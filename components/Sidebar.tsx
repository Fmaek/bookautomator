"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Image, CheckSquare, Send, Library, Zap,
  Megaphone, Radio, Calendar, DollarSign, Package, Globe, Ghost,
  Fingerprint, Search, Headphones, Languages, GraduationCap, UserCircle,
  Workflow, Palette, BarChart3, Drama, Network, TrendingUp,
  Activity, BookMarked
} from "lucide-react";

const SECTIONS = [
  {
    label: "Écriture",
    items: [
      { href: "/studio",   icon: BookOpen,      label: "Studio d'Écriture" },
      { href: "/ghost",    icon: Ghost,         label: "Ghost Mode ⚡" },
      { href: "/tone",     icon: Fingerprint,   label: "Tone Cloner" },
      { href: "/persona",  icon: Drama,         label: "Persona IA" },
      { href: "/arc",      icon: Activity,      label: "Arc Émotionnel" },
      { href: "/readage",  icon: BookMarked,    label: "Niveau Lecture" },
    ],
  },
  {
    label: "Couverture & Design",
    items: [
      { href: "/cover",    icon: Image,         label: "Couvertures" },
      { href: "/brandkit", icon: Palette,       label: "Brand Kit" },
    ],
  },
  {
    label: "Qualité & Publication",
    items: [
      { href: "/checklist", icon: CheckSquare,  label: "Contrôle Qualité" },
      { href: "/publish",   icon: Send,         label: "Publier" },
      { href: "/translate", icon: Languages,    label: "Traducteur Auto" },
    ],
  },
  {
    label: "Marketing & Ventes",
    items: [
      { href: "/marketing", icon: Megaphone,    label: "Marketing Hub" },
      { href: "/calendar",  icon: Calendar,     label: "Calendrier Promo" },
      { href: "/landing",   icon: Globe,        label: "Page de Vente" },
      { href: "/bundle",    icon: Package,      label: "Bundle Builder" },
      { href: "/hooks",     icon: Zap,          label: "Viral Hooks Lab" },
      { href: "/funnel",    icon: Workflow,     label: "Funnel Builder" },
    ],
  },
  {
    label: "Intelligence Marché",
    items: [
      { href: "/trends",   icon: TrendingUp,   label: "Tendances Meta" },
      { href: "/research", icon: Search,       label: "Research Hub" },
    ],
  },
  {
    label: "Monétisation",
    items: [
      { href: "/sales",    icon: DollarSign,   label: "Ventes & Revenus" },
      { href: "/forecast", icon: BarChart3,    label: "Prévisions & AMS" },
    ],
  },
  {
    label: "Contenu Dérivé",
    items: [
      { href: "/audiobook", icon: Headphones,  label: "Audiobook Studio" },
      { href: "/course",    icon: GraduationCap, label: "Book → Formation" },
      { href: "/ip",        icon: Network,     label: "IP Expansion" },
    ],
  },
  {
    label: "Outils",
    items: [
      { href: "/avatar",   icon: UserCircle,  label: "Reader Avatar" },
      { href: "/autopost", icon: Radio,       label: "Post Automatique" },
      { href: "/library",  icon: Library,     label: "Ma Bibliothèque" },
      { href: "/",         icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-64 h-screen flex flex-col border-r border-white/5 bg-white/[0.02] backdrop-blur-xl shrink-0">
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">BookAutomator</h1>
            <p className="text-xs text-white/40">IA · Écriture · Publication</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto space-y-4">
        {SECTIONS.map(section => (
          <div key={section.label}>
            <p className="text-white/25 text-xs font-semibold uppercase tracking-wider px-3 mb-1">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map(({ href, icon: Icon, label }) => {
                const active = path === href;
                return (
                  <Link key={href} href={href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                      active
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "text-white/45 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}>
                    <Icon size={14} />
                    <span className="truncate">{label}</span>
                    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
          <p className="text-xs text-white/30 mb-0.5">Propulsé par</p>
          <p className="text-xs font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Groq AI + Pollinations.ai</p>
        </div>
      </div>
    </aside>
  );
}
