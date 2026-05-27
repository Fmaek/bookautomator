import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 55;

// ── Prompts cinématiques selon thème / type ────────────────────────────────────
const IMAGE_PROMPTS: Record<string, Record<string, string>> = {
  dark:   {
    teaser:      "cinematic dark moody abstract background, deep shadows, soft bokeh lights, dramatic atmosphere, photorealistic, no text, no people, no watermark",
    citation:    "minimal dark cinematic background, soft bokeh orbs, abstract depth, dark luxury, photorealistic, no text, no people",
    promo:       "dark dramatic cinematic background, energy particles, abstract motion blur, moody atmosphere, no text, no people",
    booktrailer: "epic dark cinematic scene, dramatic chiaroscuro lighting, cinematic depth of field, no text, no people",
    shorts:      "dark viral aesthetic background, neon accents bokeh, abstract high contrast, no text, no people",
  },
  gold:   {
    teaser:      "golden luxury cinematic background, warm light rays, sparkling bokeh gold particles, elegant atmosphere, no text, no people",
    citation:    "warm golden abstract background, soft luxurious light, cinematic bokeh, no text, no people",
    promo:       "golden luxury cinematic background, triumphant warm light rays, rich atmosphere, no text, no people",
    booktrailer: "epic golden cinematic light rays, dramatic warm atmosphere, luxury depth of field, no text, no people",
    shorts:      "gold shimmering aesthetic background, dynamic gold particles bokeh, high energy, no text, no people",
  },
  ocean:  {
    teaser:      "cinematic ocean depth, blue underwater light rays, abstract waves, calm dramatic atmosphere, no text, no people",
    citation:    "peaceful ocean cinematic background, soft turquoise waves, light caustics, no text, no people",
    promo:       "dynamic ocean cinematic background, deep blue energy, abstract water light, modern aesthetic, no text, no people",
    booktrailer: "epic underwater cinematic scene, dramatic ocean light shafts, deep blue atmosphere, no text, no people",
    shorts:      "ocean waves aerial cinematic background, cool blue bokeh, dynamic water motion, no text, no people",
  },
  fire:   {
    teaser:      "dramatic fire cinematic background, glowing embers, intense warm atmosphere, abstract flames, no text, no people",
    citation:    "minimal fire cinematic background, glowing orange bokeh embers, warm dramatic, no text, no people",
    promo:       "dynamic fire cinematic background, intense energy flames, dramatic red atmosphere, no text, no people",
    booktrailer: "epic fire cinematic scene, dramatic raging flames, intense atmospheric depth, no text, no people",
    shorts:      "fire viral aesthetic background, intense energy bokeh, dynamic sparks, no text, no people",
  },
  forest: {
    teaser:      "mystical forest cinematic background, golden light through trees, lush green bokeh, magical atmosphere, no text, no people",
    citation:    "peaceful forest cinematic background, soft green light, ethereal fog, calm mystical, no text, no people",
    promo:       "dynamic nature cinematic background, organic green energy, inspiring forest light, no text, no people",
    booktrailer: "epic forest cinematic scene, mystical light shafts, adventure atmosphere, no text, no people",
    shorts:      "forest viral aesthetic background, lush natural energy, organic motion bokeh, no text, no people",
  },
  rose:   {
    teaser:      "romantic soft pink cinematic background, gentle bokeh petals, dreamy atmosphere, elegant luxury, no text, no people",
    citation:    "romantic cinematic background, soft rose gold light, elegant pink bokeh, no text, no people",
    promo:       "elegant rose cinematic background, romantic warm light, inspiring pink atmosphere, no text, no people",
    booktrailer: "epic romantic cinematic scene, soft emotional light, pink rose atmosphere, no text, no people",
    shorts:      "rose viral aesthetic background, romantic energy bokeh, soft particles, no text, no people",
  },
};

function getImagePrompt(theme: string, videoType: string): string {
  return IMAGE_PROMPTS[theme]?.[videoType]
    ?? IMAGE_PROMPTS[theme]?.teaser
    ?? "cinematic abstract atmospheric background, bokeh, dramatic light, photorealistic, no text, no people";
}

// ── Génération d'image via HuggingFace FLUX.1-schnell ─────────────────────────
export async function POST(req: NextRequest) {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    return NextResponse.json({ error: "HF_TOKEN manquant" }, { status: 503 });
  }

  const body = await req.json() as { theme?: string; videoType?: string; customPrompt?: string; width?: number; height?: number };
  const prompt = body.customPrompt || getImagePrompt(body.theme || "dark", body.videoType || "teaser");
  const width  = body.width  || 768;
  const height = body.height || 1344; // portrait 9:16 par défaut

  // Essai 1 : FLUX.1-schnell (rapide, 4 steps suffisent)
  const models = [
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
  ];

  for (const model of models) {
    try {
      const res = await fetch(
        `https://router.huggingface.co/hf-inference/models/${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfToken}`,
            "Content-Type": "application/json",
            "x-wait-for-model": "true",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              num_inference_steps: model.includes("schnell") ? 4 : 25,
              width,
              height,
              guidance_scale: model.includes("schnell") ? 0 : 7.5,
            },
          }),
          signal: AbortSignal.timeout(50_000),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.warn(`[wan-video] ${model} → ${res.status}:`, err.slice(0, 200));
        continue;
      }

      const contentType = res.headers.get("content-type") || "image/jpeg";
      // Vérifier que c'est bien une image (pas un JSON d'erreur)
      if (!contentType.includes("image") && !contentType.includes("octet-stream")) {
        const text = await res.text();
        console.warn(`[wan-video] ${model} returned non-image:`, text.slice(0, 200));
        continue;
      }

      const imageBuffer = await res.arrayBuffer();
      if (imageBuffer.byteLength < 1000) {
        console.warn(`[wan-video] ${model} image trop petite (${imageBuffer.byteLength}b)`);
        continue;
      }

      const base64 = Buffer.from(imageBuffer).toString("base64");
      console.log(`[wan-video] ✅ ${model} → ${Math.round(imageBuffer.byteLength / 1024)}KB`);

      return NextResponse.json({
        imageBase64: base64,
        contentType: contentType.split(";")[0].trim(),
        model,
        width,
        height,
      });
    } catch (e) {
      console.warn(`[wan-video] ${model} exception:`, String(e));
    }
  }

  return NextResponse.json({ error: "Génération image échouée (HF indisponible)" }, { status: 503 });
}
