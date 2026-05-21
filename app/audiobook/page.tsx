"use client";
import { useState, useEffect, useRef } from "react";
import { Headphones, Play, Pause, Square, Download, ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

export default function AudiobookPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [chapterIdx, setChapterIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [progress, setProgress] = useState(0);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setBooks(getBooks());
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      const fr = v.filter(x => x.lang.startsWith("fr") || x.lang.startsWith("en"));
      setVoices(fr.length > 0 ? fr : v.slice(0, 10));
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.cancel(); if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const book = books.find(b => b.id === selectedId);
  const chapter = book?.chapters[chapterIdx];

  const stop = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const speak = () => {
    if (!chapter?.content) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(chapter.content);
    const voice = voices.find(v => v.name === selectedVoice) || voices[0];
    if (voice) utter.voice = voice;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.onend = () => { setPlaying(false); setProgress(100); if (intervalRef.current) clearInterval(intervalRef.current); };
    utter.onerror = () => { setPlaying(false); if (intervalRef.current) clearInterval(intervalRef.current); };
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    setPlaying(true);
    setProgress(0);
    const words = chapter.content.split(" ").length;
    const duration = (words / (rate * 150)) * 1000;
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
      setProgress(pct);
      if (pct >= 100 && intervalRef.current) clearInterval(intervalRef.current);
    }, 200);
  };

  const pauseResume = () => {
    if (playing) { window.speechSynthesis.pause(); setPlaying(false); }
    else { window.speechSynthesis.resume(); setPlaying(true); }
  };

  const exportScript = () => {
    if (!book) return;
    const text = book.chapters.map(c => `=== ${c.title} ===\n\n${c.content}`).join("\n\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${book.title}-audiobook-script.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const frVoices = voices.filter(v => v.lang.startsWith("fr"));
  const otherVoices = voices.filter(v => !v.lang.startsWith("fr"));

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
            <Headphones size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Audiobook Studio</h1>
        </div>
        <p className="text-white/50">Écoute tes chapitres · Choix de voix · Export du script</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <div className="space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4">
            <h2 className="text-white font-semibold">Livre & Chapitre</h2>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setChapterIdx(0); stop(); }}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
              <option value="">Choisir un livre...</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>

            {book && book.chapters.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {book.chapters.map((c, i) => (
                  <button key={i} onClick={() => { setChapterIdx(i); stop(); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all border ${i === chapterIdx ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "border-white/5 text-white/50 hover:border-white/10 hover:text-white"}`}>
                    <span className="text-white/30 mr-2">{i + 1}.</span>{c.title}
                    {c.content.length < 50 && <span className="text-white/25 text-xs ml-2">(vide)</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2"><Volume2 size={15} /> Paramètres voix</h2>

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Voix</label>
              <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none">
                <option value="">Voix par défaut</option>
                {frVoices.length > 0 && <optgroup label="Français">{frVoices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}</optgroup>}
                {otherVoices.length > 0 && <optgroup label="Autres">{otherVoices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</optgroup>}
              </select>
            </div>

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Vitesse: {rate}x</label>
              <input type="range" min="0.5" max="2" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value))}
                className="w-full accent-emerald-500" />
            </div>

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Hauteur: {pitch}</label>
              <input type="range" min="0.5" max="2" step="0.1" value={pitch} onChange={e => setPitch(Number(e.target.value))}
                className="w-full accent-emerald-500" />
            </div>
          </div>

          <button onClick={exportScript} disabled={!book}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-40 text-emerald-300 rounded-xl text-sm transition-colors">
            <Download size={14} /> Exporter script texte (.txt)
          </button>
        </div>

        <div className="space-y-5">
          {chapter ? (
            <>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
                <h3 className="text-white font-semibold mb-1">{chapter.title}</h3>
                <p className="text-white/40 text-xs mb-4">{chapter.content.split(" ").length} mots · ~{Math.round(chapter.content.split(" ").length / (rate * 150))} min à écouter</p>

                <div className="w-full bg-white/5 rounded-full h-1.5 mb-5">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>

                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => { setChapterIdx(Math.max(0, chapterIdx - 1)); stop(); }} disabled={chapterIdx === 0}
                    className="p-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl transition-colors">
                    <ChevronLeft size={18} className="text-white" />
                  </button>
                  <button onClick={playing ? pauseResume : speak} disabled={!chapter.content || chapter.content.length < 10}
                    className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 rounded-2xl transition-all shadow-lg shadow-emerald-500/20">
                    {playing ? <Pause size={22} className="text-white" /> : <Play size={22} className="text-white" />}
                  </button>
                  <button onClick={stop}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                    <Square size={18} className="text-white/60" />
                  </button>
                  <button onClick={() => { setChapterIdx(Math.min((book?.chapters.length || 1) - 1, chapterIdx + 1)); stop(); }}
                    disabled={chapterIdx >= (book?.chapters.length || 1) - 1}
                    className="p-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl transition-colors">
                    <ChevronRight size={18} className="text-white" />
                  </button>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
                <h3 className="text-white/60 text-sm mb-3">Contenu du chapitre</h3>
                <div className="max-h-80 overflow-y-auto">
                  <p className="text-white/50 text-sm leading-relaxed">{chapter.content || "Ce chapitre est vide."}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-16 text-center">
              <Headphones size={48} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">Sélectionne un livre et un chapitre</p>
              <p className="text-white/20 text-xs mt-1">pour commencer l'écoute</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

