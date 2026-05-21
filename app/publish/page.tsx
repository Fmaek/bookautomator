"use client";
import { useState } from "react";
import {
  ExternalLink, CheckCircle, Circle, ChevronDown, ChevronUp,
  DollarSign, Clock, Globe, Star, AlertTriangle, BookOpen,
  Wallet, TrendingUp, Info
} from "lucide-react";

const PLATFORMS = [
  {
    id: "kdp",
    name: "Amazon KDP",
    logo: "📦",
    royalty: "70%",
    delay: "24-72h",
    audience: "Mondial",
    commission: "Gratuit",
    pros: ["Plus grand marché mondial", "70% de royalties (prix 2,99€-9,99€)", "Accès à Kindle Unlimited"],
    cons: ["Exclusivité KDP Select (optionnel)", "Paiement après 60 jours"],
    link: "https://kdp.amazon.com",
    linkLabel: "Créer compte KDP",
    steps: [
      "Va sur kdp.amazon.com et crée un compte gratuit",
      "Clique sur 'Créer un nouveau titre'",
      "Remplis les métadonnées (titre, description, catégorie, mots-clés)",
      "Upload ta couverture PNG (2500×1600px minimum recommandé)",
      "Upload ton fichier PDF ou DOCX",
      "Choisis ton prix (min 0,99€ / recommandé 2,99€-9,99€)",
      "Soumets — validation 24-72h puis livre en vente",
    ],
    earning: "Ex: livre à 4,99€ × 70% = 3,49€ par vente",
    color: "from-orange-500/20 to-amber-500/20",
    border: "border-orange-500/30",
  },
  {
    id: "d2d",
    name: "Draft2Digital",
    logo: "🌐",
    royalty: "85% net",
    delay: "2-5 jours",
    audience: "40+ plateformes",
    commission: "Gratuit",
    pros: ["Distribue sur Kobo, Apple, Barnes & Noble, etc.", "85% des recettes nettes", "Génère automatiquement EPUB et PDF"],
    cons: ["Un seul upload, plusieurs plateformes", "Paiement mensuel minimum 10$"],
    link: "https://www.draft2digital.com",
    linkLabel: "Créer compte D2D",
    steps: [
      "Va sur draft2digital.com et inscris-toi gratuitement",
      "Clique sur 'Add New Book'",
      "Uploade ton fichier Word ou PDF",
      "Remplis titre, auteur, description, ISBN (ils en fournissent un gratuit)",
      "Choisis les plateformes de distribution",
      "Définis ton prix et soumets",
      "Le livre apparaît sur Kobo, Apple Books, etc. sous 2-5 jours",
    ],
    earning: "Ex: livre à 4,99€ sur Kobo → ~4,24€ par vente",
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30",
  },
  {
    id: "kobo",
    name: "Kobo Writing Life",
    logo: "📖",
    royalty: "70%",
    delay: "72h",
    audience: "Europe / Canada",
    commission: "Gratuit",
    pros: ["Fort en France, Belgique, Canada", "70% sur prix ≥1,99$", "Promotions régulières"],
    cons: ["Moins fort aux USA que Amazon", "Interface en anglais"],
    link: "https://www.kobo.com/writinglife",
    linkLabel: "Créer compte Kobo",
    steps: [
      "Va sur kobo.com/writinglife",
      "Crée ton compte auteur",
      "Clique sur 'Add a Title'",
      "Upload EPUB ou PDF + couverture",
      "Configure prix et territoires",
      "Soumets pour validation",
    ],
    earning: "Ex: livre à 4,99€ → 3,49€ par vente",
    color: "from-red-500/20 to-rose-500/20",
    border: "border-red-500/30",
  },
  {
    id: "youscribe",
    name: "YouScribe",
    logo: "📚",
    royalty: "60%",
    delay: "3-7 jours",
    audience: "Afrique / France",
    commission: "Gratuit",
    pros: ["Leader en Afrique francophone", "Audience en Côte d'Ivoire, Sénégal, Cameroun", "Abonnement + vente à l'unité"],
    cons: ["60% de royalties", "Marché plus petit"],
    link: "https://www.youscribe.com/publisher/",
    linkLabel: "Devenir éditeur YouScribe",
    steps: [
      "Va sur youscribe.com et crée un compte éditeur",
      "Soumets ton livre via le dashboard",
      "Validation 3-7 jours",
      "Ton livre est accessible à l'abonnement et à la vente",
    ],
    earning: "Ex: 60% des revenus générés par tes lectures",
    color: "from-emerald-500/20 to-green-500/20",
    border: "border-emerald-500/30",
  },
  {
    id: "smashwords",
    name: "Smashwords",
    logo: "💡",
    royalty: "85%",
    delay: "24-48h",
    audience: "Mondial",
    commission: "Gratuit",
    pros: ["85% de royalties", "Distribution multi-canaux", "Auteurs indépendants"],
    cons: ["Interface vieillissante", "Moins populaire qu'Amazon"],
    link: "https://www.smashwords.com/about/how_to_publish_on_smashwords",
    linkLabel: "Publier sur Smashwords",
    steps: [
      "Créé un compte sur smashwords.com",
      "Formate ton document selon leur guide Meatgrinder",
      "Upload le fichier Word",
      "Soumets pour validation",
    ],
    earning: "Ex: livre à 4,99$ → ~4,24$ par vente",
    color: "from-purple-500/20 to-violet-500/20",
    border: "border-purple-500/30",
  },
];

const CHECKLIST = [
  { label: "Fichier PDF de ton livre prêt", key: "pdf" },
  { label: "Couverture PNG haute résolution (min 1600×2400px)", key: "cover" },
  { label: "Description de vente rédigée (200-400 mots)", key: "desc" },
  { label: "Prix défini (recommandé: 2,99€ - 9,99€)", key: "price" },
  { label: "Compte bancaire ou PayPal pour recevoir les paiements", key: "bank" },
  { label: "Comptes créés sur les plateformes choisies", key: "accounts" },
];

export default function PublishPage() {
  const [openPlatform, setOpenPlatform] = useState<string | null>("kdp");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [price, setPrice] = useState("4.99");

  const toggleCheck = (key: string) => setChecklist(p => ({ ...p, [key]: !p[key] }));
  const checkCount = Object.values(checklist).filter(Boolean).length;

  const earnings = (mult: number) => (parseFloat(price || "0") * 0.70 * mult).toFixed(mult === 1 ? 2 : 0);

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Publier & Gagner de l&apos;Argent</h1>
        <p className="text-white/50">Guide complet pour publier ton livre et commencer à recevoir des paiements</p>
      </div>

      {/* How it works banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 mb-8 flex gap-4">
        <Info size={20} className="text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-300 font-semibold mb-1">Comment ça fonctionne réellement ?</p>
          <p className="text-white/60 text-sm leading-relaxed">
            La publication d&apos;un livre numérique est <strong className="text-white/80">100% gratuite</strong> sur toutes ces plateformes.
            Tu crées un compte, tu uploades ton PDF + ta couverture, tu définis ton prix, et la plateforme s&apos;occupe de la vente.
            Tu reçois tes <strong className="text-white/80">royalties chaque mois</strong> directement sur ton compte bancaire ou PayPal.
            La validation prend 24h à 5 jours selon la plateforme.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-4">

          {/* Platforms */}
          {PLATFORMS.map(p => (
            <div key={p.id} className={`bg-gradient-to-br ${p.color} border ${p.border} rounded-2xl overflow-hidden transition-all`}>
              <button className="w-full flex items-center gap-4 p-5 text-left" onClick={() => setOpenPlatform(openPlatform === p.id ? null : p.id)}>
                <span className="text-3xl">{p.logo}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold">{p.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-white/10 text-white/60 rounded-full">{p.commission}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-white/50">
                    <span className="flex items-center gap-1"><DollarSign size={10} /> {p.royalty}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {p.delay}</span>
                    <span className="flex items-center gap-1"><Globe size={10} /> {p.audience}</span>
                  </div>
                </div>
                <a href={p.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors shrink-0"
                  onClick={e => e.stopPropagation()}>
                  {p.linkLabel} <ExternalLink size={10} />
                </a>
                {openPlatform === p.id ? <ChevronUp size={16} className="text-white/40 shrink-0" /> : <ChevronDown size={16} className="text-white/40 shrink-0" />}
              </button>

              {openPlatform === p.id && (
                <div className="px-5 pb-5 pt-1 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Avantages</p>
                      {p.pros.map(pro => (
                        <div key={pro} className="flex items-start gap-2 mb-1.5">
                          <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                          <span className="text-white/70 text-xs">{pro}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Points d&apos;attention</p>
                      {p.cons.map(con => (
                        <div key={con} className="flex items-start gap-2 mb-1.5">
                          <AlertTriangle size={12} className="text-yellow-400 mt-0.5 shrink-0" />
                          <span className="text-white/70 text-xs">{con}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Guide étape par étape</p>
                    <div className="space-y-1.5">
                      {p.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-white/10 text-white/60 text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          <span className="text-white/70 text-xs leading-relaxed">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <Wallet size={14} className="text-emerald-400 shrink-0" />
                    <span className="text-emerald-300 text-xs">{p.earning}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Earnings calculator */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-400" /> Simuler mes revenus
            </h3>
            <div className="mb-4">
              <label className="text-white/50 text-xs mb-2 block">Prix de ton livre (€)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} step="0.99" min="0.99"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none" />
            </div>
            <div className="space-y-2">
              {[["Par vente", 1], ["10 ventes/mois", 10], ["50 ventes/mois", 50], ["200 ventes/mois", 200]].map(([label, n]) => (
                <div key={String(label)} className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-white/50 text-sm">{label}</span>
                  <span className={`font-bold text-sm ${Number(n) >= 50 ? "text-emerald-400" : "text-white"}`}>{earnings(Number(n))}€</span>
                </div>
              ))}
            </div>
            <p className="text-white/25 text-xs mt-3">Calcul basé sur 70% de royalties (Amazon KDP)</p>
          </div>

          {/* Pre-publish checklist */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
              <BookOpen size={15} className="text-purple-400" /> Checklist avant publication
            </h3>
            <p className="text-white/30 text-xs mb-4">{checkCount}/{CHECKLIST.length} complétés</p>
            <div className="w-full bg-white/5 rounded-full h-1.5 mb-4">
              <div className="bg-gradient-to-r from-purple-500 to-emerald-500 h-1.5 rounded-full transition-all"
                style={{ width: `${(checkCount / CHECKLIST.length) * 100}%` }} />
            </div>
            <div className="space-y-2.5">
              {CHECKLIST.map(item => (
                <button key={item.key} onClick={() => toggleCheck(item.key)}
                  className="w-full flex items-start gap-3 text-left group">
                  {checklist[item.key]
                    ? <CheckCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                    : <Circle size={16} className="text-white/20 mt-0.5 shrink-0 group-hover:text-white/40 transition-colors" />}
                  <span className={`text-sm leading-snug ${checklist[item.key] ? "text-white/40 line-through" : "text-white/70"}`}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payout info */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Wallet size={15} className="text-amber-400" /> Comment je reçois mon argent ?
            </h3>
            <div className="space-y-3 text-sm">
              {[
                { platform: "Amazon KDP", info: "Virement bancaire ou chèque, paiement 60 jours après la fin du mois de vente. Minimum 10$ ou 100$ selon mode." },
                { platform: "Draft2Digital", info: "PayPal, ACH ou virement, mensuel dès 10$ accumulés." },
                { platform: "Kobo", info: "Virement mensuel, paiement le mois suivant le mois de vente." },
                { platform: "YouScribe", info: "Virement bancaire ou Mobile Money (Afrique), mensuel." },
              ].map(item => (
                <div key={item.platform} className="pb-2.5 border-b border-white/5 last:border-0">
                  <p className="text-white/70 font-medium mb-0.5">{item.platform}</p>
                  <p className="text-white/40 text-xs leading-relaxed">{item.info}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Comment savoir si publié */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
            <h3 className="text-emerald-300 font-semibold mb-2 flex items-center gap-2">
              <Star size={15} /> Comment savoir si mon livre est bien publié ?
            </h3>
            <div className="space-y-2 text-xs text-white/60 leading-relaxed">
              <p>✓ Tu reçois un <strong className="text-white/80">email de confirmation</strong> de chaque plateforme</p>
              <p>✓ Ton livre apparaît dans ton <strong className="text-white/80">tableau de bord</strong> avec statut &quot;Live&quot;</p>
              <p>✓ Tu peux le <strong className="text-white/80">chercher sur Amazon/Kobo</strong> avec ton nom ou le titre</p>
              <p>✓ Un <strong className="text-white/80">lien de vente</strong> est généré que tu peux partager</p>
              <p className="text-white/40 pt-1">Si le statut reste &quot;En révision&quot; + de 5 jours, contacte le support de la plateforme.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
