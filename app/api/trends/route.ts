import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function GET() {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Tu es un expert en tendances des réseaux sociaux francophones (Facebook, Instagram, Afrique/France). Réponds uniquement en JSON valide, sans markdown.",
        },
        {
          role: "user",
          content: `Génère 8 sujets viraux actuels sur Facebook et Instagram (mai 2025) avec fort potentiel de livres à vendre.

Réponds UNIQUEMENT avec ce JSON (sans markdown, sans \`\`\`):
{"trends": [
  {"topic": "Sujet viral", "engagement": "X millions interactions", "category": "Catégorie", "bookIdea": "Titre de livre accrocheur", "potential": "Viral"}
]}

Potentiel = "Viral", "Élevé" ou "Moyen". Sujets variés: business, spiritualité, psychologie, Afrique, famille, santé, IA, argent.`,
        },
      ],
      temperature: 0.9,
      max_tokens: 2048,
    });

    const text = completion.choices[0].message.content?.trim() || "{}";
    const clean = text.replace(/```json\n?|\n?```/g, "").trim();
    const json = JSON.parse(clean);
    return NextResponse.json(json);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ trends: [] }, { status: 500 });
  }
}
