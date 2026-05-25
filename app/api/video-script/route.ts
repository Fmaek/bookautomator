import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, bookTitle, category, description, chapters, targetAudience } = body;

  const bookContext = `Livre: "${bookTitle}" | Catégorie: ${category || "Non-fiction"}${description ? ` | Brief: ${description}` : ""}${targetAudience ? ` | Audience: ${targetAudience}` : ""}`;
  const firstChapterExcerpt = chapters?.[0]?.content?.substring(0, 400) || "";

  try {
    // ── TEASER (15s) ─────────────────────────────────────────────────────
    if (type === "teaser") {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu crées des scripts de vidéos teaser ultra-percutants pour des livres. Réponds uniquement en JSON valide." },
          { role: "user", content: `Crée un script vidéo teaser de 15 secondes pour ce livre.
${bookContext}
${firstChapterExcerpt ? `Extrait: "${firstChapterExcerpt}"` : ""}

Réponds UNIQUEMENT avec ce JSON:
{
  "hook": "phrase d'accroche choc (max 8 mots, en MAJUSCULES)",
  "slides": [
    { "text": "texte slide 1", "duration": 3, "style": "big" },
    { "text": "texte slide 2", "duration": 3, "style": "normal" },
    { "text": "texte slide 3", "duration": 3, "style": "normal" },
    { "text": "texte slide 4 — appel à l'action", "duration": 3, "style": "cta" },
    { "text": "nom du livre", "duration": 3, "style": "title" }
  ],
  "caption": "légende Instagram/TikTok complète avec hashtags",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}` },
        ],
        temperature: 0.85, max_tokens: 800,
      });
      const raw = completion.choices[0].message.content?.trim() || "{}";
      const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
      const m = clean.match(/\{[\s\S]*\}/);
      return NextResponse.json(JSON.parse(m ? m[0] : "{}"));
    }

    // ── CITATION (12s) ───────────────────────────────────────────────────
    if (type === "citation") {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu extrais et présentes des citations puissantes de livres pour les réseaux sociaux. Réponds uniquement en JSON valide." },
          { role: "user", content: `Crée 3 variantes de vidéo citation pour ce livre.
${bookContext}
${firstChapterExcerpt ? `Contenu disponible: "${firstChapterExcerpt}"` : ""}

Réponds UNIQUEMENT avec ce JSON:
{
  "variants": [
    {
      "quote": "citation forte (1-2 phrases max, percutantes)",
      "author": "${bookTitle}",
      "context": "courte phrase d'intro (ex: 'Sur la résilience:')",
      "caption": "légende post avec hashtags"
    },
    { "quote": "...", "author": "${bookTitle}", "context": "...", "caption": "..." },
    { "quote": "...", "author": "${bookTitle}", "context": "...", "caption": "..." }
  ]
}` },
        ],
        temperature: 0.9, max_tokens: 1000,
      });
      const raw = completion.choices[0].message.content?.trim() || "{}";
      const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
      const m = clean.match(/\{[\s\S]*\}/);
      return NextResponse.json(JSON.parse(m ? m[0] : "{}"));
    }

    // ── BOOKTRAILER (45s) ────────────────────────────────────────────────
    if (type === "booktrailer") {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu crées des scripts de book trailers cinématographiques et émotionnels. Réponds uniquement en JSON valide." },
          { role: "user", content: `Crée un script de book trailer de 45 secondes (style cinéma) pour ce livre.
${bookContext}
${firstChapterExcerpt ? `Extrait: "${firstChapterExcerpt}"` : ""}

Réponds UNIQUEMENT avec ce JSON:
{
  "title": "titre de la vidéo",
  "scenes": [
    { "id": 1, "text": "texte affiché à l'écran", "narration": "texte à lire en voix off (optionnel)", "duration": 5, "style": "intro" },
    { "id": 2, "text": "...", "narration": "...", "duration": 6, "style": "tension" },
    { "id": 3, "text": "...", "narration": "...", "duration": 6, "style": "reveal" },
    { "id": 4, "text": "...", "narration": "...", "duration": 6, "style": "tension" },
    { "id": 5, "text": "...", "narration": "...", "duration": 7, "style": "climax" },
    { "id": 6, "text": "...", "narration": "...", "duration": 8, "style": "cta" },
    { "id": 7, "text": "titre du livre", "narration": "", "duration": 7, "style": "title" }
  ],
  "voiceoverScript": "script complet voix off enchaîné",
  "caption": "description YouTube/TikTok avec hashtags",
  "music_suggestion": "suggestion de style musical (ex: épique orchestral, lo-fi mélancolique...)"
}` },
        ],
        temperature: 0.85, max_tokens: 1500,
      });
      const raw = completion.choices[0].message.content?.trim() || "{}";
      const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
      const m = clean.match(/\{[\s\S]*\}/);
      return NextResponse.json(JSON.parse(m ? m[0] : "{}"));
    }

    // ── PROMO REEL (30s) ─────────────────────────────────────────────────
    if (type === "promo") {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu crées des scripts de vidéos promotionnelles pour livres sur les réseaux sociaux. Réponds uniquement en JSON valide." },
          { role: "user", content: `Crée un script vidéo promo de 30 secondes pour ce livre.
${bookContext}

Réponds UNIQUEMENT avec ce JSON:
{
  "headline": "accroche principale (courte et percutante)",
  "slides": [
    { "text": "PROBLÈME que résout le livre", "subtext": "description courte", "duration": 5, "style": "problem" },
    { "text": "CE QUE TU VAS DÉCOUVRIR", "subtext": "bénéfice 1", "duration": 4, "style": "benefit" },
    { "text": "bénéfice 2", "subtext": "description", "duration": 4, "style": "benefit" },
    { "text": "bénéfice 3", "subtext": "description", "duration": 4, "style": "benefit" },
    { "text": "Pour qui?", "subtext": "description de l'audience cible", "duration": 4, "style": "audience" },
    { "text": "nom du livre", "subtext": "Disponible maintenant · Lien en bio", "duration": 9, "style": "cta" }
  ],
  "caption": "légende complète avec emojis et hashtags"
}` },
        ],
        temperature: 0.85, max_tokens: 1000,
      });
      const raw = completion.choices[0].message.content?.trim() || "{}";
      const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
      const m = clean.match(/\{[\s\S]*\}/);
      return NextResponse.json(JSON.parse(m ? m[0] : "{}"));
    }

    // ── SHORTS/REEL SCRIPT (60s) ─────────────────────────────────────────
    if (type === "shorts") {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu crées des scripts pour YouTube Shorts / TikTok / Reels de 60 secondes sur des livres. Style hook-story-cta. Réponds uniquement en JSON valide." },
          { role: "user", content: `Crée un script parlé de 60 secondes (style créateur de contenu) pour présenter ce livre.
${bookContext}
${firstChapterExcerpt ? `Extrait: "${firstChapterExcerpt}"` : ""}

Réponds UNIQUEMENT avec ce JSON:
{
  "hook": "première phrase choc pour accrocher en 3 secondes",
  "script": "script complet à lire (~150 mots, 60 secondes de parole naturelle)",
  "segments": [
    { "label": "Hook (0-3s)", "text": "..." },
    { "label": "Problème (3-15s)", "text": "..." },
    { "label": "Solution / livre (15-40s)", "text": "..." },
    { "label": "Preuve / résultat (40-52s)", "text": "..." },
    { "label": "CTA (52-60s)", "text": "..." }
  ],
  "onscreenText": ["texte 1 à afficher à l'écran", "texte 2", "texte 3"],
  "caption": "caption TikTok/Shorts avec hashtags tendance"
}` },
        ],
        temperature: 0.88, max_tokens: 1200,
      });
      const raw = completion.choices[0].message.content?.trim() || "{}";
      const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
      const m = clean.match(/\{[\s\S]*\}/);
      return NextResponse.json(JSON.parse(m ? m[0] : "{}"));
    }

    return NextResponse.json({ _error: "Unknown type" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ _error: "Generation failed" }, { status: 500 });
  }
}
