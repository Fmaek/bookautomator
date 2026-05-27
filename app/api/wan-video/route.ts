import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// ── Prompts cinématiques selon thème / type vidéo ────────────────────────────
const WAN_PROMPTS: Record<string, Record<string, string>> = {
  dark:   { teaser: "dark cinematic moody atmosphere, deep shadows, bokeh lights, slow motion, abstract", citation: "minimal dark cinematic background, soft bokeh, abstract particles floating", promo: "dynamic dark cinematic loop, energy particles, abstract motion", booktrailer: "epic dark cinematic scene, dramatic lighting, cinematic depth of field", shorts: "dark viral aesthetic loop, neon accents, energetic abstract motion" },
  gold:   { teaser: "golden luxury cinematic atmosphere, light rays, bokeh gold particles", citation: "warm golden abstract background, soft light, cinematic luxury", promo: "golden luxury cinematic loop, triumphant light", booktrailer: "epic golden cinematic light rays, dramatic atmosphere, luxury", shorts: "gold viral aesthetic, shimmering particles, dynamic energy" },
  ocean:  { teaser: "ocean cinematic abstract waves, blue depths, slow motion water", citation: "peaceful ocean cinematic background, soft waves, calm abstract", promo: "dynamic ocean cinematic loop, energy waves, modern", booktrailer: "epic ocean cinematic sweep, dramatic waves, underwater light", shorts: "ocean viral aesthetic, water motion, cool energy" },
  fire:   { teaser: "fire dramatic cinematic embers, intense atmosphere, slow motion", citation: "minimal fire cinematic background, glowing embers, warm abstract", promo: "dynamic fire cinematic loop, intense energy, dramatic", booktrailer: "epic fire cinematic scene, dramatic flames, intense atmosphere", shorts: "fire viral aesthetic, intense energy, dynamic embers" },
  forest: { teaser: "mystical forest cinematic atmosphere, light through trees, slow motion", citation: "peaceful forest cinematic background, soft light, calm abstract", promo: "dynamic nature cinematic loop, organic energy, inspiring", booktrailer: "epic forest cinematic sweep, mystical atmosphere, adventure", shorts: "forest viral aesthetic, natural energy, organic motion" },
  rose:   { teaser: "romantic rose cinematic atmosphere, soft pink bokeh, gentle motion", citation: "romantic cinematic background, soft rose light, elegant abstract", promo: "elegant rose cinematic loop, romantic energy, inspiring", booktrailer: "epic romantic cinematic scene, soft light, emotional atmosphere", shorts: "rose viral aesthetic, romantic energy, soft particles" },
};

function getWanPrompt(theme: string, videoType: string): string {
  return WAN_PROMPTS[theme]?.[videoType]
    ?? WAN_PROMPTS[theme]?.teaser
    ?? "cinematic abstract atmospheric background, smooth motion, high quality, no text, no people";
}

// ── Soumission du job à fal.ai (retour immédiat < 2s) ─────────────────────────
export async function POST(req: NextRequest) {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json(
      { error: "FAL_KEY manquant — ajoutez-le dans les variables d'environnement Vercel" },
      { status: 503 }
    );
  }

  const body = await req.json() as { theme?: string; videoType?: string; customPrompt?: string };
  const prompt = body.customPrompt || getWanPrompt(body.theme || "dark", body.videoType || "teaser");

  try {
    const res = await fetch("https://queue.fal.run/fal-ai/wan/v2.1/t2v-1.3b", {
      method: "POST",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: "text, watermark, logo, blur, distorted, low quality, people, face",
        num_frames: 49,
        resolution: "480p",
        num_inference_steps: 20,
        guidance_scale: 5.0,
        seed: Math.floor(Math.random() * 99999),
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[wan-video] fal.ai submit error:", res.status, errText);
      return NextResponse.json(
        { error: `fal.ai erreur ${res.status}`, detail: errText },
        { status: 502 }
      );
    }

    const data = await res.json() as { request_id?: string; error?: string };
    if (!data.request_id) {
      return NextResponse.json({ error: "Pas de request_id dans la réponse fal.ai" }, { status: 502 });
    }

    return NextResponse.json({ requestId: data.request_id });
  } catch (e) {
    console.error("[wan-video] submit exception:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
