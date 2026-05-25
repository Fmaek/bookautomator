"use client";
import { useState } from "react";
import { Search, BookOpen, Download, ExternalLink, Loader2, Globe, User, Library, AlertCircle, FileText } from "lucide-react";
import type { BookResult } from "@/app/api/search-books/route";

const SEARCH_TYPES = [
  { id: "author", label: "Par auteur", icon: User, placeholder: "Ex: Mahmoud Darwish, Victor Hugo, Amin Maalouf..." },
  { id: "title",  label: "Par titre",  icon: BookOpen, placeholder: "Ex: Les Misérables, L'Alchimiste..." },
  { id: "subject",label: "Par sujet",  icon: Library, placeholder: "Ex: philosophie, amour, guerre, spiritualité..." },
] as const;

const FORMAT_COLORS: Record<string, string> = {
  epub: "bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30",
  pdf:  "bg-red-500/20  border-red-500/30  text-red-300  hover:bg-red-500/30",
  txt:  "bg-white/5    border-white/10     text-white/50 hover:bg-white/10",
};

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"author" | "title" | "subject">("author");
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<BookResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setBooks([]);
    setError("");
    setSearched(false);
    try {
      const res = await fetch(`/api/search-books?q=${encodeURIComponent(query.trim())}&type=${type}`);
      const data = await res.json();
      if (data.error) setError("Erreur lors de la recherche. Vérifie ta connexion.");
      setBooks(data.books || []);
      setSearched(true);
    } catch {
      setError("Impossible de joindre les bibliothèques en ligne.");
    }
    setLoading(false);
  };

  const currentType = SEARCH_TYPES.find(t => t.id === type)!;

  return (
    <div className="p-4 md:p-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 flex items-center justify-center">
            <Globe size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Bibliothèque Mondiale</h1>
        </div>
        <p className="text-white/50">Recherche les œuvres de n'importe quel auteur · Télécharge gratuitement les livres du domaine public</p>
      </div>

      {/* Search box */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 mb-6 space-y-4">

        {/* Type tabs */}
        <div className="flex gap-2">
          {SEARCH_TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${type === t.id ? "bg-sky-500/20 border-sky-500/40 text-sky-300" : "border-white/[0.06] text-white/40 hover:text-white hover:border-white/10"}`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder={currentType.placeholder}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-sky-500/50"
            />
          </div>
          <button onClick={search} disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {loading ? "Recherche..." : "Chercher"}
          </button>
        </div>

        <p className="text-white/20 text-xs">Sources : Open Library (Internet Archive) + Project Gutenberg · Livres en français en priorité</p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={36} className="text-sky-400 animate-spin mb-4" />
          <p className="text-white/40 text-sm">Interrogation des bibliothèques mondiales...</p>
          <p className="text-white/20 text-xs mt-1">Open Library + Project Gutenberg</p>
        </div>
      )}

      {!loading && searched && books.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <BookOpen size={48} className="text-white/10 mb-4" />
          <p className="text-white/40 text-sm">Aucun résultat trouvé pour «&nbsp;{query}&nbsp;»</p>
          <p className="text-white/25 text-xs mt-2">Essaie en anglais ou avec un prénom complet</p>
        </div>
      )}

      {!loading && books.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/60 text-sm">
              <span className="text-white font-semibold">{books.length}</span> œuvre{books.length > 1 ? "s" : ""} trouvée{books.length > 1 ? "s" : ""}
              {type === "author" && <span className="text-white/30"> · bibliographie de <span className="text-sky-300">{query}</span></span>}
            </p>
            <div className="flex items-center gap-3 text-xs text-white/30">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Domaine public — téléchargeable</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Protégé — lecture en ligne seulement</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {books.map((book, i) => (
              <div key={`${book.id}-${i}`}
                className={`bg-white/[0.03] border rounded-2xl p-4 flex flex-col gap-3 ${book.isPublicDomain ? "border-emerald-500/15" : "border-white/[0.06]"}`}>

                {/* Cover + meta */}
                <div className="flex gap-3">
                  {book.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.coverUrl} alt={book.title}
                      className="w-14 h-20 object-cover rounded-lg border border-white/10 shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-14 h-20 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <BookOpen size={18} className="text-white/20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium leading-snug line-clamp-2">{book.title}</p>
                    {book.authors.length > 0 && (
                      <p className="text-white/50 text-xs mt-1 truncate">{book.authors.join(", ")}</p>
                    )}
                    {book.year && <p className="text-white/30 text-xs mt-0.5">{book.year}</p>}

                    {/* Source badge */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {book.isPublicDomain ? (
                        <span className="text-xs bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md">Domaine public</span>
                      ) : (
                        <span className="text-xs bg-amber-500/15 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md">Protégé</span>
                      )}
                      <span className="text-xs text-white/20">
                        {book.source === "gutenberg" ? "Gutenberg" : "Open Library"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subjects */}
                {book.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {book.subjects.slice(0, 3).map((s, si) => (
                      <span key={si} className="text-xs bg-white/5 border border-white/10 text-white/30 px-2 py-0.5 rounded-full truncate max-w-full">{s}</span>
                    ))}
                  </div>
                )}

                {/* Download buttons */}
                <div className="mt-auto space-y-2">
                  {book.downloadLinks.length > 0 ? (
                    <>
                      <p className="text-white/30 text-xs flex items-center gap-1"><Download size={10} /> Télécharger gratuitement :</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {book.downloadLinks.map(dl => (
                          <a key={dl.format} href={dl.url} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${FORMAT_COLORS[dl.format] || FORMAT_COLORS.txt}`}>
                            <FileText size={10} /> {dl.label}
                          </a>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-white/20 text-xs italic">
                      {book.isPublicDomain ? "Fichiers non indexés" : "Non téléchargeable librement"}
                    </p>
                  )}

                  {/* Read / Open Library link */}
                  {book.readUrl && (
                    <a href={book.readUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-sky-400/70 hover:text-sky-300 transition-colors">
                      <ExternalLink size={10} />
                      {book.isPublicDomain && book.downloadLinks.length > 0 ? "Voir en ligne" : "Voir sur le site source"}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Copyright notice */}
          <div className="mt-8 p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
            <p className="text-white/20 text-xs leading-relaxed">
              <span className="text-white/40 font-medium">ℹ️ À propos des droits</span> — Les livres marqués "Domaine public" sont librement téléchargeables car leurs auteurs sont décédés depuis plus de 70 ans.
              Les œuvres protégées par le droit d'auteur (auteurs récents) ne sont pas téléchargeables directement — redirige vers une bibliothèque légale (Open Library, Bibliothèque Nationale de France, etc.).
            </p>
          </div>
        </>
      )}

      {/* Empty state initial */}
      {!loading && !searched && (
        <div className="flex flex-col items-center justify-center py-24">
          <Globe size={56} className="text-white/8 mb-5" />
          <p className="text-white/30 text-base font-medium">Explore la bibliothèque mondiale</p>
          <p className="text-white/20 text-sm mt-2 text-center max-w-sm">
            Retrouve toutes les œuvres d'un auteur, télécharge les livres du domaine public en EPUB ou PDF
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-white/20">
            {["Victor Hugo", "Mahmoud Darwish", "Aimé Césaire", "Voltaire"].map(ex => (
              <button key={ex} onClick={() => { setQuery(ex); setType("author"); }}
                className="px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-white/10 hover:text-white/40 transition-all text-left">
                🔍 {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
