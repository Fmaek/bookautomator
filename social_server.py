"""
BookAutomator — Serveur de publication automatique
Lance: python social_server.py
Puis ouvre l'app et configure les identifiants dans Studio Social > Comptes
"""
import asyncio, base64, io, json, os, subprocess, time, uuid, threading
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
import uvicorn

# ── Dépendances vidéo optionnelles ────────────────────────────────────────────
try:
    import imageio, imageio_ffmpeg
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    HAS_VIDGEN = True
except ImportError:
    HAS_VIDGEN = False
    print("⚠  imageio/Pillow non installés — génération vidéo HD désactivée.")
    print("   Lance: pip install imageio imageio-ffmpeg Pillow numpy")

# ── Install check ─────────────────────────────────────────────────────────────
try:
    from instagrapi import Client as InstaClient
    HAS_INSTA = True
except ImportError:
    HAS_INSTA = False
    print("⚠  instagrapi non installé — Instagram désactivé. Lance: pip install instagrapi")

try:
    from playwright.async_api import async_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False
    print("⚠  playwright non installé — TikTok/Twitter via navigateur désactivé.")
    print("   Lance: pip install playwright && python -m playwright install chromium")

# ── Data ──────────────────────────────────────────────────────────────────────
QUEUE_FILE = Path("queue.json")
SESSIONS_DIR = Path("sessions")
SESSIONS_DIR.mkdir(exist_ok=True)
COVERS_DIR = Path("covers")
COVERS_DIR.mkdir(exist_ok=True)

def load_queue():
    if QUEUE_FILE.exists():
        return json.loads(QUEUE_FILE.read_text(encoding="utf-8"))
    return []

def save_queue(q):
    QUEUE_FILE.write_text(json.dumps(q, ensure_ascii=False, indent=2), encoding="utf-8")

# ── Constantes vidéo ──────────────────────────────────────────────────────────
THEME_COLORS = {
    "dark":   {"bg1":(13,13,26),   "bg2":(26,10,46),  "acc":(168,85,247)},
    "gold":   {"bg1":(26,18,0),    "bg2":(45,30,0),   "acc":(245,158,11)},
    "ocean":  {"bg1":(0,17,26),    "bg2":(0,26,46),   "acc":(6,182,212)},
    "fire":   {"bg1":(26,5,0),     "bg2":(45,10,0),   "acc":(239,68,68)},
    "forest": {"bg1":(0,26,10),    "bg2":(0,45,18),   "acc":(16,185,129)},
    "rose":   {"bg1":(26,0,16),    "bg2":(45,0,32),   "acc":(236,72,153)},
}
FORMAT_SIZES = {"portrait":(540,960), "square":(540,540), "landscape":(960,540)}
PEXELS_QUERIES = {
    "développement":"motivation success achievement",
    "self-help":"motivation success achievement",
    "romance":"romantic couple sunset love",
    "thriller":"dark city mystery suspense night",
    "horreur":"dark scary mysterious",
    "fiction":"cinematic dramatic sky",
    "fantasy":"fantasy magical forest mystical",
    "sci-fi":"futuristic technology space",
    "science-fiction":"futuristic technology space",
    "business":"professional business office success",
    "finance":"money wealth success finance",
    "spiritualité":"meditation peaceful nature zen",
    "histoire":"ancient architecture vintage history",
    "cuisine":"food cooking kitchen",
    "santé":"health wellness nature",
    "policier":"detective mystery dark street night",
}

# ── Helpers de rendu vidéo ────────────────────────────────────────────────────
if HAS_VIDGEN:
    def _get_font(size: int, bold: bool = False):
        candidates = [
            "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/Arial Bold.ttf" if bold else "C:/Windows/Fonts/Arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ]
        for p in candidates:
            try: return ImageFont.truetype(p, size)
            except: pass
        return ImageFont.load_default()

    def _wrap(draw, text: str, font, max_w: int) -> list:
        words = text.split()
        lines, cur = [], ""
        for w in words:
            test = (cur + " " + w).strip()
            if draw.textlength(test, font=font) > max_w and cur:
                lines.append(cur); cur = w
            else:
                cur = test
        if cur: lines.append(cur)
        return lines or [" "]

    def _gradient_bg(W: int, H: int, c1: tuple, c2: tuple) -> np.ndarray:
        arr = np.zeros((H, W, 3), dtype=np.uint8)
        for y in range(H):
            t = y / H
            arr[y, :] = [int(c1[i]*(1-t)+c2[i]*t) for i in range(3)]
        return arr

    def _vignette(frame: np.ndarray) -> np.ndarray:
        H, W = frame.shape[:2]
        Y, X = np.ogrid[:H, :W]
        dist = np.sqrt(((X-W/2)/(W*0.5))**2 + ((Y-H*0.45)/(H*0.45))**2)
        mask = np.clip(1 - dist*0.72, 0, 1)[..., np.newaxis]
        return np.clip(frame * mask, 0, 255).astype(np.uint8)

    def _grain(frame: np.ndarray, strength: int = 7) -> np.ndarray:
        noise = np.random.randint(-strength, strength+1, frame.shape, dtype=np.int16)
        return np.clip(frame.astype(np.int16)+noise, 0, 255).astype(np.uint8)

    def _load_cover(b64: str, max_w: int, max_h: int) -> Optional[Image.Image]:
        try:
            data = base64.b64decode(b64.split(",")[-1])
            img = Image.open(io.BytesIO(data)).convert("RGBA")
            img.thumbnail((max_w, max_h), Image.LANCZOS)
            return img
        except: return None

    def _render_frame(slide: dict, W: int, H: int, thm: dict,
                      bg_frames: list, gf: int, cover: Optional[Image.Image],
                      p: float, fade: float) -> np.ndarray:
        acc = thm["acc"]
        style = slide.get("style","normal")
        big = style in ["big","title","intro","climax"]

        # Fond
        if bg_frames:
            bg = bg_frames[gf % len(bg_frames)]
            base_arr = np.array(bg.convert("RGB").resize((W,H), Image.LANCZOS))
            overlay = _gradient_bg(W, H, thm["bg1"], thm["bg2"])
            frame_arr = np.clip(base_arr*0.42 + overlay*0.58, 0, 255).astype(np.uint8)
        else:
            frame_arr = _gradient_bg(W, H, thm["bg1"], thm["bg2"])

        img = Image.fromarray(frame_arr).convert("RGBA")

        # Lueur centrale
        glow = Image.new("RGBA",(W,H),(0,0,0,0))
        gd = ImageDraw.Draw(glow)
        for rm, al in [(0.65,12),(0.4,22),(0.2,35)]:
            r = int(W*rm); cx,cy = W//2,int(H*0.4)
            gd.ellipse([cx-r,cy-r,cx+r,cy+r], fill=(*acc,int(al*fade)))
        glow = glow.filter(ImageFilter.GaussianBlur(40))
        img = Image.alpha_composite(img, glow)
        draw = ImageDraw.Draw(img)

        text_cy = H*0.5

        # Couverture + Ken Burns
        if cover:
            zoom = 1 + 0.065*p
            cov_w = int(W*(0.52 if big else 0.27))
            cov_h = int(cov_w * cover.height/max(1,cover.width))
            zw,zh = int(cov_w*zoom), int(cov_h*zoom)
            scaled = cover.resize((zw,zh), Image.LANCZOS)
            cx_off,cy_off = (zw-cov_w)//2,(zh-cov_h)//2
            scaled = scaled.crop((cx_off,cy_off,cx_off+cov_w,cy_off+cov_h))
            cx = (W-cov_w)//2 if big else int(W*0.70)
            cy = int(H*0.09) if big else int(H*0.15)

            # Ombre portée derrière la couv
            shadow = Image.new("RGBA",(W,H),(0,0,0,0))
            sd = ImageDraw.Draw(shadow)
            pad=18
            sd.rounded_rectangle([cx-pad,cy-pad,cx+cov_w+pad,cy+cov_h+pad],
                                  radius=12, fill=(*acc,int(55*fade)))
            shadow = shadow.filter(ImageFilter.GaussianBlur(22))
            img = Image.alpha_composite(img, shadow)

            cov_rgba = scaled.convert("RGBA")
            alpha_ch = cov_rgba.getchannel("A")
            alpha_ch = alpha_ch.point(lambda x: int(x*fade))
            cov_rgba.putalpha(alpha_ch)
            img.paste(cov_rgba,(cx,cy),cov_rgba)
            draw = ImageDraw.Draw(img)
            if big: text_cy = H*0.77

        # Ligne accent
        line_y = int(H*0.70 if (cover and big) else H*0.085)
        lw = int(W*0.65*min(1, p*2.5))
        lx = (W-lw)//2
        draw.rectangle([lx,line_y,lx+lw,line_y+2], fill=(*acc,int(205*fade)))

        fade_a = int(255*fade)

        if style == "cta":
            bh = int(H*0.068); bw = int(W*0.76)
            bx = (W-bw)//2; by = int(text_cy - bh//2)
            btn_ov = Image.new("RGBA",(W,H),(0,0,0,0))
            bd = ImageDraw.Draw(btn_ov)
            bd.rounded_rectangle([bx,by,bx+bw,by+bh], radius=bh//2, fill=(*acc,fade_a))
            img = Image.alpha_composite(img, btn_ov)
            draw = ImageDraw.Draw(img)
            fnt = _get_font(int(W*0.038), bold=True)
            txt = slide["text"][:55]
            tw = draw.textlength(txt, font=fnt)
            draw.text(((W-tw)//2, by+(bh-int(W*0.038))//2), txt,
                      fill=(255,255,255,fade_a), font=fnt)
        else:
            fs = int(W*(0.074 if big else 0.052))
            fnt_m = _get_font(fs, bold=True)
            fnt_s = _get_font(int(W*0.030))

            # Reveal mots progressif
            words = slide["text"].split()
            shown = max(1, int(len(words)*min(1, p*2.8)))
            vis = " ".join(words[:shown])

            lines = _wrap(draw, vis or " ", fnt_m, int(W*0.84))
            lh = int(fs*1.38)
            tot_h = len(lines)*lh
            sy = int(text_cy - tot_h/2)
            slide_up = int((1-min(1,p*4))*H*0.022)

            for li, line in enumerate(lines):
                ty = sy + li*lh - slide_up
                if big:
                    # Glow multi-pass
                    for ox,oy in [(-2,-2),(2,-2),(-2,2),(2,2),(0,-3),(3,0),(-3,0),(0,3)]:
                        draw.text((W//2+ox, ty+oy), line, fill=(*acc,int(55*fade)),
                                  font=fnt_m, anchor="mt")
                    draw.text((W//2, ty), line, fill=(*acc,fade_a), font=fnt_m, anchor="mt")
                else:
                    # Ombre portée
                    draw.text((W//2+2, ty+2), line, fill=(0,0,0,int(160*fade)),
                              font=fnt_m, anchor="mt")
                    draw.text((W//2, ty), line, fill=(255,255,255,fade_a),
                              font=fnt_m, anchor="mt")

            if slide.get("subtext") and p > 0.35:
                sub_fade = min(1,(p-0.35)/0.3)
                sub_y = sy+tot_h+int(W*0.04)
                for si, sl2 in enumerate(_wrap(draw, slide["subtext"], fnt_s, int(W*0.78))):
                    draw.text((W//2, sub_y+si*int(W*0.037)), sl2,
                              fill=(200,200,200,int(fade_a*sub_fade)), font=fnt_s, anchor="mt")

        result = np.array(img.convert("RGB"))
        result = _vignette(result)
        result = _grain(result, 6)
        # Letterbox
        bh = int(H*0.075)
        result[:bh] = 0; result[-bh:] = 0
        # Fondu
        if fade < 0.98:
            result = np.clip(result*fade, 0, 255).astype(np.uint8)
        return result

# ── FastAPI ───────────────────────────────────────────────────────────────────
app = FastAPI(title="BookAutomator Social Server")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class PostRequest(BaseModel):
    text: str
    platforms: list[str]
    image_base64: Optional[str] = None
    credentials: dict = {}

class QueueItem(BaseModel):
    title: str
    text: str
    platforms: list[str]
    image_base64: Optional[str] = None
    credentials: dict = {}
    scheduled_at: Optional[str] = None

class VideoGenRequest(BaseModel):
    slides: List[dict]
    theme: str = "dark"
    format: str = "portrait"
    book_title: str = ""
    book_category: str = ""
    cover_base64: Optional[str] = None
    pexels_key: Optional[str] = None
    music_base64: Optional[str] = None  # audio FLAC en base64

# ── Instagram (instagrapi — username + password, sans API) ────────────────────
_insta_client: Optional["InstaClient"] = None  # type: ignore

def get_insta_client(username: str, password: str):
    global _insta_client
    session_file = SESSIONS_DIR / f"ig_{username}.json"
    cl = InstaClient() if HAS_INSTA else None
    if cl is None:
        raise RuntimeError("instagrapi non installé")
    if session_file.exists():
        cl.load_settings(str(session_file))
        cl.login(username, password)
    else:
        cl.login(username, password)
        cl.dump_settings(str(session_file))
    _insta_client = cl
    return cl

def post_instagram(text: str, username: str, password: str, image_base64: Optional[str] = None) -> dict:
    try:
        cl = get_insta_client(username, password)
        if image_base64:
            # Save image temp file
            img_path = COVERS_DIR / f"cover_{uuid.uuid4().hex}.jpg"
            img_data = base64.b64decode(image_base64.split(",")[-1])
            img_path.write_bytes(img_data)
            media = cl.photo_upload(str(img_path), caption=text)
            img_path.unlink(missing_ok=True)
            return {"ok": True, "id": str(media.pk)}
        else:
            # Post to story or use a blank white image
            img_path = COVERS_DIR / "blank.jpg"
            if not img_path.exists():
                # Create a minimal white JPEG
                import struct, zlib
                blank_b64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUEB"
                img_path.write_bytes(base64.b64decode(blank_b64 + "A" * (len(blank_b64) % 4)))
            media = cl.photo_upload(str(img_path), caption=text)
            return {"ok": True, "id": str(media.pk)}
    except Exception as e:
        return {"ok": False, "error": str(e)}

# ── Playwright helpers ────────────────────────────────────────────────────────
async def _find_first(page, selectors: list[str], timeout: int = 3000):
    """Retourne le premier élément trouvé parmi une liste de sélecteurs."""
    for sel in selectors:
        try:
            el = await page.wait_for_selector(sel, timeout=timeout)
            if el:
                return el
        except Exception:
            pass
    return None

async def _ensure_logged_in(page, context, session_file: str, platform: str,
                             login_indicators: list[str]) -> bool:
    """Vérifie si l'utilisateur est connecté, sinon attend le login manuel."""
    needs_login = False
    for ind in login_indicators:
        if ind in page.url.lower():
            needs_login = True
            break
    if not needs_login:
        modal = await _find_first(page, [
            '[data-e2e="login-modal"]', '#login-modal', '[aria-label="Log in"]',
            'input[name="username"]', 'input[name="email"]',
        ], timeout=2000)
        if modal:
            needs_login = True

    if needs_login:
        print(f"\n⚠  {platform}: fenêtre ouverte — connecte-toi puis APPUIE SUR ENTRÉE ici.")
        input(f"[Entrée après login {platform}] > ")
        await context.storage_state(path=session_file)
        print(f"✓ Session {platform} sauvegardée.")
        return True
    return False

def _launch_args(headless: bool) -> dict:
    return {
        "headless": headless,
        "args": [
            "--no-sandbox", "--disable-blink-features=AutomationControlled",
            "--disable-infobars", "--start-maximized",
        ]
    }

async def _human_type(el, text: str, delay: int = 35):
    """Frappe le texte caractère par caractère (anti-bot)."""
    await el.click()
    await el.type(text, delay=delay)

# ── Twitter/X ─────────────────────────────────────────────────────────────────
async def post_twitter_playwright(text: str) -> dict:
    if not HAS_PLAYWRIGHT:
        return {"ok": False, "error": "playwright non installé"}
    session_file = str(SESSIONS_DIR / "twitter_session.json")
    has_session = os.path.exists(session_file)

    async with async_playwright() as p:
        browser = await p.chromium.launch(**_launch_args(headless=has_session))
        ctx_args: dict = {"user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"}
        if has_session:
            ctx_args["storage_state"] = session_file
        context = await browser.new_context(**ctx_args)
        page = await context.new_page()

        try:
            # Aller sur X/Twitter
            await page.goto("https://x.com", wait_until="domcontentloaded")
            await asyncio.sleep(3)

            # Login si nécessaire
            if "login" in page.url or "i/flow" in page.url or not has_session:
                await _ensure_logged_in(page, context, session_file, "Twitter/X",
                                        ["login", "i/flow"])
                await page.goto("https://x.com", wait_until="domcontentloaded")
                await asyncio.sleep(3)

            # Cliquer sur le bouton "Poster" (compose)
            compose_btn = await _find_first(page, [
                'a[href="/compose/post"]',
                '[data-testid="SideNav_NewTweet_Button"]',
                '[aria-label="Post"]',
                '[aria-label="Publier"]',
            ])
            if compose_btn:
                await compose_btn.click()
                await asyncio.sleep(2)
            else:
                # Aller directement sur l'URL de composition
                await page.goto("https://x.com/compose/post", wait_until="domcontentloaded")
                await asyncio.sleep(3)

            # Zone de texte
            tweet_box = await _find_first(page, [
                '[data-testid="tweetTextarea_0"]',
                '[data-testid="tweetTextarea_0RichTextInputContainer"]',
                '.public-DraftEditor-content',
                '[contenteditable="true"][role="textbox"]',
            ], timeout=8000)
            if not tweet_box:
                await browser.close()
                return {"ok": False, "error": "Zone de texte introuvable — reconnecte-toi"}

            await _human_type(tweet_box, text[:280])
            await asyncio.sleep(1.5)

            # Bouton envoyer (avec retry)
            for attempt in range(3):
                send_btn = await _find_first(page, [
                    '[data-testid="tweetButtonInline"]',
                    '[data-testid="tweetButton"]',
                    'button[type="button"]:has-text("Post")',
                    'button[type="button"]:has-text("Publier")',
                ], timeout=5000)
                if send_btn:
                    await send_btn.click()
                    await asyncio.sleep(4)
                    await context.storage_state(path=session_file)
                    await browser.close()
                    return {"ok": True}
                await asyncio.sleep(2)

            await browser.close()
            return {"ok": False, "error": "Bouton Envoyer introuvable après 3 tentatives"}

        except Exception as e:
            try: await browser.close()
            except: pass
            return {"ok": False, "error": f"Erreur Twitter: {str(e)}"}

# ── Facebook ──────────────────────────────────────────────────────────────────
async def post_facebook_playwright(text: str, image_base64: Optional[str] = None) -> dict:
    if not HAS_PLAYWRIGHT:
        return {"ok": False, "error": "playwright non installé"}
    session_file = str(SESSIONS_DIR / "facebook_session.json")
    has_session = os.path.exists(session_file)

    async with async_playwright() as p:
        browser = await p.chromium.launch(**_launch_args(headless=has_session))
        ctx_args: dict = {"user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"}
        if has_session:
            ctx_args["storage_state"] = session_file
        context = await browser.new_context(**ctx_args)
        page = await context.new_page()

        try:
            await page.goto("https://www.facebook.com", wait_until="domcontentloaded")
            await asyncio.sleep(4)

            if "login" in page.url or not has_session:
                await _ensure_logged_in(page, context, session_file, "Facebook", ["login"])
                await page.goto("https://www.facebook.com", wait_until="domcontentloaded")
                await asyncio.sleep(4)

            # Cliquer sur la boîte "Créer une publication"
            create_box = await _find_first(page, [
                '[aria-label="Créer une publication"]',
                '[aria-label="Create a post"]',
                '[aria-label="Quoi de neuf"]',
                '[data-testid="status-attachment-mentions-input"]',
                'div[role="button"][tabindex="0"]:has-text("pensez")',
                'div[role="button"][tabindex="0"]:has-text("quoi")',
                'div[role="button"][tabindex="0"]:has-text("neuf")',
            ], timeout=10000)

            if create_box:
                await create_box.click()
                await asyncio.sleep(2)

            # Zone de saisie du post
            text_area = await _find_first(page, [
                '[aria-label="À quoi pensez-vous ?"]',
                '[aria-label="What\'s on your mind"]',
                'div[contenteditable="true"][role="textbox"]',
                'div[contenteditable="true"][data-lexical-editor="true"]',
                '.notranslate[contenteditable="true"]',
            ], timeout=10000)

            if not text_area:
                await browser.close()
                return {"ok": False, "error": "Zone de saisie Facebook introuvable"}

            await text_area.click()
            await asyncio.sleep(0.5)
            # Utiliser keyboard pour Facebook (plus fiable que type())
            await page.keyboard.type(text, delay=25)
            await asyncio.sleep(2)

            # Uploader image si fournie
            if image_base64:
                try:
                    img_path = COVERS_DIR / f"fb_{uuid.uuid4().hex}.jpg"
                    img_data = base64.b64decode(image_base64.split(",")[-1])
                    img_path.write_bytes(img_data)
                    photo_btn = await _find_first(page, [
                        '[aria-label="Photo/vidéo"]',
                        '[aria-label="Photo/Video"]',
                        'input[type="file"][accept*="image"]',
                    ], timeout=3000)
                    if photo_btn:
                        await photo_btn.set_input_files(str(img_path))
                        await asyncio.sleep(4)
                    img_path.unlink(missing_ok=True)
                except Exception:
                    pass  # Image optionnelle, on continue sans

            # Bouton Publier avec retry
            for attempt in range(4):
                post_btn = await _find_first(page, [
                    '[aria-label="Publier"]',
                    '[aria-label="Post"]',
                    'div[role="button"]:has-text("Publier")',
                    'div[role="button"]:has-text("Post")',
                    'button:has-text("Publier")',
                    'button:has-text("Post")',
                ], timeout=5000)
                if post_btn:
                    await post_btn.click()
                    await asyncio.sleep(5)
                    await context.storage_state(path=session_file)
                    await browser.close()
                    return {"ok": True}
                await asyncio.sleep(2)

            await browser.close()
            return {"ok": False, "error": "Bouton Publier introuvable après 4 tentatives"}

        except Exception as e:
            try: await browser.close()
            except: pass
            return {"ok": False, "error": f"Erreur Facebook: {str(e)}"}

# ── TikTok ────────────────────────────────────────────────────────────────────
async def post_tiktok_playwright(text: str, image_base64: Optional[str] = None) -> dict:
    """
    TikTok exige un fichier vidéo. Si image_base64 contient une vidéo (.webm/.mp4),
    elle est uploadée. Sinon on crée une vidéo texte simple (image fixe).
    """
    if not HAS_PLAYWRIGHT:
        return {"ok": False, "error": "playwright non installé"}
    session_file = str(SESSIONS_DIR / "tiktok_session.json")
    has_session = os.path.exists(session_file)

    # Préparer le fichier vidéo à uploader
    video_path: Optional[str] = None
    tmp_created = False
    if image_base64:
        try:
            raw = base64.b64decode(image_base64.split(",")[-1])
            ext = "webm" if image_base64.startswith("data:video/webm") else \
                  "mp4"  if image_base64.startswith("data:video/mp4")  else "webm"
            video_path = str(COVERS_DIR / f"tiktok_{uuid.uuid4().hex}.{ext}")
            Path(video_path).write_bytes(raw)
            tmp_created = True
        except Exception:
            video_path = None

    async with async_playwright() as p:
        browser = await p.chromium.launch(**_launch_args(headless=False))  # toujours visible (TikTok détecte headless)
        ctx_args: dict = {
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "viewport": {"width": 1280, "height": 800},
        }
        if has_session:
            ctx_args["storage_state"] = session_file
        context = await browser.new_context(**ctx_args)
        # Masquer l'automatisation
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            window.chrome = {runtime: {}};
        """)
        page = await context.new_page()

        try:
            await page.goto("https://www.tiktok.com", wait_until="domcontentloaded")
            await asyncio.sleep(4)

            if "login" in page.url or not has_session:
                await _ensure_logged_in(page, context, session_file, "TikTok", ["login"])
                await asyncio.sleep(2)

            # Aller sur la page d'upload
            await page.goto("https://www.tiktok.com/creator-center/upload?lang=fr",
                            wait_until="domcontentloaded")
            await asyncio.sleep(5)

            # Si toujours redirigé vers login
            if "login" in page.url:
                await _ensure_logged_in(page, context, session_file, "TikTok", ["login"])
                await page.goto("https://www.tiktok.com/creator-center/upload?lang=fr",
                                wait_until="domcontentloaded")
                await asyncio.sleep(5)

            # Upload vidéo
            if video_path:
                upload_input = await _find_first(page, [
                    'input[type="file"][accept*="video"]',
                    'input[type="file"]',
                ], timeout=10000)
                if upload_input:
                    await upload_input.set_input_files(video_path)
                    print("✓ TikTok: vidéo en cours d'upload...")
                    # Attendre que l'upload soit traité (barre de progression disparaît)
                    await asyncio.sleep(8)
                    # Attendre la disparition du loader
                    try:
                        await page.wait_for_selector('.upload-progress', state="hidden", timeout=30000)
                    except Exception:
                        await asyncio.sleep(10)
                else:
                    await browser.close()
                    if tmp_created and video_path: Path(video_path).unlink(missing_ok=True)
                    return {"ok": False, "error": "Bouton upload TikTok introuvable"}
            else:
                await browser.close()
                return {"ok": False, "error": "TikTok requiert une vidéo. Génère une vidéo dans l'onglet Vidéos IA."}

            # Remplir la légende
            caption_selectors = [
                '[data-testid="caption-content-text"]',
                '.DraftEditor-editorContainer [data-text="true"]',
                '.public-DraftEditor-content',
                '[contenteditable="true"][data-contents="true"]',
                'div[contenteditable="true"]',
            ]
            caption_box = await _find_first(page, caption_selectors, timeout=8000)
            if caption_box:
                await caption_box.click()
                await asyncio.sleep(0.5)
                await page.keyboard.type(text[:2200], delay=20)
                await asyncio.sleep(1.5)

            # Bouton Publier avec retry
            for attempt in range(5):
                post_btn = await _find_first(page, [
                    '[data-e2e="post_video_button"]',
                    'button:has-text("Publier")',
                    'button:has-text("Post")',
                    'button:has-text("Submit")',
                    'button[type="submit"]',
                ], timeout=5000)
                if post_btn:
                    is_disabled = await post_btn.get_attribute("disabled")
                    if is_disabled is None:  # not disabled
                        await post_btn.click()
                        await asyncio.sleep(6)
                        await context.storage_state(path=session_file)
                        await browser.close()
                        if tmp_created and video_path: Path(video_path).unlink(missing_ok=True)
                        return {"ok": True}
                await asyncio.sleep(3)
                print(f"TikTok: tentative {attempt+1}/5 bouton publier...")

            await browser.close()
            if tmp_created and video_path: Path(video_path).unlink(missing_ok=True)
            return {"ok": False, "error": "Bouton Publier TikTok introuvable après 5 tentatives"}

        except Exception as e:
            try: await browser.close()
            except: pass
            if tmp_created and video_path:
                try: Path(video_path).unlink(missing_ok=True)
                except: pass
            return {"ok": False, "error": f"Erreur TikTok: {str(e)}"}

# ── Routes ────────────────────────────────────────────────────────────────────
from fastapi.responses import HTMLResponse

@app.get("/", response_class=HTMLResponse)
def root():
    q = load_queue()
    pending = len([i for i in q if i.get("status") == "pending"])
    done = len([i for i in q if i.get("status") == "done"])
    return f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>BookAutomator Social Server</title>
<style>
  body{{font-family:system-ui,sans-serif;background:#0d0d14;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}}
  .card{{background:#1a1a2e;border:1px solid #2d2d4a;border-radius:16px;padding:40px;max-width:480px;width:100%;text-align:center}}
  h1{{color:#a78bfa;margin:0 0 8px}}
  .badge{{display:inline-block;padding:4px 12px;border-radius:20px;font-size:13px;margin:4px}}
  .ok{{background:#14532d;color:#86efac}}.warn{{background:#451a03;color:#fdba74}}
  .stat{{display:flex;justify-content:space-around;margin:24px 0;gap:12px}}
  .stat div{{background:#0d0d14;border-radius:12px;padding:16px;flex:1}}
  .stat .n{{font-size:28px;font-weight:700;color:#a78bfa}}
  .stat .l{{font-size:12px;color:#64748b;margin-top:4px}}
  a{{color:#818cf8;text-decoration:none;font-size:14px}}
  a:hover{{color:#a78bfa}}
</style></head>
<body><div class="card">
  <h1>📚 BookAutomator</h1>
  <p style="color:#64748b;margin:0 0 20px">Serveur de publication sociale · Port 8001</p>
  <span class="badge ok">✓ En ligne</span>
  <span class="badge {'ok' if HAS_INSTA else 'warn'}">{'✓ Instagram' if HAS_INSTA else '⚠ instagrapi manquant'}</span>
  <span class="badge {'ok' if HAS_PLAYWRIGHT else 'warn'}">{'✓ Playwright' if HAS_PLAYWRIGHT else '⚠ playwright manquant'}</span>
  <div class="stat">
    <div><div class="n">{pending}</div><div class="l">En attente</div></div>
    <div><div class="n">{done}</div><div class="l">Postés</div></div>
  </div>
  <a href="http://localhost:3001/autopost">→ Ouvrir Studio Social</a><br><br>
  <a href="/docs" style="font-size:12px;color:#475569">API docs (FastAPI)</a>
</div></body></html>"""

@app.get("/api/book/status")
def status():
    q = load_queue()
    return {
        "status": "online",
        "queue_count": len([i for i in q if i.get("status") == "pending"]),
        "has_instagrapi": HAS_INSTA,
        "has_playwright": HAS_PLAYWRIGHT,
        "posted_today": len([i for i in q if i.get("status") == "done" and i.get("posted_at", "").startswith(datetime.now().strftime("%Y-%m-%d"))]),
    }

@app.post("/api/book/post")
async def post_now(req: PostRequest):
    results = {}
    creds = req.credentials
    text = req.text
    img = req.image_base64
    platforms = req.platforms

    for p in platforms:
        if p == "instagram":
            if HAS_INSTA and creds.get("instagram", {}).get("username"):
                c = creds["instagram"]
                results["instagram"] = post_instagram(text, c["username"], c["password"], img)
            elif HAS_PLAYWRIGHT:
                results["instagram"] = await post_tiktok_playwright(text, img)  # fallback
            else:
                results["instagram"] = {"ok": False, "error": "Non configuré"}

        elif p == "tiktok":
            if HAS_PLAYWRIGHT:
                results["tiktok"] = await post_tiktok_playwright(text, img)
            else:
                results["tiktok"] = {"ok": False, "error": "playwright requis: pip install playwright"}

        elif p == "twitter":
            if HAS_PLAYWRIGHT:
                results["twitter"] = await post_twitter_playwright(text)
            else:
                results["twitter"] = {"ok": False, "error": "playwright requis"}

        elif p == "facebook":
            if HAS_PLAYWRIGHT:
                results["facebook"] = await post_facebook_playwright(text, img)
            else:
                results["facebook"] = {"ok": False, "error": "playwright requis"}

    return {"results": results, "ok": all(r.get("ok") for r in results.values())}

@app.get("/api/book/queue")
def get_queue(status: str = "all"):
    q = load_queue()
    if status != "all":
        q = [i for i in q if i.get("status") == status]
    return q

@app.post("/api/book/queue")
def add_to_queue(item: QueueItem):
    q = load_queue()
    entry = {
        "id": str(uuid.uuid4()),
        "title": item.title,
        "text": item.text,
        "platforms": item.platforms,
        "image_base64": item.image_base64,
        "credentials": item.credentials,
        "scheduled_at": item.scheduled_at,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "posted_at": None,
        "results": {}
    }
    q.insert(0, entry)
    save_queue(q)
    return {"id": entry["id"], "queue_count": len([i for i in q if i["status"] == "pending"])}

@app.delete("/api/book/queue/{item_id}")
def delete_from_queue(item_id: str):
    q = [i for i in load_queue() if i["id"] != item_id]
    save_queue(q)
    return {"ok": True}

@app.get("/api/book/history")
def get_history():
    return [i for i in load_queue() if i.get("status") == "done"]

@app.post("/api/book/post-next")
async def post_next_in_queue():
    q = load_queue()
    pending = [i for i in q if i["status"] == "pending"]
    if not pending:
        return {"ok": False, "message": "File vide"}
    item = pending[0]
    req = PostRequest(
        text=item["text"],
        platforms=item["platforms"],
        image_base64=item.get("image_base64"),
        credentials=item.get("credentials", {})
    )
    result = await post_now(req)
    for i2 in q:
        if i2["id"] == item["id"]:
            i2["status"] = "done" if result.get("ok") else "error"
            i2["posted_at"] = datetime.now().isoformat()
            i2["results"] = result.get("results", {})
    save_queue(q)
    return result

# ── Scheduler (vérifie la file toutes les minutes) ────────────────────────────
def run_scheduler():
    import requests
    while True:
        time.sleep(60)
        try:
            q = load_queue()
            now = datetime.now()
            for item in q:
                if item["status"] == "pending" and item.get("scheduled_at"):
                    sched = datetime.fromisoformat(item["scheduled_at"])
                    if now >= sched:
                        requests.post("http://localhost:8001/api/book/post-next")
                        break
        except Exception as e:
            print(f"Scheduler error: {e}")

# ── Login session initializer (run once per platform) ─────────────────────────
@app.post("/api/login/{platform}")
async def login_platform(platform: str):
    """Lance le navigateur pour que l'utilisateur se connecte une fois."""
    if not HAS_PLAYWRIGHT:
        return {"ok": False, "error": "playwright non installé"}

    urls = {"tiktok": "https://www.tiktok.com/login", "twitter": "https://twitter.com/i/flow/login",
            "facebook": "https://www.facebook.com/login", "instagram": "https://www.instagram.com/accounts/login/"}
    session_file = str(SESSIONS_DIR / f"{platform}_session.json")
    url = urls.get(platform, "https://" + platform + ".com")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False, args=["--start-maximized"])
        context = await browser.new_context(viewport=None)
        page = await context.new_page()
        await page.goto(url)
        print(f"\n✓ Fenêtre {platform} ouverte. Connecte-toi et appuie sur Entrée ici.")
        input(f"[Entrée une fois connecté à {platform}]")
        await context.storage_state(path=session_file)
        await browser.close()
        print(f"✓ Session {platform} sauvegardée dans {session_file}")
    return {"ok": True, "message": f"Session {platform} sauvegardée"}

# ── Générateur vidéo HD (imageio + Pillow) ────────────────────────────────────
@app.post("/api/book/generate-video")
async def generate_video_hd(req: VideoGenRequest):
    if not HAS_VIDGEN:
        return JSONResponse(
            {"error": "Installe: pip install imageio imageio-ffmpeg Pillow numpy"},
            status_code=503
        )

    thm = THEME_COLORS.get(req.theme, THEME_COLORS["dark"])
    W, H = FORMAT_SIZES.get(req.format, (540, 960))
    FPS = 30
    TRANS = int(FPS * 0.4)

    # Charger couverture
    cover = None
    if req.cover_base64:
        cover = _load_cover(req.cover_base64, int(W * 0.55), int(W * 0.88))

    # Télécharger vidéo Pexels pour les frames de fond
    bg_frames: list = []
    if req.pexels_key:
        try:
            import requests as rq
            cat = (req.book_category or "").lower()
            query = next((v for k, v in PEXELS_QUERIES.items() if k in cat),
                         "cinematic dramatic landscape")
            orient = "portrait" if req.format == "portrait" else "landscape"
            pex = rq.get(
                f"https://api.pexels.com/videos/search?query={query}&per_page=5&orientation={orient}",
                headers={"Authorization": req.pexels_key}, timeout=10
            ).json()
            if pex.get("videos"):
                files = pex["videos"][0]["video_files"]
                f = sorted([x for x in files if x["width"] <= 1280], key=lambda x: -x["width"])
                if f:
                    vid_bytes = rq.get(f[0]["link"], timeout=40).content
                    tmp = COVERS_DIR / f"bg_{uuid.uuid4().hex}.mp4"
                    tmp.write_bytes(vid_bytes)
                    reader = imageio.get_reader(str(tmp))
                    meta = reader.get_meta_data()
                    vfps = meta.get("fps", 25)
                    for i, fr in enumerate(reader):
                        if i % max(1, int(vfps // 6)) == 0:
                            bg_frames.append(Image.fromarray(fr))
                        if len(bg_frames) >= 250: break
                    reader.close()
                    tmp.unlink(missing_ok=True)
        except Exception as e:
            print(f"Pexels: {e}")

    # Générer les frames
    frames_out = []
    gf = 0
    for slide in req.slides:
        dur = float(slide.get("duration", 3))
        tf = int(dur * FPS)
        for f in range(tf):
            p = f / max(1, tf)
            fi = min(1.0, f / TRANS) if f < TRANS else 1.0
            fo = min(1.0, (tf - f) / TRANS) if f > tf - TRANS else 1.0
            fade = min(fi, fo)
            frame = _render_frame(slide, W, H, thm, bg_frames, gf, cover, p, fade)
            frames_out.append(frame)
            gf += 1

    # Écrire MP4 sans audio
    vid_path = COVERS_DIR / f"vid_{uuid.uuid4().hex}.mp4"
    try:
        w = imageio.get_writer(
            str(vid_path), fps=FPS, codec="libx264",
            quality=9, macro_block_size=None,
            ffmpeg_params=["-pix_fmt", "yuv420p", "-preset", "fast"]
        )
        for fr in frames_out:
            w.append_data(fr)
        w.close()

        # Ajouter musique si fournie
        if req.music_base64:
            try:
                mus_data = base64.b64decode(req.music_base64.split(",")[-1])
                mus_path = COVERS_DIR / f"mus_{uuid.uuid4().hex}.flac"
                mus_path.write_bytes(mus_data)
                out_path = COVERS_DIR / f"final_{uuid.uuid4().hex}.mp4"
                total_dur = sum(float(s.get("duration", 3)) for s in req.slides)
                ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
                subprocess.run([
                    ffmpeg, "-y",
                    "-i", str(vid_path),
                    "-i", str(mus_path),
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    "-t", str(total_dur), "-shortest",
                    str(out_path)
                ], capture_output=True, timeout=180)
                vid_path.unlink(missing_ok=True)
                mus_path.unlink(missing_ok=True)
                vid_path = out_path
            except Exception as e:
                print(f"Mix audio: {e}")

        data = vid_path.read_bytes()
        vid_path.unlink(missing_ok=True)
        return Response(content=data, media_type="video/mp4",
                        headers={"Content-Disposition": "inline; filename=video.mp4"})
    except Exception as e:
        try: vid_path.unlink(missing_ok=True)
        except: pass
        return JSONResponse({"error": str(e)}, status_code=500)

# ── Start ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "═"*55)
    print("  BookAutomator — Serveur de publication sociale")
    print("═"*55)
    print(f"  ✓ Instagram (instagrapi): {'OK' if HAS_INSTA else 'NON INSTALLÉ'}")
    print(f"  ✓ TikTok/Twitter/Facebook (playwright): {'OK' if HAS_PLAYWRIGHT else 'NON INSTALLÉ'}")
    print("  📌 Ouvre http://localhost:3001 → Studio Social")
    print("═"*55 + "\n")

    threading.Thread(target=run_scheduler, daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=8001)
