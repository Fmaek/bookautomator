"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Image, CheckSquare, Send, Library, Zap,
  Megaphone, Video, Calendar, DollarSign, Package, Globe, Ghost,
  Fingerprint, Search, Headphones, Languages, GraduationCap, UserCircle,
  Workflow, Palette, BarChart3, Drama, Network, TrendingUp,
  Activity, BookMarked, Menu, X, Lightbulb, LibraryBig
} from "lucide-react";

const SECTIONS = [
  {
    label: "Écriture",
    items: [
      { href: "/studio",   icon: BookOpen,      label: "Studio d'Écriture" },
      { href: "/inspire",  icon: Lightbulb,     label: "Mode Inspiration ✨" },
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
      { href: "/discover", icon: LibraryBig,   label: "Bibliothèque Mondiale" },
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
      { href: "/podcast",   icon: Megaphone,   label: "Podcast Studio 🎙️" },
      { href: "/course",    icon: GraduationCap, label: "Book → Formation" },
      { href: "/ip",        icon: Network,     label: "IP Expansion" },
    ],
  },
  {
    label: "Outils",
    items: [
      { href: "/avatar",   icon: UserCircle,  label: "Reader Avatar" },
      { href: "/autopost", icon: Video,        label: "Studio Social 🎬" },
      { href: "/library",  icon: Library,     label: "Ma Bibliothèque" },
      { href: "/",         icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
];

export default function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const NavContent = () => (
    <>
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">BookAutomator</h1>
            <p className="text-xs text-white/40">IA · Écriture · Publication</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="md:hidden p-1.5 text-white/40 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto space-y-4">
        {SECTIONS.map(section => (
          <div key={section.label}>
            <p className="text-white/25 text-xs font-semibold uppercase tracking-wider px-3 mb-1">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map(({ href, icon: Icon, label }) => {
                const active = path === href;
                return (
                  <Link key={href} href={href} onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      active
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "text-white/45 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}>
                    <Icon size={14} className="shrink-0" />
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
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5">
        <button onClick={() => setOpen(true)} className="p-2 text-white/60 hover:text-white transition-colors">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Zap size={13} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm">BookAutomator</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r border-white/5 bg-[#0d0d14] transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 h-screen flex-col border-r border-white/5 bg-white/[0.02] backdrop-blur-xl shrink-0">
        <NavContent />
      </aside>
    </>
  );
}
