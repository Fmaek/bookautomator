"use client";
import { useState } from "react";
import { TrendingUp, RefreshCw, Flame, BookOpen, ArrowRight, Search, Sparkles } from "lucide-react";

interface Trend {
  topic: string;
  engagement: string;
  category: string;
  bookIdea: string;
  potential: "Élevé" | "Moyen" | "Viral";
}

const MOCK_TRENDS: Trend[] = [
  { topic: "Manifestation & Loi d'attraction 2025", engagement: "2.4M interactions", category: "Spiritualité", bookIdea: "Manifeste ta vie en 21 jours : le guide ultime", potential: "Viral" },
  { topic: "Side hustle depuis l'Afrique", engagement: "1.8M interactions", category: "Business", bookIdea: "Gagner 1000€/mois en ligne depuis l'Afrique : méthodes prouvées", potential: "Élevé" },
  { topic: "Trauma bonding & relations toxiques", engagement: "1.5M interactions", category: "Psychologie", bookIdea: "Se libérer des relations toxiques : le guide de reconstruction", potential: "Élevé" },
  { topic: "Intelligence artificielle et emploi", engagement: "1.2M interactions", category: "Tech/Business", bookIdea: "Remplacer ton salaire par l'IA : 10 stratégies concrètes", potential: "Élevé" },
  { topic: "Recettes africaines modernes", engagement: "980K interactions", category: "Cuisine", bookIdea: "La cuisine africaine revisitée : 50 recettes fusion", potential: "Moyen" },
  { topic: "Santé mentale des entrepreneurs", engagement: "870K interactions", category: "Dev personnel", bookIdea: "Entrepreneuriat sans burn-out : le manuel de l'entrepreneur équilibré", potential: "Élevé" },
];

const potentialColors: Record<string, string> = {
  "Viral": "bg-red-500/20 text-red-300 border-red-500/30",
  "Élevé": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Moyen": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
};

export default function TrendsPage() {
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<Trend[]>(MOCK_TRENDS);
  const [selected, setSelected] = useState<Trend | null>(null);
  const [search, setSearch] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trends");
      const data = await res.json();
      if (data.trends?.length) setTrends(data.trends);
    } catch {
      setTrends([...MOCK_TRENDS].sort(() => Math.random() - 0.5));
    }
    setLoading(false);
  };

  const filtered = trends.filter(t =>
    t.topic.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-sm font-medium">LIVE — Analyse en temps réel</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Tendances Meta</h1>
            <p className="text-white/50">Sujets viraux Facebook & Instagram → idées de livres qui se vendent</p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-300 hover:bg-orange-500/30 transition-all text-sm disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {loading ? "Analyse IA..." : "Actualiser avec IA"}
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Filtrer par sujet ou catégorie..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((trend, i) => (
          <div
            key={i}
            className={`bg-white/[0.03] border rounded-2xl p-5 transition-all duration-200 cursor-pointer hover:bg-white/[0.06] ${
              selected?.topic === trend.topic ? "border-purple-500/50" : "border-white/[0.06]"
            }`}
            onClick={() => setSelected(selected?.topic === trend.topic ? null : trend)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={14} className="text-orange-400 shrink-0" />
                  <h3 className="text-white font-semibold">{trend.topic}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${potentialColors[trend.potential]}`}>
                    {trend.potential}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/40">
                  <span>{trend.engagement}</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">{trend.category}</span>
                </div>
              </div>
              <ArrowRight size={16} className={`text-white/20 transition-transform shrink-0 mt-1 ${selected?.topic === trend.topic ? "rotate-90 text-purple-400" : ""}`} />
            </div>

            {selected?.topic === trend.topic && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-start gap-3 mb-4">
                  <Sparkles size={16} className="text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-white/40 mb-1">Idée de livre générée</p>
                    <p className="text-white font-medium">{trend.bookIdea}</p>
                  </div>
                </div>
                <a
                  href={`/studio?idea=${encodeURIComponent(trend.bookIdea)}&category=${encodeURIComponent(trend.category)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <BookOpen size={14} />
                  Écrire ce livre maintenant
                  <ArrowRight size={14} />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/[0.06] border border-white/10 backdrop-blur-xl rounded-2xl p-8 text-center">
            <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">Claude analyse les tendances Meta...</p>
            <p className="text-white/40 text-sm mt-1">Scan Facebook · Instagram · Reels</p>
          </div>
        </div>
      )}
    </div>
  );
}

