"use client";
import { useState, useEffect } from "react";
import {
  Instagram, Twitter, Linkedin, Mail, Search, Sparkles,
  Copy, Check, Loader2, RefreshCw, Hash, Calendar,
  TrendingUp, FileText, Mic, BarChart2, BookOpen
} from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "from-pink-500 to-purple-500" },
  { id: "facebook",  label: "Facebook",  icon: Hash,      color: "from-blue-600 to-blue-400" },
  { id: "twitter",   label: "Twitter/X", icon: Twitter,   color: "from-sky-500 to-blue-500" },
  { id: "tiktok",    label: "TikTok",    icon: TrendingUp,color: "from-pink-500 to-red-500" },
  { id: "linkedin",  label: "LinkedIn",  icon: Linkedin,  color: "from-blue-700 to-blue-500" },
];

const TONES = ["Inspirant", "Authentique", "Humoristique", "Direct", "Émotionnel", "Professionnel"];

const EMAIL_TYPES = [
  { id: "launch",   label: "Email de lancement",    icon: "🚀", desc: "Annonce officielle + offre spéciale" },
  { id: "followup", label: "Séquence 5 emails",     icon: "📧", desc: "J0 à J+8 pour convertir" },
  { id: "review",   label: "Demande d'avis",        icon: "⭐", desc: "Email pour obtenir des témoignages" },
  { id: "podcast",  label: "Pitch Podcast",         icon: "🎙️", desc: "Email pour devenir invité" },
];

const CONTENT_TOOLS = [
  { id: "faq",      label: "FAQ",             icon: "❓", desc: "10 questions/réponses pour la page de vente" },
  { id: "bio",      label: "Bio auteur",      icon: "✍️", desc: "Bio pro en 3 longueurs" },
  { id: "seo",      label: "SEO & Mots-clés", icon: "🔍", desc: "7 mots-clés Amazon + catégories" },
  { id: "quotes",   label: "Extraire citations", icon: "💬", desc: "10 meilleures phrases partageables" },
  { id: "calendar", label: "Calendrier 30j",  icon: "📅", desc: "Plan de contenu lancement" },
  { id: "niche",    label: "Analyse de niche", icon: "📊", desc: "Potentiel commercial + score" },
];

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${done ? "bg-emerald-500 text-white" : "bg-white/10 hover:bg-white/20 text-white/60 hover:text-white"}`}>
      {done ? <><Check size={11} /> Copié</> : <><Copy size={11} /> Copier</>}
    </button>
  );
}

function ResultBox({ content, onRegen, loading }: { content: string; onRegen: () => void; loading: boolean }) {
  if (!content && !loading) return null;
  return (
    <div className="mt-4 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      {loading ? (
        <div className="flex items-center gap-3 py-4 justify-center">
          <Loader2 size={18} className="animate-spin text-purple-400" />
          <span className="text-white/50 text-sm">Génération en cours...</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/40 text-xs">Résultat</span>
            <div className="flex gap-2">
              <button onClick={onRegen} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg text-xs transition-colors">
                <RefreshCw size={11} /> Regénérer
              </button>
              <CopyBtn text={content} />
            </div>
          </div>
          <pre className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-sans max-h-96 overflow-y-auto">{content}</pre>
        </>
      )}
    </div>
  );
}

export default function MarketingPage() {
  const [tab, setTab] = useState<"social" | "email" | "content">("social");
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [tone, setTone] = useState("Inspirant");
  const [platform, setPlatform] = useState("instagram");
  const [emailType, setEmailType] = useState("launch");
  const [contentTool, setContentTool] = useState("faq");
  const [nicheInput, setNicheInput] = useState("");
  const [seriesInput, setSeriesInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const all = getBooks();
    setBooks(all);
    if (all.length > 0) setSelectedId(all[0].id);
  }, []);

  const book = books.find(b => b.id === selectedId);
  const bookDesc = book?.chapters?.slice(0, 3).map(c => c.title).join(", ") || "";

  const call = async (action: string, extra: Record<string, string> = {}) => {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          title: book?.title || nicheInput || seriesInput,
          category: book?.category,
          description: bookDesc,
          authorName,
          ...extra,
        }),
      });
      const data = await res.json();
      setResult(data.posts || data.email || data.faq || data.bio || data.seo || data.quotes || data.calendar || data.niche || data.series || "");
    } catch { setResult("Erreur lors de la génération."); }
    setLoading(false);
  };

  const generateSocial = () => call("social", { platform, tone });
  const generateEmail  = () => call("email", { type: emailType });
  const generateContent = () => {
    if (contentTool === "bio") return call("bio", { expertise: book?.category || "" });
    if (contentTool === "seo") return call("seo", {});
    if (contentTool === "quotes") return call("quotes", { content: book?.chapters?.map(c => c.content).join("\n\n") || "" });
    if (contentTool === "calendar") return call("calendar", { launchDate: "dans 2 semaines", platforms: "Instagram, Facebook, TikTok" });
    if (contentTool === "niche") return call("niche", { niche: nicheInput || book?.title || "" });
    return call(contentTool, {});
  };

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";
  const tabs = [
    { id: "social",  label: "Réseaux sociaux", icon: Instagram },
    { id: "email",   label: "Email Marketing",  icon: Mail },
    { id: "content", label: "Contenu & SEO",    icon: FileText },
  ] as const;

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Marketing Hub</h1>
        <p className="text-white/50">Posts, emails, SEO, calendrier — tout pour vendre ton livre</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setTab(id); setResult(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? "bg-purple-500 text-white" : "text-white/50 hover:text-white"}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: book + config */}
        <div className="space-y-4">
          {books.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
              <label className="text-white/50 text-xs mb-2 block flex items-center gap-1"><BookOpen size={11} /> Livre source</label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              {book && <p className="text-white/25 text-xs mt-2">{book.category} · {book.pages} pages</p>}
            </div>
          )}

          {tab === "social" && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-4">
              <div>
                <label className="text-white/50 text-xs mb-2 block">Plateforme</label>
                <div className="grid grid-cols-1 gap-2">
                  {SOCIAL_PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => setPlatform(p.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${platform === p.id ? "bg-purple-500/20 border border-purple-500/40 text-white" : "bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white"}`}>
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center`}>
                        <p.icon size={12} className="text-white" />
                      </div>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-2 block">Ton</label>
                <div className="flex flex-wrap gap-1.5">
                  {TONES.map(t => (
                    <button key={t} onClick={() => setTone(t)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${tone === t ? "bg-purple-500 text-white" : "bg-white/5 text-white/40 hover:text-white"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={generateSocial} disabled={loading || (!book && !nicheInput)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Générer les posts
              </button>
            </div>
          )}

          {tab === "email" && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <label className="text-white/50 text-xs mb-1 block">Type d&apos;email</label>
              {EMAIL_TYPES.map(e => (
                <button key={e.id} onClick={() => setEmailType(e.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${emailType === e.id ? "bg-purple-500/20 border border-purple-500/40" : "bg-white/[0.03] border border-white/[0.06] hover:border-white/10"}`}>
                  <span className="text-lg">{e.icon}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{e.label}</p>
                    <p className="text-white/40 text-xs">{e.desc}</p>
                  </div>
                </button>
              ))}
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Nom d&apos;auteur</label>
                <input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Ton prénom Nom" className={ic} />
              </div>
              <button onClick={generateEmail} disabled={loading || !book}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Générer l&apos;email
              </button>
            </div>
          )}

          {tab === "content" && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <label className="text-white/50 text-xs mb-1 block">Outil</label>
              {CONTENT_TOOLS.map(t => (
                <button key={t.id} onClick={() => setContentTool(t.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${contentTool === t.id ? "bg-purple-500/20 border border-purple-500/40" : "bg-white/[0.03] border border-white/[0.06] hover:border-white/10"}`}>
                  <span className="text-base">{t.icon}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{t.label}</p>
                    <p className="text-white/40 text-xs">{t.desc}</p>
                  </div>
                </button>
              ))}
              {(contentTool === "niche") && (
                <input value={nicheInput} onChange={e => setNicheInput(e.target.value)}
                  placeholder="Ex: Finance personnelle pour étudiants africains"
                  className={ic} />
              )}
              {contentTool === "bio" && (
                <div>
                  <input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Nom de l'auteur" className={ic} />
                </div>
              )}
              <button onClick={generateContent} disabled={loading || (!book && !nicheInput && !authorName)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Générer
              </button>
            </div>
          )}
        </div>

        {/* Right: result */}
        <div className="col-span-2">
          {!result && !loading && (
            <div className="h-full flex flex-col items-center justify-center bg-white/[0.02] border border-white/[0.05] rounded-2xl min-h-[400px]">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={28} className="text-purple-400" />
                </div>
                <p className="text-white/30 font-medium">Sélectionne un outil et génère</p>
                <p className="text-white/20 text-sm mt-1">Le contenu apparaîtra ici</p>
              </div>
            </div>
          )}
          <ResultBox content={result} loading={loading}
            onRegen={() => {
              if (tab === "social") generateSocial();
              else if (tab === "email") generateEmail();
              else generateContent();
            }} />
        </div>
      </div>
    </div>
  );
}
