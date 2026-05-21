"use client";
import { useState, useEffect } from "react";
import { Palette, Save, CheckCircle, RefreshCw } from "lucide-react";

interface BrandKit {
  primaryColor: string; secondaryColor: string; accentColor: string;
  bgColor: string; font: string; authorName: string; tagline: string; logoText: string;
}

const DEFAULT_KIT: BrandKit = {
  primaryColor: "#7c3aed", secondaryColor: "#db2777", accentColor: "#f97316",
  bgColor: "#0a0a0f", font: "Georgia", authorName: "", tagline: "", logoText: "",
};

const PALETTES = [
  { name: "Violet Nuit", primary: "#7c3aed", secondary: "#db2777", accent: "#f97316", bg: "#0a0a0f" },
  { name: "Océan Pro", primary: "#0ea5e9", secondary: "#06b6d4", accent: "#f59e0b", bg: "#0a1929" },
  { name: "Forêt Luxe", primary: "#10b981", secondary: "#14b8a6", accent: "#f97316", bg: "#0a1a0a" },
  { name: "Rouge Passion", primary: "#ef4444", secondary: "#f97316", accent: "#eab308", bg: "#1a0a0a" },
  { name: "Or & Noir", primary: "#d97706", secondary: "#b45309", accent: "#fbbf24", bg: "#0f0e09" },
  { name: "Rose Girly", primary: "#ec4899", secondary: "#a855f7", accent: "#06b6d4", bg: "#1a0a14" },
];

const FONTS = ["Georgia", "Times New Roman", "Garamond", "Playfair Display", "Lora", "Merriweather", "Arial", "Helvetica", "Inter", "Montserrat"];

export default function BrandKitPage() {
  const [kit, setKit] = useState<BrandKit>(DEFAULT_KIT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("bookautomator_brandkit");
    if (stored) { try { setKit(JSON.parse(stored)); } catch { } }
  }, []);

  const save = () => {
    localStorage.setItem("bookautomator_brandkit", JSON.stringify(kit));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const applyPalette = (p: typeof PALETTES[0]) => {
    setKit(prev => ({ ...prev, primaryColor: p.primary, secondaryColor: p.secondary, accentColor: p.accent, bgColor: p.bg }));
  };

  const update = (key: keyof BrandKit, val: string) => setKit(prev => ({ ...prev, [key]: val }));

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none";

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center">
            <Palette size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Brand Kit</h1>
        </div>
        <p className="text-white/50">Définis tes couleurs, polices et identité visuelle — appliqués à toutes tes couvertures</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <div className="space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4">
            <h2 className="text-white font-semibold">Palettes prédéfinies</h2>
            <div className="grid grid-cols-2 gap-2">
              {PALETTES.map(p => (
                <button key={p.name} onClick={() => applyPalette(p)}
                  className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] hover:border-white/15 rounded-xl transition-all text-left">
                  <div className="flex gap-1">
                    {[p.primary, p.secondary, p.accent].map(c => (
                      <div key={c} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-white/60 text-xs">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4">
            <h2 className="text-white font-semibold">Couleurs personnalisées</h2>
            {[
              { key: "primaryColor" as const, label: "Couleur principale" },
              { key: "secondaryColor" as const, label: "Couleur secondaire" },
              { key: "accentColor" as const, label: "Couleur d'accent" },
              { key: "bgColor" as const, label: "Couleur de fond" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <input type="color" value={kit[key]} onChange={e => update(key, e.target.value)}
                  className="w-10 h-10 rounded-xl border-0 cursor-pointer bg-transparent" />
                <div className="flex-1">
                  <label className="text-white/50 text-xs block mb-0.5">{label}</label>
                  <input value={kit[key]} onChange={e => update(key, e.target.value)}
                    className="text-white/70 text-xs bg-transparent border-none outline-none font-mono" />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4">
            <h2 className="text-white font-semibold">Typographie & Identité</h2>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Police</label>
              <select value={kit.font} onChange={e => update("font", e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Nom d'auteur</label>
              <input value={kit.authorName} onChange={e => update("authorName", e.target.value)} placeholder="Ton nom d'auteur" className={ic} />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Tagline</label>
              <input value={kit.tagline} onChange={e => update("tagline", e.target.value)} placeholder="Ex: Auteur · Coach · Entrepreneur" className={ic} />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Logo texte (initiales ou abréviation)</label>
              <input value={kit.logoText} onChange={e => update("logoText", e.target.value)} placeholder="Ex: JD, MK, AB" maxLength={3} className={ic} />
            </div>
          </div>

          <button onClick={save}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all">
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saved ? "Brand Kit sauvegardé !" : "Sauvegarder le Brand Kit"}
          </button>
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-wide mb-4">Aperçu — Couverture</h3>
            <div className="aspect-[2/3] rounded-xl overflow-hidden relative max-w-[200px] mx-auto shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${kit.primaryColor}, ${kit.secondaryColor})` }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
                {kit.logoText && (
                  <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: kit.accentColor }}>
                    {kit.logoText}
                  </div>
                )}
                <p className="text-white font-bold text-lg leading-tight" style={{ fontFamily: kit.font }}>Titre du livre</p>
                <div className="w-10 h-0.5 my-3 rounded-full" style={{ backgroundColor: kit.accentColor }} />
                <p className="text-white/70 text-xs" style={{ fontFamily: kit.font }}>{kit.authorName || "Ton Nom"}</p>
                {kit.tagline && <p className="text-white/40 text-xs mt-1">{kit.tagline}</p>}
              </div>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-wide mb-4">Aperçu — Bouton CTA</h3>
            <button className="px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-lg"
              style={{ background: `linear-gradient(135deg, ${kit.primaryColor}, ${kit.secondaryColor})`, fontFamily: kit.font }}>
              Acheter le livre
            </button>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-wide mb-4">Palette de couleurs</h3>
            <div className="flex gap-3">
              {[
                { c: kit.primaryColor, label: "Principale" },
                { c: kit.secondaryColor, label: "Secondaire" },
                { c: kit.accentColor, label: "Accent" },
                { c: kit.bgColor, label: "Fond" },
              ].map(({ c, label }) => (
                <div key={label} className="text-center">
                  <div className="w-12 h-12 rounded-xl mb-1.5 border border-white/10" style={{ backgroundColor: c }} />
                  <p className="text-white/40 text-xs">{label}</p>
                  <p className="text-white/25 text-xs font-mono">{c}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-purple-500/8 border border-purple-500/15 rounded-xl">
            <p className="text-purple-300 text-xs font-medium mb-1">Utilisation du Brand Kit</p>
            <p className="text-white/40 text-xs leading-relaxed">Tes couleurs et polices sont sauvegardées localement et seront disponibles dans le générateur de couvertures pour créer des designs cohérents.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

