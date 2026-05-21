import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "BookAutomator — Écris, Conçois, Publie",
  description: "Plateforme IA complète pour écrire, concevoir et publier vos livres automatiquement",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="flex h-screen overflow-hidden bg-[#0a0a0a]">
        <Sidebar />
        {/* pt-14 on mobile to clear the fixed top bar */}
        <main className="flex-1 overflow-y-auto scrollbar-hide pt-14 md:pt-0">
          {children}
        </main>
      </body>
    </html>
  );
}
