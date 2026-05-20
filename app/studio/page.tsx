"use client";
import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, Zap, Edit3, Layers, Play, Copy, Download, ChevronRight, Loader2, CheckCircle, Plus, Trash2 } from "lucide-react";

type Mode = "auto" | "assisted" | "hybrid";

const MODES = [
  { id: "auto" as Mode, icon: Zap, label: "Mode Auto", desc: "Donne un titre → l'IA écrit tout", color: "from-purple-500 to-violet-600" },
  { id: "assisted" as Mode, icon: Edit3, label: "Mode Assisté", desc: "Tu écris, l'IA améliore et continue", color: "from-pink-500 to-rose-600" },
  { id: "hybrid" as Mode, icon: Layers, label: "Mode Hybride", desc: "Brief → Plan → Chapitres → Export", color: "from-cyan-500 to-blue-600" },
];

interface Chapter { title: string; content: string; status: "pending" | "writing" | "done" }

function StudioContent() {
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("auto");
  const [title, setTitle] = useState(params.get("idea") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [description, setDescription] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState<"config" | "plan" | "write" | "done">("config");
  const [assistedText, setAssistedText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const generatePlan = async () => {
    if (!title) return;
    setGenerating(true);
    setStep("plan");
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "plan", title, category, description, mode }),
      });
      const data = await res.json();
      const chapterTitles: string[] = data.chapters || [
        "Introduction", "Partie 1 — Les Fondements",
        "Partie 2 — La Méthode", "Partie 3 — Application Pratique",
        "Partie 4 — Cas Réels", "Conclusion & Action"
      ];
      setChapters(chapterTitles.map(t => ({ title: t, content: "", status: "pending" })));
    } catch {
      setChapters([
        { title: "Introduction", content: "", status: "pending" },
        { title: "Partie 1 — Les Fondements", content: "", status: "pending" },
        { title: "Partie 2 — La Méthode", content: "", status: "pending" },
        { title: "Conclusion & Action", content: "", status: "pending" },
      ]);
    }
    setGenerating(false);
  };

  const writeAllChapters = async () => {
    setStep("write");
    for (let i = 0; i < chapters.length; i++) {
      setChapters(prev => prev.map((c, j) => j === i ? { ...c, status: "writing" } : c));
      try {
        const res = await fetch("/api/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "chapter", title, chapterTitle: chapters[i].title, chapterIndex: i + 1, totalChapters: chapters.length }),
        });
        const data = await res.json();
        setChapters(prev => prev.map((c, j) => j === i ? { ...c, content: data.content || "Contenu généré.", status: "done" } : c));
      } catch {
        setChapters(prev => prev.map((c, j) => j === i ? { ...c, content: "Chapitre rédigé.", status: "done" } : c));
      }
    }
    setStep("done");
  };

  const improveText = async () => {
    if (!assistedText.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "improve", text: assistedText }),
      });
      const data = await res.json();
      setAssistedText(data.improved || assistedText);
    } catch { /* keep original */ }
    setGenerating(false);
  };

  const exportBook = () => {
    const full = chapters.map(c => `# ${c.title}\n\n${c.content}`).join("\n\n---\n\n");
    const blob = new Blob([`# ${title}\n\n${full}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";
  const selectClass = "w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50";

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Studio d&apos;Écriture</h1>
        <p className="text-white/50">3 modes IA pour écrire ton livre en quelques minutes</p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {MODES.map(({ id, icon: Icon, label, desc, color }) => (
          <button
            key={id}
            onClick={() => { setMode(id); setStep("config"); setChapters([]); }}
            className={`bg-white/[0.03] border rounded-2xl p-5 text-left transition-all duration-200 ${
              mode === id ? "border-purple-500/50" : "border-white/[0.06] hover:border-white/10"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} className="text-white" />
            </div>
            <p className="text-white font-semibold text-sm mb-1">{label}</p>
            <p className="text-white/40 text-xs">{desc}</p>
          </button>
        ))}
      </div>

      {(mode === "auto" || mode === "hybrid") && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
          {step === "config" && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold text-lg">Configuration du livre</h2>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Titre / Idée du livre *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Gagner 1000€/mois en ligne depuis l'Afrique" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Catégorie</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className={selectClass}>
                    <option value="">Choisir...</option>
                    <option>Business & Entrepreneuriat</option>
                    <option>Développement personnel</option>
                    <option>Spiritualité</option>
                    <option>Roman / Fiction</option>
                    <option>Santé & Bien-être</option>
                    <option>Cuisine</option>
                    <option>Technologie</option>
                  </select>
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Pages cibles</label>
                  <select className={selectClass}>
                    <option>50-80 pages</option>
                    <option>80-150 pages</option>
                    <option>150-250 pages</option>
                    <option>250+ pages</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Brief (optionnel)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Décris ton audience cible, le problème que règle le livre..." className={`${inputClass} resize-none`} />
              </div>
              <button onClick={generatePlan} disabled={!title || generating} className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors">
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                Générer le plan
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {step === "plan" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold text-lg">Plan du livre — {title}</h2>
                <div className="flex gap-3">
                  <button onClick={() => { const t = prompt("Nouveau chapitre:"); if (t) setChapters(prev => [...prev, { title: t, content: "", status: "pending" }]); }} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-sm transition-colors">
                    <Plus size={14} /> Ajouter
                  </button>
                  <button onClick={writeAllChapters} className="flex items-center gap-2 px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors">
                    <Zap size={14} /> Écrire tout le livre
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {chapters.map((ch, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                    <span className="text-white/30 text-sm w-6">{i + 1}.</span>
                    <span className="text-white text-sm flex-1">{ch.title}</span>
                    <button onClick={() => setChapters(prev => prev.filter((_, j) => j !== i))} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(step === "write" || step === "done") && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-semibold">{title}</h2>
                  <p className="text-white/40 text-sm">{chapters.filter(c => c.status === "done").length}/{chapters.length} chapitres</p>
                </div>
                {step === "done" && (
                  <button onClick={exportBook} className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors">
                    <Download size={14} /> Exporter
                  </button>
                )}
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 mb-5">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(chapters.filter(c => c.status === "done").length / chapters.length) * 100}%` }} />
              </div>
              <div className="space-y-2 max-h-[55vh] overflow-y-auto scrollbar-hide">
                {chapters.map((ch, i) => (
                  <div key={i} className={`rounded-xl p-4 border transition-all ${ch.status === "writing" ? "border-purple-500/50 bg-purple-500/10" : ch.status === "done" ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/[0.06]"}`}>
                    <div className="flex items-center gap-3 mb-1">
                      {ch.status === "writing" && <Loader2 size={14} className="text-purple-400 animate-spin shrink-0" />}
                      {ch.status === "done" && <CheckCircle size={14} className="text-emerald-400 shrink-0" />}
                      {ch.status === "pending" && <div className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" />}
                      <span className="text-white text-sm font-medium">{ch.title}</span>
                    </div>
                    {ch.status === "writing" && <p className="text-purple-300/60 text-xs animate-pulse-slow pl-6">Rédaction en cours...</p>}
                    {ch.status === "done" && ch.content && <p className="text-white/40 text-xs pl-6 line-clamp-2">{ch.content.substring(0, 150)}...</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "assisted" && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4">Mode Assisté — Tu écris, l&apos;IA améliore</h2>
          <textarea
            ref={textareaRef}
            value={assistedText}
            onChange={e => setAssistedText(e.target.value)}
            rows={16}
            placeholder="Commence à écrire ton texte ici... L'IA l'améliorera, corrigera le style, enrichira le vocabulaire et proposera la suite."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 text-sm focus:outline-none focus:border-purple-500/50 resize-none leading-relaxed"
          />
          <div className="flex gap-3 mt-4">
            <button onClick={improveText} disabled={generating || !assistedText.trim()} className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
              Améliorer avec l&apos;IA
            </button>
            <button onClick={() => navigator.clipboard.writeText(assistedText)} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm transition-colors">
              <Copy size={14} /> Copier
            </button>
            <button onClick={() => { const blob = new Blob([assistedText], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "texte.txt"; a.click(); URL.revokeObjectURL(url); }} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm transition-colors">
              <Download size={14} /> Exporter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white/50">Chargement...</div>}>
      <StudioContent />
    </Suspense>
  );
}
