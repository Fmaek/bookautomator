"use client";
import { useState, useEffect } from "react";
import { BarChart3, Sparkles, Loader2, DollarSign, TrendingUp, Copy } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

type Tool = "forecast" | "price" | "ams";

interface Forecast {
  scenarios: {
    pessimiste: { mensuel: number[]; annuel_total: number; description: string };
    realiste: { mensuel: number[]; annuel_total: number; description: string };
    optimiste: { mensuel: number[]; annuel_total: number; description: string };
  };
  breakEven: string;
  conseils: string[];
}

export default function ForecastPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [tool, setTool] = useState<Tool>("forecast");
  const [price, setPrice] = useState("9.99");
  const [currentSales, setCurrentSales] = useState("0");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [textResult, setTextResult] = useState("");
  const [activeScenario, setActiveScenario] = useState<"pessimiste" | "realiste" | "optimiste">("realiste");

  useEffect(() => { setBooks(getBooks()); }, []);

  const book = books.find(b => b.id === selectedId);

  const run = async () => {
    if (!book) return;
    setLoading(true);
    setForecast(null); setTextResult("");
    try {
      let body: Record<string, string | number> = {};
      if (tool === "forecast") body = { action: "royalty_forecast", bookTitle: book.title, price, currentSales, category: book.category, platforms: "KDP, Kobo" };
      if (tool === "price") body = { action: "price_optimizer", bookTitle: book.title, category: book.category, pages: String(book.pages) };
      if (tool === "ams") body = { action: "ams_ads", bookTitle: book.title, category: book.category, targetKeywords, authorName: book.authorName || "" };

      const res = await fetch("/api/write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();

      if (tool === "forecast" && data.scenarios) setForecast(data as Forecast);
      else setTextResult(data.result || "");
    } catch { }
    setLoading(false);
  };

  const royaltiesPerSale = Number(price) * 0.7;
  const scenarioData = forecast?.scenarios[activeScenario];
  const maxVal = scenarioData ? Math.max(...scenarioData.mensuel) : 1;

  const SCENARIO_COLORS = {
    pessimiste: "from-red-500 to-orange-500",
    realiste: "from-purple-500 to-pink-500",
    optimiste: "from-emerald-500 to-teal-500",
  };

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none";
  const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
            <BarChart3 size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Prévisions & Monétisation</h1>
        </div>
        <p className="text-white/50">Royalties forecast · Prix optimal · Copies AMS prêtes</p>
      </div>

      {/* Tool tabs */}
      <div className="flex gap-2 mb-6">
        {([["forecast", BarChart3, "Forecast Royalties"], ["price", DollarSign, "Prix Optimal"], ["ams", TrendingUp, "Pub AMS"]] as const).map(([id, Icon, label]) => (
          <button key={id} onClick={() => { setTool(id); setForecast(null); setTextResult(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all ${tool === id ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-white/40 hover:text-white/70"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Livre</label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                <option value="">Choisir...</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>

            {tool === "forecast" && (
              <>
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">Prix de vente (€)</label>
                  <input type="number" step="0.99" value={price} onChange={e => setPrice(e.target.value)} className={ic} />
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">Ventes actuelles/mois</label>
                  <input type="number" value={currentSales} onChange={e => setCurrentSales(e.target.value)} className={ic} />
                </div>
                {price && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-emerald-300 text-xs">Royaltie par vente (70%): <span className="font-bold">{(Number(price) * 0.7).toFixed(2)}€</span></p>
                  </div>
                )}
              </>
            )}

            {tool === "ams" && (
              <div>
                <label className="text-white/60 text-xs mb-1.5 block">Mots-clés cibles</label>
                <input value={targetKeywords} onChange={e => setTargetKeywords(e.target.value)}
                  placeholder="développement personnel, productivité..." className={ic} />
              </div>
            )}

            <button onClick={run} disabled={loading || !book}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Calcul en cours..." : "Analyser"}
            </button>
          </div>
        </div>

        <div className="col-span-2">
          {tool === "forecast" && forecast ? (
            <div className="space-y-4">
              {/* Scenario selector */}
              <div className="flex gap-2">
                {(["pessimiste", "realiste", "optimiste"] as const).map(s => (
                  <button key={s} onClick={() => setActiveScenario(s)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${activeScenario === s ? `bg-gradient-to-r ${SCENARIO_COLORS[s]} border-transparent text-white` : "border-white/10 text-white/40 hover:text-white"}`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              {scenarioData && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-white/60 text-sm">{scenarioData.description}</p>
                    <div className="text-right">
                      <p className="text-white/40 text-xs">Revenu annuel estimé</p>
                      <p className={`text-2xl font-bold bg-gradient-to-r ${SCENARIO_COLORS[activeScenario]} bg-clip-text text-transparent`}>
                        {(scenarioData.annuel_total * royaltiesPerSale).toFixed(0)}€
                      </p>
                      <p className="text-white/30 text-xs">{scenarioData.annuel_total} ventes</p>
                    </div>
                  </div>

                  {/* Bar chart */}
                  <div className="flex items-end gap-1.5 h-32">
                    {scenarioData.mensuel.slice(0, 12).map((val, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t-sm relative" style={{ height: `${Math.round((val / maxVal) * 100)}%`, minHeight: "4px" }}>
                          <div className={`absolute inset-0 rounded-t-sm bg-gradient-to-t ${SCENARIO_COLORS[activeScenario]}`} />
                        </div>
                        <span className="text-white/25 text-xs">{MONTHS[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {forecast.breakEven && (
                <div className="bg-amber-500/8 border border-amber-500/15 rounded-xl p-4">
                  <p className="text-amber-300 text-xs font-medium mb-1">Break-even</p>
                  <p className="text-white/60 text-sm">{forecast.breakEven}</p>
                </div>
              )}

              {forecast.conseils?.length > 0 && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <p className="text-white/50 text-xs font-medium mb-2">Conseils</p>
                  {forecast.conseils.map((c, i) => (
                    <p key={i} className="text-white/60 text-sm flex items-start gap-2 mb-1">
                      <span className="text-emerald-400 text-xs mt-1">→</span>{c}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : textResult ? (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Résultats</h3>
                <button onClick={() => navigator.clipboard.writeText(textResult)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs">
                  <Copy size={11} /> Copier
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh]">
                <pre className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-sans">{textResult}</pre>
              </div>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-20 text-center">
              <BarChart3 size={56} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">Les prévisions apparaîtront ici</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

