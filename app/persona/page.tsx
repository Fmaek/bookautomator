"use client";
import { useState } from "react";
import { Drama, Sparkles, Loader2, Copy, Image as ImageIcon } from "lucide-react";

export default function PersonaPage() {
  const [niche, setNiche] = useState("");
  const [style, setStyle] = useState("Expert accessible");
  const [values, setValues] = useState("Authenticité, impact, transformation");
  const [realName, setRealName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [previewImg, setPreviewImg] = useState("");
  const [generatingImg, setGeneratingImg] = useState(false);

  const STYLES = ["Expert accessible", "Coach motivateur", "Storyteller", "Académique vulgarisé", "Minimaliste direct", "Inspirationnel", "Humouristique"];

  const generate = async () => {
    if (!niche) return;
    setLoading(true);
    setResult(""); setPreviewImg("");
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "persona_create", realName, niche, style, values }),
      });
      const data = await res.json();
      setResult(data.persona || "");
    } catch { }
    setLoading(false);
  };

  const generatePhoto = async () => {
    const descMatch = result.match(/DESCRIPTION PHOTO[:\s]+([^\n]+(?:\n[^\n]+)*?)(?=\n\d+\.|$)/i);
    const desc = descMatch?.[1]?.trim() || `Professional author headshot, ${style}, confident, neutral background`;
    setGeneratingImg(true);
    const prompt = encodeURIComponent(`Portrait photo of an author, ${desc}, professional, high quality, realistic`);
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=400&height=400&model=flux&nologo=true&seed=${Date.now()}`;
    const img = new window.Image();
    img.onload = () => { setPreviewImg(url); setGeneratingImg(false); };
    img.onerror = () => setGeneratingImg(false);
    img.src = url;
    setPreviewImg(url);
    setTimeout(() => setGeneratingImg(false), 5000);
  };

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none";

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
            <Drama size={20} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Persona IA</h1>
        </div>
        <p className="text-white/50">Crée un auteur fictif crédible · Bio · Histoire · Profils sociaux · Photo IA</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Créer le persona</h2>

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Niche éditoriale *</label>
              <input value={niche} onChange={e => setNiche(e.target.value)}
                placeholder="Ex: Développement personnel, Finance, Parentalité, Santé..." className={ic} />
            </div>

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Style d'écriture</label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map(s => (
                  <button key={s} onClick={() => setStyle(s)}
                    className={`py-2 px-3 rounded-xl text-xs border transition-all text-left ${style === s ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "border-white/[0.06] text-white/50 hover:border-white/10"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Valeurs du persona</label>
              <input value={values} onChange={e => setValues(e.target.value)} className={ic} />
            </div>

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Inspiration nom réel (optionnel)</label>
              <input value={realName} onChange={e => setRealName(e.target.value)}
                placeholder="Pour inspirer le nom de plume..." className={ic} />
            </div>

            <button onClick={generate} disabled={loading || !niche}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Création du persona..." : "Créer le persona"}
            </button>
          </div>

          {result && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3">
              <h3 className="text-white font-semibold text-sm">Photo du persona</h3>
              {previewImg ? (
                <img src={previewImg} alt="Persona" className="w-32 h-32 rounded-2xl object-cover border border-white/10" />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <ImageIcon size={24} className="text-white/20" />
                </div>
              )}
              <button onClick={generatePhoto} disabled={generatingImg}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 disabled:opacity-40 text-indigo-300 rounded-xl text-sm transition-colors">
                {generatingImg ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
                {generatingImg ? "Génération..." : "Générer photo IA"}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
          {result ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Persona créé</h3>
                <button onClick={() => navigator.clipboard.writeText(result)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs transition-colors">
                  <Copy size={11} /> Copier tout
                </button>
              </div>
              <div className="overflow-y-auto max-h-[70vh]">
                <pre className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-sans">{result}</pre>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <Drama size={56} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm">Le persona apparaîtra ici</p>
              <p className="text-white/20 text-xs mt-1">Nom de plume · Bio · Bios sociales · Photo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
