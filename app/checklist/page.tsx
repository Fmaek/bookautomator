"use client";
import { useState } from "react";
import { CheckSquare, CheckCircle, Circle, AlertCircle, ChevronRight, Sparkles } from "lucide-react";

interface CheckItem { id: string; category: string; label: string; desc: string; done: boolean; critical: boolean }

const INITIAL_CHECKLIST: CheckItem[] = [
  { id: "c1", category: "Contenu", label: "Titre accrocheur et mémorable", desc: "Le titre doit clairement indiquer le bénéfice principal", done: false, critical: true },
  { id: "c2", category: "Contenu", label: "Introduction captivante", desc: "Les 3 premières pages doivent accrocher le lecteur", done: false, critical: true },
  { id: "c3", category: "Contenu", label: "Conclusion avec appel à l'action", desc: "Termine par un CTA clair", done: false, critical: false },
  { id: "c4", category: "Contenu", label: "Orthographe et grammaire vérifiées", desc: "Relecture complète ou outil de correction utilisé", done: false, critical: true },
  { id: "c5", category: "Contenu", label: "Table des matières incluse", desc: "Navigation facile, numéros de pages corrects", done: false, critical: false },
  { id: "cv1", category: "Couverture", label: "Couverture au format KDP (1600x2560px)", desc: "Dimensions exactes requises par Amazon KDP", done: false, critical: true },
  { id: "cv2", category: "Couverture", label: "Titre lisible en miniature", desc: "Vérifier sur mobile et en petit format", done: false, critical: true },
  { id: "cv3", category: "Couverture", label: "Nom de l'auteur visible", desc: "Police minimum 18px recommandée", done: false, critical: false },
  { id: "t1", category: "Technique", label: "Fichier au format EPUB ou PDF", desc: "EPUB préféré pour livres numériques", done: false, critical: true },
  { id: "t2", category: "Technique", label: "Métadonnées renseignées", desc: "Titre, auteur, description, catégorie, mots-clés", done: false, critical: true },
  { id: "t3", category: "Technique", label: "ISBN ou ASIN disponible", desc: "Draft2Digital offre un ISBN gratuit", done: false, critical: false },
  { id: "m1", category: "Marketing", label: "Prix défini (2.99€ à 9.99€ recommandé)", desc: "2.99€ = 70% royalties sur KDP", done: false, critical: true },
  { id: "m2", category: "Marketing", label: "Description de vente (blurb) rédigée", desc: "200-300 mots max, orientés bénéfices", done: false, critical: true },
  { id: "m3", category: "Marketing", label: "Mots-clés KDP recherchés (7 max)", desc: "Utilise les suggestions d'Amazon", done: false, critical: false },
  { id: "m4", category: "Marketing", label: "Catégories choisies (2 max sur KDP)", desc: "Catégories de niche pour mieux ranker", done: false, critical: false },
  { id: "l1", category: "Légal", label: "Page de copyright incluse", desc: "© 2025 [Nom]. Tous droits réservés.", done: false, critical: true },
  { id: "l2", category: "Légal", label: "Sources citées si nécessaire", desc: "Citer les sources pour éviter le plagiat", done: false, critical: false },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Contenu": "text-purple-400", "Couverture": "text-pink-400",
  "Technique": "text-cyan-400", "Marketing": "text-orange-400", "Légal": "text-emerald-400",
};

export default function ChecklistPage() {
  const [items, setItems] = useState<CheckItem[]>(INITIAL_CHECKLIST);

  const toggle = (id: string) => setItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const done = items.filter(i => i.done).length;
  const total = items.length;
  const criticalDone = items.filter(i => i.critical && i.done).length;
  const criticalTotal = items.filter(i => i.critical).length;
  const pct = Math.round((done / total) * 100);
  const ready = criticalDone === criticalTotal;
  const categories = [...new Set(items.map(i => i.category))];

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Contrôle Qualité</h1>
        <p className="text-white/50">Checklist complète avant publication — ne laisse rien au hasard</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 col-span-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60 text-sm">Progression</span>
            <span className="text-white font-bold text-2xl">{pct}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all duration-500 ${pct >= 80 ? "bg-gradient-to-r from-emerald-500 to-green-400" : pct >= 50 ? "bg-gradient-to-r from-orange-500 to-yellow-400" : "bg-gradient-to-r from-red-500 to-orange-400"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-white/40">
            <span>{done}/{total} points validés</span>
            <span>{criticalDone}/{criticalTotal} points critiques</span>
          </div>
        </div>

        <div className={`bg-white/[0.04] border rounded-2xl p-5 flex flex-col items-center justify-center text-center ${ready ? "border-emerald-500/30" : "border-orange-500/30"}`}>
          {ready ? (
            <><CheckCircle size={28} className="text-emerald-400 mb-2" /><p className="text-emerald-300 font-semibold text-sm">Prêt à publier !</p></>
          ) : (
            <><AlertCircle size={28} className="text-orange-400 mb-2" /><p className="text-orange-300 font-semibold text-sm">{criticalTotal - criticalDone} points critiques</p></>
          )}
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={() => setItems(prev => prev.map(i => ({ ...i, done: true })))} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm hover:bg-emerald-500/30 transition-colors">
          <CheckCircle size={14} /> Tout cocher
        </button>
        <button onClick={() => setItems(INITIAL_CHECKLIST)} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm hover:bg-white/10 transition-colors">
          Réinitialiser
        </button>
        {ready && (
          <a href="/publish" className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium ml-auto">
            <Sparkles size={14} /> Publier maintenant <ChevronRight size={14} />
          </a>
        )}
      </div>

      <div className="space-y-5">
        {categories.map(cat => (
          <div key={cat} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${CATEGORY_COLORS[cat]}`}>
              <CheckSquare size={16} />
              {cat}
              <span className="text-white/30 text-sm font-normal ml-1">({items.filter(i => i.category === cat && i.done).length}/{items.filter(i => i.category === cat).length})</span>
            </h3>
            <div className="space-y-2">
              {items.filter(i => i.category === cat).map(item => (
                <button key={item.id} onClick={() => toggle(item.id)} className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${item.done ? "border-emerald-500/20 bg-emerald-500/5 opacity-80" : "border-white/[0.06] hover:border-white/10 hover:bg-white/[0.03]"}`}>
                  <div className="mt-0.5 shrink-0">
                    {item.done ? <CheckCircle size={16} className="text-emerald-400" /> : <Circle size={16} className="text-white/20" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${item.done ? "text-white/50 line-through" : "text-white"}`}>{item.label}</span>
                      {item.critical && !item.done && <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded-full border border-red-500/30">Critique</span>}
                    </div>
                    <p className="text-white/30 text-xs mt-0.5">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
