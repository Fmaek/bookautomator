"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, TrendingUp, BookOpen, Image,
  CheckSquare, Send, Library, Zap
} from "lucide-react";

const nav = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/trends", icon: TrendingUp, label: "Tendances Meta" },
  { href: "/studio", icon: BookOpen, label: "Studio d'Écriture" },
  { href: "/cover", icon: Image, label: "Couvertures" },
  { href: "/checklist", icon: CheckSquare, label: "Contrôle Qualité" },
  { href: "/publish", icon: Send, label: "Publier Partout" },
  { href: "/library", icon: Library, label: "Ma Bibliothèque" },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-64 h-screen flex flex-col border-r border-white/5 bg-white/[0.02] backdrop-blur-xl shrink-0">
      <div className="p-6 border-b border-white/5">
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

      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                active
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
          <p className="text-xs text-white/40 mb-1">Propulsé par</p>
          <p className="text-xs font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Claude AI + DALL-E 3</p>
        </div>
      </div>
    </aside>
  );
}
