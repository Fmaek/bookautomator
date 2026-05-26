import { NextRequest, NextResponse } from "next/server";
import { request as httpsReq } from "https";

export const maxDuration = 60;

// ── Utilitaire HTTP natif (contourne fetch/polyfill Vercel) ───────────────────
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

// Lecture SSE (Server-Sent Events) natif pour la queue Gradio
function httpsGetSSE(
  host: string, path: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const req = httpsReq(
      { hostname: host, path, method: "GET", headers },
      (res) => {
        const events: string[] = [];
        let buf = "";
        res.on("data", (c: Buffer) => {
          buf += c.toString("utf-8");
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const payload = line.slice(6).trim();
              if (payload) events.push(payload);
              // Arrêt anticipé si le job est terminé
              try {
                const ev = JSON.parse(payload) as { msg?: string };
                if (ev.msg === "process_completed") { req.destroy(); resolve(events); return; }
              } catch {}
            }
          }
        });
        res.on("end", () => resolve(events));
        res.on("error", (e) => { resolve(events.length ? events : []); void e; });
      }
    );
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve([]); });
    req.on("error", (e) => reject(e));
    req.end();
  });
}

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

// ── Tentative 1 : HF Inference Router (text-to-video) ────────────────────────
async function tryInferenceAPI(prompt: string, hfToken: string): Promise<Buffer | null> {
  try {
    const res = await httpsPost(
      "router.huggingface.co",
      "/models/Wan-AI/Wan2.1-T2V-1.3B",
      {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
        Accept: "video/mp4",
      },
      JSON.stringify({ inputs: prompt }),
      55_000
    );
    if (res.status === 200) {
      // Vérifie que c'est bien une vidéo (pas un JSON d'erreur)
      const ct = res.headers["content-type"] ?? "";
      if (ct.includes("video") || ct.includes("octet-stream")) return res.body;
    }
    if (res.status === 503) {
      // Modèle en chargement — réessayer avec wait
      const res2 = await httpsPost(
        "router.huggingface.co",
        "/models/Wan-AI/Wan2.1-T2V-1.3B",
        {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
          "x-wait-for-model": "true",
          Accept: "video/mp4",
        },
        JSON.stringify({ inputs: prompt }),
        55_000
      );
      if (res2.status === 200) {
        const ct2 = res2.headers["content-type"] ?? "";
        if (ct2.includes("video") || ct2.includes("octet-stream")) return res2.body;
      }
    }
  } catch (e) {
    console.warn("[wan-video] inference API:", String(e));
  }
  return null;
}

// ── Tentative 2 : HF Spaces Gradio queue + SSE ────────────────────────────────
const SPACES = [
  "wan-ai-wan2-1-t2v-1-3b.hf.space",
  "wan-ai-wan2-point-1-t2v-1-3b.hf.space",
];

async function tryGradioSpace(prompt: string, hfToken: string): Promise<string | null> {
  for (const spaceHost of SPACES) {
    try {
      const sessionHash = Math.random().toString(36).slice(2, 14);

      // Soumission à la queue Gradio (paramètres minimalistes pour vitesse max)
      const joinBody = JSON.stringify({
        data: [
          prompt,    // prompt
          "",        // negative prompt
          49,        // num_frames (court = plus rapide)
          "480x832", // resolution (portrait)
          8,         // num_inference_steps
          5.0,       // guidance_scale
          42,        // seed
        ],
        fn_index: 0,
        session_hash: sessionHash,
        trigger_id: 6,
      });

      const joinRes = await httpsPost(
        spaceHost, "/queue/join",
        {
          "Content-Type": "application/json",
          ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {}),
        },
        joinBody, 8_000
      );

      if (joinRes.status !== 200) continue;

      // Écoute SSE jusqu'à process_completed (max 50s)
      const events = await httpsGetSSE(
        spaceHost,
        `/queue/data?session_hash=${sessionHash}`,
        hfToken ? { Authorization: `Bearer ${hfToken}` } : {},
        50_000
      );

      for (const evStr of events) {
        try {
          const ev = JSON.parse(evStr) as {
            msg?: string;
            output?: { data?: unknown[] };
          };
          if (ev.msg === "process_completed" && ev.output?.data?.[0]) {
            const d = ev.output.data[0] as
              | { url?: string; video?: { url?: string }; path?: string }
              | string
              | null;
            let url: string | null = null;
            if (typeof d === "string") url = d;
            else if (d && typeof d === "object") {
              url = d.url ?? d.video?.url ?? d.path ?? null;
            }
            if (url) {
              if (url.startsWith("/")) url = `https://${spaceHost}${url}`;
              return url;
            }
          }
        } catch {}
      }
    } catch (e) {
      console.warn(`[wan-video] space ${spaceHost}:`, String(e));
    }
  }
  return null;
}

// ── Handler principal ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json() as { theme?: string; videoType?: string; customPrompt?: string };
  const hfToken = process.env.HF_TOKEN || "";

  const prompt = body.customPrompt || getWanPrompt(body.theme || "dark", body.videoType || "teaser");

  // Tentative 1 : Inference API (renvoie des bytes vidéo)
  const videoBytes = await tryInferenceAPI(prompt, hfToken);
  if (videoBytes) {
    return new NextResponse(videoBytes.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(videoBytes.byteLength),
        "X-Wan-Source": "inference-api",
      },
    });
  }

  // Tentative 2 : Gradio Space (renvoie une URL)
  const videoUrl = await tryGradioSpace(prompt, hfToken);
  if (videoUrl) {
    return NextResponse.json({ url: videoUrl, source: "gradio-space" });
  }

  return NextResponse.json({ error: "Wan2.1 indisponible (timeout ou quota)" }, { status: 503 });
}
