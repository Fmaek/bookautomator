"use client";
import { useState, useEffect } from "react";
import {
  ExternalLink, CheckCircle, Circle, Copy, Check,
  BookOpen, ChevronDown, ChevronUp, Wallet,
  TrendingUp, FileText, ArrowRight, Sparkles, Info
} from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

// ─── Platform definitions ─────────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: "d2d",
    name: "Draft2Digital",
    logo: "🌐",
    royalty: "85% net",
    audience: "40+ plateformes (Kobo, Apple, Barnes & Noble...)",
    color: "from-blue-600/25 to-cyan-600/15",
    border: "border-blue-500/30",
    accentText: "text-blue-300",
    // Deep links
    uploadUrl: "https://www.draft2digital.com/book/add",
    loginUrl: "https://app.draft2digital.com/login",
    // Fields needed on the platform form
    fields: [
      { key: "title",       label: "Titre",                     hint: "Colle dans le champ 'Book Title'" },
      { key: "author",      label: "Nom d'auteur",              hint: "Colle dans 'Primary Author'" },
      { key: "description", label: "Description de vente",      hint: "Colle dans 'Book Description'" },
      { key: "price",       label: "Prix (€)",                  hint: "Entre dans 'Set Your Price'" },
      { key: "category",    label: "Catégorie",                 hint: "Choisis la catégorie la plus proche" },
    ],
    steps: [
      { label: "Connecte-toi",                     url: "https://app.draft2digital.com/login",   urlLabel: "Ouvrir Draft2Digital" },
      { label: "Clique 'Add New Book'",             url: "https://www.draft2digital.com/book/add", urlLabel: "Ajouter un livre" },
      { label: "Remplis le titre + auteur",         url: null, urlLabel: null },
      { label: "Colle la description",              url: null, urlLabel: null },
      { label: "Upload ton fichier PDF",            url: null, urlLabel: null },
      { label: "Upload ta couverture PNG",          url: null, urlLabel: null },
      { label: "Définis le prix et soumets",        url: null, urlLabel: null },
    ],
    payInfo: "Paiement mensuel via PayPal ou virement bancaire dès 10$ accumulés.",
    liveInfo: "Email de confirmation dans les 24-48h. Ton livre apparaît dans ton dashboard avec statut 'Published'.",
  },
  {
    id: "kobo",
    name: "Kobo Writing Life",
    logo: "📖",
    royalty: "70%",
    audience: "Fort en France, Belgique, Canada",
    color: "from-red-600/25 to-rose-600/15",
    border: "border-red-500/30",
    accentText: "text-red-300",
    uploadUrl: "https://www.kobo.com/writinglife/books/new",
    loginUrl: "https://www.kobo.com/writinglife",
    fields: [
      { key: "title",       label: "Titre",            hint: "Champ 'Book Title'" },
      { key: "author",      label: "Nom d'auteur",     hint: "Champ 'Author Name'" },
      { key: "description", label: "Description",      hint: "Champ 'Description'" },
      { key: "price",       label: "Prix (€)",         hint: "Section 'Pricing', choisis EUR" },
      { key: "category",    label: "Catégorie",        hint: "Section 'Categories'" },
    ],
    steps: [
      { label: "Connecte-toi à Kobo Writing Life",  url: "https://www.kobo.com/writinglife",           urlLabel: "Ouvrir Kobo" },
      { label: "Clique 'Add a New Title'",           url: "https://www.kobo.com/writinglife/books/new", urlLabel: "Ajouter un titre" },
      { label: "Remplis titre, auteur, catégorie",   url: null, urlLabel: null },
      { label: "Colle la description de vente",      url: null, urlLabel: null },
      { label: "Upload le fichier PDF/EPUB",         url: null, urlLabel: null },
      { label: "Upload la couverture (1600×2400px)", url: null, urlLabel: null },
      { label: "Pricing → EUR → définis le prix",   url: null, urlLabel: null },
      { label: "Soumets pour validation",            url: null, urlLabel: null },
    ],
    payInfo: "Virement bancaire mensuel. Paiement le mois suivant les ventes.",
    liveInfo: "Email de confirmation sous 72h. Cherche ton titre sur kobo.com pour vérifier qu'il est en ligne.",
  },
  {
    id: "youscribe",
    name: "YouScribe",
    logo: "📚",
    royalty: "60%",
    audience: "Afrique francophone + France",
    color: "from-emerald-600/25 to-green-600/15",
    border: "border-emerald-500/30",
    accentText: "text-emerald-300",
    uploadUrl: "https://www.youscribe.com/publisher/catalog/add",
    loginUrl: "https://www.youscribe.com/Account/Login",
    fields: [
      { key: "title",       label: "Titre",            hint: "Champ 'Titre de l'ouvrage'" },
      { key: "author",      label: "Auteur",           hint: "Champ 'Auteur'" },
      { key: "description", label: "Description",      hint: "Champ 'Résumé / Description'" },
      { key: "price",       label: "Prix (€)",         hint: "Champ 'Prix de vente'" },
      { key: "category",    label: "Catégorie",        hint: "Menu déroulant catégorie" },
    ],
    steps: [
      { label: "Connecte-toi à YouScribe",           url: "https://www.youscribe.com/Account/Login",              urlLabel: "Ouvrir YouScribe" },
      { label: "Va dans Espace Éditeur → Catalogue", url: "https://www.youscribe.com/publisher/catalog/add",      urlLabel: "Ajouter un document" },
      { label: "Remplis titre, auteur, catégorie",   url: null, urlLabel: null },
      { label: "Colle le résumé / description",      url: null, urlLabel: null },
      { label: "Upload ton fichier PDF",             url: null, urlLabel: null },
      { label: "Upload la couverture",               url: null, urlLabel: null },
      { label: "Définis le prix et publie",          url: null, urlLabel: null },
    ],
    payInfo: "Virement bancaire ou Mobile Money (Orange Money, MTN). Paiement mensuel.",
    liveInfo: "Validation 3-7 jours. Reçois un email de confirmation. Ton livre visible sur youscribe.com.",
  },
];

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };
  return (
    <button onClick={copy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${done ? "bg-emerald-500 text-white" : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"}`}>
      {done ? <><Check size={11} /> Copié</> : <><Copy size={11} /> Copier</>}
    </button>
  );
}

// ─── Platform card ────────────────────────────────────────────────────────────
function PlatformCard({
  p, bookData, open, onToggle,
}: {
  p: typeof PLATFORMS[0];
  bookData: Record<string, string>;
  open: boolean;
  onToggle: () => void;
}) {
  const [done, setDone] = useState<Record<number, boolean>>({});
  const toggle = (i: number) => setDone(prev => ({ ...prev, [i]: !prev[i] }));
  const doneCount = Object.values(done).filter(Boolean).length;
  const pct = Math.round((doneCount / p.steps.length) * 100);

  return (
    <div className={`bg-gradient-to-br ${p.color} border ${p.border} rounded-2xl overflow-hidden`}>
      {/* Header */}
      <button className="w-full flex items-center gap-4 p-5 text-left" onClick={onToggle}>
        <span className="text-3xl">{p.logo}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-bold text-sm">{p.name}</span>
            <span className={`text-xs px-2 py-0.5 bg-white/10 rounded-full ${p.accentText}`}>{p.royalty}</span>
          </div>
          <p className="text-white/40 text-xs">{p.audience}</p>
        </div>
        {pct > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-16 bg-white/10 rounded-full h-1.5">
              <div className="bg-emerald-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-white/40">{pct}%</span>
          </div>
        )}
        <a href={p.loginUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs rounded-lg transition-colors shrink-0"
          onClick={e => e.stopPropagation()}>
          Ouvrir <ExternalLink size={10} />
        </a>
        {open ? <ChevronUp size={15} className="text-white/40 shrink-0" /> : <ChevronDown size={15} className="text-white/40 shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-6 pt-1 border-t border-white/10 space-y-5">
          {/* Fields to copy */}
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
              📋 Infos à copier-coller sur la plateforme
            </p>
            <div className="space-y-2">
              {p.fields.map(f => (
                <div key={f.key} className="bg-black/20 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/50 text-xs font-medium">{f.label}</span>
                    <CopyBtn text={bookData[f.key] || ""} />
                  </div>
                  <p className="text-white/80 text-sm leading-snug break-words line-clamp-3">
                    {bookData[f.key] || <span className="text-white/20 italic">Non renseigné</span>}
                  </p>
                  <p className="text-white/25 text-xs mt-1.5">→ {f.hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Step-by-step */}
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
              ✅ Étapes ({doneCount}/{p.steps.length} faites)
            </p>
            <div className="space-y-2">
              {p.steps.map((step, i) => (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${done[i] ? "opacity-40" : "bg-black/15"}`}>
                  <button onClick={() => toggle(i)} className="shrink-0">
                    {done[i]
                      ? <CheckCircle size={16} className="text-emerald-400" />
                      : <Circle size={16} className="text-white/25 hover:text-white/50 transition-colors" />}
                  </button>
                  <span className={`text-sm flex-1 ${done[i] ? "line-through text-white/30" : "text-white/70"}`}>{step.label}</span>
                  {step.url && (
                    <a href={step.url} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white rounded-lg text-xs transition-colors shrink-0 ${done[i] ? "hidden" : ""}`}>
                      {step.urlLabel} <ArrowRight size={10} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment + live info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-black/20 rounded-xl p-3">
              <p className="text-white/40 text-xs font-semibold mb-1 flex items-center gap-1"><Wallet size={11} /> Paiement</p>
              <p className="text-white/60 text-xs leading-relaxed">{p.payInfo}</p>
            </div>
            <div className="bg-black/20 rounded-xl p-3">
              <p className="text-white/40 text-xs font-semibold mb-1 flex items-center gap-1"><CheckCircle size={11} /> Comment savoir si c'est live ?</p>
              <p className="text-white/60 text-xs leading-relaxed">{p.liveInfo}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PublishPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [price, setPrice] = useState("4.99");
  const [authorName, setAuthorName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [open, setOpen] = useState<string>("d2d");

  useEffect(() => {
    const all = getBooks();
    setBooks(all);
    if (all.length > 0) setSelectedId(all[0].id);
  }, []);

  const book = books.find(b => b.id === selectedId);

  // Build the data object that gets pre-filled into each platform field
  const bookData: Record<string, string> = {
    title: book?.title || "",
    author: authorName,
    description: customDesc || (book?.chapters?.slice(0, 2).map(c => c.title).join(", ") || ""),
    price: price,
    category: book?.category || "",
  };

  const earnings = (n: number) => (parseFloat(price || "0") * 0.70 * n).toFixed(n === 1 ? 2 : 0);

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Publier & Gagner de l&apos;Argent</h1>
        <p className="text-white/50">Assistant de publication guidé — copie-colle en 1 clic sur chaque plateforme</p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-8 flex gap-3">
        <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-blue-200/70 text-sm leading-relaxed">
          Aucune plateforme ne permet la publication automatique sans API officielle.
          Cet assistant pré-remplit toutes tes informations depuis ton livre et t&apos;amène directement à la bonne page sur chaque site — tu n&apos;as plus qu&apos;à coller et cliquer.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        {/* Left: book config */}
        <div className="space-y-4">
          {/* Book selector */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <BookOpen size={15} className="text-purple-400" /> Livre à publier
            </h3>

            {books.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-white/30 text-sm">Aucun livre dans ta bibliothèque</p>
                <a href="/studio" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl text-sm">
                  <Sparkles size={13} /> Créer un livre
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none">
                  {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>

                {book && (
                  <div className="p-3 bg-white/[0.03] rounded-xl">
                    <p className="text-white/60 text-xs mb-0.5">{book.category} · {book.pages} pages</p>
                    <p className="text-white/30 text-xs">{book.chapters?.length || 0} chapitres · statut: {book.status}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Publication info */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <FileText size={15} className="text-purple-400" /> Infos de publication
            </h3>
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Nom d&apos;auteur</label>
              <input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Ton prénom Nom" className={ic} />
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Prix de vente (€)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} step="0.99" min="0.99" className={ic} />
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Description de vente</label>
              <textarea value={customDesc} onChange={e => setCustomDesc(e.target.value)} rows={5}
                placeholder="Colle ici la description générée dans le Studio (bouton 'Générer description')..."
                className={`${ic} resize-none text-xs leading-relaxed`} />
              <p className="text-white/25 text-xs mt-1">
                💡 Va dans le Studio → génère ton livre → clique &quot;Générer description&quot; → copie la version Medium ici
              </p>
            </div>
          </div>

          {/* Revenue simulator */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-400" /> Revenus estimés
            </h3>
            <div className="space-y-2">
              {[["Par vente", 1], ["10 ventes/mois", 10], ["50 ventes/mois", 50], ["200 ventes/mois", 200]].map(([label, n]) => (
                <div key={String(label)} className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-white/50 text-sm">{label}</span>
                  <span className={`font-bold text-sm ${Number(n) >= 50 ? "text-emerald-400" : "text-white"}`}>{earnings(Number(n))}€</span>
                </div>
              ))}
            </div>
            <p className="text-white/20 text-xs mt-3">Basé sur 70% de royalties</p>
          </div>
        </div>

        {/* Right: platforms */}
        <div className="col-span-2 space-y-4">
          <p className="text-white/40 text-sm">
            Ouvre chaque plateforme, copie-colle les champs, coche les étapes. C&apos;est tout.
          </p>
          {PLATFORMS.map(p => (
            <PlatformCard
              key={p.id}
              p={p}
              bookData={bookData}
              open={open === p.id}
              onToggle={() => setOpen(open === p.id ? "" : p.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

