"use client";
import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BookOpen, Edit3, Save, CheckCircle,
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Image, Send, Loader2, FileDown, Download, Mic, Play, Square,
  Copy, X, Radio,
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

  // ── Podcast panel ─────────────────────────────────────────────────────────
  const [showPodcast, setShowPodcast] = useState(false);
  const [podMode, setPodMode] = useState<"chapter" | "full">("chapter");
  const [podGenerating, setPodGenerating] = useState(false);
  const [podPlan, setPodPlan] = useState("");
  const [podScript, setPodScript] = useState("");
  const [podEpTitle, setPodEpTitle] = useState("");
  const [podTab, setPodTab] = useState<"plan" | "script">("plan");
  const [podPlaying, setPodPlaying] = useState(false);
  const [podProgress, setPodProgress] = useState(0);
  const podIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [podCopied, setPodCopied] = useState(false);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      if (podIntervalRef.current) clearInterval(podIntervalRef.current);
    };
  }, []);

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

  // ── Podcast helpers ────────────────────────────────────────────────────────
  const openPodcast = () => {
    setPodPlan("");
    setPodScript("");
    setPodEpTitle("");
    setPodTab("plan");
    stopPodAudio();
    setShowPodcast(true);
  };

  const generatePodcast = async () => {
    if (!book) return;
    stopPodAudio();
    setPodGenerating(true);
    setPodPlan("");
    setPodScript("");
    setPodEpTitle("");
    setPodTab("plan");
    try {
      const payload = podMode === "full"
        ? {
            action: "podcast", bookTitle: book.title, mode: "full",
            chapters: book.chapters.map(c => ({ title: c.title, content: c.content })),
          }
        : {
            action: "podcast", bookTitle: book.title, mode: "chapter",
            chapterTitle: chapter?.title, chapterIndex: chapterIdx + 1,
            content: chapter?.content,
          };
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { podcast?: string; script?: string; episodeTitle?: string };
      setPodPlan(data.podcast || "");
      setPodScript(data.script || "");
      setPodEpTitle(data.episodeTitle || chapter?.title || book.title);
    } catch { setPodPlan("Erreur lors de la génération. Réessaie."); }
    setPodGenerating(false);
  };

  const stopPodAudio = () => {
    window.speechSynthesis?.cancel();
    setPodPlaying(false);
    setPodProgress(0);
    if (podIntervalRef.current) clearInterval(podIntervalRef.current);
  };

  const speakPodScript = () => {
    if (!podScript) return;
    window.speechSynthesis.cancel();
    const text = podScript.replace(/\[PAUSE\]/g, "...").replace(/\[EMPHASE\]/g, "");
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "fr-FR";
    utter.rate = 0.92;
    const wordCount = text.split(/\s+/).length;
    const duration = (wordCount / (0.92 * 150)) * 1000;
    const start = Date.now();
    utter.onend = () => { setPodPlaying(false); setPodProgress(100); if (podIntervalRef.current) clearInterval(podIntervalRef.current); };
    utter.onerror = () => { setPodPlaying(false); if (podIntervalRef.current) clearInterval(podIntervalRef.current); };
    window.speechSynthesis.speak(utter);
    setPodPlaying(true);
    setPodProgress(0);
    podIntervalRef.current = setInterval(() => {
      const pct = Math.min(99, Math.round(((Date.now() - start) / duration) * 100));
      setPodProgress(pct);
    }, 300);
  };

  const downloadScript = () => {
    if (!podScript) return;
    const blob = new Blob([podScript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `podcast-${(podEpTitle || "episode").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyPodContent = () => {
    navigator.clipboard.writeText(podTab === "plan" ? podPlan : podScript);
    setPodCopied(true);
    setTimeout(() => setPodCopied(false), 1800);
  };

  const renderContent = (text: string) => {
    return text.split(/\n\n+/).map((para, i) => {
      const t = para.trim();
      if (!t) return null;
      if (t.startsWith("## ")) return <h2 key={i} className="text-xl font-bold text-white/90 mt-8 mb-3 border-b border-white/10 pb-2">{t.slice(3)}</h2>;
      if (t.startsWith("### ")) return <h3 key={i} className="text-lg font-semibold text-white/80 mt-6 mb-2">{t.slice(4)}</h3>;
      const clean = t
        .replace(/^[-*]\s+/gm, "")
        .replace(/^\d+\.\s+/gm, "")
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
            {/* Podcast button — prominent */}
            <button onClick={openPodcast}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-pink-500/20 to-rose-500/20 hover:from-pink-500/30 hover:to-rose-500/30 border border-pink-500/25 text-pink-300 rounded-xl text-xs font-semibold transition-colors">
              <Mic size={13} /> Podcast ce chapitre
            </button>
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
              <label className="text-white/50 text-xs mb-1.5 block">Watermark (optionnel)</label>
              <input value={watermark} onChange={e => setWatermark(e.target.value)}
                placeholder="Ex: Copie de révision — Marie Dupont"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleEpub} disabled={epubLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {epubLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {epubLoading ? "Génération..." : "Télécharger EPUB"}
              </button>
              <button onClick={() => setShowWatermark(false)} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl text-sm">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Podcast panel ──────────────────────────────────────────────────── */}
      {showPodcast && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#13111e] border border-white/10 rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                  <Radio size={15} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Podcast Studio</h3>
                  <p className="text-white/35 text-xs truncate max-w-64">{podEpTitle || chapter?.title || book.title}</p>
                </div>
              </div>
              <button onClick={() => { stopPodAudio(); setShowPodcast(false); }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <X size={15} className="text-white/40" />
              </button>
            </div>

            {/* Mode selector */}
            {!podPlan && !podGenerating && (
              <div className="px-5 pt-5 pb-0 space-y-4">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Générer le podcast pour :</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPodMode("chapter")}
                    className={`p-4 rounded-xl border text-left transition-all ${podMode === "chapter" ? "bg-pink-500/15 border-pink-500/30" : "bg-white/[0.03] border-white/[0.06] hover:border-white/10"}`}>
                    <Mic size={16} className={podMode === "chapter" ? "text-pink-400 mb-2" : "text-white/30 mb-2"} />
                    <p className={`text-sm font-semibold ${podMode === "chapter" ? "text-pink-200" : "text-white/50"}`}>Ce chapitre</p>
                    <p className="text-white/30 text-xs mt-0.5">{chapter?.title}</p>
                    <p className="text-white/20 text-xs mt-0.5">~6-10 min</p>
                  </button>
                  <button onClick={() => setPodMode("full")}
                    className={`p-4 rounded-xl border text-left transition-all ${podMode === "full" ? "bg-pink-500/15 border-pink-500/30" : "bg-white/[0.03] border-white/[0.06] hover:border-white/10"}`}>
                    <BookOpen size={16} className={podMode === "full" ? "text-pink-400 mb-2" : "text-white/30 mb-2"} />
                    <p className={`text-sm font-semibold ${podMode === "full" ? "text-pink-200" : "text-white/50"}`}>Livre complet</p>
                    <p className="text-white/30 text-xs mt-0.5">{book.chapters.length} chapitres</p>
                    <p className="text-white/20 text-xs mt-0.5">~12-18 min</p>
                  </button>
                </div>
                <button onClick={generatePodcast}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-pink-900/20">
                  <Mic size={15} /> Générer le podcast
                </button>
              </div>
            )}

            {/* Generating */}
            {podGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-pink-500/10 flex items-center justify-center">
                    <Mic size={22} className="text-pink-400" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-pink-500/30 animate-ping" />
                </div>
                <p className="text-white/70 text-sm font-medium">Génération plan + script…</p>
                <p className="text-white/25 text-xs">Groq génère les deux en parallèle</p>
              </div>
            )}

            {/* Results */}
            {!podGenerating && (podPlan || podScript) && (
              <>
                {/* Tabs */}
                <div className="flex gap-1 px-5 pt-4 border-b border-white/[0.06]">
                  <button onClick={() => setPodTab("plan")}
                    className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${podTab === "plan" ? "border-pink-500 text-pink-300" : "border-transparent text-white/35 hover:text-white/60"}`}>
                    📋 Plan
                  </button>
                  <button onClick={() => setPodTab("script")}
                    className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${podTab === "script" ? "border-pink-500 text-pink-300" : "border-transparent text-white/35 hover:text-white/60"}`}>
                    🎙️ Script
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                  <pre className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {podTab === "plan" ? podPlan : podScript}
                  </pre>
                </div>

                {/* Audio player */}
                {podScript && (
                  <div className="px-5 py-3 bg-white/[0.02] border-t border-white/[0.06]">
                    <div className="flex items-center gap-3 mb-2">
                      {!podPlaying ? (
                        <button onClick={speakPodScript}
                          className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-xs font-semibold transition-colors">
                          <Play size={11} fill="white" /> Écouter
                        </button>
                      ) : (
                        <button onClick={stopPodAudio}
                          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors">
                          <Square size={11} fill="white" /> Stop
                        </button>
                      )}
                      <span className="text-white/25 text-xs flex-1">{podPlaying ? `Lecture… ${podProgress}%` : "Synthèse vocale"}</span>
                    </div>
                    {podPlaying && (
                      <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-300" style={{ width: `${podProgress}%` }} />
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="px-5 py-3 border-t border-white/[0.06] flex items-center gap-2">
                  <button onClick={copyPodContent}
                    className="flex items-center gap-1.5 px-3 py-2 bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 rounded-lg text-xs transition-colors">
                    <Copy size={11} /> {podCopied ? "Copié !" : `Copier ${podTab === "plan" ? "plan" : "script"}`}
                  </button>
                  {podScript && (
                    <button onClick={downloadScript}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] hover:bg-white/10 text-white/50 rounded-lg text-xs transition-colors">
                      <FileDown size={11} /> .txt
                    </button>
                  )}
                  <button onClick={() => { stopPodAudio(); setPodPlan(""); setPodScript(""); setPodEpTitle(""); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] hover:bg-white/10 text-white/35 rounded-lg text-xs transition-colors ml-auto">
                    ← Nouveau
                  </button>
                </div>
              </>
            )}
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
            {/* Podcast button in top bar */}
            <button onClick={openPodcast}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/20 text-pink-300 rounded-lg text-xs font-medium transition-colors">
              <Mic size={12} /> Podcast
            </button>
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
