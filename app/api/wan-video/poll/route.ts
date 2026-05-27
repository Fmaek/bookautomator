import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

// ── Polling du statut d'un job fal.ai ────────────────────────────────────────
// GET /api/wan-video/poll?requestId=xxx
// Retourne: { status: "IN_QUEUE"|"IN_PROGRESS"|"COMPLETED"|"FAILED", url?, error? }
export async function GET(req: NextRequest) {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "FAL_KEY manquant" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get("requestId");
  if (!requestId) {
    return NextResponse.json({ error: "requestId manquant" }, { status: 400 });
  }

  try {
    // Vérifier le statut
    const statusRes = await fetch(
      `https://queue.fal.run/fal-ai/wan/v2.1/t2v-1.3b/requests/${requestId}/status`,
      {
        headers: { "Authorization": `Key ${falKey}` },
        signal: AbortSignal.timeout(12_000),
      }
    );

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      return NextResponse.json({ status: "FAILED", error: `Status check failed: ${errText}` });
    }

    const statusData = await statusRes.json() as {
      status?: string;
      error?: string;
    };

    const status = statusData.status ?? "IN_QUEUE";

    // Si complété, récupérer le résultat
    if (status === "COMPLETED") {
      const resultRes = await fetch(
        `https://queue.fal.run/fal-ai/wan/v2.1/t2v-1.3b/requests/${requestId}`,
        {
          headers: { "Authorization": `Key ${falKey}` },
          signal: AbortSignal.timeout(12_000),
        }
      );

      if (!resultRes.ok) {
        return NextResponse.json({ status: "FAILED", error: "Récupération du résultat échouée" });
      }

      const result = await resultRes.json() as {
        video?: { url?: string };
        output?: { video?: { url?: string }; url?: string };
        url?: string;
        error?: string;
      };

      // fal.ai retourne les vidéos sous différentes formes selon les modèles
      const videoUrl =
        result.video?.url ??
        result.output?.video?.url ??
        result.output?.url ??
        result.url ??
        null;

      if (videoUrl) {
        return NextResponse.json({ status: "COMPLETED", url: videoUrl });
      }
      return NextResponse.json({ status: "FAILED", error: "URL vidéo absente dans la réponse" });
    }

    if (status === "FAILED") {
      return NextResponse.json({ status: "FAILED", error: statusData.error ?? "Job échoué sur fal.ai" });
    }

    // IN_QUEUE ou IN_PROGRESS
    return NextResponse.json({ status });
  } catch (e) {
    console.error("[wan-video/poll]", e);
    return NextResponse.json({ status: "FAILED", error: String(e) });
  }
}
