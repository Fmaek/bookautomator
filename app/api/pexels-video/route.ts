import { NextRequest, NextResponse } from "next/server";

// Mots-clés cinématiques par catégorie de livre
const CATEGORY_QUERIES: Record<string, string> = {
  "développement personnel": "motivation success achievement",
  "développement": "motivation success achievement",
  "self-help": "motivation success achievement",
  "romance": "romantic couple sunset love",
  "thriller": "dark city mystery suspense night",
  "horreur": "dark scary mysterious horror",
  "fiction": "cinematic dramatic sky universe",
  "fantasy": "fantasy magical forest mystical",
  "science-fiction": "futuristic technology space science",
  "sci-fi": "futuristic technology space science",
  "business": "professional business success office",
  "finance": "money wealth success finance",
  "spiritualité": "meditation peaceful nature zen",
  "spirituality": "meditation peaceful nature zen",
  "histoire": "ancient architecture history vintage",
  "biography": "portrait person inspirational journey",
  "cuisine": "food cooking kitchen delicious",
  "santé": "health wellness nature peaceful",
  "jeunesse": "children fun colorful adventure",
  "policier": "detective mystery dark street",
};

function getQuery(category?: string, title?: string): string {
  const cat = category?.toLowerCase().trim() || "";
  for (const [key, val] of Object.entries(CATEGORY_QUERIES)) {
    if (cat.includes(key)) return val;
  }
  // Fallback: use title keywords
  if (title) {
    const words = title.toLowerCase().replace(/[^a-zàâéèêëîïôùûüç\s]/g, "").split(" ")
      .filter(w => w.length > 4).slice(0, 2).join(" ");
    if (words) return `${words} cinematic`;
  }
  return "cinematic dramatic landscape";
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { category?: string; title?: string };
  const pexelsKey = req.headers.get("x-pexels-key") || "";

  if (!pexelsKey) {
    return NextResponse.json({ error: "Clé Pexels manquante", url: null });
  }

  const query = getQuery(body.category, body.title);

  try {
    // Cherche des vidéos portrait ET paysage (plus de résultats)
    const orientations = ["portrait", "landscape"];
    let videoUrl: string | null = null;

    for (const orientation of orientations) {
      const res = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=8&orientation=${orientation}&size=medium`,
        { headers: { Authorization: pexelsKey } }
      );
      const data = await res.json() as {
        videos?: Array<{ video_files: Array<{ link: string; width: number; height: number; quality: string }> }>;
        error?: string;
      };

      if (data.error || !data.videos?.length) continue;

      // Choisir aléatoirement parmi les 5 premiers
      const pick = data.videos[Math.floor(Math.random() * Math.min(5, data.videos.length))];

      // Préférer HD (720p-1080p), pas trop lourd
      const file = pick.video_files
        .filter(f => f.width >= 640 && f.width <= 1920)
        .sort((a, b) => b.width - a.width)[0]
        ?? pick.video_files[0];

      if (file?.link) { videoUrl = file.link; break; }
    }

    return NextResponse.json({ url: videoUrl, query });
  } catch (e) {
    return NextResponse.json({ error: String(e), url: null });
  }
}
