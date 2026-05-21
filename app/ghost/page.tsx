"use client";
import { useState, useEffect } from "react";
import { Ghost, Sparkles, Loader2, CheckCircle, Download, BookOpen, Play, Square } from "lucide-react";
import { getBooks, saveBook, type Book } from "@/lib/books";

export default function GhostModePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState<"idle" | "planning" | "writing" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [currentChapter, setCurrentChapter] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [aborted, setAborted] = useState(false);

  useEffect(() => { setBooks(getBooks()); }, []);

  const book = books.find(b => b.id === selectedId);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const run = async () => {
    if (!book || book.chapters.length === 0) return;
    setAborted(false);
    setLog([]);
    setProgress(0);
    setStatus("writing");
    addLog(`📖 Démarrage Ghost Mode pour "${book.title}"...`);
    addLog(`📋 ${book.chapters.length} chapitres détectés`);

    const updatedChapters = [...book.chapters];
    const total = book.chapters.length;

    for (let i = 0; i < total; i++) {
      if (aborted) { addLog("⛔ Arrêté par l'utilisateur"); break; }
      const ch = book.chapters[i];
      setCurrentChapter(ch.title);
      addLog(`✍️ Chapitre ${i + 1}/${total}: "${ch.title}"`);

      try {
        const res = await fetch("/api/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ghost_book",
            title: book.title,
            category: book.category,
            description: "",
            style: "Motivant, clair et direct",
            chapterTitle: ch.title,
            chapterIndex: i,
            totalChapters: total,
          }),
        });
        const data = await res.json();
        if (data.content) {
          updatedChapters[i] = { ...ch, content: data.content };
          addLog(`   ✓ ${data.content.split(" ").length} mots générés`);
        }
      } catch {
        addLog(`   ✗ Erreur sur ce chapitre`);
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    const updated: Book = { ...book, chapters: updatedChapters, updatedAt: new Date().toISOString() };
    saveBook(updated);
    setBooks(getBooks());
    setStatus("done");
    setCurrentChapter("");
    addLog(`🎉 Livre complet ! ${total} chapitres écrits et sauvegardés.`);
  };

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder-white/30";

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
            <Ghost size={20} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Ghost Mode</h1>
        </div>
        <p className="text-white/50">L'IA écrit tous les chapitres de ton livre automatiquement — toi tu relis</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Livre à compléter</h2>

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Choisir un livre avec un plan existant</label>
              <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setStatus("idle"); setLog([]); }}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                <option value="">Choisir un livre...</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title} ({b.chapters.length} chapitres)</option>)}
              </select>
            </div>

            {book && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-2">
                <p className="text-purple-300 font-medium text-sm">{book.title}</p>
                <p className="text-white/40 text-xs">{book.category} · {book.chapters.length} chapitres à écrire</p>
                <div className="space-y-1 mt-2">
                  {book.chapters.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {c.content.length > 50
                        ? <CheckCircle size={11} className="text-emerald-400 shrink-0" />
                        : <div className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0" />}
                      <span className={c.content.length > 50 ? "text-white/40 line-through" : "text-white/60"}>{c.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-amber-500/8 border border-amber-500/15 rounded-xl">
              <p className="text-amber-300 text-xs font-medium mb-1">⚡ Comment ça marche</p>
              <p className="text-white/40 text-xs leading-relaxed">L'IA génère chaque chapitre séquentiellement. Les chapitres déjà écrits (50+ mots) seront réécris. Le livre est sauvegardé automatiquement.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={run} disabled={!book || status === "writing"}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
                {status === "writing" ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {status === "writing" ? "Écriture en cours..." : status === "done" ? "Relancer" : "Lancer Ghost Mode"}
              </button>
              {status === "writing" && (
                <button onClick={() => setAborted(true)}
                  className="px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-sm hover:bg-red-500/30 transition-colors">
                  <Square size={14} />
                </button>
              )}
            </div>
          </div>

          {status !== "idle" && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/60 text-sm">Progression</span>
                <span className="text-white font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 mb-3">
                <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              {currentChapter && <p className="text-purple-300 text-xs">✍️ En cours: {currentChapter}</p>}
              {status === "done" && (
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span className="text-emerald-300 text-sm font-medium">Livre complet ! Consulte le Studio pour relire.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={15} className="text-white/40" />
            <h3 className="text-white font-semibold text-sm">Journal d'écriture</h3>
          </div>
          {log.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Ghost size={40} className="text-white/10 mb-3" />
              <p className="text-white/25 text-sm">Le journal s'affiche ici pendant l'écriture</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[60vh] overflow-y-auto font-mono">
              {log.map((l, i) => (
                <p key={i} className="text-white/60 text-xs leading-relaxed">{l}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
