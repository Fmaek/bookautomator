import { NextRequest, NextResponse } from "next/server";

// Pollinations.ai — 100% gratuit, aucune clé API requise
export async function POST(req: NextRequest) {
  const { prompt, title } = await req.json();

  const fullPrompt = encodeURIComponent(
    `Professional book cover design. ${prompt}. ${title ? `Book: "${title}".` : ""}
    High quality publishing aesthetic, dramatic lighting, portrait format,
    Amazon KDP ready, bestseller style. No text or typography in image.`
  );

  // Pollinations.ai génère une image via simple URL
  const imageUrl = `https://image.pollinations.ai/prompt/${fullPrompt}?width=512&height=768&nologo=true&enhance=true`;

  return NextResponse.json({ url: imageUrl });
}
