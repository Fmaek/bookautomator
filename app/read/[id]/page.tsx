"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BookOpen, Edit3, Save, CheckCircle,
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Type,
  Image, Send, Loader2, FileDown, Download
} from "lucide-react";
import { getBook, saveBook, type Book } from "@/lib/books";
import { generateEpub, downloadEpub } from "@/lib/epub";

export default function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [fontSize, setFontSize] = useState(17);
  const [fullscreen, setFullscreen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [epubLoading, setEpubLoading] = useState(false);
  const [watermark, setWatermark] = useState("");
  const [showWatermark, setShowWatermark] = useState(false);

  useEffect(() => {
    const b = getBook(id);
    setBook(b);
    if (b?.chapters?.[0]) setEditContent(b.chapters[0].content);
  }, [id]);

  useEffect(() => {
    if (book?.chapters?.[chapterIdx]) {
      setEditContent(book.chapters[chapterIdx].content);
    }
  }, [chapterIdx, book]);

  const chapter = book?.chapters?.[chapterIdx];

  const saveChapter = () => {
    if (!book || !chapter) return;
    const updated: Book = {
      ...book,
      chapters: book.chapters.map((c, i) => i === chapterIdx ? { ...c, content: editContent } : c),
      updatedAt: new Date().toISOString(),
    };
    saveBook(updated);
    setBook(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditMode(false);
  };

  const handleEpub = async () => {
    if (!book) return;
    setEpubLoading(true);
    try {
      const blob = await generateEpub(book, watermark || undefined);
      downloadEpub(blob, book.title);
    } catch (e) { console.error(e); }
    setEpubLoading(false);
    setShowWatermark(false);
  };

  const renderContent = (text: string) => {
    return text.split(/\n\n+/).map((para, i) => {
      const t = para.trim();
      if (!t) return null;
      if (t.startsWith("## ")) return <h2 key={i} className="text-xl font-bold text-white/90 mt-8 mb-3 border-b border-white/10 pb-2">{t.slice(3)}</h2>;
      if (t.startsWith("### ")) return <h3 key={i} className="text-lg font-semibold text-white/80 mt-6 mb-2">{t.slice(4)}</h3>;
      // Strip list markers, convert bold/italic markdown to HTML
      const clean = t
        .replace(/^[-*]\s+/gm, "")          // strip bullet list markers
        .replace(/^\d+\.\s+/gm, "")          // strip numbered list markers
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>");
      return <p key={i} className="text-white/75 leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: clean }} />;
    });
  };

  if (!book) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <BookOpen size={40} className="text-white/20 mx-auto mb-3" />
        <p className="text-white/40">Livre introuvable</p>
        <button onClick={() => router.push("/library")} className="mt-4 text-purple-400 text-sm">← Bibliothèque</button>
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen bg-[#0d0d0f] ${fullscreen ? "fixed inset-0 z-50" : ""}`}>
      {/* Chapter sidebar */}
      {sidebarOpen && (
        <div className="w-64 h-full flex flex-col border-r border-white/5 bg-white/[0.02] shrink-0">
          <div className="p-4 border-b border-white/5">
            <button onClick={() => router.push("/library")} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors mb-3">
              <ArrowLeft size={14} /> Bibliothèque
            </button>
            <h2 className="text-white font-semibold text-sm leading-snug">{book.title}</h2>
            <p className="text-white/30 text-xs mt-1">{book.chapters.length} chapitres · {book.pages} pages</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {book.chapters.map((ch, i) => (
              <button key={i} onClick={() => { setChapterIdx(i); setEditMode(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all mb-0.5 ${chapterIdx === i ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
                <span className="text-white/25 text-xs mr-2">{i + 1}.</span>
                {ch.title}
              </button>
            ))}
          </div>
          {/* Actions */}
          <div className="p-3 border-t border-white/5 space-y-2">
            <button onClick={() => router.push(`/cover?title=${encodeURIComponent(book.title)}`)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl text-xs transition-colors">
              <Image size={12} /> {book.hasCover ? "Modifier couverture" : "Créer la couverture"}
            </button>
            <button onClick={() => router.push("/publish")}
              className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs transition-colors">
              <Send size={12} /> Publier ce livre
            </button>
            <button onClick={() => setShowWatermark(true)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl text-xs transition-colors">
              <FileDown size={12} /> Export EPUB
            </button>
          </div>
        </div>
      )}

      {/* Watermark modal */}
      {showWatermark && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-80 space-y-4">
            <h3 className="text-white font-semibold">Export EPUB</h3>
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Watermark (optionnel — pour copies de révision)</label>
              <input value={watermark} onChange={e => setWatermark(e.target.value)}
                placeholder="Ex: Copie de révision — Marie Dupont"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none" />
              <p className="text-white/25 text-xs mt-1">Laisse vide pour un EPUB propre sans watermark</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleEpub} disabled={epubLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {epubLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {epubLoading ? "Génération..." : "Télécharger EPUB"}
              </button>
              <button onClick={() => setShowWatermark(false)} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl text-sm">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main reading area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.01] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <BookOpen size={15} className="text-white/40" />
            </button>
            <div>
              <p className="text-white/70 text-sm font-medium">{chapter?.title}</p>
              <p className="text-white/25 text-xs">{chapterIdx + 1} / {book.chapters.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Font size */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1">
              <button onClick={() => setFontSize(f => Math.max(13, f - 1))} className="text-white/40 hover:text-white text-xs px-1">A−</button>
              <span className="text-white/30 text-xs">{fontSize}</span>
              <button onClick={() => setFontSize(f => Math.min(24, f + 1))} className="text-white/40 hover:text-white text-xs px-1">A+</button>
            </div>
            {/* Edit toggle */}
            {!editMode ? (
              <button onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-lg text-xs transition-colors">
                <Edit3 size={12} /> Modifier
              </button>
            ) : (
              <button onClick={saveChapter}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${saved ? "bg-emerald-500 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"}`}>
                {saved ? <><CheckCircle size={12} /> Sauvegardé</> : <><Save size={12} /> Sauvegarder</>}
              </button>
            )}
            {editMode && (
              <button onClick={() => { setEditMode(false); setEditContent(chapter?.content || ""); }}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs transition-colors">
                Annuler
              </button>
            )}
            <button onClick={() => setFullscreen(!fullscreen)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              {fullscreen ? <Minimize2 size={14} className="text-white/40" /> : <Maximize2 size={14} className="text-white/40" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-10">
            {editMode ? (
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-6 text-white/85 resize-none focus:outline-none focus:border-purple-500/50 leading-relaxed"
                style={{ fontSize, minHeight: "60vh", fontFamily: "Georgia, serif" }}
              />
            ) : (
              <div style={{ fontSize }} className="font-serif">
                {chapter && renderContent(chapter.content)}
                {!chapter?.content && (
                  <div className="text-center py-20">
                    <p className="text-white/20">Contenu vide — clique Modifier pour écrire</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 shrink-0">
          <button onClick={() => { setChapterIdx(i => Math.max(0, i - 1)); setEditMode(false); }}
            disabled={chapterIdx === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/50 disabled:opacity-30 rounded-xl text-sm transition-colors">
            <ChevronLeft size={15} /> Précédent
          </button>
          <div className="flex gap-1">
            {book.chapters.map((_, i) => (
              <button key={i} onClick={() => { setChapterIdx(i); setEditMode(false); }}
                className={`w-2 h-2 rounded-full transition-all ${chapterIdx === i ? "bg-purple-400 scale-125" : "bg-white/20 hover:bg-white/40"}`} />
            ))}
          </div>
          <button onClick={() => { setChapterIdx(i => Math.min(book.chapters.length - 1, i + 1)); setEditMode(false); }}
            disabled={chapterIdx === book.chapters.length - 1}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/50 disabled:opacity-30 rounded-xl text-sm transition-colors">
            Suivant <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
