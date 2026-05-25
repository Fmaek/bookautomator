"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send, Camera, Share2, Clock, Trash2, Play, CheckCircle,
  XCircle, Loader2, Settings, RefreshCw, BookOpen, Zap,
  History, List, Wifi, WifiOff, Copy, Image, Video,
  Film, Quote, Megaphone, Clapperboard, Download, Eye,
  Sparkles, ChevronRight, RotateCcw, AlignLeft, Mic,
  TrendingUp, Check, Pause, Square
} from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

const DEFAULT_URL = "http://localhost:8000";

const PLATFORMS = [
  { id: "facebook",  label: "Facebook",  color: "text-blue-400",  bg: "bg-blue-500/20 border-blue-500/30" },
  { id: "instagram", label: "Instagram", color: "text-pink-400",  bg: "bg-pink-500/20 border-pink-500/30" },
  { id: "tiktok",    label: "TikTok",    color: "text-red-400",   bg: "bg-red-500/20 border-red-500/30" },
  { id: "youtube",   label: "YouTube",   color: "text-red-500",   bg: "bg-red-600/20 border-red-600/30" },
  { id: "twitter",   label: "Twitter/X", color: "text-sky-400",   bg: "bg-sky-500/20 border-sky-500/30" },
];

const VIDEO_TYPES = [
  { id: "teaser",      label: "Teaser",        icon: Clapperboard, color: "from-violet-500 to-purple-600", duration: "15s", desc: "Accroche rapide, impact maximal" },
  { id: "citation",    label: "Citation",      icon: Quote,        color: "from-amber-500 to-orange-600",  duration: "12s", desc: "Phrase forte du livre animée" },
  { id: "promo",       label: "Promo Reel",    icon: Megaphone,    color: "from-pink-500 to-rose-600",     duration: "30s", desc: "Bénéfices + appel à l'action" },
  { id: "booktrailer", label: "Book Trailer",  icon: Film,         color: "from-cyan-500 to-blue-600",     duration: "45s", desc: "Style cinéma émotionnel" },
  { id: "shorts",      label: "Shorts/Reel",   icon: TrendingUp,   color: "from-red-500 to-pink-600",      duration: "60s", desc: "Script TikTok/Shorts parlé" },
];

const FORMATS = [
  { id: "portrait",  label: "Portrait 9:16", w: 1080, h: 1920, desc: "TikTok · Reels · Shorts" },
  { id: "square",    label: "Carré 1:1",     w: 1080, h: 1080, desc: "Feed Instagram · Facebook" },
  { id: "landscape", label: "Paysage 16:9",  w: 1920, h: 1080, desc: "YouTube · LinkedIn" },
];

const THEMES = [
  { id: "dark",    label: "Dark Premium",  bg1: "#0d0d1a", bg2: "#1a0a2e", accent: "#a855f7" },
  { id: "gold",    label: "Gold Power",    bg1: "#1a1200", bg2: "#2d1e00", accent: "#f59e0b" },
  { id: "ocean",   label: "Ocean Deep",    bg1: "#00111a", bg2: "#001a2e", accent: "#06b6d4" },
  { id: "fire",    label: "Fire Energy",   bg1: "#1a0500", bg2: "#2d0a00", accent: "#ef4444" },
  { id: "forest",  label: "Forest Zen",    bg1: "#001a0a", bg2: "#002d12", accent: "#10b981" },
  { id: "rose",    label: "Rose Passion",  bg1: "#1a0010", bg2: "#2d0020", accent: "#ec4899" },
];

type QueueItem = {
  id: string; title: string; text: string; platforms: string[];
  status: "pending" | "posting" | "done" | "error";
  created_at: string; posted_at: string | null; results: Record<string, string>;
};
type Tab = "video" | "compose" | "queue" | "history" | "settings";

interface VideoScript {
  // teaser / promo
  hook?: string; headline?: string;
  slides?: { text: string; subtext?: string; duration: number; style: string }[];
  // booktrailer
  title?: string;
  scenes?: { id: number; text: string; narration?: string; duration: number; style: string }[];
  voiceoverScript?: string; music_suggestion?: string;
  // citation
  variants?: { quote: string; author: string; context: string; caption: string }[];
  // shorts
  script?: string;
  segments?: { label: string; text: string }[];
  onscreenText?: string[];
  // shared
  caption?: string; hashtags?: string[];
}

// ── Canvas video renderer ────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
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

async function renderVideoToBlob(
  slides: Slide[],
  format: typeof FORMATS[0],
  theme: typeof THEMES[0],
  coverDataUrl?: string,
  fps = 30
): Promise<Blob> {
  const W = Math.min(format.w, 540);
  const H = Math.min(format.h, format.id === "portrait" ? 960 : format.id === "square" ? 540 : 304);
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : MediaRecorder.isTypeSupported("video/webm")
    ? "video/webm"
    : "video/mp4";
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
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

  for (const slide of slides) {
    const totalFrames = Math.round(slide.duration * fps);
    for (let f = 0; f < totalFrames; f++) {
      const progress = f / totalFrames;
      const tIn = easeOut(Math.min(1, progress * 4));
      const tOut = progress > 0.8 ? easeOut((progress - 0.8) * 5) : 0;
      const alpha = tOut > 0 ? 1 - tOut * 0.6 : tIn;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, theme.bg1);
      grad.addColorStop(1, theme.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Particle dots
      ctx.fillStyle = theme.accent + "18";
      for (let i = 0; i < 6; i++) {
        const x = ((i * 137 + f * 0.3) % 1) * W;
        const y = ((i * 97 + f * 0.2) % 1) * H;
        ctx.beginPath();
        ctx.arc(x, y, 2 + i % 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Accent line top
      ctx.fillStyle = theme.accent;
      ctx.fillRect(W * 0.1 * tIn, 0, W * 0.8 * tIn, 3);

      const slideY = lerp(H * 0.05, 0, tIn);

      if (slide.style === "title" && coverImg) {
        // Book cover centered
        const cW = W * 0.45, cH = cW * 1.5;
        const cX = (W - cW) / 2, cY = H * 0.12 + slideY;
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = 24 * tIn;
        ctx.drawImage(coverImg, cX, cY, cW, cH);
        ctx.shadowBlur = 0;
      }

      // Main text
      ctx.globalAlpha = alpha;
      const isBig = slide.style === "big" || slide.style === "title" || slide.style === "climax";
      const isHook = slide.style === "intro" || slide.style === "hook";
      const isCta = slide.style === "cta";

      if (isCta) {
        // CTA pill
        const pw = W * 0.75, ph = 52;
        const px = (W - pw) / 2, py = H * 0.52 + slideY;
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, 26);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.round(W * 0.042)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(slide.text, W / 2, py + ph / 2 + 7);
      } else {
        const fontSize = isBig ? W * 0.072 : isHook ? W * 0.065 : W * 0.054;
        ctx.font = `bold ${Math.round(fontSize)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = isBig ? theme.accent : "#ffffff";
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = isBig ? 16 : 0;

        const lines = wrapText(ctx, slide.text, W * 0.82);
        const lineH = fontSize * 1.32;
        const totalH = lines.length * lineH;
        const startY = H / 2 - totalH / 2 + slideY;
        lines.forEach((line, i) => ctx.fillText(line, W / 2, startY + i * lineH));
        ctx.shadowBlur = 0;

        if (slide.subtext) {
          ctx.font = `${Math.round(W * 0.034)}px system-ui, sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          const subLines = wrapText(ctx, slide.subtext, W * 0.78);
          const subStartY = startY + totalH + 18;
          subLines.forEach((l, i) => ctx.fillText(l, W / 2, subStartY + i * (W * 0.04)));
        }
      }

      ctx.globalAlpha = 1;
      // Bottom accent
      ctx.fillStyle = theme.accent + "60";
      ctx.fillRect(W * 0.1, H - 3, W * 0.8 * tIn, 3);

      await new Promise(r => setTimeout(r, 1000 / fps));
    }
  }

  await new Promise<void>(resolve => {
    recorder.onstop = () => resolve();
    recorder.stop();
  });

  return new Blob(chunks, { type: mimeType });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AutoPostPage() {
  const [tab, setTab] = useState<Tab>("video");
  const [apiUrl, setApiUrl] = useState(DEFAULT_URL);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  // Books
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState("");

  // Video Studio
  const [videoType, setVideoType] = useState<string>("teaser");
  const [videoFormat, setVideoFormat] = useState<string>("portrait");
  const [videoTheme, setVideoTheme] = useState<string>("dark");
  const [generating, setGenerating] = useState(false);
  const [script, setScript] = useState<VideoScript | null>(null);
  const [activeVariant, setActiveVariant] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [previewCaption, setPreviewCaption] = useState("");
  const canvasPreviewRef = useRef<HTMLCanvasElement>(null);

  // Compose
  const [postText, setPostText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "tiktok"]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const [includeCover, setIncludeCover] = useState(true);

  // Queue
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [status, setStatus] = useState<Record<string, unknown>>({});
  const [loadingQ, setLoadingQ] = useState(false);
  const [postingNow, setPostingNow] = useState(false);

  // Settings
  const [savedUrl, setSavedUrl] = useState(DEFAULT_URL);
  const [schedTimes, setSchedTimes] = useState("09:00, 12:00, 18:00, 21:00");

  useEffect(() => {
    const stored = localStorage.getItem("ba_autopost_url") || DEFAULT_URL;
    setApiUrl(stored); setSavedUrl(stored);
    setBooks(getBooks());
  }, []);

  const book = books.find(b => b.id === selectedBook);

  const call = useCallback(async (path: string, opts?: RequestInit) => {
    const url = (localStorage.getItem("ba_autopost_url") || DEFAULT_URL) + path;
    const res = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(opts?.headers || {}) } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, []);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    try { await call("/api/book/status"); setConnected(true); }
    catch { setConnected(false); }
    setChecking(false);
  }, [call]);

  useEffect(() => { checkConnection(); }, [checkConnection]);

  const loadQueue = useCallback(async () => {
    setLoadingQ(true);
    try {
      const [q, h, s] = await Promise.all([
        call("/api/book/queue?status=all"),
        call("/api/book/history"),
        call("/api/book/status"),
      ]);
      setQueue(q); setHistory(h); setStatus(s);
    } catch { /* ignore */ }
    setLoadingQ(false);
  }, [call]);

  useEffect(() => { if (tab === "queue" || tab === "history") loadQueue(); }, [tab, loadQueue]);
  useEffect(() => {
    if (tab !== "queue") return;
    const t = setInterval(loadQueue, 8000);
    return () => clearInterval(t);
  }, [tab, loadQueue]);

  // ── Generate video script ────────────────────────────────────────────────
  const generateScript = async () => {
    if (!book) return;
    setGenerating(true);
    setScript(null);
    setVideoBlobUrl(null);
    setPreviewCaption("");
    try {
      const res = await fetch("/api/video-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: videoType,
          bookTitle: book.title,
          category: book.category,
          description: book.chapters?.[0]?.content?.substring(0, 300) || "",
          chapters: book.chapters?.slice(0, 2),
        }),
      });
      const data = await res.json();
      if (data._error) throw new Error(data._error);
      setScript(data);
      // pre-fill caption
      const cap = data.caption || (data.variants?.[0]?.caption) || "";
      setPreviewCaption(cap);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  // ── Render video ─────────────────────────────────────────────────────────
  const renderVideo = async () => {
    if (!script) return;
    setRendering(true);
    setRenderProgress(0);
    setVideoBlobUrl(null);
    try {
      const fmt = FORMATS.find(f => f.id === videoFormat) || FORMATS[0];
      const thm = THEMES.find(t => t.id === videoTheme) || THEMES[0];

      let slides: Slide[] = [];
      if (videoType === "teaser" || videoType === "promo") {
        slides = (script.slides || []) as Slide[];
        if (videoType === "teaser" && script.hook) {
          slides = [{ text: script.hook, duration: 2.5, style: "big" }, ...slides];
        }
      } else if (videoType === "booktrailer") {
        slides = (script.scenes || []).map(s => ({ text: s.text, subtext: s.narration, duration: s.duration, style: s.style }));
      } else if (videoType === "citation") {
        const v = script.variants?.[activeVariant];
        if (v) slides = [
          { text: v.context, duration: 3, style: "normal" },
          { text: `"${v.quote}"`, duration: 6, style: "big" },
          { text: `— ${v.author}`, duration: 3, style: "normal" },
        ];
      } else if (videoType === "shorts") {
        slides = (script.onscreenText || []).map((t, i) => ({ text: t, duration: 8 + i, style: i === 0 ? "big" : "normal" }));
        if (script.hook) slides = [{ text: script.hook, duration: 3, style: "intro" }, ...slides];
      }

      if (slides.length === 0) {
        slides = [{ text: book?.title || "Mon Livre", duration: 3, style: "title" }];
      }

      // Add title card at end
      slides.push({ text: book?.title || "", duration: 4, style: "title" });

      const total = slides.reduce((s, sl) => s + sl.duration, 0);
      let elapsed = 0;
      const progressTracker = setInterval(() => {
        elapsed += 0.5;
        setRenderProgress(Math.min(95, Math.round((elapsed / total) * 100)));
      }, 500);

      const blob = await renderVideoToBlob(slides, fmt, thm, book?.coverDataUrl);
      clearInterval(progressTracker);
      setRenderProgress(100);
      const url = URL.createObjectURL(blob);
      setVideoBlobUrl(url);
    } catch (e) {
      console.error(e);
    }
    setRendering(false);
  };

  const downloadVideo = () => {
    if (!videoBlobUrl) return;
    const a = document.createElement("a");
    a.href = videoBlobUrl;
    a.download = `${book?.title || "video"}_${videoType}.webm`;
    a.click();
  };

  const useCaption = () => {
    setPostText(previewCaption);
    setTab("compose");
  };

  // ── Compose helpers ──────────────────────────────────────────────────────
  const generateCaption = () => {
    if (!book) return;
    const templates = [
      `📚 Découvrez "${book.title}" — ${book.category}\n\n🔥 Un livre qui va changer ta vision sur tout.\n\n👇 Lien en bio pour le commander\n\n#livre #livres #lecture #auteur #ebook #booktok`,
      `✨ "${book.title}" est enfin disponible !\n\nSi tu veux progresser en ${book.category?.toLowerCase()}, ce livre est fait pour toi.\n\n💡 ${book.chapters?.length || 0} chapitres · Des résultats concrets\n\n📩 Lien en bio\n\n#auteurindépendant #livresfrancais #ebook`,
      `🚀 Nouveau livre — "${book.title}"\n\nJe vais te révéler ce que j'ai mis des années à comprendre.\n\n${book.chapters?.slice(0, 3).map(c => `✅ ${c.title}`).join("\n") || ""}\n\nComment l'avoir ? Lien en bio !\n\n#livre #motivation #développementpersonnel #booktok`,
    ];
    setPostText(templates[Math.floor(Math.random() * templates.length)]);
  };

  const handleSend = async () => {
    if (!postText.trim() || selectedPlatforms.length === 0) return;
    setSending(true); setSendResult("");
    try {
      const body: Record<string, unknown> = {
        title: book?.title || "Promotion livre",
        text: postText, platforms: selectedPlatforms,
      };
      if (includeCover && book?.coverDataUrl) {
        body.image_base64 = book.coverDataUrl.split(",")[1] || null;
      }
      const result = await call("/api/book/queue", { method: "POST", body: JSON.stringify(body) });
      setSendResult(`✓ Ajouté à la file (id: ${result.id}) · ${result.queue_count} en attente`);
      setPostText("");
    } catch (e) {
      setSendResult(`Erreur: ${e instanceof Error ? e.message : "connexion impossible"}`);
    }
    setSending(false);
  };

  const handlePostNow = async () => {
    setPostingNow(true);
    try { await call("/api/book/post-next", { method: "POST" }); setTimeout(loadQueue, 3000); }
    catch (e) { alert(`Erreur: ${e instanceof Error ? e.message : "connexion impossible"}`); }
    setPostingNow(false);
  };

  const handleDelete = async (id: string) => {
    try { await call(`/api/book/queue/${id}`, { method: "DELETE" }); loadQueue(); }
    catch { /* ignore */ }
  };

  const saveSettings = async () => {
    localStorage.setItem("ba_autopost_url", apiUrl);
    setSavedUrl(apiUrl);
    try {
      const times = schedTimes.split(",").map(t => t.trim()).filter(Boolean);
      await call("/api/book/config", { method: "POST", body: JSON.stringify({ schedule_times: times }) });
    } catch { /* ignore */ }
    await checkConnection();
  };

  const statusIcon = (s: string) => {
    if (s === "done")    return <CheckCircle size={13} className="text-emerald-400" />;
    if (s === "error")   return <XCircle size={13} className="text-red-400" />;
    if (s === "posting") return <Loader2 size={13} className="text-yellow-400 animate-spin" />;
    return <Clock size={13} className="text-white/30" />;
  };

  const currentFmt = FORMATS.find(f => f.id === videoFormat) || FORMATS[0];
  const currentThm = THEMES.find(t => t.id === videoTheme) || THEMES[0];

  return (
    <div className="p-4 md:p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
              <Video size={20} className="text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Studio Social</h1>
          </div>
          <p className="text-white/50">Crée des vidéos promotionnelles · Compose et publie tes posts</p>
        </div>
        <div className="flex items-center gap-2">
          {connected === null || checking ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl text-white/40 text-sm">
              <Loader2 size={13} className="animate-spin" /> Vérification...
            </div>
          ) : connected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
              <Wifi size={13} /> Connecté
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white/40 text-sm">
              <WifiOff size={13} /> Hors ligne
            </div>
          )}
          <button onClick={checkConnection} disabled={checking}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
            <RefreshCw size={14} className={`text-white/40 ${checking ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 mb-6 w-fit overflow-x-auto">
        {[
          { id: "video"    as Tab, icon: Film,    label: "Vidéos" },
          { id: "compose"  as Tab, icon: Send,    label: "Composer" },
          { id: "queue"    as Tab, icon: List,    label: `File (${typeof status.queue_count === "number" ? status.queue_count : 0})` },
          { id: "history"  as Tab, icon: History, label: "Historique" },
          { id: "settings" as Tab, icon: Settings,label: "Réglages" },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${tab === id ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white" : "text-white/40 hover:text-white"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ══ VIDEO STUDIO ══════════════════════════════════════════════════════ */}
      {tab === "video" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — config */}
          <div className="space-y-4">
            {/* Book */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <h2 className="text-white font-semibold text-sm">Livre</h2>
              <select value={selectedBook} onChange={e => { setSelectedBook(e.target.value); setScript(null); setVideoBlobUrl(null); }}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                <option value="">— Sélectionne un livre —</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              {book && (
                <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl">
                  {book.coverDataUrl
                    ? <img src={book.coverDataUrl} alt="" className="w-8 h-11 object-cover rounded" />
                    : <div className="w-8 h-11 bg-white/10 rounded flex items-center justify-center"><BookOpen size={12} className="text-white/30" /></div>
                  }
                  <div className="min-w-0">
                    <p className="text-white text-xs font-medium truncate">{book.title}</p>
                    <p className="text-white/40 text-xs">{book.category}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Video type */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <h2 className="text-white font-semibold text-sm">Type de vidéo</h2>
              <div className="space-y-2">
                {VIDEO_TYPES.map(vt => (
                  <button key={vt.id} onClick={() => { setVideoType(vt.id); setScript(null); setVideoBlobUrl(null); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${videoType === vt.id ? "bg-white/8 border-violet-500/40" : "bg-white/[0.02] border-white/[0.05] hover:border-white/10"}`}>
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${vt.color} flex items-center justify-center shrink-0`}>
                      <vt.icon size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${videoType === vt.id ? "text-white" : "text-white/60"}`}>{vt.label}</p>
                      <p className="text-white/30 text-xs">{vt.desc}</p>
                    </div>
                    <span className="text-white/30 text-xs shrink-0">{vt.duration}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <h2 className="text-white font-semibold text-sm">Format</h2>
              <div className="space-y-2">
                {FORMATS.map(f => (
                  <button key={f.id} onClick={() => setVideoFormat(f.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${videoFormat === f.id ? "border-violet-500/40 bg-violet-500/10 text-white" : "border-white/[0.05] text-white/50 hover:border-white/10"}`}>
                    <span>{f.label}</span>
                    <span className="text-white/30 text-xs">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <h2 className="text-white font-semibold text-sm">Thème visuel</h2>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map(t => (
                  <button key={t.id} onClick={() => setVideoTheme(t.id)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${videoTheme === t.id ? "border-violet-500/50 bg-white/5" : "border-white/[0.05] hover:border-white/10"}`}>
                    <div className="w-full h-7 rounded-lg" style={{ background: `linear-gradient(135deg, ${t.bg1}, ${t.bg2})`, border: `2px solid ${t.accent}40` }} />
                    <span className="text-xs text-white/50">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center — script + preview */}
          <div className="space-y-4">
            <button onClick={generateScript} disabled={generating || !book}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:opacity-40 text-white rounded-2xl font-semibold transition-all">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? "Génération du script..." : "Générer le script IA"}
            </button>

            {script && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm">Script généré</h3>
                  <button onClick={generateScript} disabled={generating}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/40 rounded-lg text-xs transition-colors">
                    <RotateCcw size={11} /> Régénérer
                  </button>
                </div>

                {/* Citation variants selector */}
                {videoType === "citation" && script.variants && (
                  <div className="flex gap-1.5">
                    {script.variants.map((_, i) => (
                      <button key={i} onClick={() => setActiveVariant(i)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeVariant === i ? "bg-amber-500/30 border border-amber-500/40 text-amber-300" : "bg-white/5 text-white/40 hover:text-white/60"}`}>
                        Variante {i + 1}
                      </button>
                    ))}
                  </div>
                )}

                {/* Script display */}
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {videoType === "teaser" && script.slides?.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 bg-white/[0.03] rounded-xl">
                      <span className="text-violet-400/60 text-xs font-mono shrink-0 mt-0.5">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-white text-sm">{s.text}</p>
                        <span className="text-white/25 text-xs">{s.duration}s · {s.style}</span>
                      </div>
                    </div>
                  ))}
                  {videoType === "booktrailer" && script.scenes?.map(s => (
                    <div key={s.id} className="p-2.5 bg-white/[0.03] rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-cyan-400/60 text-xs font-mono">Scène {s.id}</span>
                        <span className="text-white/25 text-xs">{s.duration}s</span>
                      </div>
                      <p className="text-white text-sm">{s.text}</p>
                      {s.narration && <p className="text-white/40 text-xs mt-1 italic">{s.narration}</p>}
                    </div>
                  ))}
                  {videoType === "citation" && script.variants?.[activeVariant] && (
                    <div className="p-3 bg-amber-500/8 border border-amber-500/15 rounded-xl space-y-2">
                      <p className="text-amber-300/70 text-xs">{script.variants[activeVariant].context}</p>
                      <p className="text-white font-medium text-sm">"{script.variants[activeVariant].quote}"</p>
                      <p className="text-white/40 text-xs">— {script.variants[activeVariant].author}</p>
                    </div>
                  )}
                  {videoType === "promo" && script.slides?.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 bg-white/[0.03] rounded-xl">
                      <span className="text-pink-400/60 text-xs font-mono shrink-0 mt-0.5">{s.duration}s</span>
                      <div>
                        <p className="text-white text-sm font-medium">{s.text}</p>
                        {s.subtext && <p className="text-white/40 text-xs">{s.subtext}</p>}
                      </div>
                    </div>
                  ))}
                  {videoType === "shorts" && (
                    <>
                      {script.hook && <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-red-300 text-xs font-semibold mb-1">HOOK (0-3s)</p>
                        <p className="text-white text-sm">{script.hook}</p>
                      </div>}
                      {script.segments?.map((seg, i) => (
                        <div key={i} className="p-2.5 bg-white/[0.03] rounded-xl">
                          <p className="text-white/40 text-xs mb-1">{seg.label}</p>
                          <p className="text-white/70 text-sm">{seg.text}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Caption */}
                {(script.caption || script.variants?.[activeVariant]?.caption) && (
                  <div className="pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-white/40 text-xs">Légende suggérée</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => navigator.clipboard.writeText(previewCaption)}
                          className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 text-white/40 rounded-lg text-xs transition-colors">
                          <Copy size={10} /> Copier
                        </button>
                        <button onClick={useCaption}
                          className="flex items-center gap-1 px-2 py-1 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-lg text-xs transition-colors">
                          <Send size={10} /> Utiliser
                        </button>
                      </div>
                    </div>
                    <textarea value={previewCaption} onChange={e => setPreviewCaption(e.target.value)} rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white/60 text-xs focus:outline-none resize-none" />
                  </div>
                )}

                {/* Booktrailer extra */}
                {videoType === "booktrailer" && script.voiceoverScript && (
                  <div className="pt-2 border-t border-white/[0.06]">
                    <p className="text-white/40 text-xs mb-1">Script voix off complet</p>
                    <p className="text-white/60 text-xs leading-relaxed">{script.voiceoverScript}</p>
                    {script.music_suggestion && (
                      <p className="text-cyan-400/60 text-xs mt-1.5 flex items-center gap-1">
                        <span>🎵</span> {script.music_suggestion}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right — render & preview */}
          <div className="space-y-4">
            {script ? (
              <>
                <button onClick={renderVideo} disabled={rendering}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-40 text-white rounded-2xl font-semibold transition-all">
                  {rendering ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
                  {rendering ? `Rendu ${renderProgress}%...` : "Générer la vidéo"}
                </button>

                {rendering && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/60 text-sm">Rendu en cours…</p>
                      <p className="text-white/40 text-sm">{renderProgress}%</p>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${renderProgress}%` }} />
                    </div>
                    <p className="text-white/30 text-xs mt-2">Rendu {currentFmt.label} · Thème {currentThm.label}</p>
                  </div>
                )}

                {videoBlobUrl && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-emerald-400 text-sm font-semibold flex items-center gap-1.5">
                        <CheckCircle size={14} /> Vidéo prête !
                      </p>
                      <span className="text-white/30 text-xs">{currentFmt.label}</span>
                    </div>
                    <video src={videoBlobUrl} controls
                      className="w-full rounded-xl bg-black"
                      style={{ maxHeight: videoFormat === "portrait" ? "480px" : "auto" }} />
                    <div className="flex gap-2">
                      <button onClick={downloadVideo}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-sm font-medium transition-colors">
                        <Download size={14} /> Télécharger .webm
                      </button>
                      <button onClick={useCaption}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-500/20 border border-violet-500/30 hover:bg-violet-500/30 text-violet-300 rounded-xl text-sm font-medium transition-colors">
                        <Send size={14} /> Poster
                      </button>
                    </div>
                    <p className="text-white/25 text-xs text-center">Format .webm compatible TikTok, Reels, Shorts</p>
                  </div>
                )}

                {!videoBlobUrl && !rendering && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 flex flex-col items-center justify-center gap-3 min-h-40">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                      <Film size={24} className="text-white/20" />
                    </div>
                    <p className="text-white/30 text-sm text-center">Clique sur "Générer la vidéo" pour créer ton {VIDEO_TYPES.find(v => v.id === videoType)?.label}</p>
                    <div className="flex gap-2 text-white/20 text-xs">
                      <span>{currentFmt.label}</span>
                      <span>·</span>
                      <span>{currentThm.label}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 flex flex-col items-center justify-center gap-4 min-h-60">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center">
                  <Clapperboard size={28} className="text-white/20" />
                </div>
                <div className="text-center">
                  <p className="text-white/30 text-sm">Sélectionne un livre et un type de vidéo</p>
                  <p className="text-white/20 text-xs mt-1">puis clique sur "Générer le script IA"</p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full">
                  {VIDEO_TYPES.slice(0, 4).map(vt => (
                    <div key={vt.id} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-xl">
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${vt.color} flex items-center justify-center`}>
                        <vt.icon size={11} className="text-white" />
                      </div>
                      <span className="text-white/30 text-xs">{vt.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ COMPOSE ═══════════════════════════════════════════════════════════ */}
      {tab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <label className="text-white/60 text-xs">Livre concerné</label>
              <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                <option value="">— Sélectionne un livre —</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title} ({b.category})</option>)}
              </select>
              {book && (
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  {book.coverDataUrl
                    ? <img src={book.coverDataUrl} alt="" className="w-10 h-14 object-cover rounded-lg" />
                    : <div className="w-10 h-14 bg-white/10 rounded-lg flex items-center justify-center"><BookOpen size={14} className="text-white/30" /></div>
                  }
                  <div>
                    <p className="text-white text-sm font-medium">{book.title}</p>
                    <p className="text-white/40 text-xs">{book.chapters?.length || 0} chapitres · {book.pages || 0} pages</p>
                  </div>
                  <button onClick={generateCaption}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 text-purple-300 rounded-xl text-xs transition-colors">
                    <Zap size={11} /> Générer
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-white/60 text-xs">Texte du post</label>
                <span className="text-white/25 text-xs">{postText.length} / 2000</span>
              </div>
              <textarea value={postText} onChange={e => setPostText(e.target.value)}
                placeholder="Écris ta promotion ici ou génère-la automatiquement..."
                rows={8} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 resize-none" />
              <button onClick={() => navigator.clipboard.writeText(postText)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/40 rounded-xl text-xs transition-colors">
                <Copy size={11} /> Copier
              </button>
            </div>

            <button onClick={handleSend} disabled={sending || !postText.trim() || selectedPlatforms.length === 0 || !connected}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-2xl font-semibold text-sm disabled:opacity-40 transition-all">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? "Ajout à la file..." : "Ajouter à la file d'attente"}
            </button>
            {sendResult && (
              <div className={`p-3 rounded-xl text-sm text-center border ${sendResult.startsWith("✓") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
                {sendResult}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <label className="text-white/60 text-xs">Plateformes</label>
              {PLATFORMS.map(p => (
                <button key={p.id}
                  onClick={() => setSelectedPlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${selectedPlatforms.includes(p.id) ? p.bg + " " + p.color : "bg-white/[0.02] border-white/[0.06] text-white/30"}`}>
                  <span className="flex-1 text-left">{p.label}</span>
                  {selectedPlatforms.includes(p.id) && <Check size={14} />}
                </button>
              ))}
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <label className="text-white/60 text-xs">Couverture</label>
              <button onClick={() => setIncludeCover(v => !v)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${includeCover ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "bg-white/[0.02] border-white/[0.06] text-white/30"}`}>
                <Image size={16} /> <span className="flex-1 text-left">Inclure la couverture</span>
                {includeCover && <Check size={14} />}
              </button>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
              <label className="text-white/60 text-xs">Publication rapide</label>
              <button onClick={handlePostNow} disabled={postingNow || !connected}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-40">
                {postingNow ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Poster le prochain maintenant
              </button>
              <p className="text-white/25 text-xs text-center">
                {typeof status.queue_count === "number" ? `${status.queue_count} post(s) en attente` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══ QUEUE ═════════════════════════════════════════════════════════════ */}
      {tab === "queue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-sm">
              <span className="text-white/50">{queue.filter(q => q.status === "pending").length} en attente</span>
              <span className="text-yellow-400/70">{queue.filter(q => q.status === "posting").length} en cours</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePostNow} disabled={postingNow || !connected || queue.filter(q => q.status === "pending").length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-sm transition-colors disabled:opacity-40">
                {postingNow ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                Poster maintenant
              </button>
              <button onClick={loadQueue} disabled={loadingQ}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                <RefreshCw size={14} className={`text-white/40 ${loadingQ ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          {queue.length === 0 ? (
            <div className="text-center py-16">
              <List size={32} className="text-white/15 mx-auto mb-3" />
              <p className="text-white/30">File vide — compose un post pour l&apos;ajouter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map(item => (
                <div key={item.id}
                  className={`bg-white/[0.02] border rounded-2xl p-4 flex items-start gap-4 ${item.status === "posting" ? "border-yellow-500/30" : item.status === "done" ? "border-emerald-500/20" : item.status === "error" ? "border-red-500/20" : "border-white/[0.06]"}`}>
                  <div className="mt-0.5">{statusIcon(item.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white text-sm font-medium truncate">{item.title}</p>
                      <div className="flex gap-1">
                        {item.platforms.map(p => (
                          <span key={p} className="text-xs px-1.5 py-0.5 rounded-md bg-white/10 text-white/50">{p.slice(0, 2).toUpperCase()}</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-white/40 text-xs line-clamp-2">{item.text}</p>
                    <p className="text-white/20 text-xs mt-1">
                      {item.posted_at ? `Posté ${new Date(item.posted_at).toLocaleString("fr")}` : `Créé ${new Date(item.created_at).toLocaleString("fr")}`}
                    </p>
                  </div>
                  {item.status === "pending" && (
                    <button onClick={() => handleDelete(item.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors shrink-0">
                      <Trash2 size={13} className="text-white/25 hover:text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ HISTORY ══════════════════════════════════════════════════════════ */}
      {tab === "history" && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="text-center py-16">
              <History size={32} className="text-white/15 mx-auto mb-3" />
              <p className="text-white/30">Aucun post dans l&apos;historique</p>
            </div>
          ) : history.map(item => (
            <div key={item.id} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 flex items-start gap-4">
              <div className="mt-0.5">{statusIcon(item.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white text-sm font-medium truncate">{item.title}</p>
                  <div className="flex gap-1">
                    {item.platforms.map(p => (
                      <span key={p} className="text-xs px-1.5 py-0.5 rounded-md bg-white/10 text-white/50">{p.slice(0, 2).toUpperCase()}</span>
                    ))}
                  </div>
                </div>
                <p className="text-white/40 text-xs line-clamp-1">{item.text}</p>
                <p className="text-white/20 text-xs mt-1">{item.posted_at ? new Date(item.posted_at).toLocaleString("fr") : "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ SETTINGS ══════════════════════════════════════════════════════════ */}
      {tab === "settings" && (
        <div className="max-w-xl space-y-6">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <h3 className="text-white font-semibold">Connexion au serveur</h3>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">URL du serveur</label>
              <input value={apiUrl} onChange={e => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Horaires auto (virgule séparateur)</label>
              <input value={schedTimes} onChange={e => setSchedTimes(e.target.value)}
                placeholder="09:00, 12:00, 18:00, 21:00"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50" />
            </div>
            <button onClick={saveSettings}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-medium transition-colors">
              <CheckCircle size={14} /> Sauvegarder & tester
            </button>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <h3 className="text-white font-semibold">Connexion réseaux sociaux</h3>
            <p className="text-white/50 text-sm">Via le serveur backend. Lance-le puis connecte tes comptes.</p>
            <div className="flex flex-wrap gap-2">
              {["facebook", "instagram", "tiktok"].map(net => (
                <button key={net} onClick={() => call(`/api/login/${net}`, { method: "POST" }).catch(() => {})}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 rounded-xl text-sm transition-colors capitalize">
                  {net}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-500/[0.07] border border-amber-500/20 rounded-2xl p-5">
            <p className="text-amber-300 text-sm font-semibold mb-3">Comment publier automatiquement</p>
            <ol className="text-white/50 text-sm space-y-2">
              <li>1. Lance <code className="bg-white/10 px-1 rounded text-white/80">python main.py</code> dans ton dossier backend</li>
              <li>2. Connecte tes comptes via les boutons ci-dessus</li>
              <li>3. Génère tes vidéos dans l&apos;onglet <strong className="text-white/70">Vidéos</strong></li>
              <li>4. Compose tes posts dans <strong className="text-white/70">Composer</strong> et ajoute-les à la file</li>
              <li>5. Le planificateur publie automatiquement aux horaires configurés</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
