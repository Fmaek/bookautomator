"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send, Camera, Clock, Trash2, Play, CheckCircle,
  Loader2, Settings, RefreshCw, BookOpen, Zap,
  History, List, Copy, Image, Video,
  Film, Quote, Megaphone, Clapperboard, Download,
  Sparkles, RotateCcw, TrendingUp,
  Bell, ExternalLink, Check, AlertCircle,
  X, Plus, ChevronDown, ChevronUp, AtSign,
} from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

// ── Types ────────────────────────────────────────────────────────────────────
type Platform = "instagram" | "tiktok" | "twitter" | "facebook" | "youtube" | "linkedin";
type PostStatus = "pending" | "done" | "skipped";
type Tab = "video" | "compose" | "queue" | "accounts" | "settings";

interface QueueItem {
  id: string;
  bookId: string;
  bookTitle: string;
  text: string;
  platforms: Platform[];
  imageDataUrl?: string;
  videoBlobUrl?: string;
  status: PostStatus;
  scheduledAt?: string;
  postedAt?: string;
  createdAt: string;
}

interface AccountInfo {
  platform: Platform;
  handle: string;
  connected: boolean;
  connectedAt?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────
const PLATFORMS: { id: Platform; label: string; color: string; bg: string; intentUrl?: (text: string, url?: string) => string; guide: string[] }[] = [
  {
    id: "twitter", label: "X / Twitter", color: "text-sky-400", bg: "bg-sky-500/20 border-sky-500/30",
    intentUrl: (text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text.substring(0, 280))}`,
    guide: ["Ouvre l'appli X ou twitter.com", "Colle ta légende dans le tweet", "Ajoute ta couverture ou vidéo", "Publie !"],
  },
  {
    id: "tiktok", label: "TikTok", color: "text-red-400", bg: "bg-red-500/20 border-red-500/30",
    intentUrl: () => "https://www.tiktok.com/creator-center/upload",
    guide: ["Ouvre TikTok Creator Center ou l'appli", "Upload ta vidéo .webm téléchargée", "Colle ta légende dans la description", "Ajoute tes hashtags et publie"],
  },
  {
    id: "instagram", label: "Instagram", color: "text-pink-400", bg: "bg-pink-500/20 border-pink-500/30",
    intentUrl: () => "https://www.instagram.com",
    guide: ["Ouvre Instagram sur ton téléphone", "Crée un nouveau post / Reel", "Sélectionne ta vidéo ou couverture", "Colle ta légende et publie"],
  },
  {
    id: "facebook", label: "Facebook", color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/30",
    intentUrl: (text) => `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text.substring(0, 500))}`,
    guide: ["Ouvre Facebook", "Crée un nouveau post ou Reel", "Colle ta légende", "Ajoute ta vidéo ou image et publie"],
  },
  {
    id: "youtube", label: "YouTube", color: "text-red-500", bg: "bg-red-600/20 border-red-600/30",
    intentUrl: () => "https://studio.youtube.com",
    guide: ["Ouvre YouTube Studio", "Clique sur Créer > Mettre en ligne une vidéo", "Upload ta vidéo .webm", "Remplis le titre et la description"],
  },
  {
    id: "linkedin", label: "LinkedIn", color: "text-blue-300", bg: "bg-blue-400/20 border-blue-400/30",
    intentUrl: (text) => `https://www.linkedin.com/shareArticle?mini=true&summary=${encodeURIComponent(text.substring(0, 700))}`,
    guide: ["Ouvre LinkedIn", "Crée un nouveau post", "Colle ta légende", "Ajoute image ou vidéo et publie"],
  },
];

const VIDEO_TYPES = [
  { id: "teaser",      label: "Teaser",       icon: Clapperboard, color: "from-violet-500 to-purple-600", duration: "15s", desc: "Accroche rapide, impact maximal" },
  { id: "citation",    label: "Citation",     icon: Quote,        color: "from-amber-500 to-orange-600",  duration: "12s", desc: "Phrase forte du livre animée" },
  { id: "promo",       label: "Promo Reel",   icon: Megaphone,    color: "from-pink-500 to-rose-600",     duration: "30s", desc: "Bénéfices + appel à l'action" },
  { id: "booktrailer", label: "Book Trailer", icon: Film,         color: "from-cyan-500 to-blue-600",     duration: "45s", desc: "Style cinéma émotionnel" },
  { id: "shorts",      label: "Shorts/Reel",  icon: TrendingUp,   color: "from-red-500 to-pink-600",      duration: "60s", desc: "Script TikTok/Shorts parlé" },
];

const FORMATS = [
  { id: "portrait",  label: "Portrait 9:16",  w: 540,  h: 960,  desc: "TikTok · Reels · Shorts" },
  { id: "square",    label: "Carré 1:1",      w: 540,  h: 540,  desc: "Feed Instagram · Facebook" },
  { id: "landscape", label: "Paysage 16:9",   w: 960,  h: 540,  desc: "YouTube · LinkedIn" },
];

const THEMES = [
  { id: "dark",   label: "Dark",     bg1: "#0d0d1a", bg2: "#1a0a2e", accent: "#a855f7" },
  { id: "gold",   label: "Gold",     bg1: "#1a1200", bg2: "#2d1e00", accent: "#f59e0b" },
  { id: "ocean",  label: "Ocean",    bg1: "#00111a", bg2: "#001a2e", accent: "#06b6d4" },
  { id: "fire",   label: "Fire",     bg1: "#1a0500", bg2: "#2d0a00", accent: "#ef4444" },
  { id: "forest", label: "Forest",   bg1: "#001a0a", bg2: "#002d12", accent: "#10b981" },
  { id: "rose",   label: "Rose",     bg1: "#1a0010", bg2: "#2d0020", accent: "#ec4899" },
];

// ── Storage helpers ──────────────────────────────────────────────────────────
const QUEUE_KEY = "ba_post_queue";
const ACCOUNTS_KEY = "ba_accounts";

function loadQueue(): QueueItem[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}
function saveQueue(q: QueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}
function loadAccounts(): AccountInfo[] {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]"); } catch { return []; }
}
function saveAccounts(a: AccountInfo[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a));
}

// ── Canvas video renderer ────────────────────────────────────────────────────
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

interface Slide { text: string; subtext?: string; duration: number; style: string }

async function renderVideoToBlob(slides: Slide[], format: typeof FORMATS[0], theme: typeof THEMES[0], coverDataUrl?: string, fps = 25): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = format.w; canvas.height = format.h;
  const ctx = canvas.getContext("2d")!;
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
  const recorder = new MediaRecorder(canvas.captureStream(fps), { mimeType, videoBitsPerSecond: 2_500_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  let coverImg: HTMLImageElement | null = null;
  if (coverDataUrl) {
    coverImg = await new Promise(res => {
      const img = new window.Image();
      img.onload = () => res(img);
      img.onerror = () => res(null as unknown as HTMLImageElement);
      img.src = coverDataUrl;
    });
  }

  recorder.start();
  const W = format.w, H = format.h;
  for (const slide of slides) {
    const totalFrames = Math.round(slide.duration * fps);
    for (let f = 0; f < totalFrames; f++) {
      const p = f / totalFrames;
      const tIn = easeOut(Math.min(1, p * 4));
      const tOut = p > 0.8 ? easeOut((p - 0.8) * 5) : 0;
      const alpha = tOut > 0 ? 1 - tOut * 0.6 : tIn;
      const slideY = (1 - tIn) * H * 0.04;

      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, theme.bg1);
      grad.addColorStop(1, theme.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = theme.accent + "18";
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(((i * 137 + f * 0.5) % 1) * W, ((i * 97 + f * 0.3) % 1) * H, 2 + i % 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = theme.accent; ctx.fillRect(W * 0.1 * tIn, 0, W * 0.8 * tIn, 3);

      if (slide.style === "title" && coverImg) {
        const cW = W * 0.45, cH = cW * 1.5, cX = (W - cW) / 2, cY = H * 0.1 + slideY;
        ctx.shadowColor = theme.accent; ctx.shadowBlur = 24 * tIn;
        ctx.drawImage(coverImg, cX, cY, cW, cH);
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = alpha;
      if (slide.style === "cta") {
        const pw = W * 0.78, ph = 52, px = (W - pw) / 2, py = H * 0.5 + slideY;
        ctx.fillStyle = theme.accent;
        ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 26); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.round(W * 0.042)}px system-ui`; ctx.textAlign = "center";
        ctx.fillText(slide.text, W / 2, py + ph / 2 + 7);
      } else {
        const isBig = ["big", "title", "climax", "intro"].includes(slide.style);
        const fs = isBig ? W * 0.072 : W * 0.054;
        ctx.font = `bold ${Math.round(fs)}px system-ui`; ctx.textAlign = "center";
        ctx.fillStyle = isBig ? theme.accent : "#fff";
        ctx.shadowColor = theme.accent; ctx.shadowBlur = isBig ? 16 : 0;
        const lines = wrapText(ctx, slide.text, W * 0.82);
        const lh = fs * 1.32;
        const sy = H / 2 - (lines.length * lh) / 2 + slideY;
        lines.forEach((l, i) => ctx.fillText(l, W / 2, sy + i * lh));
        ctx.shadowBlur = 0;
        if (slide.subtext) {
          ctx.font = `${Math.round(W * 0.034)}px system-ui`; ctx.fillStyle = "rgba(255,255,255,0.5)";
          wrapText(ctx, slide.subtext, W * 0.78).forEach((l, i) => ctx.fillText(l, W / 2, sy + lines.length * lh + 20 + i * W * 0.04));
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = theme.accent + "60"; ctx.fillRect(W * 0.1, H - 3, W * 0.8 * tIn, 3);
      await new Promise(r => setTimeout(r, 1000 / fps));
    }
  }

  await new Promise<void>(res => { recorder.onstop = () => res(); recorder.stop(); });
  return new Blob(chunks, { type: mimeType });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function CopyBtn({ text, label = "Copier" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); };
  return (
    <button onClick={copy} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${done ? "bg-emerald-500 text-white" : "bg-white/10 hover:bg-white/20 text-white/60"}`}>
      {done ? <Check size={11} /> : <Copy size={11} />} {done ? "Copié !" : label}
    </button>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function AutoPostPage() {
  const [tab, setTab] = useState<Tab>("video");
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState("");

  // Video studio
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
  const [addedToQueue, setAddedToQueue] = useState(false);

  // Queue
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  // Accounts
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [editHandle, setEditHandle] = useState<Partial<Record<Platform, string>>>({});
  const [expandedPlatform, setExpandedPlatform] = useState<Platform | null>(null);

  // Post now modal
  const [postingItem, setPostingItem] = useState<QueueItem | null>(null);
  const [postStep, setPostStep] = useState(0);

  useEffect(() => {
    setBooks(getBooks());
    setQueue(loadQueue());
    const acc = loadAccounts();
    setAccounts(acc.length > 0 ? acc : PLATFORMS.map(p => ({ platform: p.id, handle: "", connected: false })));
  }, []);

  const book = books.find(b => b.id === selectedBook);
  const fmt = FORMATS.find(f => f.id === videoFormat) || FORMATS[0];
  const thm = THEMES.find(t => t.id === videoTheme) || THEMES[0];

  // ── Video ─────────────────────────────────────────────────────────────────
  const generateScript = async () => {
    if (!book) return;
    setGenerating(true); setScript(null); setVideoBlobUrl(null);
    try {
      const res = await fetch("/api/video-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: videoType, bookTitle: book.title, category: book.category, chapters: book.chapters?.slice(0, 2) }),
      });
      const data = await res.json();
      if (data._error) throw new Error(data._error);
      setScript(data);
      const cap: string = (data.caption as string) || ((data.variants as {caption:string}[])?.[0]?.caption) || "";
      setVideoCaption(cap);
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
        const texts = (script.onscreenText as string[]) || [];
        slides = texts.map((t, i) => ({ text: t, duration: 8, style: i === 0 ? "big" : "normal" }));
        if (script.hook) slides = [{ text: script.hook as string, duration: 3, style: "intro" }, ...slides];
      }
      if (!slides.length) slides = [{ text: book?.title || "", duration: 3, style: "title" }];
      slides.push({ text: book?.title || "", duration: 4, style: "title" });

      const total = slides.reduce((s, sl) => s + sl.duration, 0);
      let elapsed = 0;
      const t = setInterval(() => { elapsed += 0.5; setRenderProgress(Math.min(95, Math.round(elapsed / total * 100))); }, 500);
      const blob = await renderVideoToBlob(slides, fmt, thm, book?.coverDataUrl);
      clearInterval(t); setRenderProgress(100);
      setVideoBlobUrl(URL.createObjectURL(blob));
    } catch (e) { console.error(e); }
    setRendering(false);
  };

  const downloadVideo = () => {
    if (!videoBlobUrl) return;
    const a = document.createElement("a"); a.href = videoBlobUrl; a.download = `${book?.title || "video"}_${videoType}.webm`; a.click();
  };

  // ── Queue management ──────────────────────────────────────────────────────
  const addToQueue = () => {
    if (!postText.trim() || !selectedPlatforms.length) return;
    const item: QueueItem = {
      id: Date.now().toString(),
      bookId: selectedBook,
      bookTitle: book?.title || "",
      text: postText,
      platforms: selectedPlatforms,
      imageDataUrl: includeCover && book?.coverDataUrl ? book.coverDataUrl : undefined,
      videoBlobUrl: videoBlobUrl || undefined,
      status: "pending",
      scheduledAt: scheduleAt || undefined,
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...loadQueue()];
    saveQueue(next); setQueue(next);
    setPostText(""); setScheduleAt(""); setAddedToQueue(true);
    setTimeout(() => setAddedToQueue(false), 2500);
  };

  const removeFromQueue = (id: string) => {
    const next = queue.filter(q => q.id !== id);
    saveQueue(next); setQueue(next);
  };

  const markDone = (id: string) => {
    const next = queue.map(q => q.id === id ? { ...q, status: "done" as PostStatus, postedAt: new Date().toISOString() } : q);
    saveQueue(next); setQueue(next);
  };

  // ── Post now flow ─────────────────────────────────────────────────────────
  const startPosting = (item: QueueItem) => {
    setPostingItem(item); setPostStep(0);
  };

  const openPlatform = (item: QueueItem, platformId: Platform) => {
    const pl = PLATFORMS.find(p => p.id === platformId);
    if (!pl) return;
    navigator.clipboard.writeText(item.text).catch(() => {});
    const url = pl.intentUrl ? pl.intentUrl(item.text) : "https://" + platformId + ".com";
    window.open(url, "_blank", "noopener");
  };

  // ── Auto-generate caption ─────────────────────────────────────────────────
  const generateCaption = () => {
    if (!book) return;
    const templates = [
      `📚 "${book.title}" — ${book.category}\n\n🔥 Ce livre va changer ta vision sur tout.\n\n👇 Lien en bio\n\n#livre #lecture #ebook #booktok #auteur #développementpersonnel`,
      `✨ Nouveau livre disponible : "${book.title}"\n\n${book.chapters?.slice(0, 3).map(c => `✅ ${c.title}`).join("\n") || ""}\n\n💡 ${book.chapters?.length || 0} chapitres de contenu actionnable\n\n📩 Lien en bio\n\n#auteurindépendant #livrefrancais #ebook #coaching`,
      `🚀 "${book.title}" — Ce que j'ai mis des années à comprendre, dans un seul livre.\n\nSi tu veux ${book.category?.toLowerCase() || "progresser"}, ce livre est fait pour toi.\n\n💬 Commente "LIVRE" pour recevoir le lien\n\n#booktok #livre #lecture #auteur`,
    ];
    setPostText(templates[Math.floor(Math.random() * templates.length)]);
  };

  // ── Accounts management ───────────────────────────────────────────────────
  const saveAccount = (platform: Platform) => {
    const handle = editHandle[platform] || "";
    const next = accounts.map(a => a.platform === platform ? { ...a, handle, connected: !!handle, connectedAt: handle ? new Date().toISOString() : undefined } : a);
    saveAccounts(next); setAccounts(next);
    setEditHandle(prev => ({ ...prev, [platform]: undefined }));
  };

  const disconnectAccount = (platform: Platform) => {
    const next = accounts.map(a => a.platform === platform ? { ...a, handle: "", connected: false, connectedAt: undefined } : a);
    saveAccounts(next); setAccounts(next);
  };

  const connectedCount = accounts.filter(a => a.connected).length;
  const pendingCount = queue.filter(q => q.status === "pending").length;
  const filteredQueue = queue.filter(q => filter === "all" ? true : q.status === filter);

  return (
    <div className="p-4 md:p-8 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
            <Video size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Studio Social</h1>
        </div>
        <p className="text-white/50">Crée tes vidéos · Compose tes posts · Gère ta file de publication</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 mb-6 w-fit overflow-x-auto">
        {([
          { id: "video"    as Tab, icon: Film,     label: "Vidéos" },
          { id: "compose"  as Tab, icon: Send,     label: "Composer" },
          { id: "queue"    as Tab, icon: List,     label: `File (${pendingCount})` },
          { id: "accounts" as Tab, icon: AtSign,   label: `Comptes (${connectedCount}/${PLATFORMS.length})` },
          { id: "settings" as Tab, icon: Settings, label: "Guide" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${tab === id ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white" : "text-white/40 hover:text-white"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ══ VIDEO ════════════════════════════════════════════════════════════ */}
      {tab === "video" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config */}
          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <h2 className="text-white font-semibold text-sm">Livre</h2>
              <select value={selectedBook} onChange={e => { setSelectedBook(e.target.value); setScript(null); setVideoBlobUrl(null); }}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                <option value="">— Sélectionner —</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              {book && (
                <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl">
                  {book.coverDataUrl ? <img src={book.coverDataUrl} alt="" className="w-8 h-11 object-cover rounded" /> : <div className="w-8 h-11 bg-white/10 rounded flex items-center justify-center"><BookOpen size={12} className="text-white/30" /></div>}
                  <div className="min-w-0"><p className="text-white text-xs font-medium truncate">{book.title}</p><p className="text-white/40 text-xs">{book.category}</p></div>
                </div>
              )}
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
              <h2 className="text-white font-semibold text-sm mb-3">Type de vidéo</h2>
              {VIDEO_TYPES.map(vt => (
                <button key={vt.id} onClick={() => { setVideoType(vt.id); setScript(null); setVideoBlobUrl(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${videoType === vt.id ? "bg-white/8 border-violet-500/40" : "bg-white/[0.02] border-white/[0.05] hover:border-white/10"}`}>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${vt.color} flex items-center justify-center shrink-0`}><vt.icon size={14} className="text-white" /></div>
                  <div className="flex-1 min-w-0"><p className={`text-sm font-medium ${videoType === vt.id ? "text-white" : "text-white/60"}`}>{vt.label}</p><p className="text-white/30 text-xs">{vt.desc}</p></div>
                  <span className="text-white/30 text-xs shrink-0">{vt.duration}</span>
                </button>
              ))}
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <h2 className="text-white font-semibold text-sm">Format & Thème</h2>
              <div className="grid grid-cols-3 gap-1.5">
                {FORMATS.map(f => (
                  <button key={f.id} onClick={() => setVideoFormat(f.id)}
                    className={`px-2 py-1.5 rounded-lg border text-xs transition-all ${videoFormat === f.id ? "border-violet-500/40 bg-violet-500/10 text-white" : "border-white/[0.05] text-white/40 hover:border-white/10"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {THEMES.map(t => (
                  <button key={t.id} onClick={() => setVideoTheme(t.id)}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${videoTheme === t.id ? "border-violet-500/50" : "border-white/[0.05]"}`}>
                    <div className="w-full h-5 rounded" style={{ background: `linear-gradient(135deg, ${t.bg1}, ${t.bg2})`, border: `1.5px solid ${t.accent}50` }} />
                    <span className="text-xs text-white/40">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Script */}
          <div className="space-y-4">
            <button onClick={generateScript} disabled={generating || !book}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:opacity-40 text-white rounded-2xl font-semibold transition-all">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? "Génération du script..." : "Générer le script IA"}
            </button>

            {script && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm">Script IA</h3>
                  <button onClick={generateScript} disabled={generating} className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/40 rounded-lg text-xs transition-colors">
                    <RotateCcw size={11} /> Régénérer
                  </button>
                </div>

                {videoType === "citation" && Array.isArray(script.variants) && (
                  <div className="flex gap-1.5">
                    {(script.variants as unknown[]).map((_, i) => (
                      <button key={i} onClick={() => setActiveVariant(i)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${activeVariant === i ? "bg-amber-500/30 text-amber-300" : "bg-white/5 text-white/40"}`}>
                        Var. {i + 1}
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {(videoType === "teaser" || videoType === "promo") && Array.isArray(script.slides) && (script.slides as Slide[]).map((s, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-white/[0.03] rounded-xl">
                      <span className="text-violet-400/60 text-xs font-mono shrink-0 mt-0.5">{s.duration}s</span>
                      <div><p className="text-white text-sm">{s.text}</p>{s.subtext && <p className="text-white/40 text-xs">{s.subtext}</p>}</div>
                    </div>
                  ))}
                  {videoType === "booktrailer" && Array.isArray(script.scenes) && (script.scenes as {id:number;text:string;narration?:string;duration:number}[]).map(s => (
                    <div key={s.id} className="p-2.5 bg-white/[0.03] rounded-xl">
                      <p className="text-white/40 text-xs mb-1">Scène {s.id} · {s.duration}s</p>
                      <p className="text-white text-sm">{s.text}</p>
                      {s.narration && <p className="text-white/40 text-xs italic mt-1">{s.narration}</p>}
                    </div>
                  ))}
                  {videoType === "citation" && Array.isArray(script.variants) && (script.variants as {context:string;quote:string;author:string}[])[activeVariant] && (
                    <div className="p-3 bg-amber-500/8 border border-amber-500/15 rounded-xl">
                      <p className="text-amber-300/70 text-xs">{(script.variants as {context:string}[])[activeVariant].context}</p>
                      <p className="text-white font-medium text-sm mt-1">"{(script.variants as {quote:string}[])[activeVariant].quote}"</p>
                    </div>
                  )}
                  {videoType === "shorts" && (
                    <>
                      {script.hook && <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl"><p className="text-red-300 text-xs font-semibold mb-1">HOOK (0-3s)</p><p className="text-white text-sm">{script.hook as string}</p></div>}
                      {Array.isArray(script.segments) && (script.segments as {label:string;text:string}[]).map((seg, i) => (
                        <div key={i} className="p-2.5 bg-white/[0.03] rounded-xl"><p className="text-white/40 text-xs mb-1">{seg.label}</p><p className="text-white/70 text-sm">{seg.text}</p></div>
                      ))}
                    </>
                  )}
                </div>

                {videoCaption && (
                  <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-white/40 text-xs">Légende</p>
                      <div className="flex gap-1.5">
                        <CopyBtn text={videoCaption} />
                        <button onClick={() => { setPostText(videoCaption); setTab("compose"); }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-violet-500/20 text-violet-300 rounded-lg text-xs hover:bg-violet-500/30 transition-colors">
                          <Send size={10} /> Utiliser
                        </button>
                      </div>
                    </div>
                    <textarea value={videoCaption} onChange={e => setVideoCaption(e.target.value)} rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white/60 text-xs focus:outline-none resize-none" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Render */}
          <div className="space-y-4">
            {script ? (
              <>
                <button onClick={renderVideo} disabled={rendering}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-40 text-white rounded-2xl font-semibold transition-all">
                  {rendering ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
                  {rendering ? `Rendu ${renderProgress}%…` : "Générer la vidéo"}
                </button>
                {rendering && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                    <div className="flex justify-between mb-2"><p className="text-white/60 text-sm">Rendu…</p><p className="text-white/40 text-sm">{renderProgress}%</p></div>
                    <div className="w-full bg-white/10 rounded-full h-2"><div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all" style={{ width: `${renderProgress}%` }} /></div>
                  </div>
                )}
                {videoBlobUrl && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                    <p className="text-emerald-400 text-sm font-semibold flex items-center gap-1.5"><CheckCircle size={14} /> Vidéo prête !</p>
                    <video src={videoBlobUrl} controls className="w-full rounded-xl bg-black" style={{ maxHeight: videoFormat === "portrait" ? "400px" : "auto" }} />
                    <div className="flex gap-2">
                      <button onClick={downloadVideo} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-sm font-medium transition-colors">
                        <Download size={14} /> Télécharger
                      </button>
                      <button onClick={() => { setPostText(videoCaption); setTab("compose"); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-500/20 border border-violet-500/30 hover:bg-violet-500/30 text-violet-300 rounded-xl text-sm font-medium transition-colors">
                        <Send size={14} /> Poster
                      </button>
                    </div>
                    <p className="text-white/25 text-xs text-center">Format .webm · Compatible TikTok, Reels, Shorts</p>
                  </div>
                )}
                {!videoBlobUrl && !rendering && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 flex flex-col items-center gap-3 min-h-40">
                    <Film size={28} className="text-white/15" />
                    <p className="text-white/30 text-sm text-center">Script prêt — clique sur "Générer la vidéo"</p>
                    <p className="text-white/20 text-xs">{fmt.label} · {thm.label}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 flex flex-col items-center gap-4 min-h-60">
                <Clapperboard size={32} className="text-white/15" />
                <p className="text-white/30 text-sm text-center">Sélectionne un livre, choisis un type de vidéo, puis génère le script IA</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ COMPOSE ══════════════════════════════════════════════════════════ */}
      {tab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <label className="text-white/50 text-xs">Livre</label>
              <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                <option value="">— Sélectionner —</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title} ({b.category})</option>)}
              </select>
              {book && (
                <div className="flex items-center gap-3">
                  {book.coverDataUrl ? <img src={book.coverDataUrl} alt="" className="w-10 h-14 object-cover rounded-lg" /> : <div className="w-10 h-14 bg-white/10 rounded-lg" />}
                  <div className="flex-1"><p className="text-white text-sm font-medium">{book.title}</p><p className="text-white/40 text-xs">{book.chapters?.length || 0} chapitres</p></div>
                  <button onClick={generateCaption} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 text-purple-300 rounded-xl text-xs transition-colors">
                    <Zap size={11} /> Générer légende
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-white/50 text-xs">Texte du post</label>
                <span className="text-white/25 text-xs">{postText.length}</span>
              </div>
              <textarea value={postText} onChange={e => setPostText(e.target.value)}
                placeholder="Écris ou génère ta légende ici..."
                rows={8} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 resize-none" />
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
              <label className="text-white/50 text-xs">Programmer (optionnel)</label>
              <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
              <p className="text-white/25 text-xs">Laisse vide pour ajouter sans date précise</p>
            </div>

            <button onClick={addToQueue} disabled={!postText.trim() || !selectedPlatforms.length}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all ${addedToQueue ? "bg-emerald-500 text-white" : "bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:opacity-40 text-white"}`}>
              {addedToQueue ? <><Check size={16} /> Ajouté à la file !</> : <><Plus size={16} /> Ajouter à la file</>}
            </button>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
              <label className="text-white/50 text-xs mb-1 block">Plateformes cibles</label>
              {PLATFORMS.map(p => (
                <button key={p.id}
                  onClick={() => setSelectedPlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
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
          </div>
        </div>
      )}

      {/* ══ QUEUE ════════════════════════════════════════════════════════════ */}
      {tab === "queue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
              {(["all", "pending", "done"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-violet-500 text-white" : "text-white/40 hover:text-white"}`}>
                  {f === "all" ? "Tous" : f === "pending" ? `En attente (${pendingCount})` : "Publiés"}
                </button>
              ))}
            </div>
            <button onClick={() => setTab("compose")} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-xl text-xs hover:bg-violet-500/30 transition-colors">
              <Plus size={12} /> Nouveau post
            </button>
          </div>

          {filteredQueue.length === 0 ? (
            <div className="text-center py-16">
              <List size={32} className="text-white/15 mx-auto mb-3" />
              <p className="text-white/30">File vide — compose un post pour commencer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQueue.map(item => (
                <div key={item.id} className={`bg-white/[0.02] border rounded-2xl p-4 ${item.status === "done" ? "border-emerald-500/20 opacity-70" : "border-white/[0.06]"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${item.status === "done" ? "bg-emerald-400" : "bg-violet-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-white text-sm font-medium truncate">{item.bookTitle || "Post"}</p>
                        {item.platforms.map(p => {
                          const pl = PLATFORMS.find(x => x.id === p);
                          return <span key={p} className={`text-xs px-2 py-0.5 rounded-full border ${pl?.bg || "bg-white/10 border-white/20"} ${pl?.color || "text-white/50"}`}>{pl?.label || p}</span>;
                        })}
                        {item.scheduledAt && <span className="text-xs text-amber-400/70 flex items-center gap-1"><Clock size={10} /> {new Date(item.scheduledAt).toLocaleString("fr-FR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                      </div>
                      <p className="text-white/50 text-xs line-clamp-2">{item.text}</p>
                      {item.postedAt && <p className="text-white/20 text-xs mt-1">Marqué publié le {new Date(item.postedAt).toLocaleString("fr-FR")}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {item.status === "pending" && (
                        <>
                          <button onClick={() => startPosting(item)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs transition-colors">
                            <Play size={11} /> Publier
                          </button>
                          <button onClick={() => removeFromQueue(item.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors">
                            <Trash2 size={12} className="text-white/25 hover:text-red-400" />
                          </button>
                        </>
                      )}
                      {item.status === "done" && <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle size={12} /> Publié</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ ACCOUNTS ═════════════════════════════════════════════════════════ */}
      {tab === "accounts" && (
        <div className="max-w-2xl space-y-3">
          <p className="text-white/50 text-sm mb-4">Enregistre tes identifiants pour les retrouver rapidement lors de la publication.</p>
          {PLATFORMS.map(p => {
            const acc = accounts.find(a => a.platform === p.id);
            const isExpanded = expandedPlatform === p.id;
            return (
              <div key={p.id} className={`bg-white/[0.03] border rounded-2xl overflow-hidden transition-all ${acc?.connected ? "border-" + p.color.split("-")[1] + "-500/30" : "border-white/[0.06]"}`}>
                <button onClick={() => setExpandedPlatform(isExpanded ? null : p.id)}
                  className="w-full flex items-center gap-3 px-4 py-4">
                  <div className={`w-8 h-8 rounded-lg ${p.bg} flex items-center justify-center`}>
                    <AtSign size={14} className={p.color} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm font-medium">{p.label}</p>
                    {acc?.connected ? (
                      <p className={`text-xs ${p.color}`}>@{acc.handle} · Connecté</p>
                    ) : (
                      <p className="text-white/30 text-xs">Non configuré</p>
                    )}
                  </div>
                  {acc?.connected && <CheckCircle size={16} className="text-emerald-400 shrink-0" />}
                  {isExpanded ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3">
                    <div className="flex gap-2">
                      <input
                        value={editHandle[p.id] ?? (acc?.handle || "")}
                        onChange={e => setEditHandle(prev => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder={`Ton identifiant ${p.label} (ex: @moncompte)`}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50" />
                      <button onClick={() => saveAccount(p.id)}
                        className={`px-3 py-2 ${p.bg} ${p.color} rounded-xl text-sm font-medium border transition-colors hover:opacity-80`}>
                        Sauvegarder
                      </button>
                      {acc?.connected && (
                        <button onClick={() => disconnectAccount(p.id)} className="p-2 hover:bg-red-500/20 rounded-xl transition-colors">
                          <X size={14} className="text-white/30 hover:text-red-400" />
                        </button>
                      )}
                    </div>

                    <div className="bg-white/[0.02] rounded-xl p-3">
                      <p className="text-white/40 text-xs font-semibold mb-2 uppercase tracking-wide">Comment publier sur {p.label}</p>
                      <ol className="space-y-1">
                        {p.guide.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-white/50 text-xs">
                            <span className={`text-xs font-bold shrink-0 ${p.color}`}>{i + 1}.</span> {step}
                          </li>
                        ))}
                      </ol>
                      <button onClick={() => window.open(p.intentUrl?.("") || "https://" + p.id + ".com", "_blank")}
                        className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border ${p.bg} ${p.color} text-xs font-medium transition-colors hover:opacity-80`}>
                        <ExternalLink size={11} /> Ouvrir {p.label}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ GUIDE ════════════════════════════════════════════════════════════ */}
      {tab === "settings" && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-violet-500/[0.07] border border-violet-500/20 rounded-2xl p-5">
            <p className="text-violet-300 font-semibold mb-3">🎬 Workflow recommandé</p>
            <ol className="text-white/60 text-sm space-y-2.5">
              <li className="flex gap-3"><span className="text-violet-400 font-bold">1.</span><span>Dans <strong className="text-white/80">Vidéos</strong> — génère le script IA pour ton livre puis clique sur "Générer la vidéo"</span></li>
              <li className="flex gap-3"><span className="text-violet-400 font-bold">2.</span><span><strong className="text-white/80">Télécharge</strong> ta vidéo .webm (compatible TikTok, Reels, YouTube Shorts)</span></li>
              <li className="flex gap-3"><span className="text-violet-400 font-bold">3.</span><span>Dans <strong className="text-white/80">Composer</strong> — génère ta légende IA et sélectionne tes plateformes</span></li>
              <li className="flex gap-3"><span className="text-violet-400 font-bold">4.</span><span>Clique <strong className="text-white/80">Ajouter à la file</strong> pour sauvegarder ton post</span></li>
              <li className="flex gap-3"><span className="text-violet-400 font-bold">5.</span><span>Dans <strong className="text-white/80">File</strong> — clique <strong className="text-white/80">Publier</strong> pour ouvrir chaque plateforme avec la légende déjà copiée</span></li>
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "TikTok", color: "text-red-400", steps: ["Ouvre TikTok Creator Center", "Clique sur + Upload", "Upload ta vidéo .webm téléchargée", "La légende est copiée → colle-la", "Ajoute tes hashtags et publie"] },
              { title: "Instagram Reels", color: "text-pink-400", steps: ["Ouvre Instagram sur ton tel", "Tape le + → Reel", "Sélectionne ta vidéo .webm", "Colle ta légende copiée", "Ajoute la musique et publie"] },
              { title: "YouTube Shorts", color: "text-red-500", steps: ["Ouvre YouTube Studio", "Créer → Mettre en ligne", "Upload ta vidéo .webm", "Remplis titre + description", "Sélectionne Shorts et publie"] },
              { title: "X / Twitter", color: "text-sky-400", steps: ["Clique sur le bouton Publier", "Colle ta légende (max 280 car.)", "Attache ta vidéo", "Ajoute les hashtags et publie"] },
            ].map(pl => (
              <div key={pl.title} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                <p className={`font-semibold text-sm mb-3 ${pl.color}`}>{pl.title}</p>
                <ol className="space-y-1.5">
                  {pl.steps.map((s, i) => (
                    <li key={i} className="flex gap-2 text-white/50 text-xs"><span className={`font-bold shrink-0 ${pl.color}`}>{i + 1}.</span>{s}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          <div className="bg-amber-500/[0.07] border border-amber-500/20 rounded-2xl p-5">
            <p className="text-amber-300 font-semibold mb-2">💡 Pourquoi pas de publication automatique directe ?</p>
            <p className="text-white/50 text-sm">TikTok et Instagram n&apos;autorisent la publication automatique que pour les apps officiellement certifiées (processus de plusieurs mois). Pour les autres plateformes comme X, Facebook et LinkedIn, ce Studio génère le lien d&apos;intent qui pré-remplit le contenu pour une publication en 2 clics.</p>
          </div>
        </div>
      )}

      {/* ══ POST NOW MODAL ═══════════════════════════════════════════════════ */}
      {postingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d0d14] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Publier sur {postingItem.platforms.length} plateforme(s)</h3>
              <button onClick={() => { setPostingItem(null); setPostStep(0); }} className="p-1.5 hover:bg-white/10 rounded-lg"><X size={16} className="text-white/50" /></button>
            </div>

            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/60 text-xs line-clamp-3">{postingItem.text}</p>
            </div>

            <div className="space-y-2">
              <p className="text-white/40 text-xs">Légende copiée dans le presse-papiers automatiquement ↓</p>
              {postingItem.platforms.map((pid, i) => {
                const pl = PLATFORMS.find(p => p.id === pid)!;
                const isDone = i < postStep;
                const isCurrent = i === postStep;
                return (
                  <div key={pid} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isDone ? "border-emerald-500/30 bg-emerald-500/10" : isCurrent ? pl.bg : "border-white/[0.06] bg-white/[0.02]"}`}>
                    {isDone ? <CheckCircle size={16} className="text-emerald-400 shrink-0" /> : <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${isCurrent ? "border-white" : "border-white/20"}`} />}
                    <span className={`flex-1 text-sm font-medium ${isDone ? "text-white/50 line-through" : isCurrent ? pl.color : "text-white/30"}`}>{pl.label}</span>
                    {isCurrent && (
                      <button onClick={() => { openPlatform(postingItem, pid); setPostStep(p => p + 1); if (i === postingItem.platforms.length - 1) { markDone(postingItem.id); setTimeout(() => { setPostingItem(null); setPostStep(0); }, 1000); } }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${pl.bg} ${pl.color} hover:opacity-80 transition-opacity`}>
                        <ExternalLink size={11} /> Ouvrir & coller
                      </button>
                    )}
                    {isDone && <CheckCircle size={14} className="text-emerald-400" />}
                  </div>
                );
              })}
            </div>

            {postStep >= postingItem.platforms.length && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <p className="text-emerald-300 text-sm font-semibold">✓ Toutes les plateformes traitées !</p>
              </div>
            )}

            <div className="flex gap-2">
              <CopyBtn text={postingItem.text} label="Copier la légende" />
              {postStep < postingItem.platforms.length && (
                <button onClick={() => { markDone(postingItem.id); setPostingItem(null); setPostStep(0); }}
                  className="ml-auto px-3 py-1.5 text-white/30 hover:text-white/60 text-xs transition-colors">
                  Marquer comme publié
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
