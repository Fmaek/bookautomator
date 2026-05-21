"use client";
import { useState, useEffect } from "react";
import { GraduationCap, Sparkles, Loader2, Copy, Download } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

export default function CoursePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => { setBooks(getBooks()); }, []);

  const book = books.find(b => b.id === selectedId);

  const generate = async () => {
    if (!book) return;
    setLoading(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "book_to_course",
          bookTitle: book.title,
          category: book.category,
          chapters: book.chapters.map(c => ({ title: c.title, content: c.content })),
        }),
      });
      const data = await res.json();
      setResult(data.course || "");
    } catch { }
    setLoading(false);
  };

  const exportTxt = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `formation-${book?.title || "cours"}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Book → Formation</h1>
        </div>
        <p className="text-white/50">Transforme ton livre en cours en ligne structuré · Modules · Quiz · Exercices</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Livre source</h2>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setResult(""); }}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
              <option value="">Choisir un livre...</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title} ({b.chapters.length} chapitres)</option>)}
            </select>

            {book && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl space-y-2">
                <p className="text-orange-300 font-medium text-sm">{book.title}</p>
                <p className="text-white/40 text-xs">{book.category} · {book.chapters.length} chapitres → {book.chapters.length} modules de formation</p>
                <div className="mt-2 space-y-1">
                  {book.chapters.map((c, i) => (
                    <p key={i} className="text-white/30 text-xs">Module {i + 1}: {c.title}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <p className="text-white/40 text-xs leading-relaxed">
                L'IA va créer: titre de formation, promesse de transformation, structure par modules, leçons vidéo, exercices pratiques, quiz de validation et recommandations de plateformes.
              </p>
            </div>

            <button onClick={generate} disabled={loading || !book}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Création de la formation..." : "Créer la formation"}
            </button>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
          {result ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Plan de formation généré</h3>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(result)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs transition-colors">
                    <Copy size={11} /> Copier
                  </button>
                  <button onClick={exportTxt}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 hover:bg-orange-500/30 text-orange-300 rounded-lg text-xs transition-colors">
                    <Download size={11} /> Export
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[65vh]">
                <pre className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-sans">{result}</pre>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <GraduationCap size={48} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm">Le plan de formation apparaîtra ici</p>
              <p className="text-white/20 text-xs mt-1">Modules · Leçons · Quiz · Prix recommandé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
