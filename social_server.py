"""
BookAutomator — Serveur de publication automatique
Lance: python social_server.py
Puis ouvre l'app et configure les identifiants dans Studio Social > Comptes
"""
import asyncio, base64, json, os, time, uuid, threading
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

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
