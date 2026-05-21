"use client";
import { useState, useEffect, useRef } from "react";
import {
  Library, BookOpen, Plus, Search, Edit3, Trash2, Send,
  TrendingUp, Eye, Tag, Upload, X, FileText
} from "lucide-react";
import Link from "next/link";
import { getBooks, deleteBook, saveBook, newBook, type Book } from "@/lib/books";

const STATUS_STYLES: Record<string, string> = {
  "brouillon": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "prêt":      "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "publié":    "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const TAG_COLORS = [
  "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
];

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "brouillon" | "prêt" | "publié">("all");
  const [tagFilter, setTagFilter] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importTitle, setImportTitle] = useState("");
  const [importText, setImportText] = useState("");
  const [addingTagFor, setAddingTagFor] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setBooks(getBooks()); }, []);

  const allTags = [...new Set(books.flatMap(b => b.tags || []))];

  const filtered = books.filter(b => {
    const matchSearch = b.title.toLowerCase().includes(search.toLowerCase()) || b.category.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || b.status === filter;
    const matchTag = !tagFilter || (b.tags || []).includes(tagFilter);
    return matchSearch && matchFilter && matchTag;
  });

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ce livre définitivement ?")) return;
    deleteBook(id);
    setBooks(getBooks());
  };

  const addTag = (bookId: string) => {
    if (!newTag.trim()) return;
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const tags = [...new Set([...(book.tags || []), newTag.trim()])];
    saveBook({ ...book, tags });
    setBooks(getBooks());
    setNewTag("");
    setAddingTagFor(null);
  };

  const removeTag = (bookId: string, tag: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    saveBook({ ...book, tags: (book.tags || []).filter(t => t !== tag) });
    setBooks(getBooks());
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImportText(ev.target?.result as string || "");
    reader.readAsText(file);
    setImportTitle(file.name.replace(/\.[^.]+$/, ""));
  };

  const importBook = () => {
    if (!importTitle.trim() || !importText.trim()) return;
    const lines = importText.split(/\n\n+/);
    const chapters: { title: string; content: string }[] = [];
    let current: { title: string; content: string } | null = null;
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith("#") || (t.length < 80 && !t.includes("."))) {
        if (current) chapters.push(current);
        current = { title: t.replace(/^#+\s*/, ""), content: "" };
      } else if (current) {
        current.content += (current.content ? "\n\n" : "") + t;
      }
    }
    if (current) chapters.push(current);
    if (chapters.length === 0) {
      chapters.push({ title: "Contenu importé", content: importText });
    }
    const book = newBook(importTitle, "Importé");
    saveBook({
      ...book,
      chapters,
      pages: Math.round(importText.split(" ").length / 250),
      status: "brouillon",
    });
    setBooks(getBooks());
    setShowImport(false);
    setImportTitle("");
    setImportText("");
  };

  return (
    <div className="p-8 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Ma Bibliothèque</h1>
          <p className="text-white/50">Tous tes livres — lis, modifie, publie</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-sm transition-colors border border-white/10">
            <Upload size={14} /> Importer
          </button>
          <Link href="/studio" className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={15} /> Nouveau livre
          </Link>
        </div>
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-[500px] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Importer un livre</h3>
              <button onClick={() => setShowImport(false)}><X size={18} className="text-white/40" /></button>
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Titre du livre</label>
              <input value={importTitle} onChange={e => setImportTitle(e.target.value)} placeholder="Mon livre importé"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-white/50 text-xs">Contenu (colle depuis Word / Google Docs)</label>
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
                  <FileText size={11} /> Importer .txt
                </button>
                <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFileImport} />
              </div>
              <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={10}
                placeholder="Colle ici le texte de ton livre depuis Word, Google Docs, ou n'importe quelle source..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/80 text-sm focus:outline-none resize-none leading-relaxed" />
              <p className="text-white/25 text-xs mt-1">{importText.split(/\s+/).filter(Boolean).length} mots · Les lignes courtes deviennent des titres de chapitres</p>
            </div>
            <div className="flex gap-2">
              <button onClick={importBook} disabled={!importTitle || !importText}
                className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
                Importer le livre
              </button>
              <button onClick={() => setShowImport(false)} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl text-sm">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
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

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
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
        {allTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setTagFilter("")}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${!tagFilter ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "border-white/10 text-white/40 hover:text-white"}`}>
              Tous tags
            </button>
            {allTags.map(t => (
              <button key={t} onClick={() => setTagFilter(tagFilter === t ? "" : t)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${tagFilter === t ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "border-white/10 text-white/40 hover:text-white"}`}>
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Library size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/30 text-lg">{books.length === 0 ? "Aucun livre encore créé" : "Aucun livre trouvé"}</p>
          <Link href="/studio" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl text-sm">
            <Plus size={14} /> Créer ton premier livre
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((book, bi) => (
            <div key={book.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-all">
              <div className="flex items-start gap-4">
                <Link href={`/read/${book.id}`} className="shrink-0">
                  <div className={`w-14 h-20 rounded-lg flex items-center justify-center transition-all hover:scale-105 ${book.hasCover && book.coverDataUrl ? "overflow-hidden" : book.hasCover ? "bg-gradient-to-br from-purple-500 to-pink-500" : "bg-white/5 border border-dashed border-white/10"}`}>
                    {book.hasCover && book.coverDataUrl
                      ? <img src={book.coverDataUrl} alt="cover" className="w-full h-full object-cover" />
                      : <BookOpen size={20} className={book.hasCover ? "text-white" : "text-white/20"} />}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/read/${book.id}`}>
                        <h3 className="text-white font-semibold text-sm leading-snug mb-2 hover:text-purple-300 transition-colors">{book.title}</h3>
                      </Link>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{book.category}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[book.status]}`}>{book.status}</span>
                        <span className="text-xs text-white/30">{book.pages} pages</span>
                        {book.chapters?.length > 0 && <span className="text-xs text-white/20">{book.chapters.length} ch.</span>}
                      </div>
                      {/* Tags */}
                      <div className="flex gap-1 flex-wrap items-center">
                        {(book.tags || []).map((tag, ti) => (
                          <span key={tag} className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${TAG_COLORS[ti % TAG_COLORS.length]}`}>
                            #{tag}
                            <button onClick={() => removeTag(book.id, tag)} className="hover:text-red-400 transition-colors ml-0.5">
                              <X size={9} />
                            </button>
                          </span>
                        ))}
                        {addingTagFor === book.id ? (
                          <div className="flex items-center gap-1">
                            <input value={newTag} onChange={e => setNewTag(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") addTag(book.id); if (e.key === "Escape") setAddingTagFor(null); }}
                              placeholder="tag..." autoFocus
                              className="bg-white/10 border border-white/20 rounded-lg px-2 py-0.5 text-white text-xs w-20 focus:outline-none" />
                            <button onClick={() => addTag(book.id)} className="text-emerald-400 hover:text-emerald-300 text-xs">✓</button>
                            <button onClick={() => setAddingTagFor(null)} className="text-white/30 hover:text-white text-xs">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setAddingTagFor(book.id)}
                            className="text-xs text-white/20 hover:text-white/50 flex items-center gap-0.5 transition-colors">
                            <Tag size={10} /> tag
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/read/${book.id}`} className="p-1.5 hover:bg-purple-500/20 rounded-lg transition-colors" title="Lire">
                        <Eye size={13} className="text-purple-400" />
                      </Link>
                      <Link href="/studio" className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Modifier dans Studio">
                        <Edit3 size={13} className="text-white/40" />
                      </Link>
                      {book.status !== "publié" && (
                        <Link href="/publish" className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Publier">
                          <Send size={13} className="text-white/40" />
                        </Link>
                      )}
                      <button onClick={() => handleDelete(book.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={13} className="text-white/30 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-white/30 mb-1">
                        <span>Checklist</span><span>{book.checklistPct}%</span>
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
                  <p className="text-white/20 text-xs mt-1">Créé le {new Date(book.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
