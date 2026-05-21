import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_AUTHOR = `Tu es un auteur professionnel francophone reconnu. Ton style est:
- Captivant dès la première phrase
- Phrases rythmées, vocabulaire riche mais accessible
- Exemples concrets, anecdotes vivantes, métaphores parlantes
- Structure claire: accroches puissantes, développements structurés, conclusions mémorables
- Aucun remplissage, chaque mot doit avoir sa raison d'être
Toujours en français impeccable.`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  try {
    if (action === "plan") {
      const { title, category, description } = body;
      const isPoem = category?.includes("Poési");
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un expert en création de livres à succès. Réponds uniquement en JSON valide, sans markdown." },
          { role: "user", content: isPoem
            ? `Crée un recueil de 10-12 poèmes pour ce livre en français.
Titre: "${title}"
Brief: ${description || "Recueil poétique émouvant"}

Réponds UNIQUEMENT avec ce JSON (sans markdown):
{"chapters": ["Titre poème 1", "Titre poème 2", ...]}`
            : `Crée un plan de 7-9 chapitres percutants pour ce livre en français.
Titre: "${title}"
Catégorie: ${category || "Non-fiction"}
Brief: ${description || "Livre pratique et inspirant"}

Les titres doivent être accrocheurs, donner envie de lire (pas juste "Chapitre 1").
Réponds UNIQUEMENT avec ce JSON (sans markdown):
{"chapters": ["Titre chapitre 1", "Titre chapitre 2", ...]}` }
        ],
        temperature: 0.8,
        max_tokens: 1024,
      });

      const text = completion.choices[0].message.content?.trim() || "{}";
      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      const json = JSON.parse(clean);
      return NextResponse.json(json);
    }

    if (action === "chapter") {
      const { title, chapterTitle, chapterIndex, totalChapters, category } = body;
      const isPoem = category?.includes("Poési");
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_AUTHOR },
          { role: "user", content: isPoem
            ? `Écris le poème "${chapterTitle}" du recueil "${title}".
Poème ${chapterIndex}/${totalChapters}.

Écris un poème émouvant de 20-30 vers en français. Utilise des images fortes, du rythme, des jeux sonores.
Structure en strophes de 4-6 vers. Termine sur une image mémorable.`
            : `Écris le chapitre ${chapterIndex}/${totalChapters} du livre "${title}".
Titre du chapitre: "${chapterTitle}"

Exigences:
- Commence par une accroche forte (anecdote, question, statistique surprenante)
- 500-700 mots de contenu de qualité professionnelle
- 2-3 sous-titres en gras pour structurer
- Au moins 1 exemple concret ou histoire vraie
- Liste d'actions pratiques si pertinent
- Termine sur une phrase mémorable qui donne envie de lire la suite

Écris directement le contenu, sans dire "Voici le chapitre" ou autre introduction méta.` }
        ],
        temperature: 0.85,
        max_tokens: 2048,
      });

      return NextResponse.json({
        content: completion.choices[0].message.content || ""
      });
    }

    if (action === "improve") {
      const { text } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un éditeur professionnel de renom. Tu améliores les textes en français: fluidité, impact, vocabulaire, rythme. Tu corriges sans dénaturer la voix originale." },
          { role: "user", content: `Améliore ce texte. Rends-le plus percutant, plus fluide, plus professionnel.
Garde exactement le même sens et la même longueur.
Retourne UNIQUEMENT le texte amélioré, sans commentaires ni explications:

${text}` }
        ],
        temperature: 0.6,
        max_tokens: 4096,
      });
      return NextResponse.json({ improved: completion.choices[0].message.content || text });
    }

    if (action === "description") {
      const { title, category, chaptersPreview } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un expert en marketing éditorial. Tu écris des descriptions de livres qui font exploser les ventes — accrocheuses, émotionnelles, avec une promesse forte." },
          { role: "user", content: `Écris 3 descriptions de vente pour ce livre, du style court au long.

Titre: "${title}"
Catégorie: ${category || "Non-fiction"}
Aperçu des chapitres: ${chaptersPreview || ""}

Pour chaque description:
1. COURTE (50 mots max) — pour les résultats de recherche
2. MEDIUM (120 mots) — pour la page produit principale
3. LONGUE (250 mots) — description complète avec accroche émotionnelle

Format:
--- COURTE ---
[texte]

--- MEDIUM ---
[texte]

--- LONGUE ---
[texte]` }
        ],
        temperature: 0.8,
        max_tokens: 2048,
      });
      return NextResponse.json({ description: completion.choices[0].message.content || "" });
    }

    if (action === "poem") {
      const { theme, style } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_AUTHOR },
          { role: "user", content: `Écris un poème ${style || "libre"} sur le thème "${theme}".
20-30 vers, images fortes, émotion authentique. En français.` }
        ],
        temperature: 0.9,
        max_tokens: 1024,
      });
      return NextResponse.json({ content: completion.choices[0].message.content || "" });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
