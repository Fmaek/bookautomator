"use client";
import { useState, useEffect } from "react";
import { Languages, Sparkles, Loader2, Download, Copy, CheckCircle } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

const LANGUAGES = ["Anglais", "Espagnol", "Portugais", "Allemand", "Italien", "Arabe", "Mandarin", "Japonais", "Néerlandais", "Polonais"];

export default function TranslatePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [chapterIdx, setChapterIdx] = useState<number | "all">(0);
  const [targetLang, setTargetLang] = useState("Anglais");
  const [loading, setLoading] = useState(false);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [currentlyTranslating, setCurrentlyTranslating] = useState(-1);

  useEffect(() => { setBooks(getBooks()); }, []);

  const book = books.find(b => b.id === selectedId);

  const translateOne = async (idx: number) => {
    if (!book) return "";
    setCurrentlyTranslating(idx);
    const ch = book.chapters[idx];
    const res = await fetch("/api/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "translate_book",
        content: ch.content,
        targetLanguage: targetLang,
        bookTitle: book.title,
        chapterTitle: ch.title,
      }),
    });
    const data = await res.json();
    return data.translation || "";
  };

  const run = async () => {
    if (!book) return;
    setLoading(true);
    setTranslations({});
    if (chapterIdx === "all") {
      for (let i = 0; i < book.chapters.length; i++) {
        const t = await translateOne(i);
        setTranslations(prev => ({ ...prev, [i]: t }));
      }
    } else {
      const t = await translateOne(chapterIdx as number);
      setTranslations({ [chapterIdx as number]: t });
    }
    setCurrentlyTranslating(-1);
    setLoading(false);
  };

  const exportAll = () => {
    if (!book) return;
    const content = Object.entries(translations)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([i, t]) => `=== ${book.chapters[Number(i)].title} ===\n\n${t}`)
      .join("\n\n---\n\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${book.title}-${targetLang}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50";

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Languages size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Traducteur Automatique</h1>
        </div>
        <p className="text-white/50">Traduis ton livre en 10 langues · Traduction littéraire naturelle · Export TXT</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <div className="space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4">
            <h2 className="text-white font-semibold">Configuration</h2>

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Livre</label>
              <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setTranslations({}); }}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                <option value="">Choisir un livre...</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>

            {book && (
              <div>
                <label className="text-white/60 text-xs mb-1.5 block">Chapitre(s) à traduire</label>
                <select value={chapterIdx === "all" ? "all" : String(chapterIdx)}
                  onChange={e => setChapterIdx(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                  <option value="all">Tout le livre ({book.chapters.length} chapitres)</option>
                  {book.chapters.map((c, i) => <option key={i} value={i}>{i + 1}. {c.title}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Langue cible</label>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map(l => (
                  <button key={l} onClick={() => setTargetLang(l)}
                    className={`py-2 px-3 rounded-xl text-sm border transition-all ${targetLang === l ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "border-white/[0.06] text-white/50 hover:border-white/10 hover:text-white"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={run} disabled={loading || !book}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? `Traduction en ${targetLang}...` : `Traduire en ${targetLang}`}
            </button>

            {Object.keys(translations).length > 0 && (
              <button onClick={exportAll}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-sm transition-colors">
                <Download size={13} /> Exporter tout ({Object.keys(translations).length} chapitres)
              </button>
            )}
          </div>

          {loading && currentlyTranslating >= 0 && book && (
            <div className="bg-blue-500/8 border border-blue-500/15 rounded-2xl p-4">
              <p className="text-blue-300 text-sm">
                <Loader2 size={13} className="inline animate-spin mr-2" />
                Traduction: "{book.chapters[currentlyTranslating]?.title}"
              </p>
              <p className="text-white/30 text-xs mt-1">{currentlyTranslating + 1}/{book?.chapters.length}</p>
            </div>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
          {Object.keys(translations).length > 0 && book ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Traduction — {targetLang}</h3>
                <span className="text-white/30 text-xs">{Object.keys(translations).length} chapitre(s)</span>
              </div>
              <div className="space-y-5 max-h-[65vh] overflow-y-auto">
                {Object.entries(translations).sort(([a], [b]) => Number(a) - Number(b)).map(([i, t]) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white/70 text-xs font-medium">{book.chapters[Number(i)]?.title}</h4>
                      <button onClick={() => navigator.clipboard.writeText(t)}
                        className="text-white/30 hover:text-white text-xs transition-colors"><Copy size={11} /></button>
                    </div>
                    <p className="text-white/50 text-sm leading-relaxed">{t}</p>
                    {Number(i) < Object.keys(translations).length - 1 && <div className="mt-4 border-t border-white/5" />}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <Languages size={48} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm">La traduction apparaîtra ici</p>
              <p className="text-white/20 text-xs mt-1">Supporte 10 langues</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

