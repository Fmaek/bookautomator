import { NextRequest, NextResponse } from "next/server";

// ── Augmenter le timeout Vercel (60s max sur Hobby, 300s sur Pro) ─────────────
export const maxDuration = 60;

// ── HuggingFace Router (nouveau domaine, remplace api-inference.huggingface.co) ─
const HF_ROUTER = "https://router.huggingface.co/v1/chat/completions";

// Cascade : 72B préféré → 7B fallback
const MODELS = [
  "Qwen/Qwen2.5-72B-Instruct",
  "Qwen/Qwen2.5-7B-Instruct",
];

async function callQwen(
  hfToken: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  maxTokens = 1800,
  temperature = 0.90
): Promise<string> {
  let lastError = "";
  for (const model of MODELS) {
    const url = HF_ROUTER;
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 55_000); // sous le maxDuration
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, stream: false }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.status === 503 || res.status === 429) {
          const wait = parseInt(res.headers.get("retry-after") || "10", 10) * 1000;
          await new Promise(r => setTimeout(r, Math.min(wait, 12_000)));
          continue;
        }
        if (!res.ok) {
          const err = await res.text();
          lastError = `HF ${res.status}: ${err.substring(0, 200)}`;
          break; // modèle suivant
        }
        const data = await res.json() as { choices: { message: { content: string } }[] };
        return data.choices[0]?.message?.content ?? "";
      } catch (e) {
        clearTimeout(timer);
        const cause = (e as { cause?: unknown })?.cause;
        lastError = cause ? `${String(e)} — cause: ${String(cause)}` : String(e);
        console.error(`[callQwen] ${model} attempt ${attempt}:`, lastError);
        if (attempt === 0) await new Promise(r => setTimeout(r, 1_500));
      }
    }
  }
  throw new Error(`Indisponible — ${lastError}`);
}

// ── Extraction JSON robuste ────────────────────────────────────────────────────
function extractJson(raw: string): string {
  // Retire les blocs markdown
  let clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  // Essaie tableau d'abord, puis objet
  const arr = clean.match(/\[[\s\S]*\]/);
  if (arr) { try { JSON.parse(arr[0]); return arr[0]; } catch { /* continue */ } }
  const obj = clean.match(/\{[\s\S]*\}/);
  if (obj) { try { JSON.parse(obj[0]); return obj[0]; } catch {
    // Tente réparations courantes : virgules traînantes, clés non quotées
    const fixed = obj[0]
      .replace(/,\s*([}\]])/g, "$1")       // virgule trailing
      .replace(/(['"])?(\w+)(['"])?\s*:/g, '"$2":'); // clés en string
    try { JSON.parse(fixed); return fixed; } catch { /* abandon */ }
  }}
  return "{}";
}

async function parseJson(raw: string): Promise<Record<string, unknown>> {
  try { return JSON.parse(extractJson(raw)); }
  catch { return {}; }
}

// ── Contexte livre ────────────────────────────────────────────────────────────
function buildBookContext(b: {
  bookTitle: string; category?: string; description?: string;
  targetAudience?: string; chapters?: { title: string; content?: string }[];
  themes?: string; price?: number;
}) {
  const excerpts = (b.chapters || [])
    .slice(0, 3)
    .map((c, i) => `Chapitre ${i + 1} "${c.title}": ${(c.content || "").substring(0, 250)}`)
    .filter(Boolean).join("\n");
  const chapterTitles = (b.chapters || []).slice(0, 6).map(c => `"${c.title}"`).join(", ");
  return `
LIVRE: "${b.bookTitle}"
CATÉGORIE: ${b.category || "Non-fiction"}
${b.description ? `RÉSUMÉ: ${b.description.substring(0, 400)}` : ""}
${b.targetAudience ? `AUDIENCE: ${b.targetAudience}` : ""}
${b.themes ? `THÈMES: ${b.themes}` : ""}
${chapterTitles ? `CHAPITRES: ${chapterTitles}` : ""}
${excerpts ? `EXTRAITS:\n${excerpts}` : ""}`.trim();
}

const EMOTIONAL_TRIGGERS: Record<string, string> = {
  "développement personnel": "désir de croissance, peur de stagner, aspiration au meilleur soi",
  "self-help":               "désir de croissance, peur de stagner, aspiration au meilleur soi",
  "business":                "peur de l'échec financier, désir de liberté, ambition de réussite",
  "finance":                 "peur de manquer d'argent, désir de richesse, sécurité future",
  "romance":                 "désir d'amour, peur de la solitude, nostalgie, évasion",
  "thriller":                "suspense, curiosité morbide, adrénaline, besoin de résolution",
  "fantasy":                 "évasion, émerveillement, héroïsme, monde alternatif",
  "sci-fi":                  "curiosité intellectuelle, futur, survie, identité humaine",
  "spiritualité":            "sens de la vie, paix intérieure, connexion, transformation",
  "santé":                   "peur de la maladie, désir de vitalité, longévité",
  "policier":                "suspense, justice, mystère, tension narrative",
  "cuisine":                 "plaisir sensoriel, créativité, partage, fierté culinaire",
  "jeunesse":                "aventure, identité, amitié, découverte de soi",
};
function getTriggers(category: string) {
  const cat = category?.toLowerCase() || "";
  return Object.entries(EMOTIONAL_TRIGGERS).find(([k]) => cat.includes(k))?.[1]
    || "curiosité, désir de changement, aspiration à mieux";
}

// ── TEASER (15s) ──────────────────────────────────────────────────────────────
async function generateTeaser(hf: string, ctx: string, triggers: string) {
  const raw = await callQwen(hf, [
    {
      role: "system",
      content: `Tu es un expert copywriter et créateur de contenus viraux (TikTok, Reels, Shorts).
Tu maîtrises : Pattern Interrupt, PAS (Problème-Agitation-Solution), AIDA, hooks viraux.
Objectif : teaser vidéo 15s qui stoppe le scroll en < 2 secondes.
Règles : hook = choc cognitif ou promesse impossible à ignorer. Style "big" = MAJUSCULES 3-6 mots max. CTA = urgence irrésistible.
RÉPONDS UNIQUEMENT EN JSON VALIDE, AUCUN AUTRE TEXTE.`
    },
    {
      role: "user",
      content: `${ctx}\nDÉCLENCHEURS: ${triggers}\n\nJSON EXACT:\n{\n  "hooks": ["HOOK 1 pattern interrupt", "HOOK 2 question douleur", "HOOK 3 stat ou promesse"],\n  "slides": [\n    {"text": "HOOK PRINCIPAL", "duration": 2, "style": "big"},\n    {"text": "problème ressenti par l'audience", "duration": 2.5, "style": "normal"},\n    {"text": "CE QUE CE LIVRE CHANGE", "duration": 2.5, "style": "big"},\n    {"text": "résultat concret promis", "duration": 2.5, "style": "normal"},\n    {"text": "LIEN EN BIO — DISPONIBLE MAINTENANT", "duration": 3, "style": "cta"}\n  ],\n  "captions": {\n    "instagram": "caption Instagram 200-300 mots + 15 hashtags",\n    "tiktok": "caption TikTok 50-80 mots + 6 hashtags viraux",\n    "youtube": "description YouTube Shorts 80-120 mots + mots-clés SEO"\n  }\n}`
    }
  ], 1600, 0.92);
  return parseJson(raw);
}

// ── CITATION (12s) ────────────────────────────────────────────────────────────
async function generateCitation(hf: string, ctx: string, triggers: string) {
  const raw = await callQwen(hf, [
    {
      role: "system",
      content: `Tu es expert en extraction et mise en valeur de citations pour les réseaux sociaux.
3 styles : Philosophique (fait réfléchir), Émotionnel (touche le cœur), Provocateur (dérange et intrigue).
Citation = autonome (compréhensible sans contexte), courte (max 2 phrases), mémorable.
RÉPONDS UNIQUEMENT EN JSON VALIDE.`
    },
    {
      role: "user",
      content: `${ctx}\nDÉCLENCHEURS: ${triggers}\n\nJSON EXACT:\n{\n  "variants": [\n    {\n      "style_name": "Philosophique",\n      "intro": "courte phrase d'intro créant la curiosité",\n      "quote": "citation principale forte et autonome (1-2 phrases percutantes)",\n      "punchline": "phrase conclusive qui claque",\n      "caption_instagram": "caption Instagram + hashtags",\n      "caption_tiktok": "caption TikTok court + hashtags viraux"\n    },\n    {"style_name": "Émotionnel", "intro": "...", "quote": "...", "punchline": "...", "caption_instagram": "...", "caption_tiktok": "..."},\n    {"style_name": "Provocateur", "intro": "...", "quote": "...", "punchline": "...", "caption_instagram": "...", "caption_tiktok": "..."}\n  ]\n}`
    }
  ], 1600, 0.93);
  return parseJson(raw);
}

// ── PROMO REEL (30s) ──────────────────────────────────────────────────────────
async function generatePromo(hf: string, ctx: string, triggers: string) {
  const raw = await callQwen(hf, [
    {
      role: "system",
      content: `Tu es directeur créatif spécialisé en vidéos promotionnelles pour livres et infoproduits.
Tu utilises PAS (Problème → Agitation → Solution) + Before/After/Bridge.
Sois SPÉCIFIQUE (chiffres, résultats concrets), ÉMOTIONNEL (touche la vraie douleur), CRÉDIBLE.
RÉPONDS UNIQUEMENT EN JSON VALIDE.`
    },
    {
      role: "user",
      content: `${ctx}\nDÉCLENCHEURS: ${triggers}\n\nJSON EXACT:\n{\n  "headline": "accroche ultra-percutante",\n  "angle_a": {\n    "name": "Angle Problème",\n    "slides": [\n      {"text": "LE PROBLÈME", "subtext": "douleur spécifique", "duration": 4, "style": "big"},\n      {"text": "Et si ce n'était pas ta faute?", "subtext": "réencadrage", "duration": 4, "style": "normal"},\n      {"text": "CE LIVRE EXPLIQUE POURQUOI", "subtext": "promesse", "duration": 4, "style": "big"},\n      {"text": "Bénéfice 1 concret", "subtext": "résultat mesurable", "duration": 4, "style": "normal"},\n      {"text": "Bénéfice 2 concret", "subtext": "résultat mesurable", "duration": 4, "style": "normal"},\n      {"text": "REJOINS LES LECTEURS QUI ONT CHANGÉ", "subtext": "Lien en bio", "duration": 10, "style": "cta"}\n    ]\n  },\n  "angle_b": {\n    "name": "Angle Transformation",\n    "slides": [\n      {"text": "AVANT CE LIVRE", "subtext": "situation de départ douloureuse", "duration": 4, "style": "big"},\n      {"text": "APRÈS…", "subtext": "transformation désirable", "duration": 4, "style": "big"},\n      {"text": "Ce que tu vas apprendre", "subtext": "bénéfice principal", "duration": 4, "style": "normal"},\n      {"text": "Ce que tu vas ressentir", "subtext": "état cible", "duration": 4, "style": "normal"},\n      {"text": "Ce que ça va changer", "subtext": "impact concret", "duration": 4, "style": "normal"},\n      {"text": "COMMENCE AUJOURD'HUI", "subtext": "Lien en bio", "duration": 10, "style": "cta"}\n    ]\n  },\n  "captions": {"instagram": "...", "tiktok": "...", "youtube": "..."}\n}`
    }
  ], 1800, 0.88);
  return parseJson(raw);
}

// ── BOOK TRAILER (45s) ───────────────────────────────────────────────────────
async function generateBooktrailer(hf: string, ctx: string, triggers: string) {
  const raw = await callQwen(hf, [
    {
      role: "system",
      content: `Tu es scénariste de bandes-annonces cinéma et book trailers style Netflix.
Structure : Monde ordinaire → Déséquilibre → Quête → Tension → Climax → Appel à l'action.
Texte à l'écran : court et percutant. Narration off : riche et évocatrice.
Crée des métaphores visuelles fortes. Ellipses pour le suspense.
RÉPONDS UNIQUEMENT EN JSON VALIDE.`
    },
    {
      role: "user",
      content: `${ctx}\nDÉCLENCHEURS: ${triggers}\n\nJSON EXACT:\n{\n  "title": "titre accrocheur",\n  "logline": "description 1 phrase style synopsis film",\n  "scenes": [\n    {"id": 1, "text": "texte écran court", "narration": "voix off évocatrice", "duration": 5, "style": "intro", "visual_cue": "suggestion visuelle Wan2.1"},\n    {"id": 2, "text": "...", "narration": "...", "duration": 6, "style": "tension", "visual_cue": "..."},\n    {"id": 3, "text": "...", "narration": "...", "duration": 6, "style": "reveal", "visual_cue": "..."},\n    {"id": 4, "text": "...", "narration": "...", "duration": 6, "style": "tension", "visual_cue": "..."},\n    {"id": 5, "text": "...", "narration": "...", "duration": 7, "style": "climax", "visual_cue": "..."},\n    {"id": 6, "text": "titre exact du livre", "narration": "disponible maintenant", "duration": 8, "style": "title", "visual_cue": "fade to black"}\n  ],\n  "full_narration": "script voix off complet (60-80 mots, style cinéma)",\n  "music_vibe": "style musical idéal",\n  "captions": {"instagram": "...", "tiktok": "...", "youtube": "..."}\n}`
    }
  ], 2000, 0.90);
  return parseJson(raw);
}

// ── SHORTS / REEL (60s) ──────────────────────────────────────────────────────
async function generateShorts(hf: string, ctx: string, triggers: string) {
  const raw = await callQwen(hf, [
    {
      role: "system",
      content: `Tu es créateur viral avec 5M+ abonnés TikTok/YouTube Shorts.
Formules qui explosent les vues : "POV: tu viens de réaliser que...", "La raison pour laquelle 97% échouent à...", "Personne ne te dit la vérité sur...", "J'ai lu 500 livres. Celui-là a tout changé."
Script : naturel, comme quelqu'un qui parle à son téléphone. Texte écran : max 6 mots.
RÉPONDS UNIQUEMENT EN JSON VALIDE.`
    },
    {
      role: "user",
      content: `${ctx}\nDÉCLENCHEURS: ${triggers}\n\nJSON EXACT:\n{\n  "hooks": [\n    "HOOK VIRAL 1 — style POV ou personne ne te dit que...",\n    "HOOK VIRAL 2 — stat choc ou promesse folle",\n    "HOOK VIRAL 3 — confession personnelle ou révélation"\n  ],\n  "script": "script complet parlé à voix haute (150-170 mots, ton décontracté et direct)",\n  "segments": [\n    {"label": "Hook (0-3s)", "text": "phrase d'ouverture choc", "onscreen": "TEXTE COURT"},\n    {"label": "Problème (3-12s)", "text": "douleur de l'audience", "onscreen": "MOTS CLÉS"},\n    {"label": "Agitation (12-22s)", "text": "pourquoi c'est grave", "onscreen": "IMPACT"},\n    {"label": "Solution (22-40s)", "text": "ce que le livre apporte", "onscreen": "CE QUE TU APPRENDS"},\n    {"label": "Preuve (40-52s)", "text": "résultat ou citation", "onscreen": "RÉSULTAT"},\n    {"label": "CTA (52-60s)", "text": "appel à l'action urgent", "onscreen": "LIEN EN BIO 👇"}\n  ],\n  "onscreenText": ["TEXTE 1 (6 mots max)", "TEXTE 2", "TEXTE 3", "TEXTE 4", "TEXTE 5"],\n  "captions": {"instagram": "...", "tiktok": "...", "youtube": "..."}\n}`
    }
  ], 2200, 0.93);
  return parseJson(raw);
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const hfToken = process.env.HF_TOKEN || "";

  const body = await req.json() as {
    type: string; bookTitle: string; category?: string; description?: string;
    targetAudience?: string; themes?: string; price?: number;
    chapters?: { title: string; content?: string }[];
  };

  const ctx = buildBookContext(body);
  const triggers = getTriggers(body.category || "");

  try {
    switch (body.type) {
      case "teaser":      return NextResponse.json(await generateTeaser(hfToken, ctx, triggers));
      case "citation":    return NextResponse.json(await generateCitation(hfToken, ctx, triggers));
      case "promo":       return NextResponse.json(await generatePromo(hfToken, ctx, triggers));
      case "booktrailer": return NextResponse.json(await generateBooktrailer(hfToken, ctx, triggers));
      case "shorts":      return NextResponse.json(await generateShorts(hfToken, ctx, triggers));
      default:            return NextResponse.json({ error: "Type inconnu" }, { status: 400 });
    }
  } catch (e) {
    console.error("[video-script/qwen]", e);
    const msg = String(e);
    return NextResponse.json({
      error: "Génération Qwen échouée",
      detail: msg.includes("401") ? "Token HuggingFace invalide ou expiré" :
              msg.includes("429") ? "Limite de taux HuggingFace atteinte — réessaie dans 1 minute" :
              msg.includes("503") ? "Modèle en cours de chargement — réessaie dans 30 secondes" :
              msg
    }, { status: 500 });
  }
}
