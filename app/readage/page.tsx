"use client";
import { useState, useEffect } from "react";
import { BookMarked, Sparkles, Loader2, Copy, ArrowRight } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

const LEVELS = [
  { id: "enfant",         label: "Enfant",       desc: "CE2-CM2 (8-11 ans)",        color: "text-green-400",  bg: "bg-green-500/15  border-green-500/25" },
  { id: "ado",            label: "Adolescent",   desc: "Collège-Lycée (12-17 ans)", color: "text-cyan-400",   bg: "bg-cyan-500/15   border-cyan-500/25" },
  { id: "adulte_general", label: "Adulte",       desc: "Grand public",              color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/25" },
  { id: "expert",         label: "Expert",       desc: "Professionnel / spécialiste",color: "text-amber-400",  bg: "bg-amber-500/15  border-amber-500/25" },
];

export default function ReadAgePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [chapterIdx, setChapterIdx] = useState(0);
  const [targetLevel, setTargetLevel] = useState("adulte_general");
  const [customText, setCustomText] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => { setBooks(getBooks()); }, []);

  const book = books.find(b => b.id === selectedId);
  const chapter = book?.chapters[chapterIdx];
  const sourceText = useCustom ? customText : (chapter?.content || "");

  const adapt = async () => {
    if (!sourceText.trim()) return;
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reading_age",
          content: sourceText,
          targetLevel,
          bookTitle: book?.title || "ce texte",
        }),
      });
      const data = await res.json();
      setResult(data.result || "");
    } catch { }
    setLoading(false);
  };

  const level = LEVELS.find(l => l.id === targetLevel)!;

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-blue-600 flex items-center justify-center">
            <BookMarked size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Reading Age Calibrator</h1>
        </div>
        <p className="text-white/50">Adapte le niveau de lecture de ton contenu · Enfant → Expert · Même message, style différent</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <div className="space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4">
            <h2 className="text-white font-semibold">Source du texte</h2>

            <div className="flex gap-2">
              <button onClick={() => setUseCustom(false)}
                className={`flex-1 py-2 rounded-xl text-sm border transition-all ${!useCustom ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-white/40"}`}>
                Depuis un livre
              </button>
              <button onClick={() => setUseCustom(true)}
                className={`flex-1 py-2 rounded-xl text-sm border transition-all ${useCustom ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-white/40"}`}>
                Texte libre
              </button>
            </div>

            {!useCustom ? (
              <>
                <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setChapterIdx(0); }}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                  <option value="">Choisir un livre...</option>
                  {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
                {book && (
                  <select value={chapterIdx} onChange={e => setChapterIdx(Number(e.target.value))}
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                    {book.chapters.map((c, i) => <option key={i} value={i}>{i + 1}. {c.title}</option>)}
                  </select>
                )}
              </>
            ) : (
              <textarea value={customText} onChange={e => setCustomText(e.target.value)} rows={6}
                placeholder="Colle ton texte ici..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none resize-none" />
            )}
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-3">
            <h2 className="text-white font-semibold">Niveau cible</h2>
            {LEVELS.map(l => (
              <button key={l.id} onClick={() => setTargetLevel(l.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${targetLevel === l.id ? `${l.bg} border` : "border-white/[0.06] hover:border-white/10"}`}>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${targetLevel === l.id ? l.color.replace("text-", "bg-") : "bg-white/20"}`} />
                <div>
                  <span className={`text-sm font-medium ${targetLevel === l.id ? l.color : "text-white/60"}`}>{l.label}</span>
                  <p className="text-white/30 text-xs">{l.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <button onClick={adapt} disabled={loading || !sourceText.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Adaptation en cours..." : `Adapter pour niveau ${level.label}`}
          </button>
        </div>

        <div className="space-y-4">
          {sourceText && !useCustom && (
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 md:p-5">
              <p className="text-white/40 text-xs font-medium mb-2">Texte original</p>
              <p className="text-white/40 text-sm leading-relaxed line-clamp-4">{sourceText}</p>
            </div>
          )}

          {result ? (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ArrowRight size={14} className="text-sky-400" />
                  <h3 className="text-white font-semibold text-sm">Version {level.label}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${level.bg} ${level.color}`}>{level.desc}</span>
                </div>
                <button onClick={() => navigator.clipboard.writeText(result)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs">
                  <Copy size={11} /> Copier
                </button>
              </div>
              <div className="overflow-y-auto max-h-[55vh]">
                <p className="text-white/75 text-sm leading-relaxed">{result}</p>
              </div>
            </div>
          ) : !loading && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-16 text-center">
              <BookMarked size={48} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">Le texte adapté apparaîtra ici</p>
              <p className="text-white/20 text-xs mt-1">Même message · Style adapté au niveau</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

