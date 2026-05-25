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

# ── Playwright (TikTok, Twitter/X — sans API, via navigateur) ─────────────────
PLAYWRIGHT_SESSIONS: dict = {}

async def post_tiktok_playwright(text: str, image_base64: Optional[str] = None) -> dict:
    if not HAS_PLAYWRIGHT:
        return {"ok": False, "error": "playwright non installé"}
    session_file = str(SESSIONS_DIR / "tiktok_session.json")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # visible pour login si besoin
        context_args = {}
        if os.path.exists(session_file):
            context_args["storage_state"] = session_file
        context = await browser.new_context(**context_args)
        page = await context.new_page()
        await page.goto("https://www.tiktok.com/creator-center/upload?lang=fr")
        await asyncio.sleep(3)

        # Detect if logged in
        if "login" in page.url.lower() or await page.query_selector('[data-e2e="login-modal"]'):
            print("TikTok: login requis — fais ton login dans la fenêtre ouverte puis appuie sur Entrée ici.")
            input("Appuie sur Entrée après le login TikTok...")
            await context.storage_state(path=session_file)

        if image_base64:
            # Save video/image
            video_path = str(COVERS_DIR / f"tiktok_{uuid.uuid4().hex}.mp4")
            img_data = base64.b64decode(image_base64.split(",")[-1])
            Path(video_path).write_bytes(img_data)
            upload_input = await page.query_selector('input[type="file"]')
            if upload_input:
                await upload_input.set_input_files(video_path)
                await asyncio.sleep(5)
            Path(video_path).unlink(missing_ok=True)

        # Fill caption
        caption_box = await page.query_selector('[data-text="true"]')
        if not caption_box:
            caption_box = await page.query_selector('.public-DraftEditor-content')
        if caption_box:
            await caption_box.click()
            await caption_box.fill(text[:2200])
            await asyncio.sleep(1)

        # Submit
        post_btn = await page.query_selector('[data-e2e="post_video_button"]')
        if not post_btn:
            post_btn = await page.query_selector('button:has-text("Publier")')
        if not post_btn:
            post_btn = await page.query_selector('button:has-text("Post")')
        if post_btn:
            await post_btn.click()
            await asyncio.sleep(5)
            await context.storage_state(path=session_file)
            await browser.close()
            return {"ok": True}
        await browser.close()
        return {"ok": False, "error": "Bouton Publier non trouvé"}

async def post_twitter_playwright(text: str) -> dict:
    if not HAS_PLAYWRIGHT:
        return {"ok": False, "error": "playwright non installé"}
    session_file = str(SESSIONS_DIR / "twitter_session.json")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context_args = {}
        if os.path.exists(session_file):
            context_args["storage_state"] = session_file
        context = await browser.new_context(**context_args)
        page = await context.new_page()
        await page.goto("https://twitter.com/compose/post")
        await asyncio.sleep(4)

        if "login" in page.url.lower() or "i/flow/login" in page.url:
            print("Twitter: login requis — fais ton login dans la fenêtre puis appuie sur Entrée.")
            input("Entrée après login Twitter...")
            await context.storage_state(path=session_file)
            await page.goto("https://twitter.com/compose/post")
            await asyncio.sleep(3)

        tweet_box = await page.query_selector('[data-testid="tweetTextarea_0"]')
        if not tweet_box:
            await browser.close()
            return {"ok": False, "error": "Zone de texte non trouvée"}
        await tweet_box.click()
        await tweet_box.type(text[:280], delay=20)
        await asyncio.sleep(1)

        tweet_btn = await page.query_selector('[data-testid="tweetButtonInline"]')
        if not tweet_btn:
            tweet_btn = await page.query_selector('[data-testid="tweetButton"]')
        if tweet_btn:
            await tweet_btn.click()
            await asyncio.sleep(3)
            await context.storage_state(path=session_file)
            await browser.close()
            return {"ok": True}
        await browser.close()
        return {"ok": False, "error": "Bouton Tweet non trouvé"}

async def post_facebook_playwright(text: str, image_base64: Optional[str] = None) -> dict:
    if not HAS_PLAYWRIGHT:
        return {"ok": False, "error": "playwright non installé"}
    session_file = str(SESSIONS_DIR / "facebook_session.json")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context_args = {}
        if os.path.exists(session_file):
            context_args["storage_state"] = session_file
        context = await browser.new_context(**context_args)
        page = await context.new_page()
        await page.goto("https://www.facebook.com")
        await asyncio.sleep(3)

        if "login" in page.url.lower():
            print("Facebook: login requis — fais ton login dans la fenêtre puis appuie sur Entrée.")
            input("Entrée après login Facebook...")
            await context.storage_state(path=session_file)

        # Click "Créer une publication"
        create_box = await page.query_selector('[aria-label="Créer une publication"]')
        if not create_box:
            create_box = await page.query_selector('[data-testid="status-attachment-mentions-input"]')
        if not create_box:
            # Try clicking the post box
            create_box = await page.query_selector('[role="button"]:has-text("Vous pensez à quoi")')
        if create_box:
            await create_box.click()
            await asyncio.sleep(1)

        text_area = await page.query_selector('[aria-label="À quoi pensez-vous ?"]')
        if not text_area:
            text_area = await page.query_selector('[contenteditable="true"]')
        if text_area:
            await text_area.click()
            await text_area.type(text, delay=15)
            await asyncio.sleep(1)

        post_btn = await page.query_selector('[aria-label="Publier"]')
        if post_btn:
            await post_btn.click()
            await asyncio.sleep(3)
            await context.storage_state(path=session_file)
            await browser.close()
            return {"ok": True}
        await browser.close()
        return {"ok": False, "error": "Bouton Publier non trouvé"}

# ── Routes ────────────────────────────────────────────────────────────────────
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
                        requests.post("http://localhost:8000/api/book/post-next")
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
