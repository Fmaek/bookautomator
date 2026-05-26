import { NextRequest, NextResponse } from "next/server";

// Prompts musicaux par type de vidéo + thème
const MUSIC_PROMPTS: Record<string, Record<string, string>> = {
  teaser: {
    dark:   "dark cinematic tension building dramatic orchestral ambient, slow build",
    gold:   "epic inspiring orchestral fanfare dramatic brass strings, powerful",
    ocean:  "ethereal ambient oceanic peaceful cinematic underscore",
    fire:   "intense dramatic cinematic action fire orchestral tension",
    forest: "mystical nature ambient peaceful forest cinematic underscore",
    rose:   "romantic emotional cinematic strings piano gentle swell",
  },
  citation: {
    dark:   "minimal ambient piano introspective cinematic thoughtful",
    gold:   "warm inspiring piano strings cinematic uplifting",
    ocean:  "gentle ambient waves peaceful piano meditation",
    fire:   "emotional dramatic piano strings intense",
    forest: "acoustic guitar gentle peaceful nature ambient",
    rose:   "romantic piano strings gentle emotional cinematic",
  },
  promo: {
    dark:   "upbeat cinematic electronic inspiring motivational modern",
    gold:   "triumphant epic orchestral motivational commercial success",
    ocean:  "uplifting electronic ambient modern cinematic commercial",
    fire:   "energetic powerful electronic cinematic action commercial",
    forest: "uplifting organic acoustic inspiring commercial",
    rose:   "catchy upbeat pop commercial inspiring feel-good",
  },
  booktrailer: {
    dark:   "cinematic epic orchestral dramatic swell strings brass choir",
    gold:   "grand epic orchestral cinematic trailer fanfare",
    ocean:  "cinematic orchestral sweeping oceanic adventure",
    fire:   "dramatic intense cinematic orchestral action trailer",
    forest: "cinematic orchestral adventure mystical epic",
    rose:   "cinematic romantic orchestral dramatic emotional",
  },
  shorts: {
    dark:   "modern electronic trap beat cinematic dark atmospheric",
    gold:   "upbeat commercial electronic pop inspiring catchy",
    ocean:  "chill lofi electronic ambient modern relaxing",
    fire:   "energetic trap electronic beat dynamic modern",
    forest: "acoustic indie modern uplifting organic rhythm",
    rose:   "upbeat pop electronic modern catchy commercial",
  },
};

function getPrompt(videoType: string, theme: string): string {
  return MUSIC_PROMPTS[videoType]?.[theme]
    ?? MUSIC_PROMPTS[videoType]?.dark
    ?? "cinematic ambient orchestral music book promotion atmospheric";
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { videoType: string; theme: string; duration: number };
  const hfToken = req.headers.get("x-hf-token") || "";

  if (!hfToken) {
    return NextResponse.json({ error: "Token HuggingFace manquant" }, { status: 400 });
  }

  const prompt = getPrompt(body.videoType, body.theme);
  // ~50 tokens/seconde, max 512 (≈10s), min 256 (≈5s)
  const maxTokens = Math.min(512, Math.max(256, Math.round((body.duration || 20) * 50)));

  // Retry loop (le modèle peut être en chargement → 503)
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(
      "https://api-inference.huggingface.co/models/facebook/musicgen-small",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
          "Accept": "audio/flac",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: maxTokens },
        }),
        signal: AbortSignal.timeout(120_000),
      }
    );

    if (res.status === 503) {
      // Modèle en cours de chargement
      const wait = parseInt(res.headers.get("x-wait-for-model") || "20", 10) * 1000;
      await new Promise(r => setTimeout(r, Math.min(wait, 25_000)));
      continue;
    }

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `HuggingFace: ${err}` }, { status: res.status });
    }

    const audioBuffer = await res.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/flac",
        "Content-Length": String(audioBuffer.byteLength),
        "X-Music-Prompt": prompt,
      },
    });
  }

  return NextResponse.json({ error: "Modèle MusicGen indisponible après 4 tentatives" }, { status: 503 });
}
