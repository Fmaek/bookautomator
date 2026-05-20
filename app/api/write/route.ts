import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  try {
    if (action === "plan") {
      const { title, category, description } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un expert en création de livres à succès. Réponds uniquement en JSON valide, sans markdown." },
          { role: "user", content: `Crée un plan de 6-8 chapitres pour ce livre en français.
Titre: "${title}"
Catégorie: ${category || "Non-fiction"}
Brief: ${description || "Livre pratique et inspirant"}

Réponds UNIQUEMENT avec ce JSON (sans markdown, sans \`\`\`):
{"chapters": ["Titre chapitre 1", "Titre chapitre 2", ...]}` }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      });

      const text = completion.choices[0].message.content?.trim() || "{}";
      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      const json = JSON.parse(clean);
      return NextResponse.json(json);
    }

    if (action === "chapter") {
      const { title, chapterTitle, chapterIndex, totalChapters } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un auteur professionnel. Style: clair, actionnable, engageant, en français." },
          { role: "user", content: `Écris le contenu du chapitre ${chapterIndex}/${totalChapters} du livre "${title}".
Titre du chapitre: "${chapterTitle}"

Écris 400-600 mots de contenu professionnel en français avec des sous-titres, exemples concrets et points d'action.` }
        ],
        temperature: 0.8,
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
          { role: "system", content: "Tu es un éditeur professionnel expert en amélioration de textes en français. Améliore le style, la fluidité, corrige les fautes et enrichis le vocabulaire." },
          { role: "user", content: `Améliore ce texte en gardant le sens original. Renvoie uniquement le texte amélioré, sans commentaires:\n\n${text}` }
        ],
        temperature: 0.6,
        max_tokens: 4096,
      });

      return NextResponse.json({
        improved: completion.choices[0].message.content || text
      });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
