"use client";
import { useState, useEffect, useRef } from "react";
import {
  Mic, Play, Square, Copy, FileDown, Loader2, BookOpen,
  ChevronRight, Radio, Headphones, Sparkles, RefreshCw,
} from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

type Tab = "plan" | "script";
type PodMode = "chapter" | "full";

export default function PodcastPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [chapterIdx, setChapterIdx] = useState(0);
  const [mode, setMode] = useState<PodMode>("chapter");

  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState("");
  const [script, setScript] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [tab, setTab] = useState<Tab>("plan");

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [rate, setRate] = useState(0.95);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBooks(getBooks());
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.cancel();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const book = books.find(b => b.id === selectedId);
  const chapter = book?.chapters[chapterIdx];
  const frVoices = voices.filter(v => v.lang.startsWith("fr"));
  const allVoices = voices.slice(0, 12);

  const stopAudio = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const speakScript = () => {
    if (!script) return;
    window.speechSynthesis.cancel();
    const text = script.replace(/\[PAUSE\]/g, "...").replace(/\[EMPHASE\]/g, "");
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "fr-FR";
    utter.rate = rate;
    utter.pitch = 1.0;
    const voice = voices.find(v => v.name === selectedVoice)
      || frVoices[0]
      || undefined;
    if (voice) utter.voice = voice;
    const wordCount = text.split(/\s+/).length;
    const duration = (wordCount / (rate * 150)) * 1000;
    const start = Date.now();
    utter.onend = () => { setPlaying(false); setProgress(100); if (intervalRef.current) clearInterval(intervalRef.current); };
    utter.onerror = () => { setPlaying(false); if (intervalRef.current) clearInterval(intervalRef.current); };
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    setPlaying(true);
    setProgress(0);
    intervalRef.current = setInterval(() => {
      const pct = Math.min(99, Math.round(((Date.now() - start) / duration) * 100));
      setProgress(pct);
    }, 300);
  };

  const generate = async () => {
    if (!book) return;
    stopAudio();
    setGenerating(true);
    setPlan("");
    setScript("");
    setEpisodeTitle("");
    setTab("plan");
    setProgress(0);
    try {
      const payload = mode === "full"
        ? {
            action: "podcast",
            bookTitle: book.title,
            mode: "full",
            chapters: book.chapters.map(c => ({ title: c.title, content: c.content })),
          }
        : {
            action: "podcast",
            bookTitle: book.title,
            chapterTitle: chapter?.title,
            chapterIndex: chapterIdx + 1,
            content: chapter?.content,
            mode: "chapter",
          };
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { podcast?: string; script?: string; episodeTitle?: string; error?: string };
      if (data.error) throw new Error(data.error);
      setPlan(data.podcast || "");
      setScript(data.script || "");
      setEpisodeTitle(data.episodeTitle || (mode === "full" ? book.title : chapter?.title || ""));
    } catch (e) {
      setPlan("Erreur lors de la génération. Réessaie.");
      console.error(e);
    }
    setGenerating(false);
  };

  const copyContent = () => {
    const text = tab === "plan" ? plan : script;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadScript = () => {
    if (!script) return;
    const blob = new Blob([script], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `podcast-${(episodeTitle || "episode").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = script ? script.split(/\s+/).length : 0;
  const estimatedMin = wordCount ? Math.round(wordCount / (rate * 150)) : 0;

  return (
    <div className="p-4 md:p-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <Radio size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Podcast Studio</h1>
        </div>
        <p className="text-white/50 text-sm">Génère plan + script · Écoute en synthèse vocale · Export .txt</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left panel — config */}
        <div className="lg:col-span-2 space-y-4">

          {/* Book picker */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <BookOpen size={14} className="text-pink-400" /> Livre source
            </h2>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setChapterIdx(0); stopAudio(); }}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500/40">
              <option value="">Choisir un livre…</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>

            {/* Mode */}
            {book && (
              <div className="flex gap-2">
                <button onClick={() => setMode("chapter")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${mode === "chapter" ? "bg-pink-500/20 border-pink-500/30 text-pink-300" : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60"}`}>
                  Chapitre
                </button>
                <button onClick={() => setMode("full")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${mode === "full" ? "bg-pink-500/20 border-pink-500/30 text-pink-300" : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60"}`}>
                  Livre complet
                </button>
              </div>
            )}

            {/* Chapter list */}
            {book && mode === "chapter" && book.chapters.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {book.chapters.map((c, i) => (
                  <button key={i} onClick={() => { setChapterIdx(i); stopAudio(); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all border ${i === chapterIdx ? "bg-pink-500/15 border-pink-500/25 text-pink-200" : "border-white/[0.04] text-white/40 hover:border-white/10 hover:text-white/60"}`}>
                    <ChevronRight size={10} className="inline mr-1 opacity-50" />
                    {c.title}
                  </button>
                ))}
              </div>
            )}

            {book && mode === "full" && (
              <p className="text-white/30 text-xs">
                {book.chapters.length} chapitres · épisode complet ~{Math.round(book.chapters.reduce((s, c) => s + c.content.split(/\s+/).length, 0) / 150)} min
              </p>
            )}
          </div>

          {/* Voice settings */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Headphones size={14} className="text-pink-400" /> Paramètres voix
            </h2>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Voix</label>
              <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none">
                <option value="">Auto (fr-FR)</option>
                {(frVoices.length > 0 ? frVoices : allVoices).map(v => (
                  <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Vitesse: {rate}x</label>
              <input type="range" min={0.6} max={1.4} step={0.05} value={rate}
                onChange={e => setRate(parseFloat(e.target.value))}
                className="w-full accent-pink-500" />
            </div>
          </div>

          {/* Generate button */}
          <button onClick={generate} disabled={!book || generating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-pink-900/20">
            {generating ? (
              <><Loader2 size={15} className="animate-spin" /> Génération…</>
            ) : (
              <><Sparkles size={15} /> Générer le podcast</>
            )}
          </button>
        </div>

        {/* Right panel — output */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* Loading */}
          {generating && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center">
                  <Mic size={24} className="text-pink-400" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-pink-500/30 animate-ping" />
              </div>
              <p className="text-white/70 text-sm font-medium">Génération plan + script…</p>
              <p className="text-white/30 text-xs">Groq génère plan détaillé et script word-for-word en parallèle</p>
            </div>
          )}

          {/* Results */}
          {!generating && (plan || script) && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden">

              {/* Episode title */}
              {episodeTitle && (
                <div className="px-5 pt-4 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-pink-400" />
                    <p className="text-pink-300 text-xs font-semibold uppercase tracking-wider">Épisode</p>
                  </div>
                  <h3 className="text-white font-bold text-base mt-1">{episodeTitle}</h3>
                  {wordCount > 0 && (
                    <p className="text-white/30 text-xs mt-0.5">
                      Script: {wordCount.toLocaleString()} mots · ~{estimatedMin} min de lecture à {rate}x
                    </p>
                  )}
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 px-5 pt-3 pb-0 border-b border-white/[0.06]">
                <button onClick={() => setTab("plan")}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === "plan" ? "border-pink-500 text-pink-300" : "border-transparent text-white/40 hover:text-white/60"}`}>
                  📋 Plan épisode
                </button>
                <button onClick={() => setTab("script")}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === "script" ? "border-pink-500 text-pink-300" : "border-transparent text-white/40 hover:text-white/60"}`}>
                  🎙️ Script complet
                </button>
              </div>

              {/* Content */}
              <div className="p-5 max-h-[420px] overflow-y-auto">
                {tab === "plan" ? (
                  <pre className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">{plan}</pre>
                ) : (
                  <pre className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">{script}</pre>
                )}
              </div>

              {/* Audio player */}
              {script && (
                <div className="px-5 py-3 bg-white/[0.02] border-t border-white/[0.06]">
                  <div className="flex items-center gap-3 mb-2">
                    {!playing ? (
                      <button onClick={speakScript}
                        className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-semibold transition-colors">
                        <Play size={13} fill="white" /> Écouter le script
                      </button>
                    ) : (
                      <button onClick={stopAudio}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-colors">
                        <Square size={13} fill="white" /> Stop
                      </button>
                    )}
                    <span className="text-white/30 text-xs">
                      {playing ? `Lecture en cours… ${progress}%` : "Synthèse vocale navigateur"}
                    </span>
                  </div>
                  {playing && (
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-300"
                        style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="px-5 py-3 border-t border-white/[0.06] flex items-center gap-2">
                <button onClick={copyContent}
                  className="flex items-center gap-2 px-3 py-2 bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 rounded-lg text-xs transition-colors">
                  <Copy size={12} /> {copied ? "Copié !" : `Copier ${tab === "plan" ? "plan" : "script"}`}
                </button>
                {script && (
                  <button onClick={downloadScript}
                    className="flex items-center gap-2 px-3 py-2 bg-white/[0.05] hover:bg-white/10 text-white/60 rounded-lg text-xs transition-colors">
                    <FileDown size={12} /> Télécharger .txt
                  </button>
                )}
                <button onClick={generate}
                  className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] hover:bg-white/10 text-white/40 rounded-lg text-xs transition-colors ml-auto">
                  <RefreshCw size={11} /> Regénérer
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!generating && !plan && !script && (
            <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-pink-500/10 flex items-center justify-center">
                <Mic size={24} className="text-pink-400/60" />
              </div>
              <p className="text-white/50 text-sm font-medium">Prêt à générer ton podcast</p>
              <p className="text-white/25 text-xs max-w-xs">
                Sélectionne un livre, choisis un chapitre ou le livre complet, puis clique sur &quot;Générer le podcast&quot;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
