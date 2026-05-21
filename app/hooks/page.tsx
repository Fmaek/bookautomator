"use client";
import { useState, useEffect } from "react";
import { Zap, Sparkles, Loader2, Copy, CheckCircle } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

const HOOK_TYPES = ["CURIOSITÉ", "CHOC / CONTRE-INTUITIF", "BÉNÉFICE DIRECT", "SOCIAL PROOF", "PEUR / URGENCE"];
const TYPE_COLORS: Record<string, string> = {
  "CURIOSITÉ": "text-purple-400 border-purple-500/20 bg-purple-500/5",
  "CHOC / CONTRE-INTUITIF": "text-red-400 border-red-500/20 bg-red-500/5",
  "BÉNÉFICE DIRECT": "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  "SOCIAL PROOF": "text-blue-400 border-blue-500/20 bg-blue-500/5",
  "PEUR / URGENCE": "text-orange-400 border-orange-500/20 bg-orange-500/5",
};

export default function HooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [promise, setPromise] = useState("");
  const [loading, setLoading] = useState(false);
  const [rawHooks, setRawHooks] = useState("");
  const [copiedIdx, setCopiedIdx] = useState(-1);

  useEffect(() => { setBooks(getBooks()); }, []);

  const book = books.find(b => b.id === selectedId);
  const title = book?.title || customTitle;

  const generate = async () => {
    if (!title) return;
    setLoading(true);
    setRawHooks("");
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "viral_hooks",
          bookTitle: title,
          category: book?.category || "",
          promise,
        }),
      });
      const data = await res.json();
      setRawHooks(data.hooks || "");
    } catch { }
    setLoading(false);
  };

  const parseHooks = () => {
    if (!rawHooks) return [];
    const lines = rawHooks.split("\n").filter(l => l.trim());
    return lines.map((l, i) => {
      const parts = l.split("|").map(p => p.trim());
      const type = HOOK_TYPES.find(t => rawHooks.includes(t) && i >= rawHooks.split("\n").findIndex(x => x.includes(t)));
      return { text: parts[0] || l, format: parts[1] || "", type: type || "CURIOSITÉ", raw: l };
    }).filter(h => h.text.length > 10);
  };

  const hooks = parseHooks();

  const copy = (text: string, i: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(i);
    setTimeout(() => setCopiedIdx(-1), 1500);
  };

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Viral Hooks Lab</h1>
        </div>
        <p className="text-white/50">20 accroches virales · 5 types psychologiques · Prêtes pour TikTok, Instagram, email</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-semibold">Configuration</h2>

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Livre (ou saisir manuellement)</label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none mb-2">
                <option value="">Saisir manuellement...</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              {!selectedId && (
                <input value={customTitle} onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Titre de ton livre ou projet..." className={ic} />
              )}
            </div>

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Promesse principale</label>
              <textarea value={promise} onChange={e => setPromise(e.target.value)} rows={3}
                placeholder="Ex: Découvre comment doubler ta productivité en 21 jours sans effort supplémentaire..."
                className={`${ic} resize-none`} />
            </div>

            <button onClick={generate} disabled={loading || !title}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Génération..." : "Générer 20 accroches"}
            </button>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
            <p className="text-white/40 text-xs font-medium mb-2">Types d'accroches</p>
            {HOOK_TYPES.map(t => (
              <div key={t} className={`text-xs px-2 py-1 rounded-lg mb-1 border ${TYPE_COLORS[t]}`}>{t}</div>
            ))}
          </div>
        </div>

        <div className="col-span-2">
          {hooks.length > 0 ? (
            <div className="space-y-2 max-h-[75vh] overflow-y-auto">
              {rawHooks.split("\n").filter(l => l.trim()).map((line, i) => {
                const isTypeHeader = HOOK_TYPES.some(t => line.includes(`TYPE`) && line.includes(t.split("/")[0].trim()));
                if (isTypeHeader) {
                  const matchedType = HOOK_TYPES.find(t => line.includes(t.split(" ")[0]));
                  return (
                    <div key={i} className="mt-4 first:mt-0">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${matchedType ? TYPE_COLORS[matchedType].split(" ")[0] : "text-white/40"}`}>
                        {line.replace(/TYPE \d+ — /, "")}
                      </span>
                    </div>
                  );
                }
                if (line.trim().length < 10) return null;
                const parts = line.split("|").map(p => p.trim());
                const hookText = parts[0].replace(/^\d+[\.\)]\s*/, "");
                const format = parts[1];
                return (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:border-white/10 group transition-all">
                    <div className="flex-1">
                      <p className="text-white/80 text-sm leading-relaxed">{hookText}</p>
                      {format && <span className="text-white/30 text-xs mt-1 inline-block">{format}</span>}
                    </div>
                    <button onClick={() => copy(hookText, i)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all">
                      {copiedIdx === i ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} className="text-white/40" />}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : rawHooks ? (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Accroches générées</h3>
                <button onClick={() => navigator.clipboard.writeText(rawHooks)} className="text-white/30 hover:text-white text-xs"><Copy size={12} /></button>
              </div>
              <pre className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-sans">{rawHooks}</pre>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-20 text-center">
              <Zap size={56} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">20 accroches virales apparaîtront ici</p>
              <p className="text-white/20 text-xs mt-1">Prêtes à coller sur tes réseaux, emails et publicités</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

