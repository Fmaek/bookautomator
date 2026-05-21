"use client";
import { useState } from "react";
import { Telescope, TrendingUp, Users, Shield, DollarSign, Search, Sparkles, Loader2, Copy } from "lucide-react";

type Tab = "competitor" | "trends" | "sentiment" | "price" | "plagiarism";

const TABS: { id: Tab; icon: typeof Telescope; label: string; color: string }[] = [
  { id: "competitor", icon: Telescope, label: "Concurrent X-Ray", color: "text-purple-400" },
  { id: "trends", icon: TrendingUp, label: "Trend Radar", color: "text-pink-400" },
  { id: "sentiment", icon: Users, label: "Sentiment Map", color: "text-cyan-400" },
  { id: "price", icon: DollarSign, label: "Prix Optimal", color: "text-emerald-400" },
  { id: "plagiarism", icon: Shield, label: "Anti-Plagiat", color: "text-amber-400" },
];

export default function ResearchPage() {
  const [tab, setTab] = useState<Tab>("competitor");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<Tab, string>>({ competitor: "", trends: "", sentiment: "", price: "", plagiarism: "" });

  // Competitor fields
  const [niche, setNiche] = useState("");
  const [category, setCategory] = useState("Non-fiction");
  const [competitorTitles, setCompetitorTitles] = useState("");

  // Trends fields
  const [trendsCategory, setTrendsCategory] = useState("Non-fiction");
  const [language, setLanguage] = useState("français");

  // Sentiment fields
  const [reviews, setReviews] = useState("");
  const [reviewBookTitle, setReviewBookTitle] = useState("");

  // Price fields
  const [priceTitle, setPriceTitle] = useState("");
  const [priceCategory, setPriceCategory] = useState("Non-fiction");
  const [pages, setPages] = useState("");

  // Plagiarism fields
  const [plagContent, setPlagContent] = useState("");
  const [plagTitle, setPlagTitle] = useState("");

  const run = async () => {
    setLoading(true);
    try {
      let body: Record<string, string> = {};
      if (tab === "competitor") body = { action: "competitor_xray", niche, category, titles: competitorTitles };
      if (tab === "trends") body = { action: "trend_radar", category: trendsCategory, language };
      if (tab === "sentiment") body = { action: "sentiment_map", reviews, bookTitle: reviewBookTitle };
      if (tab === "price") body = { action: "price_optimizer", bookTitle: priceTitle, category: priceCategory, pages };
      if (tab === "plagiarism") body = { action: "plagiarism_check", bookTitle: plagTitle, content: plagContent };

      const res = await fetch("/api/write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      const text = data.result || data.hooks || JSON.stringify(data, null, 2);
      setResult(prev => ({ ...prev, [tab]: text }));
    } catch { }
    setLoading(false);
  };

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";

  const renderForm = () => {
    if (tab === "competitor") return (
      <div className="space-y-4">
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Niche / Sujet</label>
          <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Ex: Discipline mentale, productivité..." className={ic} />
        </div>
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Catégorie</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
            {["Non-fiction", "Roman", "Développement personnel", "Business", "Santé/Bien-être", "Finance"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Titres concurrents connus (optionnel)</label>
          <input value={competitorTitles} onChange={e => setCompetitorTitles(e.target.value)} placeholder="Ex: Atomic Habits, Les 5 AM Club..." className={ic} />
        </div>
      </div>
    );

    if (tab === "trends") return (
      <div className="space-y-4">
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Catégorie à analyser</label>
          <select value={trendsCategory} onChange={e => setTrendsCategory(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
            {["Non-fiction", "Développement personnel", "Business", "Finance", "Santé", "Spiritualité", "Romance", "Thriller"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Langue du marché</label>
          <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
            {["français", "anglais", "espagnol", "portugais"].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>
    );

    if (tab === "sentiment") return (
      <div className="space-y-4">
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Titre du livre / Niche</label>
          <input value={reviewBookTitle} onChange={e => setReviewBookTitle(e.target.value)} placeholder="Ex: livres de développement personnel" className={ic} />
        </div>
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Avis lecteurs à analyser</label>
          <textarea value={reviews} onChange={e => setReviews(e.target.value)} rows={6}
            placeholder="Colle des avis Amazon, Babelio, Goodreads... L'IA les analysera pour toi" className={`${ic} resize-none`} />
        </div>
      </div>
    );

    if (tab === "price") return (
      <div className="space-y-4">
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Titre du livre</label>
          <input value={priceTitle} onChange={e => setPriceTitle(e.target.value)} placeholder="Titre de ton livre" className={ic} />
        </div>
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Catégorie</label>
          <select value={priceCategory} onChange={e => setPriceCategory(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
            {["Non-fiction", "Roman", "Développement personnel", "Business", "Santé/Bien-être", "Finance"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Nombre de pages estimé</label>
          <input value={pages} onChange={e => setPages(e.target.value)} placeholder="Ex: 120" className={ic} type="number" />
        </div>
      </div>
    );

    if (tab === "plagiarism") return (
      <div className="space-y-4">
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Titre du livre</label>
          <input value={plagTitle} onChange={e => setPlagTitle(e.target.value)} placeholder="Titre de ton livre" className={ic} />
        </div>
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Contenu à analyser</label>
          <textarea value={plagContent} onChange={e => setPlagContent(e.target.value)} rows={8}
            placeholder="Colle le contenu à vérifier (extrait ou chapitre entier)..." className={`${ic} resize-none`} />
        </div>
      </div>
    );
  };

  const currentTab = TABS.find(t => t.id === tab)!;

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
            <Search size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Research Hub</h1>
        </div>
        <p className="text-white/50">Intelligence marché · Analyse concurrentielle · Sentiment · Prix optimal · Anti-plagiat</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all border ${tab === t.id ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-white/40 hover:text-white/70 hover:border-white/10"}`}>
            <t.icon size={14} className={tab === t.id ? currentTab.color : ""} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
          <h2 className={`font-semibold flex items-center gap-2 ${currentTab.color}`}>
            <currentTab.icon size={16} /> {currentTab.label}
          </h2>
          {renderForm()}
          <button onClick={run} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Analyse en cours..." : "Analyser"}
          </button>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
          {result[tab] ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Résultats</h3>
                <button onClick={() => navigator.clipboard.writeText(result[tab])}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs transition-colors">
                  <Copy size={11} /> Copier
                </button>
              </div>
              <div className="overflow-y-auto max-h-[65vh]">
                <pre className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-sans">{result[tab]}</pre>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <currentTab.icon size={48} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm">Les résultats apparaîtront ici</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

