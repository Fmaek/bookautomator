"use client";
import { useState } from "react";
import { Send, CheckCircle, Circle, Loader2, ExternalLink, Sparkles, Globe, AlertCircle } from "lucide-react";

interface Platform { id: string; name: string; desc: string; logo: string; commission: string; audience: string; status: "idle" | "publishing" | "done" | "error"; link?: string }

const PLATFORMS: Platform[] = [
  { id: "kdp", name: "Amazon KDP", desc: "Le plus grand marché mondial", logo: "📦", commission: "70% royalties", audience: "Mondial", status: "idle" },
  { id: "draft2digital", name: "Draft2Digital", desc: "Distribue sur 40+ plateformes en un clic", logo: "🌐", commission: "85% net", audience: "Mondial", status: "idle" },
  { id: "kobo", name: "Kobo Writing Life", desc: "Fort en Europe et Canada", logo: "📖", commission: "70% royalties", audience: "Europe/Canada", status: "idle" },
  { id: "apple", name: "Apple Books", desc: "Audience iOS mondiale", logo: "🍎", commission: "70% royalties", audience: "iOS Global", status: "idle" },
  { id: "google", name: "Google Play Books", desc: "Audience Android", logo: "🔍", commission: "70% royalties", audience: "Android Global", status: "idle" },
  { id: "youscribe", name: "YouScribe", desc: "Leader francophone Afrique", logo: "📚", commission: "60% royalties", audience: "Afrique/France", status: "idle" },
  { id: "smashwords", name: "Smashwords", desc: "Distribution multi-plateformes", logo: "💡", commission: "85% net", audience: "Mondial", status: "idle" },
];

export default function PublishPage() {
  const [platforms, setPlatforms] = useState<Platform[]>(PLATFORMS);
  const [selected, setSelected] = useState<Set<string>>(new Set(["kdp", "draft2digital", "kobo"]));
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState(false);
  const [bookTitle, setBookTitle] = useState("");
  const [bookDesc, setBookDesc] = useState("");
  const [price, setPrice] = useState("4.99");

  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const publishAll = async () => {
    if (selected.size === 0 || !bookTitle) return;
    setPublishing(true);
    for (const id of [...selected]) {
      setPlatforms(prev => prev.map(p => p.id === id ? { ...p, status: "publishing" } : p));
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
      setPlatforms(prev => prev.map(p => p.id === id ? { ...p, status: Math.random() > 0.1 ? "done" : "error" } : p));
    }
    setPublishing(false);
    setDone(true);
  };

  const doneCount = platforms.filter(p => p.status === "done").length;
  const errorCount = platforms.filter(p => p.status === "error").length;
  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Publier Partout</h1>
        <p className="text-white/50">Un seul clic → ton livre sur toutes les plateformes mondiales</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Informations du livre</h2>
            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm mb-2 block">Titre *</label>
                <input value={bookTitle} onChange={e => setBookTitle(e.target.value)} placeholder="Titre de ton livre" className={inputClass} />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Description de vente</label>
                <textarea value={bookDesc} onChange={e => setBookDesc(e.target.value)} rows={4} placeholder="Description qui donne envie d'acheter..." className={`${inputClass} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Prix (€)</label>
                  <input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.99" min="0.99" className={inputClass} />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Langue</label>
                  <select className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                    <option>Français</option>
                    <option>Anglais</option>
                    <option>Bilingue</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-500/[0.08] border border-purple-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} className="text-purple-400" />
              <span className="text-purple-300 text-sm font-medium">Estimation de revenus</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[["par vente", 1], ["30 ventes/mois", 30], ["100 ventes/mois", 100]].map(([label, mult]) => (
                <div key={String(label)}>
                  <p className="text-white text-lg font-bold">{(parseFloat(price || "0") * 0.7 * Number(mult)).toFixed(mult === 1 ? 2 : 0)}€</p>
                  <p className="text-white/40 text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Plateformes ({selected.size} sélectionnées)</h2>
            <button onClick={() => setSelected(new Set(platforms.map(p => p.id)))} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">Tout sélectionner</button>
          </div>

          <div className="space-y-2 mb-6">
            {platforms.map(p => (
              <div key={p.id} className={`bg-white/[0.03] border rounded-xl p-4 transition-all ${p.status === "done" ? "border-emerald-500/30" : p.status === "error" ? "border-red-500/30" : p.status === "publishing" ? "border-purple-500/50" : selected.has(p.id) ? "border-purple-500/30" : "border-white/[0.06]"}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => !publishing && !done && toggle(p.id)} className="shrink-0" disabled={publishing || done}>
                    {p.status === "done" ? <CheckCircle size={18} className="text-emerald-400" /> :
                     p.status === "error" ? <AlertCircle size={18} className="text-red-400" /> :
                     p.status === "publishing" ? <Loader2 size={18} className="text-purple-400 animate-spin" /> :
                     selected.has(p.id) ? <CheckCircle size={18} className="text-purple-400" /> :
                     <Circle size={18} className="text-white/20" />}
                  </button>
                  <span className="text-xl">{p.logo}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{p.commission}</span>
                    </div>
                    <p className="text-white/40 text-xs">{p.desc}</p>
                  </div>
                  <span className="text-xs text-white/30 flex items-center gap-1 shrink-0">
                    <Globe size={10} /> {p.audience}
                  </span>
                  {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-emerald-400"><ExternalLink size={13} /></a>}
                </div>
              </div>
            ))}
          </div>

          {!done ? (
            <button onClick={publishAll} disabled={publishing || selected.size === 0 || !bookTitle} className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all text-sm">
              {publishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {publishing ? `Publication... (${platforms.filter(p => p.status === "done" || p.status === "error").length}/${selected.size})` : `Publier sur ${selected.size} plateforme${selected.size > 1 ? "s" : ""}`}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <CheckCircle size={24} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-emerald-300 font-semibold">Publication terminée !</p>
                <p className="text-white/40 text-sm mt-1">{doneCount} succès · {errorCount} erreur{errorCount > 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => { setPlatforms(PLATFORMS); setDone(false); setPublishing(false); }} className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm transition-colors">Nouvelle publication</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
