import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prompt   = searchParams.get("prompt")  || "Professional book cover";
  const model    = searchParams.get("model")   || "flux";
  const seed     = searchParams.get("seed")    || String(Math.floor(Math.random() * 99999));
  const width    = "512";
  const height   = "768";

  const encoded  = encodeURIComponent(
    `Professional book cover illustration, no text, no letters, no words. ${prompt}. Cinematic lighting, dramatic atmosphere, portrait 3:4 format, bestseller quality, ultra HD photorealistic.`
  );

  const pollinationsUrl =
    `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true&enhance=true`;

  try {
    const res = await fetch(pollinationsUrl, {
      // Give Pollinations up to 90 seconds (models can be slow)
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Pollinations error ${res.status}` }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Allow canvas to read pixels — same-origin response, no CORS issue
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "timeout";
    return NextResponse.json({ error: msg }, { status: 504 });
  }
}
