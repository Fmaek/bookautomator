"use client";
import Link from "next/link";
import { TrendingUp, BookOpen, Image, Send, Star, Sparkles, Flame, ArrowRight } from "lucide-react";

const stats = [
  { label: "Livres créés", value: "0", icon: BookOpen, color: "from-purple-500 to-violet-600" },
  { label: "Publiés", value: "0", icon: Send, color: "from-pink-500 to-rose-600" },
  { label: "Tendances captées", value: "0", icon: TrendingUp, color: "from-orange-500 to-amber-600" },
  { label: "Plateformes liées", value: "5", icon: Star, color: "from-cyan-500 to-blue-600" },
];

const quickActions = [
  { href: "/trends", icon: TrendingUp, title: "Scanner les Tendances", desc: "Analyse Facebook & Instagram en temps réel", border: "border-orange-500/20", badge: "LIVE", badgeColor: "bg-orange-500/20 text-orange-300" },
  { href: "/studio", icon: BookOpen, title: "Nouveau Livre", desc: "IA écrit ton livre en 3 modes différents", border: "border-purple-500/20", badge: "IA", badgeColor: "bg-purple-500/20 text-purple-300" },
  { href: "/cover", icon: Image, title: "Créer une Couverture", desc: "DALL-E 3 + éditeur de templates intégré", border: "border-pink-500/20", badge: "DALL-E", badgeColor: "bg-pink-500/20 text-pink-300" },
  { href: "/publish", icon: Send, title: "Publier Partout", desc: "Amazon, Kobo, Draft2Digital d'un seul clic", border: "border-cyan-500/20", badge: "AUTO", badgeColor: "bg-cyan-500/20 text-cyan-300" },
];

const workflow = [
  { step: "1", label: "Tendance", sub: "Scanner Meta", href: "/trends", color: "bg-orange-500" },
  { step: "2", label: "Écriture", sub: "Studio IA", href: "/studio", color: "bg-purple-500" },
  { step: "3", label: "Couverture", sub: "DALL-E 3", href: "/cover", color: "bg-pink-500" },
  { step: "4", label: "Contrôle", sub: "Checklist", href: "/checklist", color: "bg-emerald-500" },
  { step: "5", label: "Publication", sub: "Partout", href: "/publish", color: "bg-cyan-500" },
];

export default function Dashboard() {
  return (
    <div className="p-8 min-h-screen">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-purple-400" />
          <span className="text-purple-400 text-sm font-medium">Bienvenue sur BookAutomator</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">
          De l&apos;idée au livre publié,{" "}
          <span className="gradient-text">automatiquement</span>
        </h1>
        <p className="text-white/50 text-lg">
          Capte les tendances Meta · Écris avec l&apos;IA · Crée les couvertures · Publie partout
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} className="text-white" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{value}</p>
            <p className="text-white/50 text-sm">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Flame size={18} className="text-orange-400" />
        Actions Rapides
      </h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {quickActions.map(({ href, icon: Icon, title, desc, border, badge, badgeColor }) => (
          <Link key={href} href={href}>
            <div className={`bg-white/[0.03] border ${border} rounded-2xl p-6 hover:bg-white/[0.06] transition-all duration-200 cursor-pointer group`}>
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
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" />
          Workflow Complet — Du sujet viral au livre publié
        </h2>
        <div className="flex items-center gap-4">
          {workflow.map((item, i) => (
            <div key={i} className="flex items-center gap-4 flex-1">
              <Link href={item.href} className="flex flex-col items-center group cursor-pointer flex-1">
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
