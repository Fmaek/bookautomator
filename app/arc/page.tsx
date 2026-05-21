"use client";
import { useState, useEffect } from "react";
import { Activity, Sparkles, Loader2 } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

interface ArcEntry { chapter: number; title: string; intensity: number; emotion: string; note: string }
interface ArcResult { arcs: ArcEntry[]; globalNote: string }

const EMOTION_COLORS: Record<string, string> = {
  espoir:    "#a78bfa", joie:      "#34d399", surprise: "#f59e0b",
  peur:      "#f87171", colère:    "#fb923c", tristesse:"#60a5fa",
  sérénité:  "#6ee7b7", tension:   "#f97316", mystère:  "#c084fc",
  révélation:"#fbbf24",
};

const EMOTION_BG: Record<string, string> = {
  espoir: "bg-violet-500/20", joie: "bg-emerald-500/20", surprise: "bg-amber-500/20",
  peur: "bg-red-500/20", colère: "bg-orange-500/20", tristesse: "bg-blue-500/20",
  sérénité: "bg-teal-500/20", tension: "bg-orange-500/20", mystère: "bg-purple-500/20",
  révélation: "bg-yellow-500/20",
};

export default function ArcPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ArcResult | null>(null);

  useEffect(() => { setBooks(getBooks()); }, []);

  const book = books.find(b => b.id === selectedId);

  const analyze = async () => {
    if (!book) return;
    setLoading(true);
    setResult(null);
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
      const data = await res.json();
      if (data.arcs) setResult(data as ArcResult);
    } catch { }
    setLoading(false);
  };

  const maxIntensity = result ? Math.max(...result.arcs.map(a => a.intensity), 1) : 100;

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-orange-500 flex items-center justify-center">
            <Activity size={20} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Emotional Arc Analyzer</h1>
        </div>
        <p className="text-white/50">Visualise l'intensité émotionnelle de chaque chapitre · Détecte les creux et les pics</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-semibold">Livre à analyser</h2>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setResult(null); }}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
              <option value="">Choisir un livre...</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title} ({b.chapters.length} ch.)</option>)}
            </select>

            {book && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <p className="text-rose-300 text-sm font-medium">{book.title}</p>
                <p className="text-white/40 text-xs">{book.chapters.length} chapitres à analyser</p>
              </div>
            )}

            <button onClick={analyze} disabled={loading || !book}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Analyse en cours..." : "Analyser l'arc émotionnel"}
            </button>
          </div>

          {/* Emotion legend */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-white/40 text-xs font-medium mb-3">Émotions détectables</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
                <div key={emotion} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-white/50 text-xs capitalize">{emotion}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-2 space-y-5">
          {result ? (
            <>
              {/* Waveform chart */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                <h3 className="text-white font-semibold text-sm mb-5">Courbe d'intensité émotionnelle</h3>
                <div className="relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-white/20 text-xs pr-2">
                    <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
                  </div>
                  {/* Grid lines */}
                  <div className="ml-8 relative h-48">
                    {[0, 25, 50, 75, 100].map(v => (
                      <div key={v} className="absolute w-full border-t border-white/[0.04]"
                        style={{ bottom: `${v}%` }} />
                    ))}
                    {/* Bars */}
                    <div className="absolute inset-0 flex items-end gap-1">
                      {result.arcs.map((arc, i) => {
                        const color = EMOTION_COLORS[arc.emotion.toLowerCase()] || "#a78bfa";
                        const pct = Math.round((arc.intensity / 100) * 100);
                        return (
                          <div key={i} className="flex-1 group relative flex flex-col items-center justify-end h-full">
                            <div className="w-full rounded-t-sm transition-all duration-500 relative"
                              style={{ height: `${pct}%`, backgroundColor: color, opacity: 0.8, minHeight: "3px" }}>
                              {/* Tooltip */}
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1a1a2e] border border-white/10 rounded-lg p-2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none min-w-max">
                                <p className="text-white font-medium">{arc.title}</p>
                                <p className="text-white/50">Intensité: {arc.intensity}/100</p>
                                <p className="capitalize" style={{ color }}>{arc.emotion}</p>
                              </div>
                            </div>
                            <span className="text-white/20 text-xs mt-1">{i + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Global note */}
              {result.globalNote && (
                <div className="bg-gradient-to-r from-rose-500/10 to-orange-500/10 border border-rose-500/20 rounded-2xl p-4">
                  <p className="text-rose-300 text-xs font-medium mb-1">Analyse globale</p>
                  <p className="text-white/70 text-sm">{result.globalNote}</p>
                </div>
              )}

              {/* Chapter list */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                <h3 className="text-white font-semibold text-sm mb-4">Détail par chapitre</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.arcs.map((arc, i) => {
                    const color = EMOTION_COLORS[arc.emotion.toLowerCase()] || "#a78bfa";
                    const bgClass = EMOTION_BG[arc.emotion.toLowerCase()] || "bg-violet-500/20";
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-white/30 text-xs w-4 shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white/70 text-xs truncate">{arc.title}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize shrink-0 ${bgClass}`}
                              style={{ color }}>{arc.emotion}</span>
                          </div>
                          <p className="text-white/35 text-xs">{arc.note}</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-1.5 rounded-full" style={{ width: `${arc.intensity}%`, backgroundColor: color }} />
                          </div>
                          <span className="text-white/40 text-xs w-6 text-right">{arc.intensity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-20 text-center">
              <Activity size={56} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">Le graphique d'intensité émotionnelle apparaîtra ici</p>
              <p className="text-white/20 text-xs mt-1">Pics de tension · Creux · Émotions dominantes par chapitre</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
