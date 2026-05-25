"use client";
import { useState, useEffect } from "react";
import { UserCircle, Sparkles, Loader2, Copy, RefreshCw } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

interface Avatar {
  segment: string;
  prenom: string;
  age: number;
  profession: string;
  situation: string;
  probleme_principal: string;
  desirs: string[];
  peurs: string[];
  objections_achat: string[];
  triggers_dachat: string[];
  plateformes: string[];
  message_marketing: string;
  parcours_client: string;
}

const SEGMENT_COLORS = [
  { border: "border-violet-500/20", badge: "bg-violet-500/20 text-violet-300", dot: "bg-violet-500" },
  { border: "border-pink-500/20",   badge: "bg-pink-500/20 text-pink-300",     dot: "bg-pink-500"   },
  { border: "border-cyan-500/20",   badge: "bg-cyan-500/20 text-cyan-300",     dot: "bg-cyan-500"   },
];

export default function AvatarPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [targetDesc, setTargetDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => { setBooks(getBooks()); }, []);

  const book = books.find(b => b.id === selectedId);

  const generate = async () => {
    if (!book) return;
    setLoading(true);
    setAvatars([]);
    setError("");
    setActiveIdx(0);
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
      if (data._error) { setError("Génération échouée — réessaie."); return; }
      const list: Avatar[] = data.avatars || (data.prenom ? [data] : []);
      setAvatars(list);
    } catch { setError("Erreur réseau."); }
    setLoading(false);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(JSON.stringify(avatars, null, 2));
  };

  const avatar = avatars[activeIdx];
  const colors = SEGMENT_COLORS[activeIdx] || SEGMENT_COLORS[0];

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
            <UserCircle size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Reader Avatar Builder</h1>
        </div>
        <p className="text-white/50">3 segments d'audience distincts · Résultats différents à chaque génération</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

        {/* Config */}
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-semibold">Ton livre</h2>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setAvatars([]); }}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
              <option value="">Choisir un livre...</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Précisions audience (optionnel)</label>
              <textarea value={targetDesc} onChange={e => setTargetDesc(e.target.value)} rows={3}
                placeholder="Ex: Entrepreneurs 30-50 ans, femmes actives..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none resize-none" />
            </div>
            <button onClick={generate} disabled={loading || !book}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 disabled:opacity-40 text-white rounded-xl font-medium transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Génération des 3 profils..." : "Créer 3 segments d'audience"}
            </button>
            {avatars.length > 0 && (
              <button onClick={generate} disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 text-white/40 rounded-xl text-sm transition-colors">
                <RefreshCw size={13} /> Régénérer (nouveaux profils)
              </button>
            )}
          </div>

          {error && <p className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-xl">{error}</p>}

          {avatars.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
              <p className="text-white/50 text-xs font-medium mb-3">3 segments créés :</p>
              {avatars.map((a, i) => (
                <button key={i} onClick={() => setActiveIdx(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${i === activeIdx ? SEGMENT_COLORS[i].border + " bg-white/5" : "border-white/[0.05] hover:border-white/10"}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${SEGMENT_COLORS[i].dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{a.segment || `Segment ${i + 1}`}</p>
                    <p className="text-white/30 text-xs">{a.prenom}, {a.age} ans</p>
                  </div>
                </button>
              ))}
              <button onClick={copyAll}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-white/30 hover:text-white/60 text-xs transition-colors mt-1">
                <Copy size={11} /> Copier tout (JSON)
              </button>
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="col-span-2">
          {avatar ? (
            <div className="space-y-4">
              <div className={`flex items-center gap-4 bg-white/[0.03] border ${colors.border} rounded-2xl p-4`}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {avatar.prenom?.[0] || "?"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <h2 className="text-white font-bold text-lg">{avatar.prenom}, {avatar.age} ans</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>{avatar.segment}</span>
                  </div>
                  <p className="text-white/50 text-sm">{avatar.profession}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card title="Sa situation" color="purple"><p className="text-white/60 text-sm leading-relaxed">{avatar.situation}</p></Card>
                <Card title="Problème résolu par ce livre" color="red"><p className="text-white/60 text-sm leading-relaxed">{avatar.probleme_principal}</p></Card>
                <Card title="Désirs profonds" color="emerald">
                  {avatar.desirs?.map((d, i) => <p key={i} className="text-white/60 text-sm flex items-start gap-1.5"><span className="text-emerald-400 shrink-0">✓</span>{d}</p>)}
                </Card>
                <Card title="Peurs" color="orange">
                  {avatar.peurs?.map((p, i) => <p key={i} className="text-white/60 text-sm flex items-start gap-1.5"><span className="text-orange-400 shrink-0">!</span>{p}</p>)}
                </Card>
                <Card title="Objections d'achat" color="amber">
                  {avatar.objections_achat?.map((o, i) => <p key={i} className="text-white/60 text-sm flex items-start gap-1.5"><span className="text-amber-400 shrink-0">?</span>{o}</p>)}
                </Card>
                <Card title="Déclencheurs d'achat" color="blue">
                  {avatar.triggers_dachat?.map((t, i) => <p key={i} className="text-white/60 text-sm flex items-start gap-1.5"><span className="text-blue-400 shrink-0">→</span>{t}</p>)}
                </Card>
              </div>

              <div className={`bg-gradient-to-r from-violet-500/10 to-purple-500/10 border ${colors.border} rounded-2xl p-4`}>
                <p className="text-violet-300 text-xs font-semibold uppercase tracking-wide mb-2">Message marketing pour ce segment</p>
                <p className="text-white font-medium text-sm">"{avatar.message_marketing}"</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2">Parcours client</p>
                  <p className="text-white/60 text-sm leading-relaxed">{avatar.parcours_client}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2">Plateformes</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {avatar.plateformes?.map(p => (
                      <span key={p} className="px-2.5 py-1 bg-white/5 border border-white/10 text-white/60 text-xs rounded-full">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-20 text-center flex flex-col items-center justify-center h-full">
              <UserCircle size={56} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">3 segments d'audience apparaîtront ici</p>
              <p className="text-white/20 text-xs mt-2">Profils distincts avec peurs, désirs et déclencheurs d'achat</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    purple: "text-violet-400", red: "text-red-400", emerald: "text-emerald-400",
    orange: "text-orange-400", amber: "text-amber-400", blue: "text-blue-400",
  };
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
      <h3 className={`text-xs font-semibold uppercase tracking-wide ${colors[color] || "text-white/40"}`}>{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
