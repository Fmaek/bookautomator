"use client";
import { useState, useEffect } from "react";
import {
  TrendingUp, BookOpen, FileText, Target, Plus, Trash2,
  BarChart2, Wallet, Calendar, CheckCircle, Award, Zap
} from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

interface Sale { id: string; platform: string; month: string; units: number; revenue: number; bookId: string }
interface Goal { id: string; label: string; target: number; current: number; unit: string; color: string }

const PLATFORMS_LIST = ["Draft2Digital", "Kobo Writing Life", "YouScribe"];
const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const GOAL_COLORS = ["bg-purple-500", "bg-pink-500", "bg-emerald-500", "bg-amber-500", "bg-blue-500"];

const SALES_KEY = "bookautomator_sales";
const GOALS_KEY = "bookautomator_goals";

function loadSales(): Sale[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SALES_KEY) || "[]"); } catch { return []; }
}
function saveSales(sales: Sale[]) { localStorage.setItem(SALES_KEY, JSON.stringify(sales)); }
function loadGoals(): Goal[] {
  if (typeof window === "undefined") return [];
  try {
    const g = JSON.parse(localStorage.getItem(GOALS_KEY) || "null");
    if (g) return g;
  } catch { /* empty */ }
  return [
    { id: "1", label: "Mots écrits ce mois", target: 15000, current: 0, unit: "mots", color: "bg-purple-500" },
    { id: "2", label: "Ventes ce mois", target: 30, current: 0, unit: "ventes", color: "bg-emerald-500" },
    { id: "3", label: "Revenus ce mois", target: 100, current: 0, unit: "€", color: "bg-amber-500" },
  ];
}
function saveGoals(goals: Goal[]) { localStorage.setItem(GOALS_KEY, JSON.stringify(goals)); }

export default function StatsPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newSale, setNewSale] = useState({ platform: "Draft2Digital", month: MONTHS[new Date().getMonth()], units: "", revenue: "", bookId: "" });
  const [showAddSale, setShowAddSale] = useState(false);

  useEffect(() => {
    const b = getBooks();
    setBooks(b);
    setSales(loadSales());
    setGoals(loadGoals());
    if (b.length > 0) setNewSale(p => ({ ...p, bookId: b[0].id }));
  }, []);

  // ── Computed stats ────────────────────────────────────────────────────────
  const totalWords = books.reduce((acc, b) => acc + b.chapters.reduce((s, c) => s + (c.content?.split(" ").length || 0), 0), 0);
  const totalRevenue = sales.reduce((acc, s) => acc + s.revenue, 0);
  const totalUnits = sales.reduce((acc, s) => acc + s.units, 0);
  const publishedBooks = books.filter(b => b.status === "publié").length;

  // Sales by platform
  const byPlatform = PLATFORMS_LIST.map(p => ({
    name: p,
    units: sales.filter(s => s.platform === p).reduce((a, s) => a + s.units, 0),
    revenue: sales.filter(s => s.platform === p).reduce((a, s) => a + s.revenue, 0),
  }));

  // Sales by month (last 6)
  const monthSales = MONTHS.slice(0, new Date().getMonth() + 1).slice(-6).map(m => ({
    month: m,
    revenue: sales.filter(s => s.month === m).reduce((a, s) => a + s.revenue, 0),
    units: sales.filter(s => s.month === m).reduce((a, s) => a + s.units, 0),
  }));
  const maxRev = Math.max(...monthSales.map(m => m.revenue), 1);

  const addSale = () => {
    if (!newSale.units || !newSale.revenue) return;
    const s: Sale = { id: Date.now().toString(), ...newSale, units: Number(newSale.units), revenue: Number(newSale.revenue) };
    const updated = [...sales, s];
    setSales(updated);
    saveSales(updated);
    setNewSale(p => ({ ...p, units: "", revenue: "" }));
    setShowAddSale(false);
  };

  const deleteSale = (id: string) => {
    const updated = sales.filter(s => s.id !== id);
    setSales(updated);
    saveSales(updated);
  };

  const updateGoal = (id: string, current: number) => {
    const updated = goals.map(g => g.id === id ? { ...g, current } : g);
    setGoals(updated);
    saveGoals(updated);
  };

  const ic = "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none";

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Statistiques & Objectifs</h1>
        <p className="text-white/50">Suis tes ventes, tes revenus et tes objectifs d&apos;écriture</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Livres écrits", value: books.length, sub: `${publishedBooks} publiés`, icon: BookOpen, color: "text-purple-400", bg: "bg-purple-500/10" },
          { label: "Mots écrits", value: totalWords.toLocaleString("fr"), sub: `${Math.round(totalWords / 250)} pages`, icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Ventes totales", value: totalUnits, sub: "toutes plateformes", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Revenus totaux", value: `${totalRevenue.toFixed(2)}€`, sub: "net estimé", icon: Wallet, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 md:p-5">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-white font-medium text-sm mt-0.5">{label}</p>
            <p className="text-white/30 text-xs">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Left column */}
        <div className="space-y-5">
          {/* Goals */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Target size={15} className="text-pink-400" /> Objectifs du mois
            </h3>
            <div className="space-y-4">
              {goals.map(g => {
                const pct = Math.min(100, Math.round((g.current / g.target) * 100));
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-white/70 text-sm">{g.label}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={g.current || ""}
                          onChange={e => updateGoal(g.id, Number(e.target.value))}
                          className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-white text-xs text-right focus:outline-none"
                          placeholder="0"
                        />
                        <span className="text-white/30 text-xs">/{g.target} {g.unit}</span>
                      </div>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${g.color} ${pct >= 100 ? "opacity-100" : "opacity-80"}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-white/25 text-xs mt-1 text-right">{pct}%{pct >= 100 && " 🎉"}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By platform */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <BarChart2 size={15} className="text-blue-400" /> Par plateforme
            </h3>
            <div className="space-y-3">
              {byPlatform.map(p => (
                <div key={p.name}>
                  <div className="flex justify-between text-xs text-white/50 mb-1">
                    <span>{p.name}</span>
                    <span className="text-emerald-400">{p.revenue.toFixed(2)}€ · {p.units} ventes</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                      style={{ width: `${totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
              {totalRevenue === 0 && <p className="text-white/25 text-xs text-center py-2">Entre tes premières ventes ci-dessous</p>}
            </div>
          </div>

          {/* Books list */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Award size={15} className="text-amber-400" /> Tes livres
            </h3>
            <div className="space-y-2">
              {books.length === 0 ? (
                <p className="text-white/25 text-xs text-center py-3">Aucun livre encore créé</p>
              ) : books.map(b => (
                <div key={b.id} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${b.status === "publié" ? "bg-emerald-400" : b.status === "prêt" ? "bg-blue-400" : "bg-yellow-400"}`} />
                  <span className="text-white/70 text-xs flex-1 truncate">{b.title}</span>
                  <span className="text-white/25 text-xs">{b.pages}p</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: chart + sales log */}
        <div className="col-span-2 space-y-5">
          {/* Revenue chart */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-400" /> Revenus par mois
            </h3>
            <div className="flex items-end gap-3 h-32">
              {monthSales.map(m => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-white/40 text-xs">{m.revenue > 0 ? `${m.revenue.toFixed(0)}€` : ""}</span>
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-purple-500/80 to-pink-500/80 transition-all"
                    style={{ height: `${(m.revenue / maxRev) * 80}px`, minHeight: m.revenue > 0 ? "4px" : "2px" }} />
                  <span className="text-white/30 text-xs">{m.month}</span>
                </div>
              ))}
            </div>
            {totalRevenue === 0 && (
              <p className="text-white/20 text-xs text-center mt-2">Entre tes ventes pour voir le graphique</p>
            )}
          </div>

          {/* Sales log */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Calendar size={15} className="text-purple-400" /> Journal des ventes
              </h3>
              <button onClick={() => setShowAddSale(!showAddSale)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl text-xs font-medium transition-colors">
                <Plus size={12} /> Ajouter ventes
              </button>
            </div>

            {showAddSale && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Plateforme</label>
                    <select value={newSale.platform} onChange={e => setNewSale(p => ({ ...p, platform: e.target.value }))}
                      className={`w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none`}>
                      {PLATFORMS_LIST.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Mois</label>
                    <select value={newSale.month} onChange={e => setNewSale(p => ({ ...p, month: e.target.value }))}
                      className={`w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none`}>
                      {MONTHS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Livre</label>
                    <select value={newSale.bookId} onChange={e => setNewSale(p => ({ ...p, bookId: e.target.value }))}
                      className={`w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none`}>
                      {books.map(b => <option key={b.id} value={b.id}>{b.title.substring(0, 30)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Unités vendues</label>
                    <input type="number" value={newSale.units} onChange={e => setNewSale(p => ({ ...p, units: e.target.value }))}
                      placeholder="10" className={`w-full ${ic}`} />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Revenu (€)</label>
                    <input type="number" value={newSale.revenue} onChange={e => setNewSale(p => ({ ...p, revenue: e.target.value }))}
                      placeholder="34.90" step="0.01" className={`w-full ${ic}`} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addSale}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors">
                    <CheckCircle size={13} /> Ajouter
                  </button>
                  <button onClick={() => setShowAddSale(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl text-sm transition-colors">
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {sales.length === 0 ? (
              <div className="text-center py-10">
                <Zap size={28} className="text-white/15 mx-auto mb-3" />
                <p className="text-white/25 text-sm">Aucune vente enregistrée</p>
                <p className="text-white/15 text-xs mt-1">Entre ta première vente pour commencer le suivi</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[...sales].reverse().map(s => {
                  const bk = books.find(b => b.id === s.bookId);
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl hover:bg-white/[0.04] transition-colors">
                      <span className="text-white/30 text-xs w-8 shrink-0">{s.month}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/70 text-xs truncate">{bk?.title || "Livre"}</p>
                        <p className="text-white/30 text-xs">{s.platform}</p>
                      </div>
                      <span className="text-white/50 text-xs">{s.units} ventes</span>
                      <span className="text-emerald-400 text-sm font-semibold">{s.revenue.toFixed(2)}€</span>
                      <button onClick={() => deleteSale(s.id)} className="text-white/15 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

