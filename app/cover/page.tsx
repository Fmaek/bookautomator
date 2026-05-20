"use client";
import { useState } from "react";
import { Image, Wand2, Layout, Download, RefreshCw, Loader2, Palette } from "lucide-react";

const TEMPLATES = [
  { id: "bold", name: "Impact", bg: "from-purple-900 to-indigo-900", accent: "#ec4899" },
  { id: "warm", name: "Chaleureux", bg: "from-orange-900 to-red-900", accent: "#f59e0b" },
  { id: "clean", name: "Corporate", bg: "from-blue-900 to-cyan-900", accent: "#22d3ee" },
  { id: "nature", name: "Nature", bg: "from-green-900 to-emerald-900", accent: "#34d399" },
  { id: "dark", name: "Premium", bg: "from-black to-gray-900", accent: "#fbbf24" },
  { id: "minimal", name: "Minimaliste", bg: "from-gray-800 to-gray-700", accent: "#a855f7" },
];

const STYLE_PRESETS = [
  "Business élégant, fond sombre, tons dorés",
  "Spiritualité mystique, cosmos, tons violets",
  "Fiction dramatique, paysage épique",
  "Dev personnel inspirant, lumière dorée",
  "Cuisine colorée, ingrédients frais",
  "Tech futuriste, interface holographique",
];

export default function CoverPage() {
  const [tab, setTab] = useState<"ai" | "template">("ai");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [generatedImage, setGeneratedImage] = useState("");
  const [loading, setLoading] = useState(false);

  const generateCover = () => {
    if (!prompt && !title) return;
    setLoading(true);
    setGeneratedImage("");

    const fullPrompt = encodeURIComponent(
      `Professional book cover. ${prompt || `Book titled "${title}"`}. ${author ? `Author: ${author}.` : ""}
      High quality publishing, dramatic lighting, portrait format, bestseller aesthetic. No text in image.`
    );
    // Pollinations.ai — 100% gratuit, aucune clé API
    const seed = Math.floor(Math.random() * 99999);
    const url = `https://image.pollinations.ai/prompt/${fullPrompt}?width=512&height=768&seed=${seed}&nologo=true&enhance=true`;
    setGeneratedImage(url);
    // loading stays true until img onLoad fires
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Générateur de Couvertures</h1>
        <p className="text-white/50">DALL-E 3 IA + Éditeur de templates pour des couvertures professionnelles</p>
      </div>

      <div className="flex gap-2 mb-8 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
        {[
          { id: "ai", icon: Wand2, label: "Génération IA (DALL-E 3)" },
          { id: "template", icon: Layout, label: "Éditeur Templates" },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id as "ai" | "template")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? "bg-purple-500 text-white" : "text-white/50 hover:text-white"}`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === "ai" && (
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-5">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Titre du livre</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Mon Livre Incroyable" className={inputClass} />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Auteur</label>
              <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Ton nom" className={inputClass} />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Description visuelle pour l&apos;IA</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder="Ex: Couverture business moderne, fond sombre, ville futuriste, tons violets et or, style premium..." className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Styles rapides</label>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_PRESETS.map(s => (
                  <button key={s} onClick={() => setPrompt(s)} className="text-xs py-1.5 px-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors text-left">
                    {s.split(",")[0]}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={generateCover} disabled={loading || (!prompt && !title)} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {loading ? "Génération DALL-E 3..." : "Générer la couverture"}
            </button>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[500px]">
            {loading && (
              <div className="text-center">
                <div className="w-16 h-16 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">Pollinations.ai génère ta couverture...</p>
                <p className="text-white/40 text-sm mt-1">Gratuit · ~10-20 secondes</p>
              </div>
            )}
            {!loading && !generatedImage && (
              <div className="text-center">
                <div className="w-32 h-44 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center mb-4 mx-auto">
                  <Image size={32} className="text-white/20" />
                </div>
                <p className="text-white/30 text-sm">La couverture apparaîtra ici</p>
              </div>
            )}
            {generatedImage && !loading && (
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={generatedImage} alt="Couverture générée" onLoad={() => setLoading(false)} onError={() => setLoading(false)} className="w-48 h-auto object-cover rounded-lg shadow-2xl shadow-purple-500/30 mb-4 mx-auto" />
                <div className="flex gap-3 justify-center">
                  <button onClick={generateCover} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm transition-colors">
                    <RefreshCw size={13} /> Regénérer
                  </button>
                  <a href={generatedImage} download="couverture.png" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors">
                    <Download size={13} /> Télécharger
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "template" && (
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-5">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Palette size={16} className="text-purple-400" /> Choisir un template
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setSelectedTemplate(t)} className={`rounded-xl p-2 border transition-all ${selectedTemplate.id === t.id ? "border-purple-500/50" : "border-white/[0.06]"}`}>
                  <div className={`h-16 rounded-lg bg-gradient-to-br ${t.bg} mb-1.5 flex items-center justify-center`}>
                    <span className="text-xs font-bold text-white opacity-80">Aa</span>
                  </div>
                  <p className="text-white/60 text-xs text-center">{t.name}</p>
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre du livre" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none" />
              <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Sous-titre (optionnel)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none" />
              <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Nom de l'auteur" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none" />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <p className="text-white/40 text-sm mb-5">Aperçu en temps réel</p>
            <div className={`w-48 h-64 rounded-xl bg-gradient-to-br ${selectedTemplate.bg} shadow-2xl flex flex-col items-center justify-center p-5 text-center relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              <div className="relative z-10">
                {author && <p className="text-xs opacity-60 mb-3" style={{ color: selectedTemplate.accent }}>{author}</p>}
                <h2 className="font-black text-lg leading-tight mb-2 text-white">{title || "Titre du Livre"}</h2>
                {subtitle && <p className="text-xs opacity-60 text-white">{subtitle}</p>}
                <div className="mt-4 w-8 h-0.5 mx-auto rounded-full opacity-40" style={{ backgroundColor: selectedTemplate.accent }} />
              </div>
            </div>
            <button className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors">
              <Download size={14} /> Exporter la couverture
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
