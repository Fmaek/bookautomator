import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

// ── Helpers ────────────────────────────────────────────────────────────────────
function extractJson(raw: string): string {
  const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const arr = clean.match(/\[[\s\S]*\]/);
  if (arr) return arr[0];
  const obj = clean.match(/\{[\s\S]*\}/);
  return obj ? obj[0] : "{}";
}

function buildBookContext(b: {
  bookTitle: string; category?: string; description?: string;
  targetAudience?: string; chapters?: { title: string; content?: string }[];
  themes?: string; price?: number;
}) {
  const excerpts = (b.chapters || [])
    .slice(0, 3)
    .map((c, i) => `Chapitre ${i+1} "${c.title}": ${(c.content || "").substring(0, 250)}`)
    .filter(Boolean)
    .join("\n");

  const chapterTitles = (b.chapters || []).slice(0, 6).map(c => `"${c.title}"`).join(", ");

  return `
LIVRE: "${b.bookTitle}"
CATÉGORIE: ${b.category || "Non-fiction"}
${b.description ? `RÉSUMÉ: ${b.description.substring(0, 400)}` : ""}
${b.targetAudience ? `AUDIENCE CIBLE: ${b.targetAudience}` : ""}
${b.themes ? `THÈMES: ${b.themes}` : ""}
${chapterTitles ? `CHAPITRES: ${chapterTitles}` : ""}
${excerpts ? `EXTRAITS:\n${excerpts}` : ""}
`.trim();
}

// ── Déclencheurs émotionnels par catégorie ────────────────────────────────────
const EMOTIONAL_TRIGGERS: Record<string, string> = {
  "développement personnel": "désir de croissance, peur de stagner, aspiration au meilleur soi",
  "self-help":              "désir de croissance, peur de stagner, aspiration au meilleur soi",
  "business":               "peur de l'échec financier, désir de liberté, ambition de réussite",
  "finance":                "peur de manquer d'argent, désir de richesse, sécurité future",
  "romance":                "désir d'amour, peur de la solitude, nostalgie, évasion",
  "thriller":               "suspense, curiosité morbide, adrénaline, besoin de résolution",
  "fantasy":                "évasion, émerveillement, héroïsme, monde alternatif",
  "sci-fi":                 "curiosité intellectuelle, futur, survie, identité humaine",
  "spiritualité":           "sens de la vie, paix intérieure, connexion, transformation",
  "santé":                  "peur de la maladie, désir de vitalité, longévité",
  "histoire":               "curiosité, identité culturelle, leçons du passé, fascinant",
  "policier":               "suspense, justice, mystère, tension narrative",
  "cuisine":                "plaisir sensoriel, créativité, partage, fierté culinaire",
  "jeunesse":               "aventure, identité, amitié, découverte de soi",
};

function getTriggers(category: string): string {
  const cat = category?.toLowerCase() || "";
  return Object.entries(EMOTIONAL_TRIGGERS).find(([k]) => cat.includes(k))?.[1]
    || "curiosité, désir de changement, aspiration à mieux";
}

// ── Captions multi-plateforme ─────────────────────────────────────────────────
function captionBlock(bookTitle: string, category: string) {
  return `
Génère 3 captions distinctes:
- "instagram": caption Instagram (200-300 mots, storytelling, emojis, 15-20 hashtags mélange niche+populaire, appel à commenter)
- "tiktok": caption TikTok (50-80 mots, 5-8 hashtags viraux, ton décontracté GenZ, question ou défi)
- "youtube": description YouTube Shorts (80-120 mots, mots-clés SEO, timestamps si pertinent, CTA clair)
Hashtags à inclure: #${bookTitle.replace(/\s+/g, "")} #livre #booktok #livresfrancais #lecture #${(category||"").replace(/\s+/g, "")}
`.trim();
}

// ── TEASER (15s) ──────────────────────────────────────────────────────────────
async function generateTeaser(ctx: string, triggers: string, captionCtx: string) {
  const r = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.92,
    max_tokens: 1600,
    messages: [
      {
        role: "system",
        content: `Tu es un expert en création de contenus viraux et copywriter de niveau mondial.
Tu maîtrises les formules : Pattern Interrupt, PAS (Problème-Agitation-Solution), AIDA, hooks viraux TikTok.
Objectif : créer un teaser vidéo de 15s qui fait STOPPER le scroll en moins de 2 secondes.
Règles d'or :
- Le hook doit créer un choc cognitif ou une promesse impossible à ignorer
- Chaque slide = 1 seule idée percutante (pas de phrases longues)
- Le style "big" = texte en MAJUSCULES court (3-6 mots max)
- Le CTA final doit créer une urgence ou une curiosité irrésistible
- Génère 3 hooks alternatifs pour A/B tester
RÉPONDS UNIQUEMENT EN JSON VALIDE.`
      },
      {
        role: "user",
        content: `${ctx}

DÉCLENCHEURS ÉMOTIONNELS À EXPLOITER: ${triggers}

Crée un teaser vidéo 15s ultra-percutant avec 3 hooks alternatifs.

JSON EXACT (pas d'autre texte):
{
  "hooks": [
    "HOOK 1 — pattern interrupt choc (ex: 'CE LIVRE M'A SAUVÉ LA VIE')",
    "HOOK 2 — question qui fait mal (ex: 'POURQUOI TU STRESSES ENCORE?')",
    "HOOK 3 — stat ou promesse folle (ex: '12 SEMAINES POUR TOUT CHANGER')"
  ],
  "slides": [
    { "text": "HOOK PRINCIPAL", "duration": 2, "style": "big" },
    { "text": "problème douloureux que ressent l'audience", "duration": 2.5, "style": "normal" },
    { "text": "CE QUE CE LIVRE CHANGE", "duration": 2.5, "style": "big" },
    { "text": "résultat concret et désirable promis", "duration": 2.5, "style": "normal" },
    { "text": "APPEL À L'ACTION URGENT", "duration": 2.5, "style": "cta" },
    { "text": "titre exact du livre", "duration": 3, "style": "title" }
  ],
  "captions": {
    "instagram": "...",
    "tiktok": "...",
    "youtube": "..."
  }
}`
      }
    ]
  });
  return JSON.parse(extractJson(r.choices[0].message.content || "{}"));
}

// ── CITATION (12s) ────────────────────────────────────────────────────────────
async function generateCitation(ctx: string, triggers: string, bookTitle: string) {
  const r = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.93,
    max_tokens: 1600,
    messages: [
      {
        role: "system",
        content: `Tu es un expert en extraction et mise en valeur de citations pour les réseaux sociaux.
Tu sais identifier les phrases qui font RÉFLÉCHIR, qui TOUCHENT au cœur, ou qui PROVOQUENT.
3 styles de citations : philosophique (fait penser), émotionnel (fait ressentir), provocateur (dérange et intrigue).
Règles : la citation doit être autonome (compréhensible sans contexte), courte (max 2 phrases), mémorable.
RÉPONDS UNIQUEMENT EN JSON VALIDE.`
      },
      {
        role: "user",
        content: `${ctx}

DÉCLENCHEURS: ${triggers}

Génère 3 variantes de vidéo citation (12s chacune), chaque variante avec un style différent.

JSON EXACT:
{
  "variants": [
    {
      "style_name": "Philosophique",
      "intro": "courte phrase d'intro créant la curiosité (ex: 'Sur la peur du changement :')",
      "quote": "citation principale forte et autonome (1-2 phrases percutantes, comme si c'était dans le livre)",
      "punchline": "phrase conclusive qui claque (ex: 'Ça fait mal. Mais c'est vrai.')",
      "caption_instagram": "caption Instagram avec contexte émotionnel + hashtags",
      "caption_tiktok": "caption TikTok court + hashtags viraux"
    },
    {
      "style_name": "Émotionnel",
      "intro": "...",
      "quote": "...",
      "punchline": "...",
      "caption_instagram": "...",
      "caption_tiktok": "..."
    },
    {
      "style_name": "Provocateur",
      "intro": "...",
      "quote": "...",
      "punchline": "...",
      "caption_instagram": "...",
      "caption_tiktok": "..."
    }
  ]
}`
      }
    ]
  });
  return JSON.parse(extractJson(r.choices[0].message.content || "{}"));
}

// ── PROMO REEL (30s) ──────────────────────────────────────────────────────────
async function generatePromo(ctx: string, triggers: string, captionCtx: string) {
  const r = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.88,
    max_tokens: 1800,
    messages: [
      {
        role: "system",
        content: `Tu es un directeur créatif spécialisé en vidéos promotionnelles pour livres et infoproduits.
Tu utilises la formule PAS (Problème → Agitation → Solution) combinée au Before/After/Bridge.
Principes : sois SPÉCIFIQUE (chiffres, noms, résultats concrets), ÉMOTIONNEL (touche la douleur réelle), CRÉDIBLE.
Évite les généralités. Chaque slide doit avoir un seul message puissant.
RÉPONDS UNIQUEMENT EN JSON VALIDE.`
      },
      {
        role: "user",
        content: `${ctx}

DÉCLENCHEURS ÉMOTIONNELS: ${triggers}

Crée une vidéo promo 30s (formule PAS + Before/After) avec 2 angles alternatifs.

JSON EXACT:
{
  "headline": "accroche principale ultra-percutante",
  "angle_a": {
    "name": "Angle Problème",
    "slides": [
      { "text": "LE PROBLÈME EN 3 MOTS", "subtext": "douleur spécifique que ressent l'audience", "duration": 4, "style": "big" },
      { "text": "Et si ce n'était pas ta faute?", "subtext": "réencadrage du problème", "duration": 4, "style": "normal" },
      { "text": "CE LIVRE EXPLIQUE POURQUOI", "subtext": "promesse de révélation", "duration": 4, "style": "big" },
      { "text": "Bénéfice 1 concret", "subtext": "résultat mesurable ou transformation", "duration": 4, "style": "normal" },
      { "text": "Bénéfice 2 concret", "subtext": "résultat mesurable ou transformation", "duration": 4, "style": "normal" },
      { "text": "REJOINS LES LECTEURS QUI ONT CHANGÉ", "subtext": "Lien en bio · Disponible maintenant", "duration": 10, "style": "cta" }
    ]
  },
  "angle_b": {
    "name": "Angle Transformation",
    "slides": [
      { "text": "AVANT DE LIRE CE LIVRE", "subtext": "situation de départ douloureuse", "duration": 4, "style": "big" },
      { "text": "APRÈS…", "subtext": "transformation désirable et spécifique", "duration": 4, "style": "big" },
      { "text": "Ce que tu vas apprendre", "subtext": "bénéfice principal", "duration": 4, "style": "normal" },
      { "text": "Ce que tu vas ressentir", "subtext": "émotion ou état cible", "duration": 4, "style": "normal" },
      { "text": "Ce que ça va changer", "subtext": "impact concret dans la vie", "duration": 4, "style": "normal" },
      { "text": "COMMENCE AUJOURD'HUI", "subtext": "Lien en bio · Disponible maintenant", "duration": 10, "style": "cta" }
    ]
  },
  "captions": {
    "instagram": "...",
    "tiktok": "...",
    "youtube": "..."
  }
}`
      }
    ]
  });
  return JSON.parse(extractJson(r.choices[0].message.content || "{}"));
}

// ── BOOK TRAILER (45s) ───────────────────────────────────────────────────────
async function generateBooktrailer(ctx: string, triggers: string, captionCtx: string) {
  const r = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.9,
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content: `Tu es un scénariste de bandes-annonces de films et de book trailers.
Tu connais la structure narrative de Christopher Vogler (Le Voyage du Héros) et les techniques des meilleurs trailers Marvel/Netflix.
Structure : Monde ordinaire → Déséquilibre → Quête/Révélation → Montée en tension → Climax → Appel à l'action.
Ton texte à l'écran est court et percutant. La narration off est plus riche et évocatrice.
Crée des métaphores visuelles fortes. Utilise des ellipses pour créer du suspense.
RÉPONDS UNIQUEMENT EN JSON VALIDE.`
      },
      {
        role: "user",
        content: `${ctx}

DÉCLENCHEURS ÉMOTIONNELS: ${triggers}

Crée un book trailer cinématique 45s de style Netflix/cinéma.

JSON EXACT:
{
  "title": "titre accrocheur pour la vidéo",
  "logline": "description du livre en 1 phrase cinématique (style synopsis film)",
  "scenes": [
    { "id": 1, "text": "texte court à l'écran", "narration": "voix off évocatrice et poétique", "duration": 5, "style": "intro", "visual_cue": "suggestion visuelle Wan2.1 (ex: 'slow zoom sur horizon brumeux')"},
    { "id": 2, "text": "...", "narration": "...", "duration": 6, "style": "tension", "visual_cue": "..."},
    { "id": 3, "text": "...", "narration": "...", "duration": 6, "style": "reveal", "visual_cue": "..."},
    { "id": 4, "text": "...", "narration": "...", "duration": 6, "style": "tension", "visual_cue": "..."},
    { "id": 5, "text": "...", "narration": "...", "duration": 7, "style": "climax", "visual_cue": "..."},
    { "id": 6, "text": "...", "narration": "...", "duration": 8, "style": "big", "visual_cue": "..."},
    { "id": 7, "text": "titre exact du livre", "narration": "disponible maintenant", "duration": 7, "style": "title", "visual_cue": "fade to black lent"}
  ],
  "full_narration": "script voix off complet enchaîné (60-80 mots, style cinéma)",
  "music_vibe": "description du style musical idéal (ex: 'orchestral épique Hans Zimmer, montée progressive')",
  "captions": {
    "instagram": "...",
    "tiktok": "...",
    "youtube": "..."
  }
}`
      }
    ]
  });
  return JSON.parse(extractJson(r.choices[0].message.content || "{}"));
}

// ── SHORTS / REEL (60s) ──────────────────────────────────────────────────────
async function generateShorts(ctx: string, triggers: string, captionCtx: string) {
  const r = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.93,
    max_tokens: 2200,
    messages: [
      {
        role: "system",
        content: `Tu es un créateur de contenu viral avec 5M+ abonnés sur TikTok/YouTube Shorts.
Tu maîtrises les formules qui font exploser les vues :
- "POV: tu viens de réaliser que..."
- "La raison pour laquelle 97% des gens échouent à..."
- "Personne ne te dit la vérité sur..."
- "J'ai lu 500 livres. Celui-là a tout changé."
- "Ce livre m'a appris ce que l'école ne m'a jamais enseigné"
Chaque segment doit accrocher et ne pas laisser partir le spectateur.
Génère 3 hooks viraux différents. Le script doit sonner naturel, comme quelqu'un qui parle à son téléphone.
Texte à l'écran : phrases courtes, maximum 6 mots, pour accompagner la voix.
RÉPONDS UNIQUEMENT EN JSON VALIDE.`
      },
      {
        role: "user",
        content: `${ctx}

DÉCLENCHEURS ÉMOTIONNELS: ${triggers}

Crée un script Shorts/Reel/TikTok de 60s avec 3 hooks viraux alternatifs.

JSON EXACT:
{
  "hooks": [
    "HOOK VIRAL 1 — style POV ou 'personne ne te dit que...'",
    "HOOK VIRAL 2 — style statistique choc ou promesse folle",
    "HOOK VIRAL 3 — style confession personnelle ou révélation"
  ],
  "script": "script complet parlé à voix haute (150-170 mots, ton décontracté et direct, comme si tu parlais à un ami)",
  "segments": [
    { "label": "Hook (0-3s)", "text": "phrase d'ouverture choc", "onscreen": "TEXTE COURT ÉCRAN" },
    { "label": "Problème (3-12s)", "text": "douleur/frustration de l'audience", "onscreen": "MOTS CLÉS" },
    { "label": "Agitation (12-22s)", "text": "pourquoi c'est grave de ne pas régler ça", "onscreen": "IMPACT" },
    { "label": "Solution (22-40s)", "text": "ce que le livre apporte comme réponse", "onscreen": "CE QUE TU VAS APPRENDRE" },
    { "label": "Preuve (40-52s)", "text": "résultat, transformation, ou citation du livre", "onscreen": "RÉSULTAT CONCRET" },
    { "label": "CTA (52-60s)", "text": "appel à l'action direct et urgent", "onscreen": "LIEN EN BIO 👇" }
  ],
  "onscreenText": [
    "TEXTE 1 POUR L'ÉCRAN (6 mots max)",
    "TEXTE 2",
    "TEXTE 3",
    "TEXTE 4",
    "TEXTE 5"
  ],
  "captions": {
    "instagram": "...",
    "tiktok": "...",
    "youtube": "..."
  }
}`
      }
    ]
  });
  return JSON.parse(extractJson(r.choices[0].message.content || "{}"));
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    type: string; bookTitle: string; category?: string; description?: string;
    targetAudience?: string; themes?: string; price?: number;
    chapters?: { title: string; content?: string }[];
  };

  const ctx = buildBookContext(body);
  const triggers = getTriggers(body.category || "");
  const captionCtx = captionBlock(body.bookTitle, body.category || "");

  try {
    switch (body.type) {
      case "teaser":      return NextResponse.json(await generateTeaser(ctx, triggers, captionCtx));
      case "citation":    return NextResponse.json(await generateCitation(ctx, triggers, body.bookTitle));
      case "promo":       return NextResponse.json(await generatePromo(ctx, triggers, captionCtx));
      case "booktrailer": return NextResponse.json(await generateBooktrailer(ctx, triggers, captionCtx));
      case "shorts":      return NextResponse.json(await generateShorts(ctx, triggers, captionCtx));
      default:            return NextResponse.json({ error: "Type inconnu" }, { status: 400 });
    }
  } catch (e) {
    console.error("[video-script]", e);
    return NextResponse.json({ error: "Génération échouée", detail: String(e) }, { status: 500 });
  }
}
