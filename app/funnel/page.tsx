"use client";
import { useState, useEffect } from "react";
import { Workflow, Sparkles, Loader2, Copy, Download } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

export default function FunnelPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [leadMagnet, setLeadMagnet] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => { setBooks(getBooks()); }, []);

  const book = books.find(b => b.id === selectedId);

  const generate = async () => {
    if (!book) return;
    setLoading(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "funnel_builder",
          bookTitle: book.title,
          authorName: book.authorName,
          price: "9,99€",
          leadMagnetIdea: leadMagnet,
        }),
      });
      const data = await res.json();
      setResult(data.funnel || "");
    } catch { }
    setLoading(false);
  };

  const exportTxt = () => {
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `funnel-${book?.title || "livre"}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  // Parse sections from result
  const sections = result ? result.split(/\d\.\s+(?=[A-Z])/).filter(Boolean) : [];

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center">
            <Workflow size={20} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Funnel Builder</h1>
        </div>
        <p className="text-white/50">Lead magnet · Page de capture · Séquence 7 emails · Evergreen automation</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Configuration du funnel</h2>

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Livre</label>
              <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setResult(""); }}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                <option value="">Choisir un livre...</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>

            {book && (
              <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                <p className="text-teal-300 text-xs font-medium">{book.title} · {book.authorName}</p>
              </div>
            )}

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Idée de lead magnet (optionnel)</label>
              <input value={leadMagnet} onChange={e => setLeadMagnet(e.target.value)}
                placeholder="Ex: Checklist 10 étapes, mini-guide gratuit, vidéo formation..." className={ic} />
            </div>

            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl space-y-2">
              <p className="text-white/40 text-xs font-medium">Ce qui sera généré:</p>
              {["Lead magnet (titre + description)", "Page de capture", "Séquence 7 emails (J0→J6)", "3 emails post-achat", "Email réactivation"].map(item => (
                <p key={item} className="text-white/30 text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400/40" />{item}
                </p>
              ))}
            </div>

            <button onClick={generate} disabled={loading || !book}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Création du funnel..." : "Créer le funnel complet"}
            </button>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
          {result ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Funnel complet</h3>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(result)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs transition-colors">
                    <Copy size={11} /> Copier
                  </button>
                  <button onClick={exportTxt}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 border border-teal-500/30 hover:bg-teal-500/30 text-teal-300 rounded-lg text-xs transition-colors">
                    <Download size={11} /> Export
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[65vh]">
                <pre className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-sans">{result}</pre>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <Workflow size={56} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm">Le funnel complet apparaîtra ici</p>
              <div className="mt-4 space-y-2 text-center">
                {["Lead magnet", "→ Page capture", "→ 7 emails", "→ Vente"].map(s => (
                  <p key={s} className="text-white/15 text-xs">{s}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
