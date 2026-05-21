"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, BookOpen, Image, Send, Star, Sparkles, Flame, ArrowRight, CheckCircle, Clock } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

const quickActions = [
  { href: "/trends", icon: TrendingUp, title: "Scanner les Tendances", desc: "Analyse Facebook & Instagram en temps réel", border: "border-orange-500/20", badge: "LIVE", badgeColor: "bg-orange-500/20 text-orange-300" },
  { href: "/studio", icon: BookOpen, title: "Nouveau Livre", desc: "IA écrit ton livre en 3 modes différents", border: "border-purple-500/20", badge: "IA", badgeColor: "bg-purple-500/20 text-purple-300" },
  { href: "/cover", icon: Image, title: "Créer une Couverture", desc: "Générateur IA + éditeur de templates intégré", border: "border-pink-500/20", badge: "IA", badgeColor: "bg-pink-500/20 text-pink-300" },
  { href: "/publish", icon: Send, title: "Publier Partout", desc: "Amazon, Kobo, Draft2Digital d'un seul clic", border: "border-cyan-500/20", badge: "AUTO", badgeColor: "bg-cyan-500/20 text-cyan-300" },
];

const workflow = [
  { step: "1", label: "Tendance", sub: "Scanner Meta", href: "/trends", color: "bg-orange-500" },
  { step: "2", label: "Écriture", sub: "Studio IA", href: "/studio", color: "bg-purple-500" },
  { step: "3", label: "Couverture", sub: "Génération IA", href: "/cover", color: "bg-pink-500" },
  { step: "4", label: "Contrôle", sub: "Checklist", href: "/checklist", color: "bg-emerald-500" },
  { step: "5", label: "Publication", sub: "Partout", href: "/publish", color: "bg-cyan-500" },
];

const STATUS_LABELS: Record<Book["status"], string> = {
  brouillon: "Brouillon",
  prêt: "Prêt",
  publié: "Publié",
};
const STATUS_COLORS: Record<Book["status"], string> = {
  brouillon: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  prêt: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  publié: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

export default function Dashboard() {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    const load = () => setBooks(getBooks());
    load();
    // Refresh when window gains focus (e.g. user comes back from another tab)
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const total = books.length;
  const published = books.filter(b => b.status === "publié").length;
  const withCover = books.filter(b => b.hasCover).length;
  const ready = books.filter(b => b.status === "prêt" || b.status === "publié").length;

  const stats = [
    { label: "Livres créés", value: String(total), icon: BookOpen, color: "from-purple-500 to-violet-600" },
    { label: "Publiés", value: String(published), icon: Send, color: "from-pink-500 to-rose-600" },
    { label: "Avec couverture", value: String(withCover), icon: Image, color: "from-orange-500 to-amber-600" },
    { label: "Prêts / Publiés", value: String(ready), icon: Star, color: "from-cyan-500 to-blue-600" },
  ];

  const recentBooks = books.slice(0, 5);

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-purple-400" />
          <span className="text-purple-400 text-sm font-medium">Bienvenue sur BookAutomator</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          De l&apos;idée au livre publié,{" "}
          <span className="gradient-text">automatiquement</span>
        </h1>
        <p className="text-white/50 text-base md:text-lg">
          Capte les tendances · Écris avec l&apos;IA · Crée les couvertures · Publie partout
        </p>
      </div>

      {/* Stats live */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 md:p-5">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} className="text-white" />
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white mb-1">{value}</p>
            <p className="text-white/50 text-sm">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent books */}
      {recentBooks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock size={16} className="text-purple-400" /> Mes livres récents
            </h2>
            <Link href="/library" className="text-white/40 hover:text-white text-sm transition-colors flex items-center gap-1">
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentBooks.map(book => (
              <Link key={book.id} href={`/studio?bookId=${book.id}`}>
                <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 hover:bg-white/[0.06] transition-all group">
                  {book.hasCover && book.coverDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.coverDataUrl} alt="" className="w-8 h-11 rounded object-cover border border-white/10 shrink-0" />
                  ) : (
                    <div className="w-8 h-11 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <BookOpen size={12} className="text-white/20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{book.title}</p>
                    <p className="text-white/40 text-xs">{book.category} · {book.chapters.length} chapitres</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[book.status]}`}>
                      {STATUS_LABELS[book.status]}
                    </span>
                    {book.checklistPct >= 100 && <CheckCircle size={14} className="text-emerald-400" />}
                    <ArrowRight size={13} className="text-white/20 group-hover:text-white/60 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Flame size={18} className="text-orange-400" />
        Actions Rapides
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-8">
        {quickActions.map(({ href, icon: Icon, title, desc, border, badge, badgeColor }) => (
          <Link key={href} href={href}>
            <div className={`bg-white/[0.03] border ${border} rounded-2xl p-5 md:p-6 hover:bg-white/[0.06] transition-all duration-200 cursor-pointer group`}>
              <div className="flex items-start justify-between mb-4">
                <Icon size={24} className="text-white/80" />
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
                  <ArrowRight size={16} className="text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
              <h3 className="text-white font-semibold mb-1">{title}</h3>
              <p className="text-white/50 text-sm">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Workflow */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" />
          Workflow Complet — Du sujet viral au livre publié
        </h2>
        <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-1">
          {workflow.map((item, i) => (
            <div key={i} className="flex items-center gap-2 md:gap-4 shrink-0">
              <Link href={item.href} className="flex flex-col items-center group cursor-pointer">
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center text-white font-bold text-sm mb-2 group-hover:scale-110 transition-transform`}>
                  {item.step}
                </div>
                <p className="text-white text-xs font-medium text-center">{item.label}</p>
                <p className="text-white/40 text-xs text-center">{item.sub}</p>
              </Link>
              {i < workflow.length - 1 && <ArrowRight size={14} className="text-white/20 shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
