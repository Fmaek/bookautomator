import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ── Twitter OAuth 1.0a ───────────────────────────────────────────────────────
function oauthSign(
  method: string, url: string,
  oauthParams: Record<string, string>,
  bodyParams: Record<string, string>,
  consumerSecret: string, tokenSecret: string
): string {
  const all = { ...oauthParams, ...bodyParams };
  const base = Object.keys(all).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(all[k])}`)
    .join("&");
  const sigBase = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(base)].join("&");
  const key = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac("sha1", key).update(sigBase).digest("base64");
}

function buildOAuthHeader(
  method: string, url: string, bodyParams: Record<string, string>,
  apiKey: string, apiSecret: string, accessToken: string, accessTokenSecret: string
): string {
  const op: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_token: accessToken,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_version: "1.0",
  };
  op.oauth_signature = oauthSign(method, url, op, bodyParams, apiSecret, accessTokenSecret);
  return "OAuth " + Object.entries(op).map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`).join(", ");
}

async function postToTwitter(text: string, creds: Record<string, string>) {
  const url = "https://api.twitter.com/2/tweets";
  const auth = buildOAuthHeader("POST", url, {}, creds.apiKey, creds.apiSecret, creds.accessToken, creds.accessTokenSecret);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.substring(0, 280) }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) return { ok: false, error: (data as { detail?: string }).detail || JSON.stringify(data) };
  return { ok: true, id: (data.data as Record<string, string>)?.id };
}

// ── Facebook Graph API ───────────────────────────────────────────────────────
async function postToFacebook(text: string, pageId: string, pageToken: string) {
  const url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text, access_token: pageToken }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) return { ok: false, error: JSON.stringify((data as { error?: unknown }).error || data) };
  return { ok: true, id: data.id };
}

async function uploadFbPhoto(imageBase64: string, pageId: string, pageToken: string, message: string): Promise<{ ok: boolean; id?: unknown; error?: string }> {
  // Strip data URL prefix
  const b64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const binary = Buffer.from(b64, "base64");
  const boundary = "----BookAutomator" + Date.now();
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="source"; filename="cover.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    binary,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="message"\r\n\r\n${message}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="access_token"\r\n\r\n${pageToken}\r\n`),
    Buffer.from(`--${boundary}--`),
  ]);
  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body,
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) return { ok: false, error: JSON.stringify((data as { error?: unknown }).error || data) };
  return { ok: true, id: data.id };
}

// ── Instagram Business (via Facebook Graph) ──────────────────────────────────
async function postToInstagram(caption: string, igUserId: string, pageToken: string, imageUrl?: string) {
  // Requires a publicly accessible image URL — skip photo if not available
  const containerBody: Record<string, string> = { caption, access_token: pageToken };
  if (imageUrl) containerBody.image_url = imageUrl;
  else containerBody.media_type = "NONE"; // text-only not directly supported, fallback

  if (!imageUrl) {
    return { ok: false, error: "Instagram nécessite une image publique. Utilise le webhook Make.com pour poster sans image." };
  }

  const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerBody),
  });
  const container = await containerRes.json() as Record<string, unknown>;
  if (!containerRes.ok || !container.id) {
    return { ok: false, error: JSON.stringify((container as { error?: unknown }).error || container) };
  }

  // Wait a moment for processing
  await new Promise(r => setTimeout(r, 3000));

  const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: container.id, access_token: pageToken }),
  });
  const published = await publishRes.json() as Record<string, unknown>;
  if (!publishRes.ok) return { ok: false, error: JSON.stringify((published as { error?: unknown }).error || published) };
  return { ok: true, id: published.id };
}


// ── Webhook universel (Make.com / Zapier / n8n) ──────────────────────────────
async function postToWebhook(webhookUrl: string, payload: Record<string, unknown>) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  return { ok: true };
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, platforms, imageDataUrl, imagePublicUrl, credentials } = body as {
    text: string;
    platforms: string[];
    imageDataUrl?: string;
    imagePublicUrl?: string;
    credentials: Record<string, Record<string, string>>;
  };

  const results: Record<string, { ok: boolean; id?: unknown; error?: string }> = {};

  const ps = platforms as string[];

  // Twitter/X
  if (ps.includes("twitter") && credentials.twitter?.apiKey) {
    try { results.twitter = await postToTwitter(text, credentials.twitter); }
    catch (e) { results.twitter = { ok: false, error: String(e) }; }
  }

  // Facebook
  if (ps.includes("facebook") && credentials.facebook?.pageToken && credentials.facebook?.pageId) {
    try {
      if (imageDataUrl && imageDataUrl.startsWith("data:")) {
        results.facebook = await uploadFbPhoto(imageDataUrl, credentials.facebook.pageId, credentials.facebook.pageToken, text);
      } else {
        results.facebook = await postToFacebook(text, credentials.facebook.pageId, credentials.facebook.pageToken);
      }
    } catch (e) { results.facebook = { ok: false, error: String(e) }; }
  }

  // Instagram
  if (ps.includes("instagram") && credentials.instagram?.pageToken && credentials.instagram?.igUserId) {
    try {
      results.instagram = await postToInstagram(text, credentials.instagram.igUserId, credentials.instagram.pageToken, imagePublicUrl);
    } catch (e) { results.instagram = { ok: false, error: String(e) }; }
  }

// Webhook (TikTok, Instagram via Make.com, etc.)
  if (credentials.webhook?.url) {
    const webhookPlatforms = ps.filter(p => ["tiktok", "instagram", "youtube"].includes(p) && !results[p]);
    if (webhookPlatforms.length > 0 || ps.includes("webhook")) {
      try {
        const result = await postToWebhook(credentials.webhook.url, {
          text, platforms: webhookPlatforms,
          image: imageDataUrl ? "base64_included" : null,
          imageDataUrl: imageDataUrl || null,
          timestamp: new Date().toISOString(),
        });
        webhookPlatforms.forEach(p => { results[p] = result; });
        if (ps.includes("webhook")) results.webhook = result;
      } catch (e) {
        webhookPlatforms.forEach(p => { results[p] = { ok: false, error: String(e) }; });
      }
    }
  }

  const allOk = Object.values(results).every(r => r.ok);
  const anyOk = Object.values(results).some(r => r.ok);

  return NextResponse.json({ results, allOk, anyOk });
}
