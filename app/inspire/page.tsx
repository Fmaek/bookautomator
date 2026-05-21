"use client";
import { useState, useEffect } from "react";
import { Lightbulb, Sparkles, Loader2, Copy, BookOpen, Check, X, ChevronRight } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Business & Entrepreneuriat", "Développement personnel", "Spiritualité",
  "Roman / Fiction", "Santé & Bien-être", "Finance & Investissement",
  "Poésie / Recueil", "Thriller", "Auto-biographie", "Technologie",
];

export default function InspirePage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newAudience, setNewAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { setBooks(getBooks()); }, []);

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const run = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setIdeas("");
    try {
      const payload = selected.map(id => {
        const b = books.find(bk => bk.id === id)!;
        const summary = b.chapters.map(c => c.content).join(" ").substring(0, 300);
        return { title: b.title, category: b.category, summary };
      });
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "book_inspiration",
          books: payload,
          newCategory,
          newAudience,
        }),
      });
      const data = await res.json();
      setIdeas(data.ideas || "");
    } catch { }
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(ideas);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedBooks = books.filter(b => selected.includes(b.id));

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Lightbulb size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Mode Inspiration</h1>
        </div>
        <p className="text-white/50">Sélectionne jusqu'à 5 de tes livres · L'IA génère 3 nouvelles idées originales qui s'en inspirent</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        {/* Left: config */}
        <div className="space-y-5">

          {/* Book selector */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <BookOpen size={15} /> Livres d&apos;inspiration
              </h2>
              <span className="text-white/30 text-xs">{selected.length}/5 sélectionnés</span>
            </div>

            {books.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen size={36} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/40 text-sm mb-3">Aucun livre dans ta bibliothèque</p>
                <button onClick={() => router.push("/studio")}
                  className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl text-sm hover:bg-purple-500/30 transition-colors">
                  Créer un livre d'abord
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {books.map(book => {
                  const isSelected = selected.includes(book.id);
                  return (
                    <button key={book.id} onClick={() => toggle(book.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${isSelected ? "bg-amber-500/15 border-amber-500/30" : "border-white/[0.06] hover:border-white/10 hover:bg-white/[0.03]"}`}>
                      {book.hasCover && book.coverDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={book.coverDataUrl} alt="" className="w-7 h-10 rounded object-cover border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-7 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <BookOpen size={10} className="text-white/20" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? "text-amber-200" : "text-white/70"}`}>{book.title}</p>
                        <p className="text-white/30 text-xs">{book.category} · {book.chapters.length} chapitres</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? "bg-amber-500 border-amber-500" : "border-white/20"}`}>
                        {isSelected && <Check size={11} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4">
            <h2 className="text-white font-semibold">Options (facultatif)</h2>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Orienter vers une catégorie</label>
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                <option value="">Laisser l'IA choisir</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Audience cible</label>
              <input value={newAudience} onChange={e => setNewAudience(e.target.value)}
                placeholder="Ex: femmes 25-40 ans, entrepreneurs débutants..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
          </div>

          {/* Selected summary */}
          {selectedBooks.length > 0 && (
            <div className="bg-amber-500/8 border border-amber-500/15 rounded-2xl p-4">
              <p className="text-amber-300 text-xs font-medium mb-2">Sources d'inspiration :</p>
              <div className="flex flex-wrap gap-2">
                {selectedBooks.map(b => (
                  <div key={b.id} className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/20 rounded-lg px-2.5 py-1">
                    <span className="text-amber-200 text-xs truncate max-w-32">{b.title}</span>
                    <button onClick={() => toggle(b.id)} className="text-amber-400/60 hover:text-amber-300 transition-colors">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={run} disabled={loading || selected.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Génération des idées en cours..." : `Générer 3 idées à partir de ${selected.length} livre${selected.length > 1 ? "s" : ""}`}
          </button>
        </div>

        {/* Right: results */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 min-h-[500px]">
          {ideas ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Lightbulb size={14} className="text-amber-400" /> 3 idées générées
                </h3>
                <button onClick={copy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs transition-colors">
                  {copied ? <><Check size={11} className="text-emerald-400" /> Copié</> : <><Copy size={11} /> Copier</>}
                </button>
              </div>
              <div className="overflow-y-auto max-h-[65vh] space-y-1">
                <pre className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-sans">{ideas}</pre>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-white/30 text-xs mb-2">Tu aimes une idée ? Lance le studio :</p>
                <button onClick={() => router.push("/studio")}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 text-purple-300 rounded-xl text-sm transition-colors">
                  <BookOpen size={13} /> Ouvrir le Studio d'Écriture <ChevronRight size={13} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16">
              <Lightbulb size={52} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm text-center">Les idées inspirées de tes livres apparaîtront ici</p>
              <p className="text-white/20 text-xs mt-2 text-center">Sélectionne 1 à 5 livres et lance la génération</p>
              {books.length > 0 && selected.length === 0 && (
                <p className="text-amber-400/50 text-xs mt-4 text-center">← Coche des livres à gauche pour commencer</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
