"use client";
import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Plus, Trash2, BookOpen, Target, Award } from "lucide-react";
import { getBooks, saveBook, type Book } from "@/lib/books";

interface SaleEntry { date: string; units: number; revenue: number; platform: string; }
interface BookSales { book: Book; entries: SaleEntry[]; total: number; totalRevenue: number; }

const PLATFORMS = ["Amazon KDP", "Kobo", "Gumroad", "Lulu", "Draft2Digital", "Direct", "Autre"];

export default function SalesPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState("");
  const [entries, setEntries] = useState<SaleEntry[]>([]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), units: "", revenue: "", platform: "Amazon KDP" });
  const [adding, setAdding] = useState(false);

  useEffect(() => { setBooks(getBooks()); }, []);

  useEffect(() => {
    if (!selectedBook) { setEntries([]); return; }
    const book = books.find(b => b.id === selectedBook);
    setEntries((book?.salesData as SaleEntry[] || []));
  }, [selectedBook, books]);

  const addEntry = () => {
    if (!selectedBook || !form.units || !form.revenue) return;
    const book = books.find(b => b.id === selectedBook);
    if (!book) return;
    const newEntry: SaleEntry = { date: form.date, units: parseInt(form.units), revenue: parseFloat(form.revenue), platform: form.platform };
    const updatedEntries = [...(book.salesData as SaleEntry[] || []), newEntry].sort((a, b) => a.date.localeCompare(b.date));
    saveBook({ ...book, salesData: updatedEntries });
    setBooks(getBooks());
    setEntries(updatedEntries);
    setForm(f => ({ ...f, units: "", revenue: "" }));
    setAdding(false);
  };

  const deleteEntry = (idx: number) => {
    const book = books.find(b => b.id === selectedBook);
    if (!book) return;
    const updated = (book.salesData as SaleEntry[] || []).filter((_, i) => i !== idx);
    saveBook({ ...book, salesData: updated });
    setBooks(getBooks());
    setEntries(updated);
  };

  // Compute stats for all books
  const allBookSales: BookSales[] = books.map(b => {
    const e = (b.salesData as SaleEntry[] || []);
    return { book: b, entries: e, total: e.reduce((s, x) => s + x.units, 0), totalRevenue: e.reduce((s, x) => s + x.revenue, 0) };
  }).filter(bs => bs.total > 0).sort((a, b) => b.totalRevenue - a.totalRevenue);

  const globalRevenue = allBookSales.reduce((s, b) => s + b.totalRevenue, 0);
  const globalUnits = allBookSales.reduce((s, b) => s + b.total, 0);
  const bestSeller = allBookSales[0];

  // Last 6 months revenue (current entries)
  const monthly: Record<string, number> = {};
  entries.forEach(e => {
    const month = e.date.slice(0, 7);
    monthly[month] = (monthly[month] || 0) + e.revenue;
  });
  const monthlyData = Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  const maxMonthly = Math.max(...monthlyData.map(m => m[1]), 1);

  const ic = "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50";

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Ventes & Revenus</h1>
        <p className="text-white/50">Suivi manuel de tes ventes par plateforme</p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Revenus totaux", value: `${globalRevenue.toFixed(2)} €`, icon: DollarSign, color: "text-emerald-400" },
          { label: "Unités vendues", value: globalUnits.toString(), icon: BookOpen, color: "text-blue-400" },
          { label: "Livres actifs", value: allBookSales.length.toString(), icon: TrendingUp, color: "text-purple-400" },
          { label: "Best-seller", value: bestSeller?.book.title.substring(0, 20) || "—", icon: Award, color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
            <div className={`${color} mb-2`}><Icon size={20} /></div>
            <p className="text-white font-bold text-xl">{value}</p>
            <p className="text-white/40 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        {/* Left: Entry form + per-book entries */}
        <div className="space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
            <h2 className="text-white font-semibold mb-4">Saisir des ventes</h2>

            <div className="mb-4">
              <label className="text-white/60 text-sm mb-1.5 block">Livre</label>
              <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                <option value="">Choisir...</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>

            {!adding ? (
              <button onClick={() => setAdding(true)} disabled={!selectedBook}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 text-purple-300 rounded-xl text-sm transition-colors disabled:opacity-40">
                <Plus size={14} /> Ajouter une entrée de ventes
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/60 text-xs mb-1 block">Date</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={ic} />
                  </div>
                  <div>
                    <label className="text-white/60 text-xs mb-1 block">Plateforme</label>
                    <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                      {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/60 text-xs mb-1 block">Unités</label>
                    <input type="number" value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} placeholder="10" className={ic} />
                  </div>
                  <div>
                    <label className="text-white/60 text-xs mb-1 block">Revenu (€)</label>
                    <input type="number" step="0.01" value={form.revenue} onChange={e => setForm(f => ({ ...f, revenue: e.target.value }))} placeholder="29.90" className={ic} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addEntry} className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors">
                    Enregistrer
                  </button>
                  <button onClick={() => setAdding(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl text-sm transition-colors">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Entries list */}
          {entries.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Historique</h3>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold">{entries.reduce((s, e) => s + e.revenue, 0).toFixed(2)} €</p>
                  <p className="text-white/40 text-xs">{entries.reduce((s, e) => s + e.units, 0)} unités</p>
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {[...entries].reverse().map((e, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-white/[0.03] rounded-xl">
                    <div className="flex-1">
                      <p className="text-white text-xs font-medium">{e.platform}</p>
                      <p className="text-white/40 text-xs">{new Date(e.date).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <p className="text-white/60 text-xs">{e.units} u.</p>
                    <p className="text-emerald-400 text-sm font-medium">{e.revenue.toFixed(2)} €</p>
                    <button onClick={() => deleteEntry(entries.length - 1 - i)} className="text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Charts + rankings */}
        <div className="space-y-5">
          {/* Monthly bar chart for selected book */}
          {monthlyData.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
              <h3 className="text-white font-semibold mb-5 text-sm">Revenus mensuels</h3>
              <div className="flex items-end gap-2 h-32">
                {monthlyData.map(([month, rev]) => (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-white/40 text-xs">{rev.toFixed(0)}€</span>
                    <div className="w-full bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-lg transition-all"
                      style={{ height: `${(rev / maxMonthly) * 100}%`, minHeight: 4 }} />
                    <span className="text-white/30 text-xs">{month.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All books ranking */}
          {allBookSales.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
              <h3 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
                <Target size={14} className="text-amber-400" /> Classement des livres
              </h3>
              <div className="space-y-3">
                {allBookSales.map((bs, i) => (
                  <div key={bs.book.id} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-white/20 text-white" : "bg-white/10 text-white/50"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{bs.book.title}</p>
                      <div className="w-full bg-white/5 rounded-full h-1 mt-1">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1 rounded-full"
                          style={{ width: `${(bs.totalRevenue / (allBookSales[0]?.totalRevenue || 1)) * 100}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-emerald-400 text-sm font-medium">{bs.totalRevenue.toFixed(2)} €</p>
                      <p className="text-white/30 text-xs">{bs.total} u.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allBookSales.length === 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 text-center">
              <DollarSign size={32} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">Aucune vente enregistrée</p>
              <p className="text-white/25 text-xs mt-1">Ajoute tes premières ventes pour voir les stats</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

