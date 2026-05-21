"use client";
import { useState, useEffect } from "react";
import { Fingerprint, Sparkles, Loader2, Copy, CheckCircle, BookOpen } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

export default function ToneClonerPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [sampleText, setSampleText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { setBooks(getBooks()); }, []);

  const book = books.find(b => b.id === selectedId);

  const loadBookSample = () => {
    if (!book) return;
    const content = book.chapters.map(c => c.content).join("\n\n").substring(0, 2000);
    setSampleText(content);
  };

  const generate = async () => {
    if (!sampleText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tone_clone",
          sampleText,
          bookTitle: book?.title || "",
          instruction,
        }),
      });
      const data = await res.json();
      setResult(data.result || "");
    } catch { }
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stylePart = result.includes("TEXTE GÉNÉRÉ:") ? result.split("TEXTE GÉNÉRÉ:")[0] : "";
  const textPart = result.includes("TEXTE GÉNÉRÉ:") ? result.split("TEXTE GÉNÉRÉ:")[1]?.trim() : result;

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center">
            <Fingerprint size={20} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Tone Cloner</h1>
        </div>
        <p className="text-white/50">L'IA apprend ton style d'écriture et génère du contenu qui te ressemble</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold">1. Colle ton texte d'exemple</h2>

            <div className="flex gap-2">
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="flex-1 bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                <option value="">Choisir un livre pour importer...</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              <button onClick={loadBookSample} disabled={!book}
                className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl text-sm hover:bg-purple-500/30 disabled:opacity-40 transition-colors whitespace-nowrap">
                <BookOpen size={13} className="inline mr-1" /> Importer
              </button>
            </div>

            <textarea value={sampleText} onChange={e => setSampleText(e.target.value)}
              placeholder="Colle 200-500 mots écrits par toi (ou un auteur dont tu veux imiter le style)..."
              rows={8} className={`${ic} resize-none`} />
            <p className="text-white/30 text-xs">{sampleText.length} caractères — minimum 200 pour un bon résultat</p>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold">2. Sujet à générer</h2>
            <textarea value={instruction} onChange={e => setInstruction(e.target.value)}
              placeholder="Ex: Écris l'introduction d'un chapitre sur la discipline mentale..."
              rows={3} className={`${ic} resize-none`} />

            <button onClick={generate} disabled={loading || sampleText.length < 100}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Clonage du style en cours..." : "Cloner et générer"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {result ? (
            <>
              {stylePart && (
                <div className="bg-purple-500/8 border border-purple-500/15 rounded-2xl p-5">
                  <h3 className="text-purple-300 font-semibold text-sm mb-3">Style détecté</h3>
                  <pre className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap font-sans">{stylePart.replace("STYLE DÉTECTÉ:", "").trim()}</pre>
                </div>
              )}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold text-sm">Texte généré dans ton style</h3>
                  <button onClick={copy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs transition-colors">
                    {copied ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copied ? "Copié !" : "Copier"}
                  </button>
                </div>
                <pre className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-sans">{textPart}</pre>
              </div>
            </>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 text-center h-full flex flex-col items-center justify-center">
              <Fingerprint size={48} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm">Le texte cloné apparaîtra ici</p>
              <p className="text-white/20 text-xs mt-1">Le style détecté s'affichera aussi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
