"use client";
import React, { useState, useRef, Suspense, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BookOpen, Zap, Edit3, Layers, Play, Copy, FileText,
  ChevronRight, Loader2, CheckCircle, Plus, Trash2, Save,
  ArrowLeft, Sparkles, FileDown, AlignLeft, RefreshCw, Mic, X,
  History, Globe, MessageSquare, ArrowUp, ArrowDown, Target,
  BarChart3, AlertTriangle, Repeat2, Send, Newspaper, Fingerprint
} from "lucide-react";
import { saveBook, newBook, getBook, saveChapterVersion, getChapterVersions, type Book, type ChapterVersion } from "@/lib/books";
import { getSavedStyles, type SavedStyle } from "@/lib/styles";

type Mode = "auto" | "assisted" | "hybrid";

const MODES = [
  { id: "auto" as Mode, icon: Zap, label: "Mode Auto", desc: "Donne un titre → l'IA écrit tout", color: "from-purple-500 to-violet-600" },
  { id: "assisted" as Mode, icon: Edit3, label: "Mode Assisté", desc: "Tu écris, l'IA améliore et continue", color: "from-pink-500 to-rose-600" },
  { id: "hybrid" as Mode, icon: Layers, label: "Mode Hybride", desc: "Brief → Plan → Chapitres → Export", color: "from-cyan-500 to-blue-600" },
];

const CATEGORIES = [
  "Business & Entrepreneuriat",
  "Développement personnel",
  "Spiritualité",
  "Roman / Fiction",
  "Santé & Bien-être",
  "Cuisine",
  "Technologie",
  "Poésie / Recueil",
  "Développement enfants",
  "Finance & Investissement",
  "Livre enfant (3-8 ans)",
  "Livre de coloriage enfant",
  "Livre d'énigmes / Puzzles",
];

const LANGUAGES = ["Français", "English", "Español", "Português", "Deutsch", "Italiano", "Arabic", "Wolof"];

function readabilityScore(text: string): number {
  if (!text) return 0;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3).length || 1;
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length || 1;
  const syllables = words.reduce((s, w) => s + Math.max(1, w.replace(/[^aeiouyàâéèêëîïôùûü]/gi, "").length), 0);
  const asl = wordCount / sentences;
  const asw = syllables / wordCount;
  const score = 206.835 - 1.015 * asl - 84.6 * asw;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function readabilityLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: "Très facile", color: "text-emerald-400" };
  if (score >= 55) return { label: "Facile", color: "text-green-400" };
  if (score >= 40) return { label: "Standard", color: "text-amber-400" };
  if (score >= 25) return { label: "Difficile", color: "text-orange-400" };
  return { label: "Expert", color: "text-red-400" };
}

interface Chapter { title: string; content: string; status: "pending" | "writing" | "done" }

function exportToPDF(title: string, chapters: Chapter[]) {
  const content = chapters.map(c => `
    <div class="chapter">
      <h2>${c.title}</h2>
      <div class="chapter-body">${c.content
        .replace(/^[-*]\s+/gm, "")
        .replace(/^\d+\.\s+/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/^#{1,3}\s+(.+)$/gm, "<strong>$1</strong>")
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br>")}</div>
    </div>
  `).join('<div class="page-break"></div>');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; font-size: 12pt; line-height: 1.8; color: #1a1a1a; background: white; }
    .cover-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 40px; border-bottom: 3px solid #6d28d9; }
    .cover-page h1 { font-size: 2.4em; font-weight: 900; color: #1a1a1a; margin-bottom: 20px; line-height: 1.2; }
    .cover-page .subtitle { font-size: 1em; color: #666; font-style: italic; margin-top: 40px; }
    .toc { padding: 40px 60px; page-break-after: always; }
    .toc h2 { font-size: 1.4em; font-weight: bold; margin-bottom: 20px; color: #6d28d9; text-transform: uppercase; letter-spacing: 2px; }
    .toc ol { list-style: none; }
    .toc ol li { padding: 6px 0; border-bottom: 1px dotted #ccc; display: flex; justify-content: space-between; font-size: 11pt; }
    .chapter { padding: 60px 70px 40px; }
    .chapter h2 { font-size: 1.6em; font-weight: bold; color: #1a1a1a; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #6d28d9; }
    .chapter-body { font-size: 11pt; line-height: 1.9; color: #2a2a2a; }
    .chapter-body p { margin-bottom: 14px; }
    .chapter-body strong { color: #1a1a1a; }
    .page-break { page-break-after: always; }
    @media print {
      .page-break { page-break-after: always; }
      .chapter { page-break-inside: avoid-page; }
    }
  </style>
</head>
<body>
  <div class="cover-page">
    <h1>${title}</h1>
    <div class="subtitle">Créé avec BookAutomator · ${new Date().getFullYear()}</div>
  </div>
  <div class="page-break"></div>
  <div class="toc">
    <h2>Table des matières</h2>
    <ol>${chapters.map((c, i) => `<li><span>${i + 1}. ${c.title}</span></li>`).join("")}</ol>
  </div>
  ${content}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => { win.print(); }, 300);
}

function StudioContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("auto");
  const [title, setTitle] = useState(params.get("idea") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [description, setDescription] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState<"config" | "plan" | "write" | "done">("config");
  const [assistedText, setAssistedText] = useState("");
  const [editingChapter, setEditingChapter] = useState<number | null>(null);
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [writingStyle, setWritingStyle] = useState("Motivant");
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [bookDescription, setBookDescription] = useState("");
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [podcastIdx, setPodcastIdx] = useState<number | null>(null);
  const [podcastContent, setPodcastContent] = useState("");
  const [generatingPodcast, setGeneratingPodcast] = useState(false);
  // New features
  const [language, setLanguage] = useState("Français");
  const [wordTarget, setWordTarget] = useState<number>(0);
  const [continueIdx, setContinueIdx] = useState<number | null>(null);
  const [continueInstruction, setContinueInstruction] = useState("");
  const [continueLoading, setContinueLoading] = useState(false);
  const [dialogueIdx, setDialogueIdx] = useState<number | null>(null);
  const [dialogueParagraph, setDialogueParagraph] = useState("");
  const [dialogueInstruction, setDialogueInstruction] = useState("");
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [versionIdx, setVersionIdx] = useState<number | null>(null);
  const [versions, setVersions] = useState<ChapterVersion[]>([]);
  const [consistencyResult, setConsistencyResult] = useState("");
  const [consistencyLoading, setConsistencyLoading] = useState(false);
  const [showConsistency, setShowConsistency] = useState(false);
  const [duplicatesResult, setDuplicatesResult] = useState("");
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [booktokContent, setBooktokContent] = useState("");
  const [booktokLoading, setBooktokLoading] = useState(false);
  const [showBooktok, setShowBooktok] = useState(false);
  const [newsletterIdx, setNewsletterIdx] = useState<number | null>(null);
  const [newsletterContent, setNewsletterContent] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  // Saved styles integration
  const [savedStyles, setSavedStyles] = useState<SavedStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setSavedStyles(getSavedStyles()); }, []);

  const selectedStyleDescription = savedStyles.find(s => s.id === selectedStyleId)?.styleDescription || "";

  const isPoem = category.includes("Poési");
  const isKids = category.includes("enfant") || category.includes("coloriage");
  const isRiddle = category.includes("nigme");
  const isColoring = category.includes("coloriage");

  const generatePlan = async () => {
    if (!title) return;
    setGenerating(true);
    setStep("plan");
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "plan", title, category, description, mode }),
      });
      const data = await res.json();
      const chapterTitles: string[] = data.chapters || ["Introduction", "Développement", "Conclusion"];
      setChapters(chapterTitles.map(t => ({ title: t, content: "", status: "pending" })));
    } catch {
      setChapters([
        { title: "Introduction", content: "", status: "pending" },
        { title: "Développement", content: "", status: "pending" },
        { title: "Conclusion", content: "", status: "pending" },
      ]);
    }
    setGenerating(false);
  };

  const writeAllChapters = async () => {
    setStep("write");
    const book = newBook(title, category);
    setCurrentBookId(book.id);
    const updated = [...chapters];
    for (let i = 0; i < chapters.length; i++) {
      updated[i] = { ...updated[i], status: "writing" };
      setChapters([...updated]);
      try {
        const res = await fetch("/api/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "chapter", title, chapterTitle: chapters[i].title, chapterIndex: i + 1, totalChapters: chapters.length, category, style: writingStyle, description: bookDescription, themes: bookDescription, savedStyleDescription: selectedStyleDescription }),
        });
        const data = await res.json();
        updated[i] = { ...updated[i], content: data.content || "", status: "done" };
      } catch {
        updated[i] = { ...updated[i], content: "Contenu à rédiger.", status: "done" };
      }
      setChapters([...updated]);
    }
    const finalBook: Book = {
      ...book,
      chapters: updated.map(c => ({ title: c.title, content: c.content })),
      pages: Math.round(updated.reduce((acc, c) => acc + (c.content.split(" ").length || 0), 0) / 250),
      status: "brouillon",
      checklistPct: 30,
      updatedAt: new Date().toISOString(),
    };
    saveBook(finalBook);
    setStep("done");
  };

  const saveCurrentBook = useCallback(() => {
    if (!title || chapters.length === 0) return;
    const id = currentBookId || Date.now().toString();
    setCurrentBookId(id);
    const book: Book = {
      id,
      title,
      category,
      status: "brouillon",
      pages: Math.round(chapters.reduce((acc, c) => acc + (c.content?.split(" ").length || 0), 0) / 250),
      hasCover: false,
      checklistPct: step === "done" ? 40 : 20,
      platforms: [],
      chapters: chapters.map(c => ({ title: c.title, content: c.content })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveBook(book);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [title, category, chapters, currentBookId, step]);

  const updateChapterContent = (idx: number, content: string) => {
    setChapters(prev => prev.map((c, i) => i === idx ? { ...c, content } : c));
  };

  const regenerateChapter = async (idx: number) => {
    setRegenIdx(idx);
    setChapters(prev => prev.map((c, i) => i === idx ? { ...c, status: "writing" as const } : c));
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate", title, chapterTitle: chapters[idx].title, chapterIndex: idx + 1, totalChapters: chapters.length, category, style: writingStyle, description: bookDescription, themes: bookDescription, savedStyleDescription: selectedStyleDescription }),
      });
      const data = await res.json();
      setChapters(prev => prev.map((c, i) => i === idx ? { ...c, content: data.content || c.content, status: "done" as const } : c));
    } catch {
      setChapters(prev => prev.map((c, i) => i === idx ? { ...c, status: "done" as const } : c));
    }
    setRegenIdx(null);
    setEditingChapter(idx);
  };

  const generatePodcast = async (idx: number) => {
    setGeneratingPodcast(true);
    setPodcastIdx(idx);
    setPodcastContent("");
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "podcast", bookTitle: title, chapterTitle: chapters[idx].title, chapterIndex: idx + 1, content: chapters[idx].content }),
      });
      const data = await res.json();
      setPodcastContent(data.podcast || "");
    } catch {
      setPodcastContent("Erreur lors de la génération. Réessaie.");
    }
    setGeneratingPodcast(false);
  };

  const continueChapter = async (idx: number) => {
    if (!chapters[idx]?.content) return;
    setContinueLoading(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "continue", bookTitle: title, chapterTitle: chapters[idx].title, existingContent: chapters[idx].content, instruction: continueInstruction, style: writingStyle, language }),
      });
      const data = await res.json();
      if (data.continuation) {
        const updated = chapters[idx].content + "\n\n" + data.continuation;
        updateChapterContent(idx, updated);
        if (currentBookId) saveChapterVersion(currentBookId, idx, chapters[idx].content, "Avant continuation");
      }
    } catch { }
    setContinueLoading(false);
    setContinueIdx(null);
    setContinueInstruction("");
  };

  const runDialogue = async () => {
    if (!dialogueParagraph || !dialogueInstruction) return;
    setDialogueLoading(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dialogue", bookTitle: title, paragraph: dialogueParagraph, instruction: dialogueInstruction }),
      });
      const data = await res.json();
      if (data.result && dialogueIdx !== null) {
        if (currentBookId) saveChapterVersion(currentBookId, dialogueIdx, chapters[dialogueIdx].content, "Avant dialogue IA");
        const updated = chapters[dialogueIdx].content.replace(dialogueParagraph, data.result);
        updateChapterContent(dialogueIdx, updated === chapters[dialogueIdx].content ? chapters[dialogueIdx].content + "\n\n" + data.result : updated);
        setDialogueParagraph(data.result);
      }
    } catch { }
    setDialogueLoading(false);
  };

  const openVersions = (idx: number) => {
    if (!currentBookId) return;
    setVersions(getChapterVersions(currentBookId, idx));
    setVersionIdx(idx);
  };

  const restoreVersion = (v: ChapterVersion) => {
    if (versionIdx === null) return;
    if (currentBookId) saveChapterVersion(currentBookId, versionIdx, chapters[versionIdx].content, "Avant restauration");
    updateChapterContent(versionIdx, v.content);
    setVersionIdx(null);
  };

  const checkConsistency = async () => {
    if (chapters.length < 2) return;
    setConsistencyLoading(true);
    setShowConsistency(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "consistency", bookTitle: title, chapters: chapters.map(c => ({ title: c.title, content: c.content })) }),
      });
      const data = await res.json();
      setConsistencyResult(data.consistency || "");
    } catch { setConsistencyResult("Erreur lors de l'analyse."); }
    setConsistencyLoading(false);
  };

  const checkDuplicates = async () => {
    const fullText = chapters.map(c => c.content).join("\n\n");
    if (!fullText.trim()) return;
    setDuplicatesLoading(true);
    setShowDuplicates(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicates", bookTitle: title, content: fullText }),
      });
      const data = await res.json();
      setDuplicatesResult(data.duplicates || "");
    } catch { setDuplicatesResult("Erreur lors de l'analyse."); }
    setDuplicatesLoading(false);
  };

  const generateBooktok = async () => {
    setBooktokLoading(true);
    setShowBooktok(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "booktok", bookTitle: title, category, description }),
      });
      const data = await res.json();
      setBooktokContent(data.booktok || "");
    } catch { setBooktokContent("Erreur."); }
    setBooktokLoading(false);
  };

  const generateNewsletter = async (idx: number) => {
    setNewsletterLoading(true);
    setNewsletterIdx(idx);
    setNewsletterContent("");
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "newsletter", bookTitle: title, chapterTitle: chapters[idx].title, chapterContent: chapters[idx].content }),
      });
      const data = await res.json();
      setNewsletterContent(data.newsletter || "");
    } catch { setNewsletterContent("Erreur."); }
    setNewsletterLoading(false);
  };

  const moveChapter = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= chapters.length) return;
    setChapters(prev => {
      const n = [...prev];
      [n[idx], n[newIdx]] = [n[newIdx], n[idx]];
      return n;
    });
  };

  const improveText = async () => {
    if (!assistedText.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "improve", text: assistedText }),
      });
      const data = await res.json();
      setAssistedText(data.improved || assistedText);
    } catch { }
    setGenerating(false);
  };

  const generateDescription = async () => {
    if (!title) return;
    setGeneratingDesc(true);
    const preview = chapters.slice(0, 4).map(c => c.title).join(", ");
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "description", title, category, chaptersPreview: preview }),
      });
      const data = await res.json();
      setBookDescription(data.description || "");
      setShowDescription(true);
    } catch { }
    setGeneratingDesc(false);
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";
  const selectClass = "w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50";

  const Modal = ({ title: t, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h3 className="text-white font-semibold">{t}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg"><X size={14} className="text-white/40" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 min-h-screen">

      {/* Dialogue IA modal */}
      {dialogueIdx !== null && (
        <Modal title={`Dialogue IA — ${chapters[dialogueIdx]?.title}`} onClose={() => setDialogueIdx(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Paragraphe à modifier</label>
              <textarea value={dialogueParagraph} onChange={e => setDialogueParagraph(e.target.value)} rows={5}
                placeholder="Colle ici le paragraphe que tu veux réécrire..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none resize-none" />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Instruction</label>
              <input value={dialogueInstruction} onChange={e => setDialogueInstruction(e.target.value)}
                placeholder="Ex: Rends ce passage plus dramatique et plus court"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={runDialogue} disabled={dialogueLoading || !dialogueParagraph || !dialogueInstruction}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-sm transition-colors disabled:opacity-50">
                {dialogueLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Réécrire
              </button>
              <button onClick={() => setDialogueIdx(null)} className="px-4 py-2.5 bg-white/5 text-white/50 rounded-xl text-sm">Fermer</button>
            </div>
            {dialogueParagraph && dialogueInstruction && (
              <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <p className="text-white/60 text-xs mb-1">Résultat (remplace dans le chapitre au clic &quot;Appliquer&quot;)</p>
                <p className="text-white/80 text-sm font-serif leading-relaxed">{dialogueParagraph}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Versions modal */}
      {versionIdx !== null && (
        <Modal title={`Historique — ${chapters[versionIdx]?.title}`} onClose={() => setVersionIdx(null)}>
          {versions.length === 0 ? (
            <p className="text-white/40 text-sm">Aucune version sauvegardée pour ce chapitre.</p>
          ) : (
            <div className="space-y-3">
              {versions.map((v, i) => (
                <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/60 text-xs">{new Date(v.savedAt).toLocaleString("fr-FR")} {v.label ? `— ${v.label}` : ""}</span>
                    <button onClick={() => restoreVersion(v)}
                      className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs transition-colors">
                      Restaurer
                    </button>
                  </div>
                  <p className="text-white/50 text-xs font-serif line-clamp-3">{v.content.substring(0, 300)}...</p>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Newsletter modal */}
      {newsletterIdx !== null && (
        <Modal title={`Newsletter — ${chapters[newsletterIdx]?.title}`} onClose={() => { setNewsletterIdx(null); setNewsletterContent(""); }}>
          {newsletterLoading ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 size={24} className="text-blue-400 animate-spin" />
              <p className="text-white/40 text-sm">Génération en cours...</p>
            </div>
          ) : (
            <>
              <pre className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">{newsletterContent}</pre>
              {newsletterContent && (
                <button onClick={() => navigator.clipboard.writeText(newsletterContent)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl text-sm transition-colors">
                  <Copy size={13} /> Copier
                </button>
              )}
            </>
          )}
        </Modal>
      )}

      {/* BookTok modal */}
      {showBooktok && (
        <Modal title="Scripts BookTok / Reels" onClose={() => { setShowBooktok(false); setBooktokContent(""); }}>
          {booktokLoading ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 size={24} className="text-rose-400 animate-spin" />
              <p className="text-white/40 text-sm">Génération en cours...</p>
            </div>
          ) : (
            <>
              <pre className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">{booktokContent}</pre>
              {booktokContent && (
                <button onClick={() => navigator.clipboard.writeText(booktokContent)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-sm transition-colors">
                  <Copy size={13} /> Copier
                </button>
              )}
            </>
          )}
        </Modal>
      )}

      {/* Consistency modal */}
      {showConsistency && (
        <Modal title="Analyse de cohérence" onClose={() => { setShowConsistency(false); setConsistencyResult(""); }}>
          {consistencyLoading ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 size={24} className="text-violet-400 animate-spin" />
              <p className="text-white/40 text-sm">Analyse en cours...</p>
            </div>
          ) : (
            <>
              <pre className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">{consistencyResult}</pre>
              {consistencyResult && (
                <button onClick={() => navigator.clipboard.writeText(consistencyResult)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-xl text-sm transition-colors">
                  <Copy size={13} /> Copier
                </button>
              )}
            </>
          )}
        </Modal>
      )}

      {/* Duplicates modal */}
      {showDuplicates && (
        <Modal title="Détecteur de répétitions" onClose={() => { setShowDuplicates(false); setDuplicatesResult(""); }}>
          {duplicatesLoading ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 size={24} className="text-orange-400 animate-spin" />
              <p className="text-white/40 text-sm">Analyse en cours...</p>
            </div>
          ) : (
            <>
              <pre className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">{duplicatesResult}</pre>
              {duplicatesResult && (
                <button onClick={() => navigator.clipboard.writeText(duplicatesResult)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded-xl text-sm transition-colors">
                  <Copy size={13} /> Copier
                </button>
              )}
            </>
          )}
        </Modal>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Studio d&apos;Écriture</h1>
          <p className="text-white/50">Romans · Non-fiction · Poésie · 3 modes IA</p>
        </div>
        {step === "done" && (
          <div className="flex gap-3">
            <button onClick={generateDescription} disabled={generatingDesc}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 text-amber-300 rounded-xl text-sm font-medium transition-all disabled:opacity-50">
              {generatingDesc ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Générer description
            </button>
            <button onClick={saveCurrentBook}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${saved ? "bg-emerald-500 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"}`}>
              {saved ? <><CheckCircle size={14} /> Sauvegardé !</> : <><Save size={14} /> Sauvegarder</>}
            </button>
            <button onClick={() => router.push("/library")} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm transition-colors">
              <ArrowLeft size={14} /> Bibliothèque
            </button>
          </div>
        )}
      </div>

      {/* Description panel */}
      {showDescription && bookDescription && (
        <div className="mb-6 bg-amber-500/[0.08] border border-amber-500/20 rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-amber-300 font-semibold flex items-center gap-2">
              <AlignLeft size={15} /> Descriptions de vente générées
            </h3>
            <button onClick={() => setShowDescription(false)} className="text-white/30 hover:text-white text-sm">✕ Fermer</button>
          </div>
          <pre className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">{bookDescription}</pre>
          <button onClick={() => navigator.clipboard.writeText(bookDescription)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-sm transition-colors">
            <Copy size={13} /> Copier tout
          </button>
        </div>
      )}

      {/* Podcast modal */}
      {podcastIdx !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Mic size={16} className="text-pink-400" />
                <h3 className="text-white font-semibold">Plan d&apos;épisode podcast</h3>
                {chapters[podcastIdx] && <span className="text-white/40 text-sm">— {chapters[podcastIdx].title}</span>}
              </div>
              <button onClick={() => { setPodcastIdx(null); setPodcastContent(""); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <X size={15} className="text-white/40" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {generatingPodcast ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 size={24} className="text-pink-400 animate-spin" />
                  <p className="text-white/50 text-sm">Génération du plan en cours...</p>
                </div>
              ) : (
                <pre className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">{podcastContent}</pre>
              )}
            </div>
            {!generatingPodcast && podcastContent && (
              <div className="p-4 border-t border-white/10 flex gap-2">
                <button onClick={() => navigator.clipboard.writeText(podcastContent)}
                  className="flex items-center gap-2 px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded-xl text-sm transition-colors">
                  <Copy size={13} /> Copier
                </button>
                <button onClick={() => { setPodcastIdx(null); setPodcastContent(""); }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl text-sm transition-colors ml-auto">
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-8">
        {MODES.map(({ id, icon: Icon, label, desc, color }) => (
          <button key={id} onClick={() => { setMode(id); setStep("config"); setChapters([]); setSaved(false); setShowDescription(false); }}
            className={`bg-white/[0.03] border rounded-2xl p-5 text-left transition-all duration-200 ${mode === id ? "border-purple-500/50" : "border-white/[0.06] hover:border-white/10"}`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}><Icon size={18} className="text-white" /></div>
            <p className="text-white font-semibold text-sm mb-1">{label}</p>
            <p className="text-white/40 text-xs">{desc}</p>
          </button>
        ))}
      </div>

      {(mode === "auto" || mode === "hybrid") && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
          {step === "config" && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold text-lg">Configuration du livre</h2>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Titre / Idée du livre *</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Gagner 1000€/mois en ligne depuis l'Afrique" className={inputClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Catégorie</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className={selectClass}>
                    <option value="">Choisir...</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Pages cibles</label>
                  <select className={selectClass}>
                    <option>50-80 pages</option>
                    <option>80-150 pages</option>
                    <option>150-250 pages</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Style d&apos;écriture</label>
                <div className="flex flex-wrap gap-2">
                  {["Motivant", "Storytelling", "Académique", "Humoristique", "Dramatique"].map(s => (
                    <button key={s} onClick={() => { setWritingStyle(s); setSelectedStyleId(""); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${writingStyle === s && !selectedStyleId ? "bg-purple-500 text-white" : "bg-white/5 text-white/50 hover:text-white"}`}>
                      {s}
                    </button>
                  ))}
                </div>
                {savedStyles.length > 0 && (
                  <div className="mt-3">
                    <label className="text-white/40 text-xs mb-1.5 flex items-center gap-1.5 block">
                      <Fingerprint size={11} className="text-pink-400" /> Mon style cloné (Tone Cloner)
                    </label>
                    <select value={selectedStyleId} onChange={e => setSelectedStyleId(e.target.value)}
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                      <option value="">— Sans style personnel —</option>
                      {savedStyles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {selectedStyleId && (
                      <p className="text-pink-400/70 text-xs mt-1.5 flex items-center gap-1">
                        <Fingerprint size={10} /> Style cloné appliqué à tous les chapitres
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="text-white/60 text-sm mb-2 flex items-center gap-1"><Globe size={13} /> Langue</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                    {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 flex items-center gap-1"><Target size={13} /> Objectif mots (optionnel)</label>
                  <input type="number" value={wordTarget || ""} onChange={e => setWordTarget(parseInt(e.target.value) || 0)}
                    placeholder="Ex: 20000" className={inputClass} />
                </div>
              </div>

              {isPoem && <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl"><p className="text-purple-300 text-sm">🎭 Mode Poésie — Recueil de poèmes avec images fortes et rythme.</p></div>}
              {isColoring && <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl"><p className="text-pink-300 text-sm">🖍️ Mode Livre de coloriage — Descriptions de scènes à colorier, instructions simples pour enfants. Imprime et distribue !</p></div>}
              {isRiddle && !isColoring && <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl"><p className="text-amber-300 text-sm">🧩 Mode Énigmes — L&apos;IA génère des devinettes, puzzles et charades avec leurs réponses.</p></div>}
              {isKids && !isColoring && !isRiddle && <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl"><p className="text-blue-300 text-sm">👶 Mode Livre enfant — Langage ultra simple, phrases courtes, histoires colorées pour 3-8 ans.</p></div>}
              <div>
                <label className="text-white/60 text-sm mb-2 block">Brief (optionnel)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  placeholder="Décris ton audience, le ton, le message principal..." className={`${inputClass} resize-none`} />
              </div>
              <button onClick={generatePlan} disabled={!title || generating}
                className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors">
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {isPoem ? "Générer le recueil" : "Générer le plan"} <ChevronRight size={16} />
              </button>
            </div>
          )}

          {step === "plan" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-white font-semibold text-lg">{isPoem ? "Plan du recueil" : "Plan"} — {title}</h2>
                  <p className="text-white/40 text-sm">{chapters.length} {isPoem ? "poèmes" : "chapitres"}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { const t = prompt(`Titre du ${isPoem ? "poème" : "chapitre"}:`); if (t) setChapters(prev => [...prev, { title: t, content: "", status: "pending" }]); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-sm">
                    <Plus size={14} /> Ajouter
                  </button>
                  <button onClick={writeAllChapters}
                    className="flex items-center gap-2 px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium">
                    <Zap size={14} /> {isPoem ? "Écrire tous les poèmes" : "Écrire tout le livre"}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {chapters.map((ch, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveChapter(i, -1)} disabled={i === 0} className="text-white/20 hover:text-white disabled:opacity-20 transition-colors"><ArrowUp size={10} /></button>
                      <button onClick={() => moveChapter(i, 1)} disabled={i === chapters.length - 1} className="text-white/20 hover:text-white disabled:opacity-20 transition-colors"><ArrowDown size={10} /></button>
                    </div>
                    <span className="text-white/30 text-sm w-5">{i + 1}.</span>
                    <span className="text-white text-sm flex-1">{ch.title}</span>
                    <button onClick={() => setChapters(prev => prev.filter((_, j) => j !== i))} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(step === "write" || step === "done") && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-semibold">{title}</h2>
                  <p className="text-white/40 text-sm">{chapters.filter(c => c.status === "done").length}/{chapters.length} {isPoem ? "poèmes" : "chapitres"}</p>
                </div>
                {step === "done" && (
                  <button onClick={saveCurrentBook}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all ${saved ? "bg-emerald-500 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"}`}>
                    {saved ? <><CheckCircle size={14} /> Sauvegardé !</> : <><Save size={14} /> Sauvegarder</>}
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/5 rounded-full h-2 mb-3">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(chapters.filter(c => c.status === "done").length / Math.max(chapters.length, 1)) * 100}%` }} />
              </div>

              {/* Word count + readability bar */}
              {(() => {
                const allText = chapters.filter(c => c.status === "done").map(c => c.content).join(" ");
                const wc = allText.split(/\s+/).filter(Boolean).length;
                const rs = readabilityScore(allText);
                const rl = readabilityLabel(rs);
                const pct = wordTarget ? Math.min(100, Math.round((wc / wordTarget) * 100)) : null;
                return (
                  <div className="flex items-center gap-4 mb-5 text-xs">
                    <span className="text-white/40">{wc.toLocaleString()} mots</span>
                    {wordTarget > 0 && (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1 bg-white/5 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${pct! >= 100 ? "bg-emerald-500" : "bg-amber-400"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`${pct! >= 100 ? "text-emerald-400" : "text-white/40"}`}>{pct}% / {wordTarget.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <BarChart3 size={10} className={rl.color} />
                      <span className={rl.color}>{rl.label}</span>
                      <span className="text-white/20">({rs}/100)</span>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {chapters.map((ch, i) => (
                  <div key={i} className={`rounded-xl border transition-all ${ch.status === "writing" ? "border-purple-500/50 bg-purple-500/10" : ch.status === "done" ? "border-white/10 bg-white/[0.02]" : "border-white/[0.06]"}`}>
                    <div className="flex items-center gap-3 p-4 cursor-pointer"
                      onClick={() => ch.status === "done" && setEditingChapter(editingChapter === i ? null : i)}>
                      {ch.status === "writing" && <Loader2 size={14} className="text-purple-400 animate-spin shrink-0" />}
                      {ch.status === "done" && <CheckCircle size={14} className="text-emerald-400 shrink-0" />}
                      {ch.status === "pending" && <div className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" />}
                      <span className="text-white text-sm font-medium flex-1">{ch.title}</span>
                      {ch.status === "done" && (
                        <div className="flex items-center gap-1">
                          <button onClick={e => { e.stopPropagation(); generatePodcast(i); }}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors" title="Podcast">
                            <Mic size={11} className={`text-white/30 hover:text-pink-400 ${generatingPodcast && podcastIdx === i ? "animate-pulse text-pink-400" : ""}`} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); generateNewsletter(i); }}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors" title="Newsletter">
                            <Newspaper size={11} className={`text-white/30 hover:text-blue-400 ${newsletterLoading && newsletterIdx === i ? "animate-pulse text-blue-400" : ""}`} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setContinueIdx(continueIdx === i ? null : i); setContinueInstruction(""); }}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors" title="Continuer">
                            <ChevronRight size={11} className={`text-white/30 hover:text-cyan-400 ${continueIdx === i ? "text-cyan-400" : ""}`} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDialogueIdx(i); setDialogueParagraph(""); setDialogueInstruction(""); }}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors" title="Dialogue IA">
                            <MessageSquare size={11} className="text-white/30 hover:text-emerald-400" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); openVersions(i); }}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors" title="Historique">
                            <History size={11} className="text-white/30 hover:text-amber-400" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); regenerateChapter(i); }} disabled={regenIdx !== null}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors" title="Regénérer">
                            <RefreshCw size={11} className={`text-white/30 hover:text-purple-400 ${regenIdx === i ? "animate-spin text-purple-400" : ""}`} />
                          </button>
                          <span className="text-white/30 text-xs">{editingChapter === i ? "▲" : "✏️"}</span>
                        </div>
                      )}
                    </div>
                    {ch.status === "writing" && <p className="text-purple-300/60 text-xs animate-pulse px-4 pb-3">Rédaction en cours...</p>}
                    {/* Continue panel */}
                    {ch.status === "done" && continueIdx === i && (
                      <div className="px-4 pb-4 border-t border-cyan-500/20 pt-3">
                        <p className="text-cyan-300 text-xs font-medium mb-2">Continuer l&apos;écriture</p>
                        <input value={continueInstruction} onChange={e => setContinueInstruction(e.target.value)}
                          placeholder="Instruction (optionnel) — ex: Ajoute un exemple concret"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none mb-2" />
                        <div className="flex gap-2">
                          <button onClick={() => continueChapter(i)} disabled={continueLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-xs transition-colors disabled:opacity-50">
                            {continueLoading ? <Loader2 size={10} className="animate-spin" /> : <ChevronRight size={10} />} Continuer
                          </button>
                          <button onClick={() => setContinueIdx(null)} className="px-3 py-1.5 bg-white/5 text-white/40 rounded-lg text-xs">Annuler</button>
                        </div>
                      </div>
                    )}
                    {ch.status === "done" && editingChapter === i && (
                      <div className="px-4 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 text-xs text-white/30">
                            <span>{ch.content.split(/\s+/).filter(Boolean).length} mots</span>
                            {(() => { const rs = readabilityScore(ch.content); const rl = readabilityLabel(rs); return <span className={rl.color}>{rl.label}</span>; })()}
                          </div>
                        </div>
                        <textarea value={ch.content} onChange={e => updateChapterContent(i, e.target.value)} rows={14}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-purple-500/50 resize-none leading-relaxed font-serif" />
                        <div className="flex justify-end gap-2 mt-2">
                          <button onClick={() => setEditingChapter(null)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg text-xs transition-colors">Fermer</button>
                          <button onClick={saveCurrentBook} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs transition-colors"><Save size={11} /> Sauvegarder</button>
                        </div>
                      </div>
                    )}
                    {ch.status === "done" && editingChapter !== i && continueIdx !== i && ch.content && (
                      <p className="text-white/40 text-xs px-4 pb-3 line-clamp-2 font-serif">{ch.content.substring(0, 200)}...</p>
                    )}
                  </div>
                ))}
              </div>

              {step === "done" && currentBookId && (
                <div className="mt-5 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={16} className="text-emerald-400" />
                    <span className="text-white font-semibold text-sm">Livre créé et sauvegardé dans ta bibliothèque !</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => router.push(`/read/${currentBookId}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors">
                      <BookOpen size={14} /> Lire le livre
                    </button>
                    <button onClick={() => router.push(`/cover?title=${encodeURIComponent(title)}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-pink-500/20 border border-pink-500/30 hover:bg-pink-500/30 text-pink-300 rounded-xl text-sm font-medium transition-colors">
                      🎨 Créer la couverture
                    </button>
                    <button onClick={generateDescription} disabled={generatingDesc}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-sm transition-colors disabled:opacity-50">
                      {generatingDesc ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Description
                    </button>
                    <button onClick={() => router.push("/publish")}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm transition-colors">
                      📤 Publier
                    </button>
                    <button onClick={generateBooktok} disabled={booktokLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-500/20 border border-rose-500/30 hover:bg-rose-500/30 text-rose-300 rounded-xl text-sm transition-colors disabled:opacity-50">
                      {booktokLoading ? <Loader2 size={13} className="animate-spin" /> : "🎥"} BookTok
                    </button>
                  </div>
                </div>
              )}

              {step === "done" && (
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/5">
                  <button onClick={() => exportToPDF(title, chapters)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-300 rounded-xl text-sm font-medium transition-colors">
                    <FileDown size={14} /> Exporter en PDF
                  </button>
                  <button onClick={generateDescription} disabled={generatingDesc}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 text-amber-300 rounded-xl text-sm transition-colors disabled:opacity-50">
                    {generatingDesc ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Générer description
                  </button>
                  <button onClick={() => {
                    const full = chapters.map(c => `## ${c.title}\n\n${c.content}`).join("\n\n");
                    navigator.clipboard.writeText(`# ${title}\n\n${full}`);
                  }} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm transition-colors">
                    <Copy size={14} /> Copier tout
                  </button>
                  <button onClick={checkConsistency} disabled={consistencyLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-500/20 border border-violet-500/30 hover:bg-violet-500/30 text-violet-300 rounded-xl text-sm transition-colors disabled:opacity-50">
                    {consistencyLoading ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />} Cohérence
                  </button>
                  <button onClick={checkDuplicates} disabled={duplicatesLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/30 hover:bg-orange-500/30 text-orange-300 rounded-xl text-sm transition-colors disabled:opacity-50">
                    {duplicatesLoading ? <Loader2 size={14} className="animate-spin" /> : <Repeat2 size={14} />} Doublons
                  </button>
                  <button onClick={() => router.push("/library")} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm ml-auto transition-colors hover:bg-emerald-500/30">
                    <BookOpen size={14} /> Voir dans ma bibliothèque
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode === "assisted" && (
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
            <div className="mb-4">
              <label className="text-white/60 text-sm mb-2 block">Titre du projet (pour la sauvegarde)</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Mon livre..." className={inputClass} />
            </div>
            <h2 className="text-white font-semibold text-lg mb-4">Mode Assisté — Tu écris, l&apos;IA améliore</h2>
            <textarea ref={textareaRef} value={assistedText} onChange={e => setAssistedText(e.target.value)} rows={18}
              placeholder="Commence à écrire ici... L'IA améliorera le style, corrigera les fautes et enrichira le vocabulaire."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 text-sm focus:outline-none focus:border-purple-500/50 resize-none leading-relaxed font-serif" />
            <div className="flex gap-3 mt-4">
              <button onClick={improveText} disabled={generating || !assistedText.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                Améliorer avec l&apos;IA
              </button>
              <button onClick={() => {
                const blob = new Blob([`# ${title || "Mon texte"}\n\n${assistedText}`], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `${(title || "texte").replace(/\s+/g, "_")}.txt`; a.click();
                URL.revokeObjectURL(url);
              }} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm transition-colors">
                <FileText size={14} /> Exporter
              </button>
              <button onClick={() => navigator.clipboard.writeText(assistedText)} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm transition-colors">
                <Copy size={14} /> Copier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white/50">Chargement...</div>}>
      <StudioContent />
    </Suspense>
  );
}

