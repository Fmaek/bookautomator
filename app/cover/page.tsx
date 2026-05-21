"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Download, Wand2, Layout, RefreshCw, Palette, Sparkles, BookOpen, Check } from "lucide-react";
import { getBooks, saveBook, type Book } from "@/lib/books";

const TEMPLATES = [
  { id: "bold",     name: "Impact",      c1: "#2e1065", c2: "#1e1b4b", accent: "#e879f9", text: "#ffffff" },
  { id: "warm",     name: "Chaleureux",  c1: "#7c2d12", c2: "#431407", accent: "#fb923c", text: "#ffffff" },
  { id: "clean",    name: "Corporate",   c1: "#0c2340", c2: "#0c4a6e", accent: "#38bdf8", text: "#ffffff" },
  { id: "nature",   name: "Nature",      c1: "#052e16", c2: "#14532d", accent: "#4ade80", text: "#ffffff" },
  { id: "dark",     name: "Premium",     c1: "#000000", c2: "#0f0f0f", accent: "#facc15", text: "#ffffff" },
  { id: "minimal",  name: "Minimaliste", c1: "#1f2937", c2: "#111827", accent: "#c084fc", text: "#ffffff" },
  { id: "rose",     name: "Romance",     c1: "#500724", c2: "#831843", accent: "#f9a8d4", text: "#ffffff" },
  { id: "ocean",    name: "Océan",       c1: "#082f49", c2: "#0c4a6e", accent: "#67e8f9", text: "#ffffff" },
];

const DECOS = ["cercles", "lignes", "points", "aucune"] as const;

const W = 512, H = 768;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCover(
  canvas: HTMLCanvasElement,
  title: string,
  author: string,
  subtitle: string,
  tpl: typeof TEMPLATES[0],
  deco: typeof DECOS[number]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = W;
  canvas.height = H;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, tpl.c1);
  bg.addColorStop(1, tpl.c2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Decorations
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = tpl.accent;
  ctx.lineWidth = 1.5;
  if (deco === "cercles") {
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(W * 0.78, H * 0.22, 55 + i * 42, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (deco === "lignes") {
    for (let i = -5; i < 25; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 35);
      ctx.lineTo(W, i * 35 + 120);
      ctx.stroke();
    }
  } else if (deco === "points") {
    ctx.fillStyle = tpl.accent;
    for (let x = 20; x < W; x += 28) {
      for (let y = 20; y < H; y += 28) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();

  // ── Accent bars top & bottom ──
  ctx.fillStyle = tpl.accent;
  ctx.fillRect(0, 0, W, 7);
  ctx.fillRect(0, H - 7, W, 7);

  // ── Left vertical accent line ──
  ctx.fillRect(44, 90, 3, H - 180);

  // ── AUTHOR NAME (top, accent color) ──
  const authorDisplay = (author || "Auteur").toUpperCase();
  ctx.font = "bold 21px Arial, Helvetica, sans-serif";
  ctx.fillStyle = tpl.accent;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(authorDisplay, 62, 76);

  // ── TITLE (large, white, word-wrapped) ──
  const titleText = title || "Titre du Livre";
  const maxW = W - 124;

  let fs = 62;
  ctx.font = `bold ${fs}px Arial, Helvetica, sans-serif`;
  // Shrink font until first word fits (rough measure)
  while (ctx.measureText(titleText).width > maxW * 2.5 && fs > 26) {
    fs -= 3;
    ctx.font = `bold ${fs}px Arial, Helvetica, sans-serif`;
  }

  const lines = wrapText(ctx, titleText, maxW);
  const lh = fs * 1.28;
  const totalTitleH = lines.length * lh;
  const titleStartY = H * 0.46 - totalTitleH / 2;

  ctx.fillStyle = "#ffffff";
  lines.forEach((l, i) => {
    ctx.fillText(l, 62, titleStartY + i * lh);
  });

  // ── Accent divider line ──
  const divY = titleStartY + totalTitleH + 22;
  ctx.strokeStyle = tpl.accent;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(62, divY);
  ctx.lineTo(220, divY);
  ctx.stroke();

  // ── SUBTITLE ──
  if (subtitle) {
    ctx.font = `italic 19px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.58)";
    ctx.fillText(subtitle.substring(0, 50), 62, divY + 38);
  }

  // ── Bottom strip ──
  const stripGrad = ctx.createLinearGradient(0, H - 110, 0, H - 7);
  stripGrad.addColorStop(0, "rgba(0,0,0,0)");
  stripGrad.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = stripGrad;
  ctx.fillRect(0, H - 110, W, 103);

  // Author at bottom
  ctx.font = "bold 18px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.textAlign = "center";
  ctx.fillText(author || "Auteur", W / 2, H - 48);

  ctx.font = "12px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillText("BookAutomator", W / 2, H - 22);
}

export default function CoverPage() {
  const [tab, setTab] = useState<"canvas" | "ai">("canvas");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [tpl, setTpl] = useState(TEMPLATES[0]);
  const [deco, setDeco] = useState<typeof DECOS[number]>("cercles");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiUrl, setAiUrl] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [assignTarget, setAssignTarget] = useState("");
  const [assigned, setAssigned] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { setBooks(getBooks()); }, []);

  const redraw = useCallback(() => {
    if (canvasRef.current) drawCover(canvasRef.current, title, author, subtitle, tpl, deco);
  }, [title, author, subtitle, tpl, deco]);

  useEffect(() => { redraw(); }, [redraw]);

  const downloadCanvas = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.download = `couverture-${title || "livre"}.png`;
    a.href = canvasRef.current.toDataURL("image/png");
    a.click();
  };

  const assignCoverToBook = () => {
    if (!assignTarget || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const book = books.find(b => b.id === assignTarget);
    if (!book) return;
    saveBook({ ...book, hasCover: true, coverDataUrl: dataUrl, updatedAt: new Date().toISOString() });
    setBooks(getBooks());
    setAssigned(true);
    setTimeout(() => setAssigned(false), 2500);
  };

  const generateAI = () => {
    if (!aiPrompt && !title) return;
    setAiLoading(true);
    setAiUrl("");
    const seed = Math.floor(Math.random() * 99999);
    const prompt = encodeURIComponent(
      `Professional book cover illustration. ${aiPrompt || `Book titled "${title}"`}. ${author ? `Author ${author}.` : ""}
       Cinematic lighting, dramatic atmosphere, portrait 3:4 format, bestseller quality, ultra HD. No text, no letters.`
    );
    setAiUrl(`https://image.pollinations.ai/prompt/${prompt}?width=512&height=768&seed=${seed}&nologo=true&enhance=true`);
  };

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Générateur de Couvertures</h1>
        <p className="text-white/50">Création instantanée par Canvas · Génération IA · Assignation au livre</p>
      </div>

      <div className="flex gap-2 mb-8 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
        {[{ id: "canvas", icon: Layout, label: "Couverture Instantanée" }, { id: "ai", icon: Wand2, label: "Génération IA (lente)" }].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id as "canvas" | "ai")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? "bg-purple-500 text-white" : "text-white/50 hover:text-white"}`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {tab === "canvas" && (
        <div className="grid grid-cols-2 gap-8">
          {/* Controls */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-5">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Titre du livre</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Mon Livre Incroyable" className={ic} />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Auteur</label>
              <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Ton nom" className={ic} />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Sous-titre (optionnel)</label>
              <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="La méthode complète en 30 jours" className={ic} />
            </div>

            <div>
              <label className="text-white/60 text-sm mb-2 flex items-center gap-1"><Palette size={13} /> Thème</label>
              <div className="grid grid-cols-4 gap-2">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setTpl(t)}
                    className={`rounded-xl p-1.5 border transition-all ${tpl.id === t.id ? "border-purple-500/70 scale-105" : "border-white/[0.06]"}`}>
                    <div className="h-10 rounded-lg mb-1 flex items-end justify-center pb-1"
                      style={{ background: `linear-gradient(160deg, ${t.c1}, ${t.c2})`, borderBottom: `3px solid ${t.accent}` }} />
                    <p className="text-white/50 text-xs text-center leading-none">{t.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-white/60 text-sm mb-2 block">Décoration</label>
              <div className="flex gap-2 flex-wrap">
                {DECOS.map(d => (
                  <button key={d} onClick={() => setDeco(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${deco === d ? "bg-purple-500 text-white" : "bg-white/5 text-white/50 hover:text-white"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Assign to book */}
            {books.length > 0 && (
              <div className="pt-3 border-t border-white/5">
                <label className="text-white/60 text-sm mb-2 flex items-center gap-1"><BookOpen size={13} /> Assigner à un livre</label>
                <div className="flex gap-2">
                  <select value={assignTarget} onChange={e => setAssignTarget(e.target.value)}
                    className="flex-1 bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                    <option value="">Choisir un livre...</option>
                    {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                  <button onClick={assignCoverToBook} disabled={!assignTarget}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 ${assigned ? "bg-emerald-500 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"}`}>
                    {assigned ? <><Check size={14} /> Assignée</> : "Assigner"}
                  </button>
                </div>
                {assigned && <p className="text-emerald-400 text-xs mt-1.5">✓ Couverture sauvegardée dans la bibliothèque</p>}
              </div>
            )}

            <button onClick={downloadCanvas}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-medium transition-all">
              <Download size={16} /> Télécharger PNG (512×768)
            </button>
          </div>

          {/* Canvas Preview */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 flex flex-col items-center justify-center">
            <div className="flex items-center justify-between mb-5 w-full max-w-xs">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">Aperçu temps réel</span>
              </div>
              <button onClick={() => setShow3D(!show3D)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${show3D ? "bg-purple-500 text-white" : "bg-white/10 text-white/50 hover:text-white"}`}>
                {show3D ? "Vue 2D" : "Vue 3D"}
              </button>
            </div>
            <div style={show3D ? { perspective: "900px" } : {}}>
              <div style={show3D ? {
                transform: "rotateY(-28deg) rotateX(4deg)",
                transformStyle: "preserve-3d",
                filter: "drop-shadow(30px 30px 50px rgba(0,0,0,0.8))",
                transition: "transform 0.4s ease",
              } : { transition: "transform 0.4s ease" }}>
                <canvas ref={canvasRef} style={{ width: 224, height: 336, borderRadius: show3D ? "4px 12px 12px 4px" : "12px" }}
                  className="shadow-2xl shadow-purple-500/25 border border-white/10" />
                {show3D && (
                  <div style={{
                    position: "absolute", top: 0, left: -30, width: 30, height: 336,
                    background: `linear-gradient(to right, ${tpl.c2}, ${tpl.c1})`,
                    borderRadius: "4px 0 0 4px",
                    transform: "rotateY(-90deg) translateX(-15px)",
                    transformOrigin: "right center",
                    boxShadow: "-5px 0 15px rgba(0,0,0,0.5)",
                  }} />
                )}
              </div>
            </div>
            <p className="text-white/20 text-xs mt-4">512 × 768 px · Format livre standard</p>
          </div>
        </div>
      )}

      {tab === "ai" && (
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-5">
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-yellow-300 text-sm">⚠️ Génération IA via Pollinations.ai — peut prendre 2-10 minutes. Utilise l&apos;onglet <strong>Instantané</strong> pour une couverture immédiate.</p>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Description visuelle</label>
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={4}
                placeholder="Ex: Fond sombre premium, ville futuriste la nuit, tons violets et dorés, style luxe..."
                className={`${ic} resize-none`} />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Titre (contexte IA)</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Mon Livre" className={ic} />
            </div>
            <button onClick={generateAI} disabled={aiLoading || (!aiPrompt && !title)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all">
              {aiLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Wand2 size={16} />}
              {aiLoading ? "Génération en cours..." : "Générer avec Pollinations.ai"}
            </button>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[500px]">
            {aiLoading && !aiUrl && (
              <div className="text-center">
                <div className="w-16 h-16 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">Génération en cours...</p>
                <p className="text-white/40 text-sm mt-1">Patience, peut prendre plusieurs minutes</p>
              </div>
            )}
            {!aiLoading && !aiUrl && (
              <div className="text-center">
                <div className="w-32 h-44 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center mb-4 mx-auto">
                  <Wand2 size={32} className="text-white/20" />
                </div>
                <p className="text-white/30 text-sm">La couverture IA apparaîtra ici</p>
              </div>
            )}
            {aiUrl && (
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={aiUrl} alt="Couverture IA"
                  onLoad={() => setAiLoading(false)}
                  onError={() => setAiLoading(false)}
                  className="w-48 h-auto rounded-lg shadow-2xl shadow-purple-500/30 mb-4 mx-auto" />
                {!aiLoading && (
                  <div className="flex gap-3 justify-center">
                    <button onClick={generateAI} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm">
                      <RefreshCw size={13} /> Regénérer
                    </button>
                    <a href={aiUrl} download="couverture-ia.png" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium">
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
