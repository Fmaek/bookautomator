"use client";
import { useState } from "react";
import { Calendar, Loader2, Copy, Download, Sparkles, ChevronRight, CheckCircle } from "lucide-react";
import { getBooks } from "@/lib/books";

const PLATFORMS = ["Instagram", "Facebook", "TikTok", "LinkedIn", "Twitter/X", "Pinterest"];
const CONTENT_TYPES = [
  { emoji: "📸", label: "Post image" },
  { emoji: "🎥", label: "Reel/Vidéo" },
  { emoji: "📖", label: "Extrait livre" },
  { emoji: "🎙️", label: "Podcast" },
  { emoji: "📧", label: "Newsletter" },
  { emoji: "🎁", label: "Offre spéciale" },
];

interface CalendarDay {
  day: number;
  phase: "pre" | "launch" | "post" | "long";
  platform: string;
  type: string;
  idea: string;
  done: boolean;
}

function parseCalendarText(text: string, launchDay: number): CalendarDay[] {
  const days: CalendarDay[] = [];
  const lines = text.split("\n").filter(l => l.trim());
  for (const line of lines) {
    const parts = line.split("|").map(p => p.trim());
    if (parts.length >= 4) {
      const dayNum = parseInt(parts[0].replace(/[^\d-]/g, "")) || days.length + 1;
      days.push({
        day: dayNum,
        phase: dayNum < 0 ? "pre" : dayNum === 0 ? "launch" : dayNum <= 7 ? "post" : "long",
        platform: parts[2] || "Instagram",
        type: parts[3] || "Post",
        idea: parts[4] || parts[3] || "",
        done: false,
      });
    }
  }
  return days.length > 0 ? days : [];
}

const phaseColors: Record<string, string> = {
  pre: "bg-amber-500/20 border-amber-500/30 text-amber-300",
  launch: "bg-purple-500/20 border-purple-500/30 text-purple-300",
  post: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
  long: "bg-blue-500/20 border-blue-500/30 text-blue-300",
};
const phaseLabels: Record<string, string> = {
  pre: "Pré-lancement",
  launch: "LANCEMENT",
  post: "Post-lancement",
  long: "Long terme",
};

export default function CalendarPage() {
  const books = getBooks();
  const [selectedBook, setSelectedBook] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["Instagram", "Facebook", "TikTok"]);
  const [loading, setLoading] = useState(false);
  const [rawCalendar, setRawCalendar] = useState("");
  const [parsedDays, setParsedDays] = useState<CalendarDay[]>([]);
  const [view, setView] = useState<"table" | "grid">("grid");
  const [doneDays, setDoneDays] = useState<Set<number>>(new Set());

  const selectedBookData = books.find(b => b.id === selectedBook);

  const generate = async () => {
    if (!selectedBook && !launchDate) return;
    setLoading(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "promo_calendar",
          bookTitle: selectedBookData?.title || "Mon livre",
          launchDate,
          authorName: selectedBookData?.authorName || "",
          platforms: platforms.join(", "),
        }),
      });
      const data = await res.json();
      setRawCalendar(data.calendar || "");
      setParsedDays(parseCalendarText(data.calendar || "", 14));
    } catch { }
    setLoading(false);
  };

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const exportCSV = () => {
    const csv = ["Jour,Phase,Plateforme,Type,Idée", ...parsedDays.map(d =>
      `${d.day},${phaseLabels[d.phase]},${d.platform},"${d.type}","${d.idea}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `calendrier-${selectedBookData?.title || "livre"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Calendrier de Promotion</h1>
        <p className="text-white/50">30 jours de contenu IA — du pré-lancement au long terme</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4">
          <h2 className="text-white font-semibold">Configuration</h2>

          <div>
            <label className="text-white/60 text-sm mb-2 block">Livre</label>
            <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
              <option value="">Choisir un livre...</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>

          <div>
            <label className="text-white/60 text-sm mb-2 block">Date de lancement prévue</label>
            <input type="date" value={launchDate} onChange={e => setLaunchDate(e.target.value)} className={ic} />
          </div>

          <div>
            <label className="text-white/60 text-sm mb-2 block">Plateformes actives</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${platforms.includes(p) ? "bg-purple-500 text-white" : "bg-white/5 text-white/40 hover:text-white"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={loading || (!selectedBook && !launchDate)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Génération en cours..." : "Générer le calendrier 30 jours"}
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
          <h2 className="text-white font-semibold mb-4">Types de contenu</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CONTENT_TYPES.map(ct => (
              <div key={ct.label} className="flex items-center gap-2 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <span className="text-xl">{ct.emoji}</span>
                <span className="text-white/60 text-sm">{ct.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <p className="text-purple-300 text-xs">Chaque jour aura un type de contenu, une plateforme et une idée précise à exécuter.</p>
          </div>
        </div>
      </div>

      {(parsedDays.length > 0 || rawCalendar) && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white font-semibold">Calendrier — {selectedBookData?.title || "Mon livre"}</h2>
              <p className="text-white/40 text-sm">{parsedDays.length} jours planifiés · {doneDays.size} complétés</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView(v => v === "grid" ? "table" : "grid")}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs transition-colors">
                Vue {view === "grid" ? "tableau" : "grille"}
              </button>
              <button onClick={() => navigator.clipboard.writeText(rawCalendar)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs transition-colors">
                <Copy size={11} /> Copier
              </button>
              {parsedDays.length > 0 && (
                <button onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs transition-colors">
                  <Download size={11} /> Export CSV
                </button>
              )}
            </div>
          </div>

          {parsedDays.length > 0 ? (
            <div className="grid grid-cols-5 gap-2">
              {parsedDays.map((day, i) => (
                <button key={i} onClick={() => setDoneDays(prev => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i); else next.add(i);
                  return next;
                })}
                  className={`p-3 rounded-xl border text-left transition-all relative ${doneDays.has(i) ? "bg-emerald-500/10 border-emerald-500/30" : phaseColors[day.phase]}`}>
                  {doneDays.has(i) && <CheckCircle size={10} className="absolute top-2 right-2 text-emerald-400" />}
                  <div className="text-xs font-bold mb-1 opacity-70">J{day.day >= 0 ? "+" : ""}{day.day}</div>
                  <div className="text-xs font-medium mb-0.5 truncate">{day.platform}</div>
                  <div className="text-xs opacity-60 line-clamp-2">{day.idea || day.type}</div>
                </button>
              ))}
            </div>
          ) : (
            <pre className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-sans">{rawCalendar}</pre>
          )}
        </div>
      )}
    </div>
  );
}

