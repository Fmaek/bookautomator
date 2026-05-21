"use client";
import { useState, useEffect } from "react";
import { Network, Sparkles, Loader2, Copy, Download } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

export default function IpExpansionPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
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
          action: "ip_expansion",
          bookTitle: book.title,
          category: book.category,
          authorName: book.authorName,
        }),
      });
      const data = await res.json();
      setResult(data.expansion || "");
    } catch { }
    setLoading(false);
  };

  const exportTxt = () => {
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `expansion-ip-${book?.title || "livre"}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const PHASES = [
    { label: "Phase 1", desc: "0-3 mois", color: "text-purple-400", items: ["Workbook", "Threads/posts", "Lead magnet", "Quiz interactif"] },
    { label: "Phase 2", desc: "3-6 mois", color: "text-pink-400", items: ["Formation en ligne", "Challenge 30 jours", "Communauté", "Webinaire"] },
    { label: "Phase 3", desc: "6-12 mois", color: "text-amber-400", items: ["Livre papier", "Planner physique", "Deck de cartes", "Coaching premium"] },
    { label: "Phase 4", desc: "12+ mois", color: "text-cyan-400", items: ["Podcast", "Licences", "Conférences", "Partenariats"] },
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <Network size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">IP Expansion Planner</h1>
        </div>
        <p className="text-white/50">Transforme un livre en univers de produits · Formations · Physique · Podcast · Licences</p>
      </div>

      {/* Phase roadmap visual */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {PHASES.map((ph, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold ${ph.color}`}>{ph.label}</span>
              <span className="text-white/25 text-xs">{ph.desc}</span>
            </div>
            {ph.items.map(item => (
              <p key={item} className="text-white/40 text-xs flex items-center gap-1.5 mb-1">
                <span className={`w-1 h-1 rounded-full ${ph.color.replace("text-", "bg-")}`} />{item}
              </p>
            ))}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <div className="space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4">
            <h2 className="text-white font-semibold">Ton livre à développer</h2>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setResult(""); }}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
              <option value="">Choisir un livre...</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>

            {book && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <p className="text-purple-300 text-sm font-medium">{book.title}</p>
                <p className="text-white/40 text-xs">{book.category} · {book.authorName}</p>
              </div>
            )}

            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <p className="text-white/40 text-xs leading-relaxed">L'IA va créer un plan d'expansion complet avec revenus estimés, effort de création et priorité pour chaque produit dérivé sur 4 phases.</p>
            </div>

            <button onClick={generate} disabled={loading || !book}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Création du plan..." : "Créer le plan d'expansion"}
            </button>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
          {result ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Plan d'expansion IP</h3>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(result)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs">
                    <Copy size={11} />
                  </button>
                  <button onClick={exportTxt}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 text-purple-300 rounded-lg text-xs">
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
              <Network size={56} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm">Le plan d'expansion apparaîtra ici</p>
              <p className="text-white/20 text-xs mt-1">16+ produits dérivés avec revenus estimés</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

