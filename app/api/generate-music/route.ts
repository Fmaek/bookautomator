import { NextRequest, NextResponse } from "next/server";
import { request as httpsReq } from "https";

export const maxDuration = 60;

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

// HTTPS natif Node.js — contourne fetch/polyfill Vercel
function httpsPost(
  host: string, path: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number
): Promise<{ status: number; body: Buffer; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(body, "utf-8");
    const req = httpsReq(
      { hostname: host, path, method: "POST", headers: { ...headers, "Content-Length": bodyBuf.length } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve({
          status: res.statusCode ?? 0,
          body: Buffer.concat(chunks),
          headers: res.headers as Record<string, string>,
        }));
      }
    );
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error(`Timeout ${timeoutMs}ms`)); });
    req.on("error", reject);
    req.write(bodyBuf);
    req.end();
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { videoType: string; theme: string; duration: number };
  const hfToken = process.env.HF_TOKEN || "";

  const prompt = getPrompt(body.videoType, body.theme);
  const maxTokens = Math.min(512, Math.max(256, Math.round((body.duration || 20) * 50)));
  const reqBody = JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: maxTokens } });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await httpsPost(
        "api-inference.huggingface.co",
        "/models/facebook/musicgen-small",
        {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
          Accept: "audio/flac",
        },
        reqBody,
        50_000
      );

      if (res.status === 503) {
        const wait = parseInt(res.headers["x-wait-for-model"] || "20", 10) * 1000;
        await new Promise(r => setTimeout(r, Math.min(wait, 20_000)));
        continue;
      }
      if (res.status >= 400) {
        return NextResponse.json({ error: `MusicGen ${res.status}` }, { status: res.status });
      }

      return new NextResponse(res.body.buffer as ArrayBuffer, {
        headers: {
          "Content-Type": "audio/flac",
          "Content-Length": String(res.body.byteLength),
          "X-Music-Prompt": prompt,
        },
      });
    } catch (e) {
      console.warn(`[generate-music] attempt ${attempt}:`, String(e));
      if (attempt < 2) await new Promise(r => setTimeout(r, 2_000));
    }
  }

  return NextResponse.json({ error: "MusicGen indisponible" }, { status: 503 });
}
