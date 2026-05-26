"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send, Clock, Trash2, Play, CheckCircle, XCircle,
  Loader2, RefreshCw, BookOpen, Zap,
  History, List, Copy, Image, Video,
  Film, Quote, Megaphone, Clapperboard, Download,
  Sparkles, RotateCcw, TrendingUp, Check, X,
  Plus, Wifi, WifiOff, KeyRound, Eye, EyeOff,
  Settings, AlertTriangle, Terminal
} from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

// ── Types ─────────────────────────────────────────────────────────────────────
type Platform = "instagram" | "tiktok" | "twitter" | "facebook";
type PostStatus = "pending" | "done" | "error" | "posting";
type Tab = "video" | "compose" | "queue" | "accounts";

interface QueueItem {
  id: string; title: string; text: string; platforms: string[];
  status: PostStatus; created_at: string; posted_at?: string;
  results?: Record<string, { ok: boolean; error?: string }>;
}

interface Creds { instagram: { username: string; password: string }; tiktok_session: boolean; twitter_session: boolean; facebook_session: boolean }

// ── Video constants ────────────────────────────────────────────────────────────
const VIDEO_TYPES = [
  { id: "teaser",      label: "Teaser",       icon: Clapperboard, color: "from-violet-500 to-purple-600", duration: "15s", desc: "Accroche rapide" },
  { id: "citation",    label: "Citation",     icon: Quote,        color: "from-amber-500 to-orange-600",  duration: "12s", desc: "Phrase forte animée" },
  { id: "promo",       label: "Promo Reel",   icon: Megaphone,    color: "from-pink-500 to-rose-600",     duration: "30s", desc: "Bénéfices + CTA" },
  { id: "booktrailer", label: "Book Trailer", icon: Film,         color: "from-cyan-500 to-blue-600",     duration: "45s", desc: "Style cinéma" },
  { id: "shorts",      label: "Shorts/Reel",  icon: TrendingUp,   color: "from-red-500 to-pink-600",      duration: "60s", desc: "Script TikTok" },
];

const FORMATS = [
  { id: "portrait",  label: "9:16",  w: 540, h: 960 },
  { id: "square",    label: "1:1",   w: 540, h: 540 },
  { id: "landscape", label: "16:9",  w: 960, h: 540 },
];

const THEMES = [
  { id: "dark",   label: "Dark",   bg1: "#0d0d1a", bg2: "#1a0a2e", accent: "#a855f7" },
  { id: "gold",   label: "Gold",   bg1: "#1a1200", bg2: "#2d1e00", accent: "#f59e0b" },
  { id: "ocean",  label: "Ocean",  bg1: "#00111a", bg2: "#001a2e", accent: "#06b6d4" },
  { id: "fire",   label: "Fire",   bg1: "#1a0500", bg2: "#2d0a00", accent: "#ef4444" },
  { id: "forest", label: "Forest", bg1: "#001a0a", bg2: "#002d12", accent: "#10b981" },
  { id: "rose",   label: "Rose",   bg1: "#1a0010", bg2: "#2d0020", accent: "#ec4899" },
];

const PLATFORMS: { id: Platform; label: string; color: string; bg: string }[] = [
  { id: "instagram", label: "Instagram", color: "text-pink-400",  bg: "bg-pink-500/20 border-pink-500/30" },
  { id: "tiktok",    label: "TikTok",    color: "text-red-400",   bg: "bg-red-500/20 border-red-500/30" },
  { id: "twitter",   label: "Twitter/X", color: "text-sky-400",   bg: "bg-sky-500/20 border-sky-500/30" },
  { id: "facebook",  label: "Facebook",  color: "text-blue-400",  bg: "bg-blue-500/20 border-blue-500/30" },
];

const SERVER = "http://localhost:8001";

// ── Video renderer ─────────────────────────────────────────────────────────────
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" "); const lines: string[] = []; let cur = "";
  for (const w of words) { const t2 = cur ? cur + " " + w : w; if (ctx.measureText(t2).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t2; }
  if (cur) lines.push(cur); return lines;
}
interface Slide { text: string; subtext?: string; duration: number; style: string }
async function renderVideoToBlob(slides: Slide[], fmt: typeof FORMATS[0], thm: typeof THEMES[0], coverDataUrl?: string, fps = 25): Promise<Blob> {
  const canvas = document.createElement("canvas"); canvas.width = fmt.w; canvas.height = fmt.h;
  const ctx = canvas.getContext("2d")!;
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
  const rec = new MediaRecorder(canvas.captureStream(fps), { mimeType: mime, videoBitsPerSecond: 2_500_000 });
  const chunks: Blob[] = []; rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  let cImg: HTMLImageElement | null = null;
  if (coverDataUrl) { cImg = await new Promise(r => { const i = new window.Image(); i.onload = () => r(i); i.onerror = () => r(null as unknown as HTMLImageElement); i.src = coverDataUrl; }); }
  rec.start();
  const W = fmt.w, H = fmt.h;
  for (const sl of slides) {
    const tf = Math.round(sl.duration * fps);
    for (let f = 0; f < tf; f++) {
      const p = f / tf, tIn = easeOut(Math.min(1, p * 4)), tOut = p > 0.8 ? easeOut((p - 0.8) * 5) : 0;
      const alpha = tOut > 0 ? 1 - tOut * 0.6 : tIn, sY = (1 - tIn) * H * 0.04;
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, thm.bg1); g.addColorStop(1, thm.bg2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = thm.accent + "20";
      for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(((i * 137 + f * 0.5) % 1) * W, ((i * 97 + f * 0.3) % 1) * H, 2 + i % 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = thm.accent; ctx.fillRect(W * 0.1 * tIn, 0, W * 0.8 * tIn, 3);
      if (sl.style === "title" && cImg) { const cW = W * 0.45, cH = cW * 1.5, cX = (W - cW) / 2, cY = H * 0.1 + sY; ctx.shadowColor = thm.accent; ctx.shadowBlur = 24 * tIn; ctx.drawImage(cImg, cX, cY, cW, cH); ctx.shadowBlur = 0; }
      ctx.globalAlpha = alpha;
      if (sl.style === "cta") {
        const pw = W * 0.78, ph = 52, px = (W - pw) / 2, py = H * 0.5 + sY;
        ctx.fillStyle = thm.accent; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 26); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.round(W * 0.042)}px system-ui`; ctx.textAlign = "center"; ctx.fillText(sl.text, W / 2, py + ph / 2 + 7);
      } else {
        const big = ["big","title","climax","intro"].includes(sl.style), fs = big ? W * 0.072 : W * 0.054;
        ctx.font = `bold ${Math.round(fs)}px system-ui`; ctx.textAlign = "center"; ctx.fillStyle = big ? thm.accent : "#fff";
        ctx.shadowColor = thm.accent; ctx.shadowBlur = big ? 16 : 0;
        const lines = wrapText(ctx, sl.text, W * 0.82), lh = fs * 1.32, sy = H / 2 - lines.length * lh / 2 + sY;
        lines.forEach((l, i) => ctx.fillText(l, W / 2, sy + i * lh)); ctx.shadowBlur = 0;
        if (sl.subtext) { ctx.font = `${Math.round(W * 0.034)}px system-ui`; ctx.fillStyle = "rgba(255,255,255,0.5)"; wrapText(ctx, sl.subtext, W * 0.78).forEach((l, i) => ctx.fillText(l, W / 2, sy + lines.length * lh + 20 + i * W * 0.04)); }
      }
      ctx.globalAlpha = 1; ctx.fillStyle = thm.accent + "60"; ctx.fillRect(W * 0.1, H - 3, W * 0.8 * tIn, 3);
      await new Promise(r => setTimeout(r, 1000 / fps));
    }
  }
  await new Promise<void>(r => { rec.onstop = () => r(); rec.stop(); });
  return new Blob(chunks, { type: mime });
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AutoPostPage() {
  const [tab, setTab] = useState<Tab>("compose");
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState("");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [serverInfo, setServerInfo] = useState<Record<string, unknown>>({});
  const [checking, setChecking] = useState(false);

  // Video
  const [videoType, setVideoType] = useState("teaser");
  const [videoFormat, setVideoFormat] = useState("portrait");
  const [videoTheme, setVideoTheme] = useState("dark");
  const [generating, setGenerating] = useState(false);
  const [script, setScript] = useState<Record<string, unknown> | null>(null);
  const [activeVariant, setActiveVariant] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [videoCaption, setVideoCaption] = useState("");

  // Compose
  const [postText, setPostText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["instagram", "tiktok"]);
  const [includeCover, setIncludeCover] = useState(true);
  const [scheduleAt, setScheduleAt] = useState("");
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<Record<string, { ok: boolean; error?: string }> | null>(null);

  // Queue
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueFilter, setQueueFilter] = useState<"all" | "pending" | "done">("all");

  // Credentials (stored in localStorage, never server-side)
  const [creds, setCreds] = useState<Creds>({ instagram: { username: "", password: "" }, tiktok_session: false, twitter_session: false, facebook_session: false });
  const [showPwd, setShowPwd] = useState(false);
  const [loginLoading, setLoginLoading] = useState<string | null>(null);
  const [loginMsg, setLoginMsg] = useState("");

  useEffect(() => {
    setBooks(getBooks());
    const saved = localStorage.getItem("ba_creds");
    if (saved) setCreds(JSON.parse(saved));
    checkConnection();
  }, []);

  const saveCreds = (next: Creds) => { setCreds(next); localStorage.setItem("ba_creds", JSON.stringify(next)); };

  const book = books.find(b => b.id === selectedBook);
  const fmt = FORMATS.find(f => f.id === videoFormat) || FORMATS[0];
  const thm = THEMES.find(t => t.id === videoTheme) || THEMES[0];

  // ── Server connection ────────────────────────────────────────────────────────
  const checkConnection = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch(`${SERVER}/api/book/status`, { signal: AbortSignal.timeout(3000) });
      const data = await res.json() as Record<string, unknown>;
      setServerInfo(data); setConnected(true);
    } catch { setConnected(false); }
    setChecking(false);
  }, []);

  const loadQueue = useCallback(async () => {
    if (!connected) return;
    setLoadingQueue(true);
    try {
      const res = await fetch(`${SERVER}/api/book/queue?status=all`);
      setQueue(await res.json() as QueueItem[]);
    } catch { /* ignore */ }
    setLoadingQueue(false);
  }, [connected]);

  useEffect(() => { if (tab === "queue") loadQueue(); }, [tab, loadQueue]);

  // ── Login sessions (open browser window for one-time login) ──────────────────
  const loginSession = async (platform: string) => {
    setLoginLoading(platform);
    setLoginMsg(`Ouverture du navigateur pour ${platform}… Connecte-toi puis le serveur sauvegarde la session.`);
    try {
      const res = await fetch(`${SERVER}/api/login/${platform}`, { method: "POST", signal: AbortSignal.timeout(300_000) });
      const data = await res.json() as Record<string, string>;
      if (data.ok) {
        saveCreds({ ...creds, [`${platform}_session`]: true } as Creds);
        setLoginMsg(`✓ Session ${platform} sauvegardée — publication automatique activée`);
      } else {
        setLoginMsg(`Erreur: ${data.message || "inconnue"}`);
      }
    } catch (e) { setLoginMsg(`Erreur: ${String(e)}`); }
    setLoginLoading(null);
  };

  // ── Post now ─────────────────────────────────────────────────────────────────
  const postNow = async () => {
    if (!postText.trim() || !selectedPlatforms.length || !connected) return;
    setPosting(true); setPostResult(null);
    try {
      const body: Record<string, unknown> = {
        text: postText, platforms: selectedPlatforms,
        credentials: { instagram: creds.instagram },
      };
      if (includeCover && book?.coverDataUrl) body.image_base64 = book.coverDataUrl;
      const res = await fetch(`${SERVER}/api/book/post`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json() as { results: Record<string, { ok: boolean; error?: string }> };
      setPostResult(data.results);
      if (Object.values(data.results).some(r => r.ok)) setPostText("");
    } catch (e) { setPostResult({ _error: { ok: false, error: String(e) } }); }
    setPosting(false);
  };

  // ── Add to queue ─────────────────────────────────────────────────────────────
  const addToQueue = async () => {
    if (!postText.trim() || !selectedPlatforms.length) return;
    if (connected) {
      try {
        const body: Record<string, unknown> = {
          title: book?.title || "Post",
          text: postText, platforms: selectedPlatforms,
          credentials: { instagram: creds.instagram },
          scheduled_at: scheduleAt || null,
        };
        if (includeCover && book?.coverDataUrl) body.image_base64 = book.coverDataUrl;
        await fetch(`${SERVER}/api/book/queue`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        await loadQueue(); setPostText(""); setScheduleAt("");
      } catch (e) { console.error(e); }
    }
  };

  const postNextInQueue = async () => {
    try { await fetch(`${SERVER}/api/book/post-next`, { method: "POST" }); setTimeout(loadQueue, 4000); }
    catch (e) { console.error(e); }
  };

  const deleteFromQueue = async (id: string) => {
    try { await fetch(`${SERVER}/api/book/queue/${id}`, { method: "DELETE" }); setQueue(q => q.filter(x => x.id !== id)); }
    catch { /* ignore */ }
  };

  // ── Video ─────────────────────────────────────────────────────────────────────
  const generateScript = async () => {
    if (!book) return;
    setGenerating(true); setScript(null); setVideoBlobUrl(null);
    try {
      const res = await fetch("/api/video-script", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: videoType, bookTitle: book.title, category: book.category, chapters: book.chapters?.slice(0, 2) }),
      });
      const data = await res.json() as Record<string, unknown>;
      setScript(data);
      setVideoCaption((data.caption as string) || ((data.variants as {caption:string}[])?.[0]?.caption) || "");
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const renderVideo = async () => {
    if (!script) return;
    setRendering(true); setRenderProgress(0); setVideoBlobUrl(null);
    try {
      let slides: Slide[] = [];
      if (videoType === "teaser" || videoType === "promo") {
        const raw = (script.slides as Slide[]) || [];
        slides = videoType === "teaser" && script.hook ? [{ text: script.hook as string, duration: 2.5, style: "big" }, ...raw] : raw;
      } else if (videoType === "booktrailer") {
        slides = ((script.scenes as {text:string;narration?:string;duration:number;style:string}[]) || []).map(s => ({ text: s.text, subtext: s.narration, duration: s.duration, style: s.style }));
      } else if (videoType === "citation") {
        const v = (script.variants as {quote:string;author:string;context:string}[])?.[activeVariant];
        if (v) slides = [{ text: v.context, duration: 3, style: "normal" }, { text: `"${v.quote}"`, duration: 6, style: "big" }, { text: `— ${v.author}`, duration: 3, style: "normal" }];
      } else if (videoType === "shorts") {
        slides = ((script.onscreenText as string[]) || []).map((t, i) => ({ text: t, duration: 8, style: i === 0 ? "big" : "normal" }));
        if (script.hook) slides = [{ text: script.hook as string, duration: 3, style: "intro" }, ...slides];
      }
      if (!slides.length) slides = [{ text: book?.title || "", duration: 3, style: "title" }];
      slides.push({ text: book?.title || "", duration: 4, style: "title" });
      const total = slides.reduce((s, sl) => s + sl.duration, 0);
      let elapsed = 0; const t = setInterval(() => { elapsed += 0.5; setRenderProgress(Math.min(95, Math.round(elapsed / total * 100))); }, 500);
      const blob = await renderVideoToBlob(slides, fmt, thm, book?.coverDataUrl);
      clearInterval(t); setRenderProgress(100); setVideoBlobUrl(URL.createObjectURL(blob));
    } catch (e) { console.error(e); }
    setRendering(false);
  };

  const downloadVideo = () => {
    if (!videoBlobUrl) return;
    const a = document.createElement("a"); a.href = videoBlobUrl; a.download = `${book?.title || "video"}_${videoType}.webm`; a.click();
  };

  const generateCaption = () => {
    if (!book) return;
    const t = [
      `📚 "${book.title}" — ${book.category}\n\n🔥 Ce livre va changer ta façon de voir les choses.\n\nLien en bio 👇\n\n#livre #booktok #lecture #ebook #auteur`,
      `✨ "${book.title}" est disponible maintenant !\n\n${book.chapters?.slice(0, 3).map(c => `✅ ${c.title}`).join("\n") || ""}\n\n📩 Lien en bio\n\n#livrefrancais #coaching #développementpersonnel`,
      `🚀 "${book.title}" — Tout ce que j'ai appris, dans un seul livre.\n\nCommente "OUI" pour recevoir le lien 👇\n\n#booktok #auteur #ebook #motivation`,
    ];
    setPostText(t[Math.floor(Math.random() * t.length)]);
  };

  const pendingCount = queue.filter(q => q.status === "pending").length;
  const filteredQueue = queue.filter(q => queueFilter === "all" ? true : q.status === queueFilter);

  const statusBadge = () => {
    if (checking) return <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl text-white/40 text-xs"><Loader2 size={12} className="animate-spin" /> Connexion…</div>;
    if (connected) return <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs"><Wifi size={12} /> Serveur connecté</div>;
    return <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white/40 text-xs"><WifiOff size={12} /> Serveur hors ligne</div>;
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center"><Video size={20} className="text-white" /></div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Studio Social</h1>
          </div>
          <p className="text-white/50">Vidéos IA · Publication automatique · File programmée</p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge()}
          <button onClick={checkConnection} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl"><RefreshCw size={13} className={`text-white/40 ${checking ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      {/* Server offline banner */}
      {connected === false && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Terminal size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-amber-300 font-semibold text-sm">Lance le serveur Python pour la publication automatique</p>
              <div className="mt-2 space-y-1">
                <code className="block bg-black/40 text-amber-200 text-xs px-3 py-1.5 rounded-lg">pip install fastapi uvicorn instagrapi playwright</code>
                <code className="block bg-black/40 text-amber-200 text-xs px-3 py-1.5 rounded-lg">python -m playwright install chromium</code>
                <code className="block bg-black/40 text-emerald-300 text-xs px-3 py-1.5 rounded-lg font-bold">python social_server.py</code>
              </div>
              <p className="text-white/40 text-xs mt-2">Le fichier social_server.py est dans le dossier de ton projet BookAutomator.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 mb-6 w-fit overflow-x-auto">
        {([
          { id: "compose" as Tab, icon: Send,    label: "Composer & Poster" },
          { id: "queue"   as Tab, icon: List,    label: `File (${pendingCount})` },
          { id: "video"   as Tab, icon: Film,    label: "Vidéos IA" },
          { id: "accounts"as Tab, icon: KeyRound,label: "Comptes" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${tab === id ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white" : "text-white/40 hover:text-white"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ══ COMPOSE ══════════════════════════════════════════════════════════ */}
      {tab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {/* Book picker */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                <option value="">— Sélectionne un livre (optionnel) —</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title} ({b.category})</option>)}
              </select>
              {book && (
                <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl">
                  {book.coverDataUrl ? <img src={book.coverDataUrl} alt="" className="w-8 h-11 object-cover rounded" /> : <div className="w-8 h-11 bg-white/10 rounded" />}
                  <div className="flex-1"><p className="text-white text-sm font-medium">{book.title}</p></div>
                  <button onClick={generateCaption} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl text-xs hover:bg-purple-500/30 transition-colors">
                    <Zap size={11} /> Générer légende
                  </button>
                </div>
              )}
            </div>

            {/* Text */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-white/50 text-xs">Texte du post</label>
                <span className="text-white/25 text-xs">{postText.length}</span>
              </div>
              <textarea value={postText} onChange={e => setPostText(e.target.value)}
                placeholder="Écris ou génère ta légende..." rows={7}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 resize-none" />
            </div>

            {/* Schedule */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
              <label className="text-white/50 text-xs mb-2 block">Programmer à (optionnel)</label>
              <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={postNow} disabled={posting || !postText.trim() || !selectedPlatforms.length || !connected}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:opacity-40 text-white rounded-2xl font-semibold text-sm transition-all">
                {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {posting ? "Publication…" : "Poster maintenant"}
              </button>
              <button onClick={addToQueue} disabled={!postText.trim() || !selectedPlatforms.length || !connected}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 text-white/60 rounded-2xl text-sm font-medium transition-all">
                <Clock size={15} /> Programmer
              </button>
            </div>

            {/* Result */}
            {postResult && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                {Object.entries(postResult).map(([platform, res]) => (
                  <div key={platform} className={`flex items-center gap-3 p-2.5 rounded-xl ${res.ok ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                    {res.ok ? <CheckCircle size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-red-400" />}
                    <span className="text-white text-sm capitalize font-medium">{platform}</span>
                    {res.ok ? <span className="text-emerald-400 text-xs ml-auto">Publié ✓</span> : <span className="text-red-300 text-xs ml-auto truncate max-w-48">{res.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: platform + cover */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
              <label className="text-white/50 text-xs mb-2 block">Plateformes</label>
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setSelectedPlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${selectedPlatforms.includes(p.id) ? p.bg + " " + p.color : "bg-white/[0.02] border-white/[0.06] text-white/30"}`}>
                  <span className="flex-1 text-left">{p.label}</span>
                  {selectedPlatforms.includes(p.id) && <Check size={14} />}
                </button>
              ))}
            </div>
            <button onClick={() => setIncludeCover(v => !v)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${includeCover ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "bg-white/[0.02] border-white/[0.06] text-white/30"}`}>
              <Image size={16} /> <span className="flex-1 text-left">Inclure la couverture</span>
              {includeCover && <Check size={14} />}
            </button>

            {/* Server status */}
            {connected && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-1.5">
                <p className="text-white/40 text-xs font-semibold">Serveur</p>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded-lg ${(serverInfo.has_instagrapi as boolean) ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/30"}`}>Instagram {(serverInfo.has_instagrapi as boolean) ? "✓" : "—"}</span>
                  <span className={`text-xs px-2 py-1 rounded-lg ${(serverInfo.has_playwright as boolean) ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/30"}`}>TikTok/X {(serverInfo.has_playwright as boolean) ? "✓" : "—"}</span>
                </div>
                <p className="text-white/25 text-xs">{typeof serverInfo.posted_today === "number" ? serverInfo.posted_today : 0} posté(s) aujourd&apos;hui</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ QUEUE ════════════════════════════════════════════════════════════ */}
      {tab === "queue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
              {(["all", "pending", "done"] as const).map(f => (
                <button key={f} onClick={() => setQueueFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${queueFilter === f ? "bg-violet-500 text-white" : "text-white/40 hover:text-white"}`}>
                  {f === "all" ? "Tous" : f === "pending" ? `Attente (${pendingCount})` : "Publiés"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={postNextInQueue} disabled={!connected || pendingCount === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-medium disabled:opacity-40 transition-colors">
                <Play size={12} /> Poster le suivant
              </button>
              <button onClick={loadQueue} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl"><RefreshCw size={13} className={`text-white/40 ${loadingQueue ? "animate-spin" : ""}`} /></button>
            </div>
          </div>
          {filteredQueue.length === 0 ? (
            <div className="text-center py-16"><List size={32} className="text-white/15 mx-auto mb-3" /><p className="text-white/30">File vide</p></div>
          ) : (
            <div className="space-y-2">
              {filteredQueue.map(item => (
                <div key={item.id} className={`bg-white/[0.02] border rounded-2xl p-4 flex items-start gap-4 ${item.status === "done" ? "border-emerald-500/20" : item.status === "error" ? "border-red-500/20" : item.status === "posting" ? "border-yellow-500/30" : "border-white/[0.06]"}`}>
                  <div className="mt-0.5 shrink-0">
                    {item.status === "done" && <CheckCircle size={14} className="text-emerald-400" />}
                    {item.status === "error" && <XCircle size={14} className="text-red-400" />}
                    {item.status === "posting" && <Loader2 size={14} className="text-yellow-400 animate-spin" />}
                    {item.status === "pending" && <Clock size={14} className="text-white/30" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {item.platforms.map(p => { const pl = PLATFORMS.find(x => x.id === p); return <span key={p} className={`text-xs px-2 py-0.5 rounded-full border ${pl?.bg || "bg-white/10 border-white/20"} ${pl?.color || "text-white/50"}`}>{pl?.label || p}</span>; })}
                    </div>
                    <p className="text-white/60 text-xs line-clamp-2">{item.text}</p>
                    <p className="text-white/20 text-xs mt-1">{new Date(item.created_at).toLocaleString("fr-FR")}</p>
                    {item.results && (
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {Object.entries(item.results).map(([p, r]) => (
                          <span key={p} className={`text-xs px-2 py-0.5 rounded-lg ${r.ok ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                            {p} {r.ok ? "✓" : "✗"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {item.status === "pending" && (
                    <button onClick={() => deleteFromQueue(item.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg shrink-0">
                      <Trash2 size={12} className="text-white/25 hover:text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ VIDEO ════════════════════════════════════════════════════════════ */}
      {tab === "video" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <h2 className="text-white font-semibold text-sm">Livre</h2>
              <select value={selectedBook} onChange={e => { setSelectedBook(e.target.value); setScript(null); setVideoBlobUrl(null); }}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                <option value="">— Sélectionner —</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
              <h2 className="text-white font-semibold text-sm mb-2">Type</h2>
              {VIDEO_TYPES.map(vt => (
                <button key={vt.id} onClick={() => { setVideoType(vt.id); setScript(null); setVideoBlobUrl(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${videoType === vt.id ? "bg-white/8 border-violet-500/40" : "bg-white/[0.02] border-white/[0.05]"}`}>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${vt.color} flex items-center justify-center shrink-0`}><vt.icon size={14} className="text-white" /></div>
                  <div><p className={`text-sm font-medium ${videoType === vt.id ? "text-white" : "text-white/60"}`}>{vt.label} <span className="text-white/30 text-xs">{vt.duration}</span></p><p className="text-white/30 text-xs">{vt.desc}</p></div>
                </button>
              ))}
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {FORMATS.map(f => <button key={f.id} onClick={() => setVideoFormat(f.id)} className={`px-2 py-1.5 rounded-lg border text-xs transition-all ${videoFormat === f.id ? "border-violet-500/40 bg-violet-500/10 text-white" : "border-white/[0.05] text-white/40"}`}>{f.label}</button>)}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {THEMES.map(t => <button key={t.id} onClick={() => setVideoTheme(t.id)} className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${videoTheme === t.id ? "border-violet-500/50" : "border-white/[0.05]"}`}><div className="w-full h-5 rounded" style={{ background: `linear-gradient(135deg, ${t.bg1}, ${t.bg2})`, border: `1.5px solid ${t.accent}50` }} /><span className="text-xs text-white/40">{t.label}</span></button>)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button onClick={generateScript} disabled={generating || !book}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:opacity-40 text-white rounded-2xl font-semibold transition-all">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? "Génération…" : "Générer le script IA"}
            </button>
            {script && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3 max-h-96 overflow-y-auto">
                {videoType === "citation" && Array.isArray(script.variants) && (
                  <div className="flex gap-1.5">{(script.variants as unknown[]).map((_, i) => <button key={i} onClick={() => setActiveVariant(i)} className={`px-3 py-1 rounded-lg text-xs font-medium ${activeVariant === i ? "bg-amber-500/30 text-amber-300" : "bg-white/5 text-white/40"}`}>Var. {i + 1}</button>)}</div>
                )}
                <div className="space-y-1.5">
                  {(videoType === "teaser" || videoType === "promo") && Array.isArray(script.slides) && (script.slides as Slide[]).map((s, i) => <div key={i} className="flex items-start gap-2 p-2.5 bg-white/[0.03] rounded-xl"><span className="text-violet-400/60 text-xs shrink-0">{s.duration}s</span><p className="text-white text-sm">{s.text}</p></div>)}
                  {videoType === "citation" && Array.isArray(script.variants) && (script.variants as {context:string;quote:string}[])[activeVariant] && <div className="p-3 bg-amber-500/8 border border-amber-500/15 rounded-xl"><p className="text-white font-medium text-sm">"{(script.variants as {quote:string}[])[activeVariant].quote}"</p></div>}
                  {videoType === "shorts" && !!script.hook && <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl"><p className="text-red-300 text-xs mb-1">HOOK</p><p className="text-white text-sm">{String(script.hook)}</p></div>}
                  {videoType === "booktrailer" && Array.isArray(script.scenes) && (script.scenes as {id:number;text:string;duration:number}[]).map(s => <div key={s.id} className="p-2.5 bg-white/[0.03] rounded-xl"><p className="text-white/40 text-xs mb-1">Scène {s.id} · {s.duration}s</p><p className="text-white text-sm">{s.text}</p></div>)}
                </div>
                {videoCaption && (
                  <div className="pt-2 border-t border-white/[0.06]">
                    <div className="flex justify-between mb-1"><span className="text-white/40 text-xs">Légende</span><button onClick={() => navigator.clipboard.writeText(videoCaption)} className="text-white/40 hover:text-white text-xs flex items-center gap-1"><Copy size={10} /> Copier</button></div>
                    <textarea value={videoCaption} onChange={e => setVideoCaption(e.target.value)} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white/60 text-xs focus:outline-none resize-none" />
                    <button onClick={() => { setPostText(videoCaption); setTab("compose"); }} className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-xl text-xs hover:bg-violet-500/30 transition-colors"><Send size={11} /> Utiliser dans Composer</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {script ? (
              <>
                <button onClick={renderVideo} disabled={rendering}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-40 text-white rounded-2xl font-semibold transition-all">
                  {rendering ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
                  {rendering ? `Rendu ${renderProgress}%…` : "Générer la vidéo"}
                </button>
                {rendering && <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"><div className="w-full bg-white/10 rounded-full h-2"><div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all" style={{ width: `${renderProgress}%` }} /></div></div>}
                {videoBlobUrl && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                    <p className="text-emerald-400 text-sm font-semibold flex items-center gap-1.5"><CheckCircle size={14} /> Vidéo prête !</p>
                    <video src={videoBlobUrl} controls className="w-full rounded-xl bg-black" style={{ maxHeight: videoFormat === "portrait" ? "400px" : "auto" }} />
                    <div className="flex gap-2">
                      <button onClick={downloadVideo} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-colors"><Download size={14} /> Télécharger</button>
                      <button onClick={() => { setPostText(videoCaption); setTab("compose"); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-xl text-sm font-medium hover:bg-violet-500/30 transition-colors"><Send size={14} /> Poster</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 flex flex-col items-center gap-3"><Clapperboard size={28} className="text-white/15" /><p className="text-white/30 text-sm text-center">Génère d&apos;abord le script</p></div>
            )}
          </div>
        </div>
      )}

      {/* ══ ACCOUNTS ═════════════════════════════════════════════════════════ */}
      {tab === "accounts" && (
        <div className="max-w-lg space-y-4">
          {/* Instagram */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center"><span className="text-white text-xs font-bold">IG</span></div>
              <p className="text-white font-semibold text-sm">Instagram</p>
              {creds.instagram.username && <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Configuré</span>}
            </div>
            <p className="text-white/40 text-xs">Identifiant + mot de passe → publication directe via instagrapi (sans API officielle)</p>
            <input value={creds.instagram.username} onChange={e => saveCreds({ ...creds, instagram: { ...creds.instagram, username: e.target.value } })}
              placeholder="Nom d'utilisateur Instagram" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
            <div className="relative">
              <input type={showPwd ? "text" : "password"} value={creds.instagram.password}
                onChange={e => saveCreds({ ...creds, instagram: { ...creds.instagram, password: e.target.value } })}
                placeholder="Mot de passe Instagram" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none pr-10" />
              <button onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">{showPwd ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
            <p className="text-white/25 text-xs">Stocké uniquement dans ton navigateur, jamais envoyé à un serveur externe.</p>
          </div>

          {/* TikTok */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center"><span className="text-white text-xs font-bold">TK</span></div>
              <p className="text-white font-semibold text-sm">TikTok</p>
              {creds.tiktok_session && <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Session active</span>}
            </div>
            <p className="text-white/40 text-xs">Le serveur ouvre Chrome, tu te connectes une fois → la session est sauvegardée automatiquement pour les prochains posts.</p>
            <button onClick={() => loginSession("tiktok")} disabled={!connected || loginLoading === "tiktok"}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 rounded-xl text-sm font-medium disabled:opacity-40 transition-colors">
              {loginLoading === "tiktok" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              {loginLoading === "tiktok" ? "Ouverture du navigateur…" : "Connecter TikTok (une seule fois)"}
            </button>
          </div>

          {/* Twitter/X */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center"><span className="text-white text-xs font-bold">X</span></div>
              <p className="text-white font-semibold text-sm">Twitter / X</p>
              {creds.twitter_session && <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Session active</span>}
            </div>
            <p className="text-white/40 text-xs">Même principe — le navigateur s&apos;ouvre, tu te connectes une fois, la session est sauvegardée.</p>
            <button onClick={() => loginSession("twitter")} disabled={!connected || loginLoading === "twitter"}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:bg-sky-500/30 rounded-xl text-sm font-medium disabled:opacity-40 transition-colors">
              {loginLoading === "twitter" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              {loginLoading === "twitter" ? "Ouverture du navigateur…" : "Connecter Twitter/X (une seule fois)"}
            </button>
          </div>

          {/* Facebook */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center"><span className="text-white text-xs font-bold">FB</span></div>
              <p className="text-white font-semibold text-sm">Facebook</p>
              {creds.facebook_session && <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Session active</span>}
            </div>
            <button onClick={() => loginSession("facebook")} disabled={!connected || loginLoading === "facebook"}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 rounded-xl text-sm font-medium disabled:opacity-40 transition-colors">
              {loginLoading === "facebook" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              {loginLoading === "facebook" ? "Ouverture du navigateur…" : "Connecter Facebook (une seule fois)"}
            </button>
          </div>

          {loginMsg && (
            <div className={`p-3 rounded-xl border text-sm ${loginMsg.startsWith("✓") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-white/5 border-white/10 text-white/60"}`}>
              {loginMsg}
            </div>
          )}

          {!connected && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
              <p className="text-amber-300 text-sm font-semibold mb-1">Serveur requis pour configurer les comptes</p>
              <p className="text-white/50 text-xs">Lance <code className="bg-black/30 px-1 rounded">python social_server.py</code> dans le dossier du projet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
