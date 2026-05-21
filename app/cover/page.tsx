"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Image, Wand2, Layout, Download, RefreshCw, Palette, Sparkles } from "lucide-react";

const TEMPLATES = [
  { id: "bold", name: "Impact", colors: ["#4c1d95", "#312e81"], accent: "#ec4899", textColor: "#ffffff" },
  { id: "warm", name: "Chaleureux", colors: ["#7c2d12", "#78350f"], accent: "#f59e0b", textColor: "#ffffff" },
  { id: "clean", name: "Corporate", colors: ["#1e3a5f", "#0c4a6e"], accent: "#22d3ee", textColor: "#ffffff" },
  { id: "nature", name: "Nature", colors: ["#14532d", "#064e3b"], accent: "#34d399", textColor: "#ffffff" },
  { id: "dark", name: "Premium", colors: ["#0a0a0a", "#1c1c1c"], accent: "#fbbf24", textColor: "#ffffff" },
  { id: "minimal", name: "Minimaliste", colors: ["#374151", "#4b5563"], accent: "#a855f7", textColor: "#ffffff" },
  { id: "rose", name: "Romance", colors: ["#831843", "#9d174d"], accent: "#f9a8d4", textColor: "#ffffff" },
  { id: "ocean", name: "Océan", colors: ["#0c4a6e", "#0e7490"], accent: "#67e8f9", textColor: "#ffffff" },
];

const DECORATIONS = ["circles", "lines", "dots", "triangles", "none"] as const;

const W = 512;
const H = 768;

function drawCover(
  canvas: HTMLCanvasElement,
  title: string,
  author: string,
  subtitle: string,
  template: typeof TEMPLATES[0],
  decoration: typeof DECORATIONS[number]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = W;
  canvas.height = H;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, template.colors[0]);
  grad.addColorStop(1, template.colors[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Decorations
  ctx.globalAlpha = 0.08;
  if (decoration === "circles") {
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(W * 0.7 + i * 20, H * 0.3 - i * 30, 60 + i * 40, 0, Math.PI * 2);
      ctx.strokeStyle = template.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else if (decoration === "lines") {
    ctx.strokeStyle = template.accent;
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 40);
      ctx.lineTo(W, i * 40 - 100);
      ctx.stroke();
    }
  } else if (decoration === "dots") {
    ctx.fillStyle = template.accent;
    for (let x = 0; x < W; x += 30) {
      for (let y = 0; y < H; y += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (decoration === "triangles") {
    ctx.strokeStyle = template.accent;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const x = (W / 8) * i + 30;
      const y = H * 0.15 + Math.sin(i) * 50;
      const s = 40 + i * 10;
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s * 0.866, y + s * 0.5);
      ctx.lineTo(x - s * 0.866, y + s * 0.5);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // Accent bar top
  ctx.fillStyle = template.accent;
  ctx.fillRect(0, 0, W, 5);

  // Accent bar bottom
  ctx.fillRect(0, H - 5, W, 5);

  // Vertical accent line left
  ctx.fillRect(30, 80, 3, H - 160);

  // Author name (top)
  ctx.font = "bold 22px Georgia, serif";
  ctx.fillStyle = template.accent;
  ctx.textAlign = "left";
  ctx.fillText((author || "Auteur").toUpperCase(), 50, 120);

  // Title
  const titleText = title || "Titre du Livre";
  const maxWidth = W - 100;
  ctx.fillStyle = template.textColor;
  ctx.textAlign = "left";

  // Measure and auto-size font
  let fontSize = 64;
  ctx.font = `900 ${fontSize}px Georgia, serif`;
  while (ctx.measureText(titleText).width > maxWidth && fontSize > 28) {
    fontSize -= 4;
    ctx.font = `900 ${fontSize}px Georgia, serif`;
  }

  // Word-wrap title
  const words = titleText.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const titleY = H * 0.38 - ((lines.length - 1) * (fontSize * 1.2)) / 2;
  lines.forEach((l, i) => {
    ctx.fillText(l, 50, titleY + i * fontSize * 1.25);
  });

  // Divider line
  const divY = titleY + lines.length * fontSize * 1.25 + 20;
  ctx.strokeStyle = template.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, divY);
  ctx.lineTo(200, divY);
  ctx.stroke();

  // Subtitle
  if (subtitle) {
    ctx.font = `italic 22px Georgia, serif`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(subtitle, 50, divY + 40);
  }

  // Bottom branding strip
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(0, H - 80, W, 80);

  ctx.font = "14px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.textAlign = "center";
  ctx.fillText("BookAutomator", W / 2, H - 25);
}

export default function CoverPage() {
  const [tab, setTab] = useState<"canvas" | "ai">("canvas");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [decoration, setDecoration] = useState<typeof DECORATIONS[number]>("circles");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiImageUrl, setAiImageUrl] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const redraw = useCallback(() => {
    if (canvasRef.current) {
      drawCover(canvasRef.current, title, author, subtitle, selectedTemplate, decoration);
    }
  }, [title, author, subtitle, selectedTemplate, decoration]);

  useEffect(() => { redraw(); }, [redraw]);

  const downloadCanvas = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `couverture-${title || "livre"}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const generateAI = () => {
    if (!aiPrompt && !title) return;
    setAiLoading(true);
    setAiImageUrl("");
    const seed = Math.floor(Math.random() * 99999);
    const fullPrompt = encodeURIComponent(
      `Professional book cover. ${aiPrompt || `Book titled "${title}"`}. ${author ? `Author: ${author}.` : ""}
       High quality publishing, dramatic lighting, portrait format, bestseller aesthetic. No text.`
    );
    setAiImageUrl(`https://image.pollinations.ai/prompt/${fullPrompt}?width=512&height=768&seed=${seed}&nologo=true&enhance=true`);
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Générateur de Couvertures</h1>
        <p className="text-white/50">Création instantanée par Canvas ou génération IA</p>
      </div>

      <div className="flex gap-2 mb-8 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
        {[
          { id: "canvas", icon: Layout, label: "Couverture Instantanée" },
          { id: "ai", icon: Wand2, label: "Génération IA (lente)" },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id as "canvas" | "ai")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? "bg-purple-500 text-white" : "text-white/50 hover:text-white"}`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === "canvas" && (
        <div className="grid grid-cols-2 gap-8">
          {/* Controls */}
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
              <label className="text-white/60 text-sm mb-2 block">Sous-titre (optionnel)</label>
              <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="La méthode complète en 30 jours" className={inputClass} />
            </div>

            <div>
              <label className="text-white/60 text-sm mb-2 block flex items-center gap-1">
                <Palette size={13} /> Thème
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setSelectedTemplate(t)}
                    className={`rounded-xl p-1.5 border transition-all ${selectedTemplate.id === t.id ? "border-purple-500/60 scale-105" : "border-white/[0.06]"}`}>
                    <div className="h-10 rounded-lg mb-1" style={{ background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})`, borderBottom: `2px solid ${t.accent}` }} />
                    <p className="text-white/50 text-xs text-center leading-none">{t.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-white/60 text-sm mb-2 block">Décoration</label>
              <div className="flex flex-wrap gap-2">
                {DECORATIONS.map(d => (
                  <button key={d} onClick={() => setDecoration(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${decoration === d ? "bg-purple-500 text-white" : "bg-white/5 text-white/50 hover:text-white"}`}>
                    {d === "none" ? "Aucune" : d}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={downloadCanvas}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-medium transition-all">
              <Download size={16} /> Télécharger la couverture (PNG)
            </button>
          </div>

          {/* Canvas Preview */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">Aperçu instantané — aucune attente</span>
            </div>
            <canvas
              ref={canvasRef}
              className="rounded-xl shadow-2xl shadow-purple-500/30"
              style={{ width: 220, height: 330 }}
            />
            <p className="text-white/20 text-xs mt-4">512 × 768 px · Format livre</p>
          </div>
        </div>
      )}

      {tab === "ai" && (
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-5">
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-yellow-300 text-sm">⚠️ La génération IA peut prendre 2-10 minutes selon Pollinations.ai. Utilise l&apos;onglet <strong>Instantané</strong> pour une couverture immédiate.</p>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Description visuelle</label>
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={4}
                placeholder="Ex: Couverture business moderne, fond sombre, ville futuriste, tons violets et or..."
                className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Titre (pour le contexte IA)</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Mon Livre" className={inputClass} />
            </div>
            <button onClick={generateAI} disabled={aiLoading || (!aiPrompt && !title)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all">
              {aiLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Wand2 size={16} />}
              {aiLoading ? "Génération en cours..." : "Générer avec l'IA"}
            </button>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[500px]">
            {aiLoading && (
              <div className="text-center">
                <div className="w-16 h-16 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">Pollinations.ai génère...</p>
                <p className="text-white/40 text-sm mt-1">Patience, ça peut prendre plusieurs minutes</p>
              </div>
            )}
            {!aiLoading && !aiImageUrl && (
              <div className="text-center">
                <div className="w-32 h-44 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center mb-4 mx-auto">
                  <Image size={32} className="text-white/20" />
                </div>
                <p className="text-white/30 text-sm">La couverture IA apparaîtra ici</p>
              </div>
            )}
            {aiImageUrl && (
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={aiImageUrl} alt="Couverture IA"
                  onLoad={() => setAiLoading(false)}
                  onError={() => setAiLoading(false)}
                  className="w-48 h-auto rounded-lg shadow-2xl shadow-purple-500/30 mb-4 mx-auto" />
                {!aiLoading && (
                  <div className="flex gap-3 justify-center">
                    <button onClick={generateAI} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm transition-colors">
                      <RefreshCw size={13} /> Regénérer
                    </button>
                    <a href={aiImageUrl} download="couverture-ia.png" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors">
                      <Download size={13} /> Télécharger
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
