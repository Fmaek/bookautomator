"use client";
import { useState, useEffect } from "react";
import { Package, Plus, Trash2, Download, Loader2, Sparkles, CheckCircle, GripVertical } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";
import { generateEpub, downloadEpub } from "@/lib/epub";

export default function BundlePage() {
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bundleTitle, setBundleTitle] = useState("");
  const [bundleAuthor, setBundleAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingEpub, setGeneratingEpub] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => { setAllBooks(getBooks()); }, []);

  const selectedBooks = selectedIds.map(id => allBooks.find(b => b.id === id)).filter(Boolean) as Book[];

  const toggleBook = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setSelectedIds(prev => { const n = [...prev]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n; });
  };

  const moveDown = (idx: number) => {
    setSelectedIds(prev => { if (idx >= prev.length - 1) return prev; const n = [...prev]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; return n; });
  };

  const generateDescription = async () => {
    if (selectedBooks.length === 0) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bundle_desc",
          bundleTitle: bundleTitle || "Bundle",
          books: selectedBooks.map(b => b.title),
        }),
      });
      const data = await res.json();
      setDescription(data.description || "");
    } catch { }
    setGenerating(false);
  };

  const exportBundle = async () => {
    if (selectedBooks.length === 0) return;
    setGeneratingEpub(true);
    try {
      // Merge all books into a single virtual book
      const allChapters = selectedBooks.flatMap((b, bi) => [
        { title: `— ${b.title} —`, content: `Livre ${bi + 1} du bundle.\n\n${b.title}` },
        ...b.chapters,
      ]);
      const bundleBook: Book = {
        id: "bundle",
        title: bundleTitle || `Bundle (${selectedBooks.length} livres)`,
        category: "Bundle",
        status: "brouillon",
        pages: selectedBooks.reduce((s, b) => s + b.pages, 0),
        hasCover: false,
        checklistPct: 0,
        platforms: [],
        authorName: bundleAuthor,
        chapters: allChapters,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const blob = await generateEpub(bundleBook);
      downloadEpub(blob, bundleBook.title);
      setGenerated(true);
      setTimeout(() => setGenerated(false), 3000);
    } catch (e) { console.error(e); }
    setGeneratingEpub(false);
  };

  const totalWords = selectedBooks.reduce((s, b) => s + b.chapters.reduce((cs, c) => cs + (c.content.split(" ").length || 0), 0), 0);
  const totalPages = selectedBooks.reduce((s, b) => s + b.pages, 0);

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Bundle Builder</h1>
        <p className="text-white/50">Regroupe plusieurs livres en un seul EPUB vendu ensemble</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Left: Book selector */}
        <div className="space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Sélectionne les livres</h2>
            {allBooks.length === 0 ? (
              <p className="text-white/40 text-sm">Aucun livre dans ta bibliothèque</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {allBooks.map(book => (
                  <button key={book.id} onClick={() => toggleBook(book.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedIds.includes(book.id) ? "bg-purple-500/20 border-purple-500/40" : "bg-white/[0.02] border-white/[0.06] hover:border-white/10"}`}>
                    <div className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-all ${selectedIds.includes(book.id) ? "bg-purple-500 border-purple-500" : "border-white/20"}`}>
                      {selectedIds.includes(book.id) && <CheckCircle size={10} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{book.title}</p>
                      <p className="text-white/40 text-xs">{book.pages} pages · {book.chapters.length} chapitres</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Informations du bundle</h2>
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Titre du bundle</label>
              <input value={bundleTitle} onChange={e => setBundleTitle(e.target.value)}
                placeholder="Ex: Collection Développement Personnel — 3 livres" className={ic} />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Auteur</label>
              <input value={bundleAuthor} onChange={e => setBundleAuthor(e.target.value)}
                placeholder="Ton nom" className={ic} />
            </div>
          </div>
        </div>

        {/* Right: Order + export */}
        <div className="space-y-5">
          {selectedBooks.length > 0 ? (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Ordre des livres dans le bundle</h2>
                <div className="text-right">
                  <p className="text-white/60 text-xs">{selectedBooks.length} livres · {totalPages} pages</p>
                  <p className="text-white/40 text-xs">{Math.round(totalWords / 1000)}k mots</p>
                </div>
              </div>
              <div className="space-y-2 mb-5">
                {selectedBooks.map((book, i) => (
                  <div key={book.id} className="flex items-center gap-2 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                    <GripVertical size={13} className="text-white/20 shrink-0" />
                    <span className="text-white/30 text-xs w-4">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{book.title}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => moveUp(i)} disabled={i === 0} className="p-1 text-white/30 hover:text-white disabled:opacity-20 text-xs">▲</button>
                      <button onClick={() => moveDown(i)} disabled={i === selectedBooks.length - 1} className="p-1 text-white/30 hover:text-white disabled:opacity-20 text-xs">▼</button>
                      <button onClick={() => toggleBook(book.id)} className="p-1 text-white/20 hover:text-red-400 transition-colors"><Trash2 size={11} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={generateDescription} disabled={generating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 text-amber-300 rounded-xl text-sm transition-colors disabled:opacity-50">
                  {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  Générer description IA
                </button>
                <button onClick={exportBundle} disabled={generatingEpub || selectedBooks.length === 0}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${generated ? "bg-emerald-500 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"}`}>
                  {generatingEpub ? <Loader2 size={13} className="animate-spin" /> : generated ? <CheckCircle size={13} /> : <Download size={13} />}
                  {generatingEpub ? "Export..." : generated ? "Téléchargé !" : "Export EPUB"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 text-center">
              <Package size={40} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">Sélectionne au moins 2 livres</p>
              <p className="text-white/25 text-xs mt-1">pour créer un bundle</p>
            </div>
          )}

          {description && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Description générée</h3>
                <button onClick={() => navigator.clipboard.writeText(description)}
                  className="text-white/40 hover:text-white text-xs transition-colors">Copier</button>
              </div>
              <pre className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-sans">{description}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
