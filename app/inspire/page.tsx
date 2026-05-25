"use client";
import { useState, useEffect } from "react";
import {
  Lightbulb, Sparkles, Loader2, Copy, BookOpen,
  Check, X, ChevronRight, Globe, Search, Library, User
} from "lucide-react";
import { getBooks, type Book } from "@/lib/books";
import { useRouter } from "next/navigation";
import type { BookResult } from "@/app/api/search-books/route";

const CATEGORIES = [
  "Business & Entrepreneuriat", "Développement personnel", "Spiritualité",
  "Roman / Fiction", "Santé & Bien-être", "Finance & Investissement",
  "Poésie / Recueil", "Thriller", "Auto-biographie", "Technologie",
];

type SourceTab = "mine" | "world";

interface SelectedSource {
  id: string;
  title: string;
  category: string;
  summary: string;
  origin: "mine" | "world";
}

export default function InspirePage() {
  const router = useRouter();

  // My books
  const [myBooks, setMyBooks] = useState<Book[]>([]);

  // World search
  const [sourceTab, setSourceTab] = useState<SourceTab>("world");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"author" | "title" | "subject">("author");
  const [searchLoading, setSearchLoading] = useState(false);
  const [worldBooks, setWorldBooks] = useState<BookResult[]>([]);
  const [worldSearched, setWorldSearched] = useState(false);

  // Selection (both sources)
  const [selected, setSelected] = useState<SelectedSource[]>([]);

  // Generation
  const [newCategory, setNewCategory] = useState("");
  const [newAudience, setNewAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { setMyBooks(getBooks()); }, []);

  /* ── Search world books ── */
  const searchWorld = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setWorldBooks([]);
    setWorldSearched(false);
    try {
      const res = await fetch(`/api/search-books?q=${encodeURIComponent(searchQuery.trim())}&type=${searchType}`);
      const data = await res.json();
      setWorldBooks(data.books || []);
      setWorldSearched(true);
    } catch { }
    setSearchLoading(false);
  };

  /* ── Toggle selection ── */
  const toggleMine = (book: Book) => {
    const id = `mine-${book.id}`;
    if (selected.find(s => s.id === id)) {
      setSelected(prev => prev.filter(s => s.id !== id));
    } else if (selected.length < 5) {
      const summary = book.chapters.map(c => c.content).join(" ").substring(0, 300);
      setSelected(prev => [...prev, { id, title: book.title, category: book.category, summary, origin: "mine" }]);
    }
  };

  const toggleWorld = (book: BookResult) => {
    const id = `world-${book.id}`;
    if (selected.find(s => s.id === id)) {
      setSelected(prev => prev.filter(s => s.id !== id));
    } else if (selected.length < 5) {
      setSelected(prev => [...prev, {
        id,
        title: book.title,
        category: book.subjects.slice(0, 2).join(", ") || "Littérature",
        summary: `${book.authors.join(", ")}${book.year ? ` (${book.year})` : ""}. ${book.subjects.slice(0, 3).join(", ")}.`,
        origin: "world",
      }]);
    }
  };

  const isSelectedMine  = (book: Book)       => !!selected.find(s => s.id === `mine-${book.id}`);
  const isSelectedWorld = (book: BookResult) => !!selected.find(s => s.id === `world-${book.id}`);

  /* ── Generate ideas ── */
  const run = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setIdeas("");
    try {
      const payload = selected.map(s => ({
        title: s.title,
        category: s.category,
        summary: s.summary,
      }));
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

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Lightbulb size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Mode Inspiration</h1>
        </div>
        <p className="text-white/50">
          Sélectionne jusqu'à 5 livres (les tiens ou de grands auteurs) · L'IA génère 3 idées originales qui s'en inspirent
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">

        {/* ── LEFT : source selection ── */}
        <div className="space-y-4">

          {/* Source tabs */}
          <div className="flex gap-2 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
            <button onClick={() => setSourceTab("world")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${sourceTab === "world" ? "bg-amber-500 text-white" : "text-white/40 hover:text-white"}`}>
              <Globe size={14} /> Livres du monde
            </button>
            <button onClick={() => setSourceTab("mine")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${sourceTab === "mine" ? "bg-amber-500 text-white" : "text-white/40 hover:text-white"}`}>
              <Library size={14} /> Mes livres
            </button>
          </div>

          {/* ── WORLD SEARCH ── */}
          {sourceTab === "world" && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <h2 className="text-white font-semibold flex items-center gap-2"><Globe size={14} className="text-amber-400" /> Rechercher des livres publiés</h2>

              {/* Search type */}
              <div className="flex gap-2">
                {(["author", "title", "subject"] as const).map(t => {
                  const icons = { author: User, title: BookOpen, subject: Library };
                  const labels = { author: "Auteur", title: "Titre", subject: "Sujet" };
                  const Icon = icons[t];
                  return (
                    <button key={t} onClick={() => setSearchType(t)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${searchType === t ? "bg-amber-500/20 border-amber-500/30 text-amber-300" : "border-white/[0.06] text-white/40 hover:border-white/10 hover:text-white"}`}>
                      <Icon size={11} /> {labels[t]}
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && searchWorld()}
                    placeholder={
                      searchType === "author"  ? "Mahmoud Darwish, Victor Hugo..." :
                      searchType === "title"   ? "Le Prophète, Les Misérables..." :
                                                 "amour, exil, philosophie..."
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <button onClick={searchWorld} disabled={searchLoading || !searchQuery.trim()}
                  className="px-4 py-2.5 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-40 text-amber-300 rounded-xl text-sm transition-colors">
                  {searchLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                </button>
              </div>

              {/* World results */}
              {searchLoading && (
                <div className="py-6 text-center">
                  <Loader2 size={22} className="text-amber-400 animate-spin mx-auto mb-2" />
                  <p className="text-white/30 text-xs">Interrogation des bibliothèques mondiales...</p>
                </div>
              )}

              {!searchLoading && worldSearched && worldBooks.length === 0 && (
                <p className="text-white/30 text-sm text-center py-6">Aucun résultat pour «&nbsp;{searchQuery}&nbsp;»</p>
              )}

              {!searchLoading && worldBooks.length > 0 && (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  <p className="text-white/30 text-xs">{worldBooks.length} livres trouvés — sélectionne jusqu'à {5 - selected.length} de plus</p>
                  {worldBooks.map((book, i) => {
                    const isSel = isSelectedWorld(book);
                    const maxed = selected.length >= 5 && !isSel;
                    return (
                      <button key={`${book.id}-${i}`} onClick={() => !maxed && toggleWorld(book)} disabled={maxed}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${isSel ? "bg-amber-500/15 border-amber-500/30" : maxed ? "opacity-40 border-white/[0.04]" : "border-white/[0.06] hover:border-white/10 hover:bg-white/[0.03]"}`}>
                        {book.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={book.coverUrl} alt=""
                            className="w-7 h-10 object-cover rounded border border-white/10 shrink-0"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="w-7 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <BookOpen size={9} className="text-white/20" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSel ? "text-amber-200" : "text-white/70"}`}>{book.title}</p>
                          <p className="text-white/30 text-xs truncate">{book.authors.join(", ")}{book.year ? ` · ${book.year}` : ""}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSel ? "bg-amber-500 border-amber-500" : "border-white/20"}`}>
                          {isSel && <Check size={10} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {!worldSearched && (
                <div className="pt-2">
                  <p className="text-white/20 text-xs mb-2">Suggestions rapides :</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Mahmoud Darwish", "Amin Maalouf", "Frantz Fanon", "Aimé Césaire", "Khalil Gibran"].map(s => (
                      <button key={s} onClick={() => { setSearchQuery(s); setSearchType("author"); }}
                        className="px-2.5 py-1 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-white/30 hover:text-white/60 hover:border-white/10 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MY BOOKS ── */}
          {sourceTab === "mine" && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <h2 className="text-white font-semibold flex items-center gap-2"><Library size={14} className="text-amber-400" /> Mes livres créés</h2>
              {myBooks.length === 0 ? (
                <div className="py-8 text-center">
                  <BookOpen size={32} className="text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 text-sm mb-3">Aucun livre dans ta bibliothèque</p>
                  <button onClick={() => router.push("/studio")}
                    className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl text-sm hover:bg-purple-500/30 transition-colors">
                    Créer un livre d'abord
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {myBooks.map(book => {
                    const isSel = isSelectedMine(book);
                    const maxed = selected.length >= 5 && !isSel;
                    return (
                      <button key={book.id} onClick={() => !maxed && toggleMine(book)} disabled={maxed}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${isSel ? "bg-amber-500/15 border-amber-500/30" : maxed ? "opacity-40 border-white/[0.04]" : "border-white/[0.06] hover:border-white/10 hover:bg-white/[0.03]"}`}>
                        {book.hasCover && book.coverDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={book.coverDataUrl} alt="" className="w-7 h-10 rounded object-cover border border-white/10 shrink-0" />
                        ) : (
                          <div className="w-7 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <BookOpen size={9} className="text-white/20" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSel ? "text-amber-200" : "text-white/70"}`}>{book.title}</p>
                          <p className="text-white/30 text-xs">{book.category} · {book.chapters.length} chapitres</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSel ? "bg-amber-500 border-amber-500" : "border-white/20"}`}>
                          {isSel && <Check size={10} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Selection summary ── */}
          {selected.length > 0 && (
            <div className="bg-amber-500/8 border border-amber-500/15 rounded-2xl p-4 space-y-2">
              <p className="text-amber-300 text-xs font-medium">{selected.length}/5 sources sélectionnées :</p>
              <div className="flex flex-wrap gap-2">
                {selected.map(s => (
                  <div key={s.id} className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/20 rounded-lg px-2.5 py-1">
                    {s.origin === "world" ? <Globe size={9} className="text-amber-400 shrink-0" /> : <Library size={9} className="text-amber-400 shrink-0" />}
                    <span className="text-amber-200 text-xs truncate max-w-36">{s.title}</span>
                    <button onClick={() => setSelected(prev => prev.filter(x => x.id !== s.id))} className="text-amber-400/60 hover:text-amber-300 transition-colors ml-0.5">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Options ── */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
            <h2 className="text-white/70 text-sm font-semibold">Options (facultatif)</h2>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none">
              <option value="">Laisser l'IA choisir la catégorie</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input value={newAudience} onChange={e => setNewAudience(e.target.value)}
              placeholder="Audience cible (ex: femmes 30-45 ans, entrepreneurs...)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-amber-500/50" />
          </div>

          {/* ── Generate button ── */}
          <button onClick={run} disabled={loading || selected.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 text-white rounded-xl font-semibold transition-all">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Génération des idées..." : `Générer 3 idées (${selected.length} source${selected.length > 1 ? "s" : ""})`}
          </button>
        </div>

        {/* ── RIGHT : results ── */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 min-h-[500px]">
          {ideas ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Lightbulb size={14} className="text-amber-400" /> 3 idées originales générées
                </h3>
                <button onClick={copy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs transition-colors">
                  {copied ? <><Check size={11} className="text-emerald-400" /> Copié</> : <><Copy size={11} /> Copier</>}
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh]">
                <pre className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-sans">{ideas}</pre>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                <button onClick={() => router.push("/studio")}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 text-purple-300 rounded-xl text-sm transition-colors">
                  <BookOpen size={13} /> Ouvrir le Studio <ChevronRight size={13} />
                </button>
                <button onClick={() => setIdeas("")}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/40 rounded-xl text-sm transition-colors">
                  Réinitialiser
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16">
              <Lightbulb size={52} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm text-center">Les idées générées apparaîtront ici</p>
              <p className="text-white/20 text-xs mt-2 text-center">
                Cherche des livres d'auteurs publiés ou sélectionne tes propres livres
              </p>
              {selected.length === 0 && (
                <p className="text-amber-400/40 text-xs mt-5 text-center">← Sélectionne 1 à 5 livres pour commencer</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
