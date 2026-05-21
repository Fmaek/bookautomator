"use client";
import { useState, useEffect } from "react";
import {
  CheckSquare, CheckCircle, Circle, AlertCircle, ChevronRight, Sparkles,
  Loader2, BookOpen, ShieldCheck, XCircle, Wrench, BarChart3, ArrowRight, ChevronDown, ChevronUp
} from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

interface CheckItem { id: string; category: string; label: string; desc: string; done: boolean; critical: boolean }

interface AiResult { id: string; pass: boolean; note: string; fix?: string }

interface GenreElement {
  name: string;
  importance: "obligatoire" | "recommandé";
  present: boolean;
  note: string;
  fix: string | null;
}
interface GenreResult {
  genre: string;
  score: number;
  verdict: string;
  elements: GenreElement[];
}

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
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState<CheckItem[]>(INITIAL_CHECKLIST);
  const [aiResults, setAiResults] = useState<AiResult[]>([]);
  const [genreResult, setGenreResult] = useState<GenreResult | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [loadingGenre, setLoadingGenre] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [expandedFixes, setExpandedFixes] = useState<Set<string>>(new Set());
  const [expandedGenreItems, setExpandedGenreItems] = useState<Set<number>>(new Set());

  useEffect(() => { setBooks(getBooks()); }, []);

  const book = books.find(b => b.id === selectedId);

  const getBookContent = (b: Book) =>
    b.chapters.map(c => `${c.title}\n\n${c.content}`).join("\n\n---\n\n");

  const runChecklistAi = async () => {
    if (!book) return;
    setLoadingChecklist(true);
    setAiMode(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checklist_auto",
          bookTitle: book.title,
          category: book.category,
          chaptersContent: getBookContent(book),
          items: INITIAL_CHECKLIST.map(i => ({ id: i.id, label: i.label, desc: i.desc })),
        }),
      });
      const data = await res.json();
      if (data.results) setAiResults(data.results);
    } catch { }
    setLoadingChecklist(false);
  };

  const runGenreCheck = async () => {
    if (!book) return;
    setLoadingGenre(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "genre_check",
          bookTitle: book.title,
          category: book.category,
          chaptersContent: getBookContent(book),
        }),
      });
      const data = await res.json();
      if (data.elements) setGenreResult(data);
    } catch { }
    setLoadingGenre(false);
  };

  const toggle = (id: string) => setItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const toggleFix = (id: string) => setExpandedFixes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleGenreItem = (i: number) => setExpandedGenreItems(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const getAiResult = (id: string) => aiResults.find(r => r.id === id);

  const effectiveDone = aiMode
    ? aiResults.filter(r => r.pass).length
    : items.filter(i => i.done).length;
  const total = items.length;
  const aiAnalyzed = aiResults.length > 0;
  const criticalFailed = aiMode && aiAnalyzed
    ? items.filter(i => i.critical).filter(i => { const r = getAiResult(i.id); return r ? !r.pass : false; }).length
    : items.filter(i => i.critical && !i.done).length;
  const pct = total > 0 ? Math.round((effectiveDone / total) * 100) : 0;
  const criticalTotal = items.filter(i => i.critical).length;
  const ready = criticalFailed === 0 && effectiveDone > 0;
  const categories = [...new Set(items.map(i => i.category))];

  const failedItems = aiMode && aiAnalyzed
    ? items.filter(i => { const r = getAiResult(i.id); return r ? !r.pass : false; })
    : [];

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Contrôle Qualité</h1>
        <p className="text-white/50">Analyse IA automatique + checklist complète avant publication</p>
      </div>

      {/* Book selector + AI buttons */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-48">
            <label className="text-white/60 text-xs mb-1.5 block">Livre à analyser</label>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setAiResults([]); setGenreResult(null); setAiMode(false); }}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none">
              <option value="">Choisir un livre...</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>

          {book && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={runChecklistAi} disabled={loadingChecklist}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all">
                {loadingChecklist ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {loadingChecklist ? "Analyse en cours..." : "Analyser la checklist IA"}
              </button>
              <button onClick={runGenreCheck} disabled={loadingGenre}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50 text-blue-300 rounded-xl text-sm transition-colors">
                {loadingGenre ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
                {loadingGenre ? "Vérification..." : "Vérifier conformité genre"}
              </button>
            </div>
          )}

          {!book && (
            <p className="text-white/30 text-xs italic">Sélectionne un livre pour activer l'analyse IA</p>
          )}
        </div>

        {book && (
          <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <p className="text-purple-300 text-xs font-medium">{book.title}</p>
            <p className="text-white/40 text-xs">{book.category} · {book.pages} pages · {book.chapters.length} chapitres · {book.authorName}</p>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 col-span-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60 text-sm">{aiMode && aiAnalyzed ? "Score IA" : "Progression manuelle"}</span>
            <span className="text-white font-bold text-2xl">{pct}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all duration-500 ${pct >= 80 ? "bg-gradient-to-r from-emerald-500 to-green-400" : pct >= 50 ? "bg-gradient-to-r from-orange-500 to-yellow-400" : "bg-gradient-to-r from-red-500 to-orange-400"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-white/40">
            <span>{effectiveDone}/{total} points validés</span>
            <span>{criticalFailed > 0 ? `${criticalFailed} point${criticalFailed > 1 ? "s" : ""} critique${criticalFailed > 1 ? "s" : ""} en échec` : `${criticalTotal} points critiques OK`}</span>
          </div>
        </div>

        <div className={`bg-white/[0.04] border rounded-2xl p-5 flex flex-col items-center justify-center text-center ${ready ? "border-emerald-500/30" : "border-orange-500/30"}`}>
          {ready ? (
            <><CheckCircle size={28} className="text-emerald-400 mb-2" /><p className="text-emerald-300 font-semibold text-sm">Prêt à publier !</p></>
          ) : (
            <><AlertCircle size={28} className="text-orange-400 mb-2" /><p className="text-orange-300 font-semibold text-sm">{criticalFailed > 0 ? `${criticalFailed} critique${criticalFailed > 1 ? "s" : ""} manquant${criticalFailed > 1 ? "s" : ""}` : "Points à compléter"}</p></>
          )}
        </div>
      </div>

      {/* Manual toggle controls (when no AI) */}
      {!aiMode && (
        <div className="flex gap-3 mb-6">
          <button onClick={() => setItems(prev => prev.map(i => ({ ...i, done: true })))}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm hover:bg-emerald-500/30 transition-colors">
            <CheckCircle size={14} /> Tout cocher
          </button>
          <button onClick={() => setItems(INITIAL_CHECKLIST)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm hover:bg-white/10 transition-colors">
            Réinitialiser
          </button>
          {ready && (
            <a href="/publish" className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium ml-auto">
              <Sparkles size={14} /> Publier maintenant <ChevronRight size={14} />
            </a>
          )}
        </div>
      )}

      {/* AI mode toggle hint */}
      {aiMode && aiAnalyzed && (
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/15 border border-purple-500/25 rounded-xl text-xs text-purple-300">
            <Sparkles size={11} /> Résultats IA — clique sur un point pour le basculer manuellement
          </div>
          <button onClick={() => { setAiMode(false); setAiResults([]); }}
            className="text-white/30 hover:text-white text-xs transition-colors">
            Revenir en mode manuel
          </button>
        </div>
      )}

      {/* Checklist by category */}
      <div className="space-y-5 mb-8">
        {categories.map(cat => (
          <div key={cat} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5">
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${CATEGORY_COLORS[cat]}`}>
              <CheckSquare size={16} />
              {cat}
              <span className="text-white/30 text-sm font-normal ml-1">
                ({items.filter(i => i.category === cat && (aiMode && aiAnalyzed ? (getAiResult(i.id)?.pass ?? i.done) : i.done)).length}/{items.filter(i => i.category === cat).length})
              </span>
            </h3>
            <div className="space-y-2">
              {items.filter(i => i.category === cat).map(item => {
                const aiR = getAiResult(item.id);
                const isDone = aiMode && aiAnalyzed ? (aiR?.pass ?? item.done) : item.done;
                const isFail = aiMode && aiAnalyzed && aiR && !aiR.pass;
                const showFix = expandedFixes.has(item.id);

                return (
                  <div key={item.id} className={`rounded-xl border text-left transition-all ${isDone ? "border-emerald-500/20 bg-emerald-500/5" : isFail ? "border-red-500/20 bg-red-500/5" : "border-white/[0.06]"}`}>
                    <button onClick={() => toggle(item.id)} className="w-full flex items-start gap-3 p-3 text-left">
                      <div className="mt-0.5 shrink-0">
                        {isDone ? <CheckCircle size={16} className="text-emerald-400" /> : isFail ? <XCircle size={16} className="text-red-400" /> : <Circle size={16} className="text-white/20" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${isDone ? "text-white/50 line-through" : isFail ? "text-red-300" : "text-white"}`}>
                            {item.label}
                          </span>
                          {item.critical && !isDone && <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded-full border border-red-500/30">Critique</span>}
                          {aiMode && aiAnalyzed && aiR && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full border ${aiR.pass ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" : "bg-red-500/15 text-red-300 border-red-500/25"}`}>
                              {aiR.pass ? "✓ IA: OK" : "✗ IA: Échec"}
                            </span>
                          )}
                        </div>
                        {aiMode && aiAnalyzed && aiR ? (
                          <p className={`text-xs mt-0.5 ${aiR.pass ? "text-white/40" : "text-red-300/70"}`}>{aiR.note}</p>
                        ) : (
                          <p className="text-white/30 text-xs mt-0.5">{item.desc}</p>
                        )}
                      </div>
                      {isFail && aiR?.fix && (
                        <button onClick={e => { e.stopPropagation(); toggleFix(item.id); }}
                          className="shrink-0 flex items-center gap-1 text-xs text-amber-400/70 hover:text-amber-300 transition-colors px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <Wrench size={11} /> {showFix ? "Masquer" : "Comment corriger"}
                          {showFix ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                      )}
                    </button>
                    {isFail && aiR?.fix && showFix && (
                      <div className="px-3 pb-3 ml-7">
                        <div className="p-3 bg-amber-500/8 border border-amber-500/15 rounded-lg">
                          <p className="text-amber-200/80 text-xs leading-relaxed"><ArrowRight size={10} className="inline mr-1 text-amber-400" />{aiR.fix}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Action Plan (AI failures only) */}
      {aiMode && aiAnalyzed && failedItems.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-6 mb-8">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-400" />
            Plan d'action — {failedItems.length} point{failedItems.length > 1 ? "s" : ""} à corriger
          </h2>
          <div className="space-y-3">
            {[...failedItems].sort((a, b) => (b.critical ? 1 : 0) - (a.critical ? 1 : 0)).map(item => {
              const aiR = getAiResult(item.id);
              return (
                <div key={item.id} className="flex gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                  <div className="shrink-0 mt-0.5">
                    {item.critical ? <AlertCircle size={15} className="text-red-400" /> : <Circle size={15} className="text-orange-400" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium">{item.label}</span>
                      {item.critical && <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded-full border border-red-500/30">Critique</span>}
                      <span className="text-white/30 text-xs">{CATEGORY_COLORS[item.category] ? item.category : ""}</span>
                    </div>
                    {aiR?.note && <p className="text-red-300/70 text-xs mb-1">{aiR.note}</p>}
                    {aiR?.fix && (
                      <p className="text-amber-200/70 text-xs"><ArrowRight size={10} className="inline mr-1 text-amber-400" />{aiR.fix}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Genre Compliance Panel */}
      {genreResult && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <BookOpen size={18} className="text-blue-400" />
              Conformité Genre — {genreResult.genre}
            </h2>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{genreResult.score}<span className="text-white/40 text-base">/100</span></div>
              </div>
              <div className="relative w-14 h-14">
                <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke={genreResult.score >= 75 ? "#10b981" : genreResult.score >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="3" strokeDasharray={`${genreResult.score} 100`} strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          <div className={`p-3 rounded-xl mb-5 text-sm border ${genreResult.score >= 75 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : genreResult.score >= 50 ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
            {genreResult.verdict}
          </div>

          {/* Score bar */}
          <div className="w-full bg-white/5 rounded-full h-2 mb-5">
            <div className={`h-2 rounded-full transition-all duration-700 ${genreResult.score >= 75 ? "bg-gradient-to-r from-emerald-500 to-green-400" : genreResult.score >= 50 ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-red-500 to-orange-400"}`}
              style={{ width: `${genreResult.score}%` }} />
          </div>

          {/* Elements grid */}
          <div className="space-y-2">
            {genreResult.elements.map((el, i) => (
              <div key={i} className={`rounded-xl border transition-all ${el.present ? "border-emerald-500/15 bg-emerald-500/5" : el.importance === "obligatoire" ? "border-red-500/20 bg-red-500/5" : "border-orange-500/15 bg-orange-500/5"}`}>
                <button onClick={() => toggleGenreItem(i)} className="w-full flex items-center gap-3 p-3 text-left">
                  <div className="shrink-0">
                    {el.present ? <CheckCircle size={15} className="text-emerald-400" /> : <XCircle size={15} className={el.importance === "obligatoire" ? "text-red-400" : "text-orange-400"} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${el.present ? "text-white/60" : el.importance === "obligatoire" ? "text-red-300" : "text-orange-300"}`}>
                        {el.name}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${el.importance === "obligatoire" ? "bg-red-500/15 text-red-300 border-red-500/25" : "bg-amber-500/15 text-amber-300 border-amber-500/25"}`}>
                        {el.importance}
                      </span>
                      {el.present && <span className="text-xs text-emerald-400/60">Présent</span>}
                    </div>
                    <p className="text-white/35 text-xs mt-0.5 line-clamp-1">{el.note}</p>
                  </div>
                  {(!el.present && el.fix) && (
                    <div className="shrink-0">
                      {expandedGenreItems.has(i) ? <ChevronUp size={13} className="text-white/30" /> : <ChevronDown size={13} className="text-white/30" />}
                    </div>
                  )}
                </button>
                {expandedGenreItems.has(i) && !el.present && el.fix && (
                  <div className="px-3 pb-3 ml-6">
                    <div className="p-3 bg-amber-500/8 border border-amber-500/15 rounded-lg">
                      <p className="text-xs text-white/50 mb-1 font-medium">Comment corriger :</p>
                      <p className="text-amber-200/80 text-xs leading-relaxed">{el.fix}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Genre failures summary */}
          {genreResult.elements.filter(e => !e.present && e.importance === "obligatoire").length > 0 && (
            <div className="mt-5 p-4 bg-red-500/8 border border-red-500/15 rounded-xl">
              <p className="text-red-300 text-sm font-medium mb-2">
                {genreResult.elements.filter(e => !e.present && e.importance === "obligatoire").length} élément{genreResult.elements.filter(e => !e.present && e.importance === "obligatoire").length > 1 ? "s" : ""} obligatoire{genreResult.elements.filter(e => !e.present && e.importance === "obligatoire").length > 1 ? "s" : ""} manquant{genreResult.elements.filter(e => !e.present && e.importance === "obligatoire").length > 1 ? "s" : ""}
              </p>
              {genreResult.elements.filter(e => !e.present && e.importance === "obligatoire").map((el, i) => (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <ArrowRight size={11} className="shrink-0 mt-1 text-red-400" />
                  <div>
                    <span className="text-red-300/80 text-xs font-medium">{el.name} : </span>
                    <span className="text-red-300/50 text-xs">{el.fix}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Genre loading placeholder */}
      {loadingGenre && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 text-center">
          <Loader2 size={32} className="text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm">Analyse de conformité genre en cours...</p>
          <p className="text-white/25 text-xs mt-1">L'IA vérifie chaque élément attendu pour ce genre</p>
        </div>
      )}
    </div>
  );
}

