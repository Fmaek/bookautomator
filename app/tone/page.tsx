"use client";
import { useState, useEffect } from "react";
import { Fingerprint, Sparkles, Loader2, Copy, CheckCircle, BookOpen, Save, Trash2, Check } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";
import { getSavedStyles, saveStyle, deleteStyle, type SavedStyle } from "@/lib/styles";

export default function ToneClonerPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [sampleText, setSampleText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  // Style saving
  const [savedStyles, setSavedStyles] = useState<SavedStyle[]>([]);
  const [styleName, setStyleName] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setBooks(getBooks());
    setSavedStyles(getSavedStyles());
  }, []);

  const book = books.find(b => b.id === selectedId);

  const loadBookSample = () => {
    if (!book) return;
    const content = book.chapters.map(c => c.content).join("\n\n").substring(0, 2000);
    setSampleText(content);
  };

  const generate = async () => {
    if (!sampleText.trim()) return;
    setLoading(true);
    setResult("");
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
      // Auto-suggest name
      if (!styleName && book?.title) setStyleName(`Style — ${book.title}`);
      else if (!styleName) setStyleName(`Mon style ${new Date().toLocaleDateString("fr-FR")}`);
    } catch { }
    setLoading(false);
  };

  // Parse style analysis and generated text from result
  const stylePart = result.includes("TEXTE GÉNÉRÉ:")
    ? result.split("TEXTE GÉNÉRÉ:")[0].replace("STYLE DÉTECTÉ:", "").trim()
    : "";
  const textPart = result.includes("TEXTE GÉNÉRÉ:")
    ? result.split("TEXTE GÉNÉRÉ:")[1]?.trim()
    : result;

  const handleSaveStyle = () => {
    if (!stylePart || !styleName.trim()) return;
    const s: SavedStyle = {
      id: Date.now().toString(),
      name: styleName.trim(),
      styleDescription: stylePart,
      sampleText: sampleText.substring(0, 500),
      createdAt: new Date().toISOString(),
    };
    saveStyle(s);
    setSavedStyles(getSavedStyles());
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleDelete = (id: string) => {
    deleteStyle(id);
    setSavedStyles(getSavedStyles());
  };

  const loadStyle = (s: SavedStyle) => {
    setSampleText(s.sampleText);
    setStyleName(s.name);
    setResult("STYLE DÉTECTÉ:" + s.styleDescription + "\n\nTEXTE GÉNÉRÉ:");
  };

  const copy = () => {
    navigator.clipboard.writeText(textPart || result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-pink-500/50";

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center">
            <Fingerprint size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Tone Cloner</h1>
        </div>
        <p className="text-white/50">Analyse ton style · Génère du contenu identique · Sauvegarde pour l'utiliser sur tes livres</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        {/* ── LEFT ── */}
        <div className="space-y-5">

          {/* Saved styles library */}
          {savedStyles.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Save size={13} className="text-pink-400" /> Mes styles sauvegardés ({savedStyles.length})
              </h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedStyles.map(s => (
                  <div key={s.id} className="flex items-center gap-2 p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{s.name}</p>
                      <p className="text-white/30 text-xs">{new Date(s.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <button onClick={() => loadStyle(s)}
                      className="px-2.5 py-1 bg-pink-500/15 border border-pink-500/20 text-pink-300 rounded-lg text-xs hover:bg-pink-500/25 transition-colors whitespace-nowrap">
                      Charger
                    </button>
                    <button onClick={() => handleDelete(s.id)}
                      className="p-1.5 text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample text */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4">
            <h2 className="text-white font-semibold">1. Colle ton texte d'exemple</h2>
            <div className="flex gap-2">
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="flex-1 bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                <option value="">Importer depuis un livre...</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              <button onClick={loadBookSample} disabled={!book}
                className="px-4 py-2 bg-pink-500/20 border border-pink-500/30 text-pink-300 rounded-xl text-sm hover:bg-pink-500/30 disabled:opacity-40 transition-colors whitespace-nowrap">
                <BookOpen size={13} className="inline mr-1" /> Importer
              </button>
            </div>
            <textarea value={sampleText} onChange={e => setSampleText(e.target.value)}
              placeholder="Colle 200–500 mots écrits par toi (ou un auteur à imiter)..."
              rows={8} className={`${ic} resize-none`} />
            <p className="text-white/30 text-xs">{sampleText.length} caractères — minimum 200 recommandé</p>
          </div>

          {/* Instruction */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4">
            <h2 className="text-white font-semibold">2. Ce que tu veux générer</h2>
            <textarea value={instruction} onChange={e => setInstruction(e.target.value)}
              placeholder="Ex: Écris l'introduction d'un chapitre sur la discipline mentale..."
              rows={3} className={`${ic} resize-none`} />
            <button onClick={generate} disabled={loading || sampleText.length < 100}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Clonage du style..." : "Cloner et générer"}
            </button>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Style analysis */}
              {stylePart && (
                <div className="bg-purple-500/8 border border-purple-500/15 rounded-2xl p-4 md:p-5">
                  <h3 className="text-purple-300 font-semibold text-sm mb-3">ADN stylistique détecté</h3>
                  <pre className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap font-sans">{stylePart}</pre>

                  {/* Save this style */}
                  <div className="mt-4 pt-4 border-t border-purple-500/10 space-y-2">
                    <p className="text-white/40 text-xs">Sauvegarder ce style pour l'utiliser sur tes livres :</p>
                    <div className="flex gap-2">
                      <input value={styleName} onChange={e => setStyleName(e.target.value)}
                        placeholder="Nom du style (ex: Mon style coach, Style narratif...)"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/25 text-sm focus:outline-none focus:border-pink-500/50" />
                      <button onClick={handleSaveStyle} disabled={!styleName.trim() || !stylePart}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 ${justSaved ? "bg-emerald-500 text-white" : "bg-pink-500/20 border border-pink-500/30 text-pink-300 hover:bg-pink-500/30"}`}>
                        {justSaved ? <><Check size={13} /> Sauvegardé</> : <><Save size={13} /> Sauvegarder</>}
                      </button>
                    </div>
                    {justSaved && (
                      <p className="text-emerald-400 text-xs">✓ Style ajouté à ta bibliothèque — disponible dans le Studio d'Écriture</p>
                    )}
                  </div>
                </div>
              )}

              {/* Generated text */}
              {textPart && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
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
              )}
            </>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-64">
              <Fingerprint size={48} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm">Ton style cloné apparaîtra ici</p>
              <p className="text-white/20 text-xs mt-2">Sauvegarde-le pour l'appliquer à n'importe quel livre</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
