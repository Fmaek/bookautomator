"use client";
import { useState, useEffect } from "react";
import { Library, BookOpen, Plus, Search, Edit3, Trash2, Send, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getBooks, deleteBook, type Book } from "@/lib/books";

const STATUS_STYLES: Record<string, string> = {
  "brouillon": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "prêt": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "publié": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "brouillon" | "prêt" | "publié">("all");

  useEffect(() => {
    setBooks(getBooks());
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ce livre définitivement ?")) return;
    deleteBook(id);
    setBooks(getBooks());
  };

  const filtered = books.filter(b => {
    const matchSearch = b.title.toLowerCase().includes(search.toLowerCase()) || b.category.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filter === "all" || b.status === filter);
  });

  return (
    <div className="p-8 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Ma Bibliothèque</h1>
          <p className="text-white/50">Tous tes livres, leur avancement et leur statut</p>
        </div>
        <Link href="/studio" className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> Nouveau livre
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total", value: books.length, color: "text-white" },
          { label: "Brouillons", value: books.filter(b => b.status === "brouillon").length, color: "text-yellow-400" },
          { label: "Prêts", value: books.filter(b => b.status === "prêt").length, color: "text-blue-400" },
          { label: "Publiés", value: books.filter(b => b.status === "publié").length, color: "text-emerald-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-white/40 text-sm">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un livre..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none" />
        </div>
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          {(["all", "brouillon", "prêt", "publié"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-purple-500 text-white" : "text-white/40 hover:text-white"}`}>
              {f === "all" ? "Tous" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Library size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/30 text-lg">
            {books.length === 0 ? "Aucun livre encore créé" : "Aucun livre trouvé"}
          </p>
          <p className="text-white/20 text-sm mt-1">
            {books.length === 0 ? "Génère ton premier livre dans le Studio d'Écriture" : "Essaie une autre recherche"}
          </p>
          <Link href="/studio" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl text-sm">
            <Plus size={14} /> Créer ton premier livre
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(book => (
            <div key={book.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-all">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-20 rounded-lg shrink-0 flex items-center justify-center ${book.hasCover ? "bg-gradient-to-br from-purple-500 to-pink-500" : "bg-white/5 border border-dashed border-white/10"}`}>
                  <BookOpen size={20} className={book.hasCover ? "text-white" : "text-white/20"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-white font-semibold text-sm leading-snug mb-2">{book.title}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{book.category}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[book.status]}`}>{book.status}</span>
                        <span className="text-xs text-white/30">{book.pages} pages</span>
                        {book.chapters?.length > 0 && (
                          <span className="text-xs text-white/20">{book.chapters.length} chapitres</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href="/studio" className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                        <Edit3 size={13} className="text-white/40" />
                      </Link>
                      {book.status !== "publié" && (
                        <Link href="/publish" className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                          <Send size={13} className="text-white/40" />
                        </Link>
                      )}
                      <button onClick={() => handleDelete(book.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={13} className="text-white/30 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-white/30 mb-1">
                        <span>Checklist</span>
                        <span>{book.checklistPct}%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${book.checklistPct >= 90 ? "bg-emerald-500" : book.checklistPct >= 60 ? "bg-yellow-500" : "bg-orange-500"}`}
                          style={{ width: `${book.checklistPct}%` }} />
                      </div>
                    </div>
                    {book.platforms.length > 0 && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <TrendingUp size={11} />{book.platforms.length} plateforme{book.platforms.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {book.platforms.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {book.platforms.map(p => (
                        <span key={p} className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-300/70 rounded-full border border-emerald-500/20">{p}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-white/20 text-xs mt-2">
                    Créé le {new Date(book.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
