"use client";
import { useState, useEffect } from "react";
import { UserCircle, Sparkles, Loader2, Copy, RefreshCw, Heart, AlertTriangle, TrendingUp, Target, MessageSquare, ThumbsUp, ThumbsDown, Zap, Eye, ShoppingCart } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

interface Avatar {
  segment: string;
  prenom: string;
  age: number;
  genre: string;
  profession: string;
  revenu_mensuel: string;
  situation: string;
  frustration_quotidienne: string;
  probleme_principal: string;
  transformation_esperee: string;
  ce_quils_vont_adorer: string[];
  ce_qui_peut_les_decevoir: string[];
  desirs_profonds: string[];
  peurs: string[];
  resistance_profonde: string;
  objections_achat: string[];
  declencheurs_dachat: string[];
  moment_dachat_ideal: string;
  mots_qui_convertissent: string[];
  mots_a_eviter: string[];
  angle_marketing_principal: string;
  message_marketing: string;
  ton_communication: string;
  canaux_prioritaires: string[];
  type_contenu_prefere: string[];
  erreurs_marketing_a_eviter: string;
  parcours_client: string;
}

const SEGMENTS = [
  {
    border: "border-violet-500/30", bg: "bg-violet-500/10", badge: "bg-violet-500/20 text-violet-300",
    dot: "bg-violet-500", glow: "shadow-violet-500/10", accent: "text-violet-400", tabActive: "bg-violet-500/20 text-violet-200",
  },
  {
    border: "border-pink-500/30", bg: "bg-pink-500/10", badge: "bg-pink-500/20 text-pink-300",
    dot: "bg-pink-500", glow: "shadow-pink-500/10", accent: "text-pink-400", tabActive: "bg-pink-500/20 text-pink-200",
  },
  {
    border: "border-cyan-500/30", bg: "bg-cyan-500/10", badge: "bg-cyan-500/20 text-cyan-300",
    dot: "bg-cyan-500", glow: "shadow-cyan-500/10", accent: "text-cyan-400", tabActive: "bg-cyan-500/20 text-cyan-200",
  },
];

type SectionKey = "profil" | "livre" | "psychologie" | "achat" | "marketing";

const SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: "profil",      label: "Profil",         icon: "👤" },
  { key: "livre",       label: "Rapport au livre", icon: "📖" },
  { key: "psychologie", label: "Psychologie",     icon: "🧠" },
  { key: "achat",       label: "Décision d'achat", icon: "🛒" },
  { key: "marketing",   label: "Comment l'atteindre", icon: "🎯" },
];

export default function AvatarPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [targetDesc, setTargetDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeSection, setActiveSection] = useState<SectionKey>("profil");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { setBooks(getBooks()); }, []);

  const book = books.find(b => b.id === selectedId);

  const generate = async () => {
    if (!book) return;
    setLoading(true);
    setAvatars([]);
    setError("");
    setActiveIdx(0);
    setActiveSection("profil");
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reader_avatar",
          bookTitle: book.title,
          category: book.category,
          targetDescription: targetDesc,
          chapters: book.chapters?.map(c => ({ title: c.title, content: c.content })) || [],
        }),
      });
      const data = await res.json() as { avatars?: Avatar[]; _error?: string };
      if (data._error) { setError("Génération échouée — réessaie."); return; }
      setAvatars(data.avatars || []);
    } catch { setError("Erreur réseau."); }
    setLoading(false);
  };

  const copyAvatar = () => {
    navigator.clipboard.writeText(JSON.stringify(avatar, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const avatar = avatars[activeIdx];
  const colors = SEGMENTS[activeIdx] || SEGMENTS[0];

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
            <UserCircle size={20} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Reader Avatar Builder</h1>
        </div>
        <p className="text-white/50 text-sm">3 personas profonds · Psychologie · Ce qu&apos;ils aimeront/détesteront · Comment les atteindre</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Config panel */}
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-semibold text-sm">Ton livre</h2>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setAvatars([]); }}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/40">
              <option value="">Choisir un livre…</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            {book && (
              <p className="text-white/30 text-xs">{book.category} · {book.chapters?.length || 0} chapitres analysés</p>
            )}
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Précisions audience (optionnel)</label>
              <textarea value={targetDesc} onChange={e => setTargetDesc(e.target.value)} rows={2}
                placeholder="Ex: Entrepreneurs 30-50 ans, femmes actives Afrique..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none resize-none" />
            </div>
            <button onClick={generate} disabled={loading || !book}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-900/20">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {loading ? "Analyse en cours…" : "Analyser l'audience"}
            </button>
            {avatars.length > 0 && (
              <button onClick={generate} disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 bg-white/[0.04] hover:bg-white/10 text-white/40 rounded-xl text-xs transition-colors">
                <RefreshCw size={12} /> Régénérer
              </button>
            )}
          </div>

          {error && <p className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-xl">{error}</p>}

          {/* Segment selector */}
          {avatars.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">3 personas générés</p>
              {avatars.map((a, i) => (
                <button key={i} onClick={() => { setActiveIdx(i); setActiveSection("profil"); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all border ${i === activeIdx ? SEGMENTS[i].border + " " + SEGMENTS[i].bg : "border-white/[0.05] hover:border-white/10"}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${i === activeIdx ? "bg-white/20" : "bg-white/5"}`}>
                    {a.prenom?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{a.prenom}, {a.age} ans</p>
                    <p className="text-white/30 text-xs truncate">{a.segment?.split("—")[1]?.trim() || a.segment}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${SEGMENTS[i].dot}`} />
                </button>
              ))}
              <button onClick={copyAvatar}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-white/25 hover:text-white/50 text-xs transition-colors mt-1">
                <Copy size={10} /> {copied ? "Copié !" : "Copier JSON"}
              </button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {loading && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <UserCircle size={28} className="text-violet-400" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-ping" />
              </div>
              <p className="text-white/70 text-sm font-medium">Analyse profonde en cours…</p>
              <p className="text-white/30 text-xs">Psychologie · Rapport au livre · Stratégie marketing</p>
            </div>
          )}

          {!loading && avatar && (
            <div className="space-y-4">

              {/* Header card */}
              <div className={`bg-white/[0.03] border ${colors.border} rounded-2xl p-5`}>
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center text-white text-2xl font-bold shrink-0`}>
                    {avatar.prenom?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="text-white font-bold text-xl">{avatar.prenom}, {avatar.age} ans</h2>
                      {avatar.genre && <span className="text-white/30 text-sm">({avatar.genre === "F" ? "Femme" : "Homme"})</span>}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${colors.badge}`}>{avatar.segment?.split("—")[1]?.trim() || avatar.segment}</span>
                    </div>
                    <p className="text-white/60 text-sm mb-1">{avatar.profession}</p>
                    {avatar.revenu_mensuel && (
                      <span className="text-white/30 text-xs bg-white/5 px-2 py-0.5 rounded-full">{avatar.revenu_mensuel} / mois</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section tabs */}
              <div className="flex gap-1 flex-wrap">
                {SECTIONS.map(s => (
                  <button key={s.key} onClick={() => setActiveSection(s.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${activeSection === s.key ? colors.border + " " + colors.tabActive : "border-white/[0.06] text-white/40 hover:text-white/60"}`}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>

              {/* Section content */}
              {activeSection === "profil" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoCard icon={<Eye size={13} />} title="Situation actuelle" accent={colors.accent}>
                    <p className="text-white/65 text-sm leading-relaxed">{avatar.situation}</p>
                  </InfoCard>
                  <InfoCard icon={<AlertTriangle size={13} />} title="Frustration quotidienne" accent="text-orange-400">
                    <p className="text-white/65 text-sm leading-relaxed">{avatar.frustration_quotidienne}</p>
                  </InfoCard>
                  <InfoCard icon={<Target size={13} />} title="Problème que le livre résout" accent="text-red-400">
                    <p className="text-white/65 text-sm leading-relaxed">{avatar.probleme_principal}</p>
                  </InfoCard>
                  <InfoCard icon={<TrendingUp size={13} />} title="Transformation espérée" accent="text-emerald-400">
                    <p className="text-white/65 text-sm leading-relaxed">{avatar.transformation_esperee}</p>
                  </InfoCard>
                </div>
              )}

              {activeSection === "livre" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoCard icon={<ThumbsUp size={13} />} title="Ce qu'il va adorer dans ce livre" accent="text-emerald-400">
                    <ul className="space-y-2">
                      {avatar.ce_quils_vont_adorer?.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/65">
                          <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>{item}
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                  <InfoCard icon={<ThumbsDown size={13} />} title="Ce qui peut le décevoir" accent="text-rose-400">
                    <ul className="space-y-2">
                      {avatar.ce_qui_peut_les_decevoir?.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/65">
                          <span className="text-rose-400 shrink-0 mt-0.5">⚠</span>{item}
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                  <div className={`sm:col-span-2 bg-gradient-to-r ${colors.bg} border ${colors.border} rounded-xl p-4`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${colors.accent} mb-2`}>Message marketing ciblé</p>
                    <p className="text-white font-medium text-sm leading-relaxed">&quot;{avatar.message_marketing}&quot;</p>
                  </div>
                </div>
              )}

              {activeSection === "psychologie" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoCard icon={<Heart size={13} />} title="Désirs profonds" accent="text-pink-400">
                    <ul className="space-y-2">
                      {avatar.desirs_profonds?.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/65">
                          <span className="text-pink-400 shrink-0">♦</span>{d}
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                  <InfoCard icon={<AlertTriangle size={13} />} title="Peurs" accent="text-orange-400">
                    <ul className="space-y-2">
                      {avatar.peurs?.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/65">
                          <span className="text-orange-400 shrink-0">!</span>{p}
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                  <div className="sm:col-span-2 bg-red-500/[0.07] border border-red-500/20 rounded-xl p-4">
                    <p className="text-red-400 text-xs font-semibold uppercase tracking-wide mb-2">🔒 Résistance profonde</p>
                    <p className="text-white/70 text-sm leading-relaxed">{avatar.resistance_profonde}</p>
                  </div>
                </div>
              )}

              {activeSection === "achat" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoCard icon={<ShoppingCart size={13} />} title="Objections à l'achat" accent="text-amber-400">
                    <ul className="space-y-2">
                      {avatar.objections_achat?.map((o, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/65">
                          <span className="text-amber-400 shrink-0">?</span>{o}
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                  <InfoCard icon={<Zap size={13} />} title="Déclencheurs d'achat" accent="text-blue-400">
                    <ul className="space-y-2">
                      {avatar.declencheurs_dachat?.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/65">
                          <span className="text-blue-400 shrink-0">→</span>{t}
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                  <div className="sm:col-span-2 bg-blue-500/[0.07] border border-blue-500/20 rounded-xl p-4">
                    <p className="text-blue-400 text-xs font-semibold uppercase tracking-wide mb-2">⏱ Moment d&apos;achat idéal</p>
                    <p className="text-white/70 text-sm leading-relaxed">{avatar.moment_dachat_ideal}</p>
                  </div>
                  <div className="sm:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                    <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-3">Parcours complet</p>
                    <p className="text-white/60 text-sm leading-relaxed">{avatar.parcours_client}</p>
                  </div>
                </div>
              )}

              {activeSection === "marketing" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`sm:col-span-2 ${colors.bg} border ${colors.border} rounded-xl p-4`}>
                    <p className={`${colors.accent} text-xs font-semibold uppercase tracking-wide mb-2`}>🎯 Angle marketing principal</p>
                    <p className="text-white font-semibold text-sm leading-relaxed">{avatar.angle_marketing_principal}</p>
                  </div>
                  <InfoCard icon={<MessageSquare size={13} />} title="Mots qui convertissent" accent="text-emerald-400">
                    <div className="flex flex-wrap gap-1.5">
                      {avatar.mots_qui_convertissent?.map((m, i) => (
                        <span key={i} className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs rounded-full">{m}</span>
                      ))}
                    </div>
                  </InfoCard>
                  <InfoCard icon={<AlertTriangle size={13} />} title="Mots à éviter" accent="text-red-400">
                    <div className="flex flex-wrap gap-1.5">
                      {avatar.mots_a_eviter?.map((m, i) => (
                        <span key={i} className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-full line-through">{m}</span>
                      ))}
                    </div>
                  </InfoCard>
                  <InfoCard icon={<Eye size={13} />} title="Canaux prioritaires" accent={colors.accent}>
                    <div className="flex flex-wrap gap-1.5">
                      {avatar.canaux_prioritaires?.map((c, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 text-white/60 text-xs rounded-full">{c}</span>
                      ))}
                    </div>
                    {avatar.type_contenu_prefere?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-white/30 text-xs mb-1.5">Contenu préféré :</p>
                        <div className="flex flex-wrap gap-1.5">
                          {avatar.type_contenu_prefere.map((c, i) => (
                            <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 text-white/50 text-xs rounded-full">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </InfoCard>
                  <InfoCard icon={<AlertTriangle size={13} />} title="Erreurs marketing à éviter" accent="text-rose-400">
                    <p className="text-white/65 text-sm leading-relaxed">{avatar.erreurs_marketing_a_eviter}</p>
                    {avatar.ton_communication && (
                      <div className="mt-2 pt-2 border-t border-white/[0.06]">
                        <p className="text-white/30 text-xs mb-1">Ton à adopter :</p>
                        <p className="text-white/60 text-xs">{avatar.ton_communication}</p>
                      </div>
                    )}
                  </InfoCard>
                </div>
              )}
            </div>
          )}

          {!loading && !avatar && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl flex flex-col items-center justify-center py-20 text-center">
              <UserCircle size={52} className="text-white/[0.08] mb-4" />
              <p className="text-white/30 text-sm font-medium">3 personas profonds apparaîtront ici</p>
              <p className="text-white/15 text-xs mt-2 max-w-xs">
                Psychologie · Ce qu&apos;ils aimeront/détesteront · Comment les atteindre · Mots qui convertissent
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, accent, children }: { icon: React.ReactNode; title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2.5">
      <h3 className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${accent}`}>
        {icon}{title}
      </h3>
      <div>{children}</div>
    </div>
  );
}
