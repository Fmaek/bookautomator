"use client";
import { useState, useEffect } from "react";
import { UserCircle, Sparkles, Loader2, Copy } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

interface Avatar {
  prenom: string; age: number; profession: string; situation: string;
  probleme_principal: string; desirs: string[]; peurs: string[];
  objections_achat: string[]; triggers_dachat: string[];
  plateformes: string[]; message_marketing: string; parcours_client: string;
}

export default function AvatarPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [targetDesc, setTargetDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { setBooks(getBooks()); }, []);

  const book = books.find(b => b.id === selectedId);

  const generate = async () => {
    if (!book) return;
    setLoading(true);
    setError("");
    setAvatar(null);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reader_avatar",
          bookTitle: book.title,
          category: book.category,
          targetDescription: targetDesc,
        }),
      });
      const data = await res.json();
      if (data.prenom) {
        setAvatar(data as Avatar);
      } else if (data._error) {
        setError("L'IA n'a pas pu générer le JSON. Réessaie — cela arrive parfois.");
      } else {
        setError("Réponse inattendue. Réessaie.");
      }
    } catch {
      setError("Erreur réseau. Vérifie ta connexion et réessaie.");
    }
    setLoading(false);
  };

  const copyAll = () => {
    if (!avatar) return;
    navigator.clipboard.writeText(JSON.stringify(avatar, null, 2));
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
            <UserCircle size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Reader Avatar Builder</h1>
        </div>
        <p className="text-white/50">Crée le profil ultra-détaillé de ton lecteur idéal · Peurs · Désirs · Déclencheurs d'achat</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-semibold">Ton livre</h2>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setAvatar(null); }}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
              <option value="">Choisir un livre...</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Description du lecteur cible (optionnel)</label>
              <textarea value={targetDesc} onChange={e => setTargetDesc(e.target.value)} rows={3}
                placeholder="Ex: Entrepreneur de 30-45 ans qui veut améliorer sa productivité..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none resize-none" />
            </div>
            <button onClick={generate} disabled={loading || !book}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Création de l'avatar..." : "Créer l'avatar"}
            </button>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2">
          {avatar ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                    {avatar.prenom[0]}
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-xl">{avatar.prenom}, {avatar.age} ans</h2>
                    <p className="text-white/50 text-sm">{avatar.profession}</p>
                  </div>
                </div>
                <button onClick={copyAll} className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl text-xs transition-colors">
                  <Copy size={12} /> JSON
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <AvatarCard title="Sa situation" color="purple">
                  <p className="text-white/60 text-sm">{avatar.situation}</p>
                </AvatarCard>
                <AvatarCard title="Problème principal" color="red">
                  <p className="text-white/60 text-sm">{avatar.probleme_principal}</p>
                </AvatarCard>
                <AvatarCard title="Désirs profonds" color="emerald">
                  {avatar.desirs?.map((d, i) => <p key={i} className="text-white/60 text-sm flex items-start gap-1.5"><span className="text-emerald-400 text-xs mt-1">✓</span>{d}</p>)}
                </AvatarCard>
                <AvatarCard title="Peurs" color="orange">
                  {avatar.peurs?.map((p, i) => <p key={i} className="text-white/60 text-sm flex items-start gap-1.5"><span className="text-orange-400 text-xs mt-1">!</span>{p}</p>)}
                </AvatarCard>
                <AvatarCard title="Objections d'achat" color="amber">
                  {avatar.objections_achat?.map((o, i) => <p key={i} className="text-white/60 text-sm flex items-start gap-1.5"><span className="text-amber-400 text-xs mt-1">?</span>{o}</p>)}
                </AvatarCard>
                <AvatarCard title="Déclencheurs d'achat" color="blue">
                  {avatar.triggers_dachat?.map((t, i) => <p key={i} className="text-white/60 text-sm flex items-start gap-1.5"><span className="text-blue-400 text-xs mt-1">→</span>{t}</p>)}
                </AvatarCard>
              </div>

              <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl p-4 md:p-5">
                <p className="text-violet-300 text-xs font-medium mb-2">Message marketing idéal</p>
                <p className="text-white font-medium text-sm">"{avatar.message_marketing}"</p>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
                <p className="text-white/50 text-xs font-medium mb-2">Parcours client</p>
                <p className="text-white/60 text-sm">{avatar.parcours_client}</p>
              </div>

              {avatar.plateformes?.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs">Plateformes fréquentées:</span>
                  {avatar.plateformes.map(p => (
                    <span key={p} className="px-2.5 py-1 bg-white/5 border border-white/10 text-white/60 text-xs rounded-full">{p}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-20 text-center">
              <UserCircle size={56} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">L'avatar de ton lecteur idéal apparaîtra ici</p>
              <p className="text-white/20 text-xs mt-1">Profil complet avec peurs, désirs et déclencheurs d'achat</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AvatarCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    purple: "text-violet-400", red: "text-red-400", emerald: "text-emerald-400",
    orange: "text-orange-400", amber: "text-amber-400", blue: "text-blue-400",
  };
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
      <h3 className={`text-xs font-semibold uppercase tracking-wide ${colors[color] || "text-white/40"}`}>{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

