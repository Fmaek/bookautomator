"use client";
import { useState, useEffect, useRef } from "react";
import { Activity, Sparkles, Loader2, TrendingUp, AlertTriangle, RotateCcw, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ArcEntry {
  chapter: number; title: string; intensity: number;
  emotion: string; subEmotion?: string; note: string;
  isKeyMoment?: boolean; keyMomentType?: "climax" | "nadir" | "revelation" | "twist" | null;
}
interface TurningPoint {
  chapter: number; fromEmotion: string; toEmotion: string;
  type: string; description: string;
}
interface ArcResult {
  arcs: ArcEntry[];
  globalNote: string;
  pattern?: { name: string; description: string; coherenceScore: number; comparison: string };
  dynamism?: { score: number; label: string; weakChapters: number[]; overloadedChapters: number[]; recommendations: { chapter: number; issue: string; suggestion: string }[] };
  turningPoints?: TurningPoint[];
}

// ── Emotion palette — vivid, clearly distinct ─────────────────────────────────
const EMOTIONS: Record<string, { hex: string; glow: string; bg: string; label: string }> = {
  espoir:     { hex: "#818cf8", glow: "rgba(129,140,248,0.5)", bg: "bg-indigo-500/20",   label: "Espoir"     },
  joie:       { hex: "#4ade80", glow: "rgba(74,222,128,0.5)",  bg: "bg-green-500/20",    label: "Joie"       },
  surprise:   { hex: "#fbbf24", glow: "rgba(251,191,36,0.5)",  bg: "bg-yellow-500/20",   label: "Surprise"   },
  peur:       { hex: "#f87171", glow: "rgba(248,113,113,0.5)", bg: "bg-red-500/20",      label: "Peur"       },
  colere:     { hex: "#f97316", glow: "rgba(249,115,22,0.5)",  bg: "bg-orange-500/20",   label: "Colère"     },
  tristesse:  { hex: "#38bdf8", glow: "rgba(56,189,248,0.5)",  bg: "bg-sky-500/20",      label: "Tristesse"  },
  serenite:   { hex: "#2dd4bf", glow: "rgba(45,212,191,0.5)",  bg: "bg-teal-500/20",     label: "Sérénité"   },
  tension:    { hex: "#fb923c", glow: "rgba(251,146,60,0.5)",  bg: "bg-orange-400/20",   label: "Tension"    },
  mystere:    { hex: "#c084fc", glow: "rgba(192,132,252,0.5)", bg: "bg-purple-500/20",   label: "Mystère"    },
  revelation: { hex: "#fde047", glow: "rgba(253,224,71,0.5)",  bg: "bg-yellow-400/20",   label: "Révélation" },
  amour:      { hex: "#f472b6", glow: "rgba(244,114,182,0.5)", bg: "bg-pink-500/20",     label: "Amour"      },
  honte:      { hex: "#a78bfa", glow: "rgba(167,139,250,0.5)", bg: "bg-violet-500/20",   label: "Honte"      },
  deuil:      { hex: "#94a3b8", glow: "rgba(148,163,184,0.5)", bg: "bg-slate-500/20",    label: "Deuil"      },
  extase:     { hex: "#e879f9", glow: "rgba(232,121,249,0.5)", bg: "bg-fuchsia-500/20",  label: "Extase"     },
  angoisse:   { hex: "#dc2626", glow: "rgba(220,38,38,0.5)",   bg: "bg-red-700/20",      label: "Angoisse"   },
  // fallback aliases
  "colère":   { hex: "#f97316", glow: "rgba(249,115,22,0.5)",  bg: "bg-orange-500/20",   label: "Colère"     },
  "sérénité": { hex: "#2dd4bf", glow: "rgba(45,212,191,0.5)",  bg: "bg-teal-500/20",     label: "Sérénité"   },
  "mélancolie":{ hex: "#60a5fa", glow: "rgba(96,165,250,0.5)", bg: "bg-blue-500/20",     label: "Mélancolie" },
};

function emotionColor(name: string) {
  const key = name?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") || "";
  return EMOTIONS[key] || EMOTIONS[name?.toLowerCase() || ""] || { hex: "#a78bfa", glow: "rgba(167,139,250,0.5)", bg: "bg-violet-500/20", label: name };
}

// ── Zone bands ─────────────────────────────────────────────────────────────────
const ZONES = [
  { min: 80, max: 100, label: "Climax",   color: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)"   },
  { min: 55, max: 80,  label: "Intense",  color: "rgba(249,115,22,0.06)",  border: "rgba(249,115,22,0.15)" },
  { min: 30, max: 55,  label: "Tension",  color: "rgba(251,191,36,0.05)",  border: "rgba(251,191,36,0.12)" },
  { min: 0,  max: 30,  label: "Calme",    color: "rgba(56,189,248,0.04)",  border: "rgba(56,189,248,0.10)" },
];

const PATTERN_ICONS: Record<string, string> = {
  "Voyage du Héros": "🧙", "Voyage du Heros": "🧙",
  "Tragédie": "🎭", "Tragedie": "🎭",
  "Crescendo": "📈", "En U": "🔄",
  "Montagne Russe": "🎢", "Montagne russe": "🎢",
  "Chute Libre": "📉", "Chute libre": "📉",
  "Renaissance": "🌅", "Comédie": "😄", "Comedie": "😄",
};

const KEY_MOMENT_STYLES: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  climax:     { label: "CLIMAX",     color: "#f87171", bg: "bg-red-500/20",    ring: "ring-red-500/40"    },
  nadir:      { label: "NADIR",      color: "#38bdf8", bg: "bg-sky-500/20",    ring: "ring-sky-500/40"    },
  revelation: { label: "RÉVÉLATION", color: "#fde047", bg: "bg-yellow-400/20", ring: "ring-yellow-400/40" },
  twist:      { label: "TWIST",      color: "#c084fc", bg: "bg-purple-500/20", ring: "ring-purple-500/40" },
};

type Tab = "graphe" | "pattern" | "dynamisme" | "retournements";

// ── SVG Line+Area chart ────────────────────────────────────────────────────────
function ArcChart({ arcs, onHover }: { arcs: ArcEntry[]; onHover: (i: number | null) => void }) {
  const W = 800; const H = 220; const PAD = { top: 20, right: 16, bottom: 32, left: 36 };
  const n = arcs.length;
  if (n === 0) return null;

  const xScale = (i: number) => PAD.left + (i / Math.max(n - 1, 1)) * (W - PAD.left - PAD.right);
  const yScale = (v: number) => PAD.top + (1 - v / 100) * (H - PAD.top - PAD.bottom);

  // Build path points
  const pts = arcs.map((a, i) => ({ x: xScale(i), y: yScale(a.intensity), arc: a, i }));

  // Build segmented filled areas (one per pair of consecutive points, colored by the from-emotion)
  const areaSegments = pts.slice(0, -1).map((p, i) => {
    const next = pts[i + 1];
    const col = emotionColor(p.arc.emotion).hex;
    const d = `M ${p.x} ${yScale(0)} L ${p.x} ${p.y} L ${next.x} ${next.y} L ${next.x} ${yScale(0)} Z`;
    return { d, col, opacity: 0.22 };
  });

  // Line path
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Grid Y values
  const gridYs = [0, 25, 50, 75, 100];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 340 }}>
        {/* Zone bands */}
        {ZONES.map(z => {
          const y1 = yScale(z.max); const y2 = yScale(z.min);
          return (
            <g key={z.label}>
              <rect x={PAD.left} y={y1} width={W - PAD.left - PAD.right} height={y2 - y1}
                fill={z.color} />
              <line x1={PAD.left} x2={W - PAD.right} y1={y1} y2={y1}
                stroke={z.border} strokeWidth={0.5} strokeDasharray="4 4" />
              <text x={PAD.left + 4} y={y1 + 11} fill={z.border} fontSize={8} fontFamily="sans-serif">{z.label}</text>
            </g>
          );
        })}

        {/* Grid lines */}
        {gridYs.map(v => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yScale(v)} y2={yScale(v)}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <text x={PAD.left - 4} y={yScale(v) + 4} fill="rgba(255,255,255,0.2)"
              fontSize={9} textAnchor="end" fontFamily="sans-serif">{v}</text>
          </g>
        ))}

        {/* Filled area segments (colored by emotion) */}
        {areaSegments.map((s, i) => (
          <path key={i} d={s.d} fill={s.col} opacity={s.opacity} />
        ))}

        {/* Line segments (colored per segment) */}
        {pts.slice(0, -1).map((p, i) => {
          const next = pts[i + 1];
          const col = emotionColor(p.arc.emotion).hex;
          return <line key={i} x1={p.x} y1={p.y} x2={next.x} y2={next.y} stroke={col} strokeWidth={2.5} strokeLinecap="round" />;
        })}

        {/* Key moment halos */}
        {pts.filter(p => p.arc.isKeyMoment).map(p => {
          const col = emotionColor(p.arc.emotion).hex;
          return (
            <circle key={p.i} cx={p.x} cy={p.y} r={14} fill="none"
              stroke={col} strokeWidth={1} opacity={0.4} />
          );
        })}

        {/* Data points */}
        {pts.map(p => {
          const col = emotionColor(p.arc.emotion).hex;
          const glow = emotionColor(p.arc.emotion).glow;
          return (
            <g key={p.i} style={{ cursor: "pointer" }}
              onMouseEnter={() => onHover(p.i)} onMouseLeave={() => onHover(null)}>
              {/* Invisible large hit area — prevents flicker at glow edge */}
              <circle cx={p.x} cy={p.y} r={22} fill="transparent" style={{ pointerEvents: "all" }} />
              {/* Glow */}
              <circle cx={p.x} cy={p.y} r={8} fill={glow} style={{ pointerEvents: "none" }} />
              {/* Dot */}
              <circle cx={p.x} cy={p.y} r={5} fill={col} stroke="#0d0d0f" strokeWidth={1.5} style={{ pointerEvents: "none" }} />
              {/* Key moment star */}
              {p.arc.isKeyMoment && (
                <text x={p.x} y={p.y - 10} textAnchor="middle" fill={col} fontSize={10} style={{ pointerEvents: "none" }}>★</text>
              )}
            </g>
          );
        })}

        {/* X-axis chapter numbers */}
        {pts.map(p => (
          <text key={p.i} x={p.x} y={H - 4} textAnchor="middle"
            fill="rgba(255,255,255,0.2)" fontSize={9} fontFamily="sans-serif">{p.i + 1}</text>
        ))}
      </svg>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ArcPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ArcResult | null>(null);
  const [tab, setTab] = useState<Tab>("graphe");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [expandedRec, setExpandedRec] = useState<number | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setHoveredDebounced = (i: number | null) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (i !== null) {
      // Enter immediately
      setHoveredIdx(i);
    } else {
      // Leave with small delay — absorbs micro-flickers between child elements
      hoverTimer.current = setTimeout(() => setHoveredIdx(null), 40);
    }
  };

  useEffect(() => { setBooks(getBooks()); }, []);
  const book = books.find(b => b.id === selectedId);

  const analyze = async () => {
    if (!book) return;
    setLoading(true);
    setResult(null);
    setTab("graphe");
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "emotional_arc",
          bookTitle: book.title,
          chapters: book.chapters.map(c => ({ title: c.title, content: c.content })),
        }),
      });
      const data = await res.json() as ArcResult;
      if (data.arcs) setResult(data);
    } catch { }
    setLoading(false);
  };

  const hoveredArc = hoveredIdx !== null ? result?.arcs[hoveredIdx] : null;

  // Emotion distribution for legend
  const emotionCounts = result
    ? result.arcs.reduce((acc, a) => { acc[a.emotion] = (acc[a.emotion] || 0) + 1; return acc; }, {} as Record<string, number>)
    : {};
  const sortedEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);

  const TABS: { key: Tab; label: string; icon: React.ReactNode; available: boolean }[] = [
    { key: "graphe",        label: "Graphe",          icon: <Activity size={13} />,    available: true },
    { key: "pattern",       label: "Pattern narratif", icon: <span className="text-xs">🧩</span>, available: !!result?.pattern },
    { key: "dynamisme",     label: "Dynamisme",        icon: <TrendingUp size={13} />,  available: !!result?.dynamism },
    { key: "retournements", label: "Retournements",    icon: <RotateCcw size={13} />,   available: !!(result?.turningPoints?.length) },
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-orange-500 flex items-center justify-center">
            <Activity size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Emotional Arc Analyzer</h1>
        </div>
        <p className="text-white/50 text-sm">
          Courbe d&apos;intensité · Pattern narratif · Score de dynamisme · Retournements émotionnels · Double émotion
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Left config panel */}
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-semibold text-sm">Livre à analyser</h2>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setResult(null); }}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/40">
              <option value="">Choisir un livre…</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title} ({b.chapters.length} ch.)</option>)}
            </select>
            {book && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <p className="text-rose-300 text-xs font-semibold">{book.title}</p>
                <p className="text-white/35 text-xs">{book.chapters.length} chapitres · analyse complète</p>
              </div>
            )}
            <button onClick={analyze} disabled={loading || !book}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-rose-900/20">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {loading ? "Analyse en cours…" : "Analyser l'arc"}
            </button>
          </div>

          {/* Emotion legend */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">
              {result ? "Distribution dans ce livre" : "Émotions détectables"}
            </p>
            <div className="space-y-1.5">
              {result ? sortedEmotions.map(([em, count]) => {
                const ec = emotionColor(em);
                const pct = Math.round((count / result.arcs.length) * 100);
                return (
                  <div key={em} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ec.hex, boxShadow: `0 0 4px ${ec.glow}` }} />
                    <span className="text-white/60 text-xs capitalize flex-1">{ec.label || em}</span>
                    <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: ec.hex }} />
                    </div>
                    <span className="text-white/30 text-xs w-6 text-right">{count}</span>
                  </div>
                );
              }) : Object.entries(EMOTIONS).slice(0, 12).map(([em, ec]) => (
                <div key={em} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ec.hex, boxShadow: `0 0 4px ${ec.glow}` }} />
                  <span className="text-white/40 text-xs">{ec.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zone legend */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Zones d&apos;intensité</p>
            {ZONES.map(z => (
              <div key={z.label} className="flex items-center gap-2 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: z.color, border: `1px solid ${z.border}` }} />
                <span className="text-white/40 text-xs">{z.label}</span>
                <span className="text-white/20 text-xs ml-auto">{z.min}–{z.max}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right main panel */}
        <div className="lg:col-span-3 space-y-4">

          {/* Loading */}
          {loading && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <Activity size={26} className="text-rose-400" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-rose-500/30 animate-ping" />
              </div>
              <p className="text-white/70 text-sm font-medium">Analyse complète en cours…</p>
              <p className="text-white/25 text-xs">Arc · Pattern · Dynamisme · Retournements · Double émotion</p>
            </div>
          )}

          {/* Results */}
          {!loading && result && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1">
                {TABS.map(t => (
                  <button key={t.key} onClick={() => t.available && setTab(t.key)}
                    disabled={!t.available}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${tab === t.key ? "bg-rose-500/20 text-rose-300 border border-rose-500/25" : t.available ? "text-white/40 hover:text-white/70" : "text-white/15 cursor-not-allowed"}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* ── TAB: GRAPHE ── */}
              {tab === "graphe" && (
                <div className="space-y-4">
                  {/* SVG Chart */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold text-sm">Courbe d&apos;intensité émotionnelle</h3>
                      <div className="flex items-center gap-1 text-white/30 text-xs">
                        <span className="w-6 h-0.5 bg-white/20 inline-block rounded" /> ligne colorée par émotion
                      </div>
                    </div>
                    <ArcChart arcs={result.arcs} onHover={setHoveredDebounced} />

                    {/* Hover tooltip — fixed height reserved to prevent layout shift */}
                    <div className="mt-3 min-h-[88px]">
                      {hoveredArc && (
                        <div className="p-3 rounded-xl border transition-colors"
                          style={{ borderColor: emotionColor(hoveredArc.emotion).hex + "44", backgroundColor: emotionColor(hoveredArc.emotion).hex + "11" }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white/40 text-xs">Ch.{hoveredArc.chapter}</span>
                            <span className="text-white font-semibold text-sm">{hoveredArc.title}</span>
                            {hoveredArc.isKeyMoment && hoveredArc.keyMomentType && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${KEY_MOMENT_STYLES[hoveredArc.keyMomentType]?.bg || ""}`}
                                style={{ color: KEY_MOMENT_STYLES[hoveredArc.keyMomentType]?.color }}>
                                ★ {KEY_MOMENT_STYLES[hoveredArc.keyMomentType]?.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <EmotionBadge emotion={hoveredArc.emotion} />
                            {hoveredArc.subEmotion && (
                              <><span className="text-white/20 text-xs">+</span><EmotionBadge emotion={hoveredArc.subEmotion} small /></>
                            )}
                            <span className="text-white/50 text-xs ml-auto font-mono">{hoveredArc.intensity}/100</span>
                          </div>
                          <p className="text-white/55 text-xs mt-2 leading-relaxed">{hoveredArc.note}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Global note */}
                  {result.globalNote && (
                    <div className="bg-gradient-to-r from-rose-500/10 to-orange-500/10 border border-rose-500/20 rounded-2xl p-4">
                      <p className="text-rose-300 text-xs font-semibold uppercase tracking-wide mb-2">Analyse globale</p>
                      <p className="text-white/70 text-sm leading-relaxed">{result.globalNote}</p>
                    </div>
                  )}

                  {/* Chapter list with dual emotions */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                    <h3 className="text-white font-semibold text-sm mb-3">Détail par chapitre</h3>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {result.arcs.map((arc, i) => {
                        const ec = emotionColor(arc.emotion);
                        const isHovered = hoveredIdx === i;
                        const km = arc.keyMomentType && KEY_MOMENT_STYLES[arc.keyMomentType];
                        return (
                          <div key={i}
                            onMouseEnter={() => setHoveredDebounced(i)} onMouseLeave={() => setHoveredDebounced(null)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-default border ${isHovered ? "bg-white/5 border-white/10" : "bg-white/[0.015] border-transparent"}`}>
                            <span className="text-white/25 text-xs w-5 shrink-0 text-right">{i + 1}</span>
                            {/* Intensity bar */}
                            <div className="w-1 rounded-full self-stretch shrink-0" style={{ backgroundColor: ec.hex, boxShadow: `0 0 6px ${ec.glow}`, minHeight: 20, opacity: 0.7 + arc.intensity / 300 }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-white/75 text-xs truncate">{arc.title}</span>
                                {km && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-bold shrink-0 ${km.bg}`} style={{ color: km.color }}>★ {km.label}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <EmotionBadge emotion={arc.emotion} />
                                {arc.subEmotion && (
                                  <><span className="text-white/20 text-xs">+</span><EmotionBadge emotion={arc.subEmotion} small /></>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5">
                              <div className="w-14 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-1.5 rounded-full transition-all" style={{ width: `${arc.intensity}%`, backgroundColor: ec.hex, boxShadow: `0 0 4px ${ec.glow}` }} />
                              </div>
                              <span className="text-white/35 text-xs w-7 text-right font-mono">{arc.intensity}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: PATTERN ── */}
              {tab === "pattern" && result.pattern && (
                <div className="space-y-4">
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/20 flex items-center justify-center text-3xl shrink-0">
                        {PATTERN_ICONS[result.pattern.name] || "🎬"}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-xl mb-1">{result.pattern.name}</h3>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white/40 text-xs">Cohérence</span>
                            <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400"
                                style={{ width: `${result.pattern.coherenceScore}%` }} />
                            </div>
                            <span className="text-rose-300 text-xs font-bold">{result.pattern.coherenceScore}/100</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-white/65 text-sm leading-relaxed">{result.pattern.description}</p>
                    {result.pattern.comparison && (
                      <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                        <p className="text-orange-300 text-xs font-semibold mb-0.5">Comparaison littéraire</p>
                        <p className="text-white/60 text-sm">{result.pattern.comparison}</p>
                      </div>
                    )}
                  </div>

                  {/* Visual arc pattern */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                    <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-4">Visualisation de l&apos;arc</h3>
                    <ArcChart arcs={result.arcs} onHover={setHoveredDebounced} />
                  </div>
                </div>
              )}

              {/* ── TAB: DYNAMISME ── */}
              {tab === "dynamisme" && result.dynamism && (
                <div className="space-y-4">
                  {/* Score gauge */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-white font-bold text-2xl">{result.dynamism.score}<span className="text-white/30 text-lg">/100</span></h3>
                        <p className="text-white/50 text-sm">{result.dynamism.label}</p>
                      </div>
                      <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: `conic-gradient(${result.dynamism.score >= 70 ? "#4ade80" : result.dynamism.score >= 40 ? "#fbbf24" : "#f87171"} ${result.dynamism.score * 3.6}deg, rgba(255,255,255,0.05) 0deg)` }}>
                        <div className="w-12 h-12 rounded-full bg-[#0d0d0f] flex items-center justify-center">
                          <Zap size={18} className={result.dynamism.score >= 70 ? "text-green-400" : result.dynamism.score >= 40 ? "text-yellow-400" : "text-red-400"} />
                        </div>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${result.dynamism.score}%`,
                          background: result.dynamism.score >= 70 ? "linear-gradient(90deg,#4ade80,#22c55e)"
                            : result.dynamism.score >= 40 ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                            : "linear-gradient(90deg,#f87171,#ef4444)"
                        }} />
                    </div>
                    <div className="flex justify-between text-white/20 text-xs mt-1">
                      <span>Monotone</span><span>Dynamique</span><span>Explosif</span>
                    </div>
                  </div>

                  {/* Weak + overloaded chapters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.dynamism.weakChapters.length > 0 && (
                      <div className="bg-blue-500/[0.06] border border-blue-500/20 rounded-2xl p-4">
                        <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <AlertTriangle size={11} /> Chapitres trop plats
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {result.dynamism.weakChapters.map(n => (
                            <span key={n} className="px-2.5 py-1 bg-blue-500/15 border border-blue-500/25 text-blue-300 text-xs rounded-lg font-mono">
                              Ch. {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.dynamism.overloadedChapters.length > 0 && (
                      <div className="bg-red-500/[0.06] border border-red-500/20 rounded-2xl p-4">
                        <p className="text-red-300 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <AlertTriangle size={11} /> Chapitres surchargés
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {result.dynamism.overloadedChapters.map(n => (
                            <span key={n} className="px-2.5 py-1 bg-red-500/15 border border-red-500/25 text-red-300 text-xs rounded-lg font-mono">
                              Ch. {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recommendations */}
                  {result.dynamism.recommendations.length > 0 && (
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                      <h3 className="text-white font-semibold text-sm mb-1">Recommandations</h3>
                      {result.dynamism.recommendations.map((rec, i) => (
                        <div key={i} className="border border-white/[0.06] rounded-xl overflow-hidden">
                          <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                            onClick={() => setExpandedRec(expandedRec === i ? null : i)}>
                            <span className="text-white/30 text-xs font-mono w-12 shrink-0">Ch. {rec.chapter}</span>
                            <span className="text-white/65 text-sm flex-1">{rec.issue}</span>
                            {expandedRec === i ? <ChevronUp size={13} className="text-white/30 shrink-0" /> : <ChevronDown size={13} className="text-white/30 shrink-0" />}
                          </button>
                          {expandedRec === i && (
                            <div className="px-4 pb-3 border-t border-white/[0.06]">
                              <p className="text-white/55 text-sm leading-relaxed pt-3">{rec.suggestion}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: RETOURNEMENTS ── */}
              {tab === "retournements" && result.turningPoints && (
                <div className="space-y-4">
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                    <h3 className="text-white font-semibold text-sm mb-4">Moments de bascule émotionnelle</h3>
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-[22px] top-4 bottom-4 w-px bg-white/[0.06]" />
                      <div className="space-y-4">
                        {result.turningPoints.map((tp, i) => {
                          const fromEc = emotionColor(tp.fromEmotion);
                          const toEc = emotionColor(tp.toEmotion);
                          const km = KEY_MOMENT_STYLES[tp.type] || KEY_MOMENT_STYLES["twist"];
                          return (
                            <div key={i} className="flex gap-4">
                              {/* Timeline dot */}
                              <div className="w-11 shrink-0 flex flex-col items-center pt-1">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${km.bg}`}
                                  style={{ borderColor: km.color }}>
                                  <span className="text-[8px]">★</span>
                                </div>
                                <span className="text-white/25 text-xs mt-1 font-mono">Ch.{tp.chapter}</span>
                              </div>
                              {/* Content */}
                              <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${km.bg}`} style={{ color: km.color }}>{km.label}</span>
                                  <div className="flex items-center gap-1.5 ml-1">
                                    <EmotionBadge emotion={tp.fromEmotion} />
                                    <span className="text-white/30 text-xs">→</span>
                                    <EmotionBadge emotion={tp.toEmotion} />
                                  </div>
                                </div>
                                <p className="text-white/60 text-sm leading-relaxed">{tp.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Chart context */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                    <p className="text-white/35 text-xs mb-3">Retournements sur le graphe (étoiles ★)</p>
                    <ArcChart arcs={result.arcs} onHover={setHoveredDebounced} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty state */}
          {!loading && !result && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl flex flex-col items-center justify-center py-20 text-center">
              <Activity size={52} className="text-white/[0.08] mb-4" />
              <p className="text-white/30 text-sm font-medium">Le graphe émotionnel apparaîtra ici</p>
              <p className="text-white/15 text-xs mt-2 max-w-xs">
                Courbe colorée · Pattern narratif · Score dynamisme · Retournements · Double émotion par chapitre
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tiny helper components ─────────────────────────────────────────────────────
function EmotionBadge({ emotion, small }: { emotion: string; small?: boolean }) {
  const ec = emotionColor(emotion);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full capitalize ${small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"}`}
      style={{ backgroundColor: ec.hex + "22", border: `1px solid ${ec.hex}44`, color: ec.hex }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ec.hex, boxShadow: `0 0 4px ${ec.glow}` }} />
      {ec.label || emotion}
    </span>
  );
}
