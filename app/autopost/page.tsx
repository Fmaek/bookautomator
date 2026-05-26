"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send, Clock, Trash2, Play, CheckCircle, XCircle,
  Loader2, RefreshCw, BookOpen, Zap,
  History, List, Copy, Image, Video,
  Film, Quote, Megaphone, Clapperboard, Download,
  Sparkles, RotateCcw, TrendingUp, Check, X,
  Plus, Wifi, WifiOff, KeyRound, Eye, EyeOff,
  Settings, AlertTriangle, Terminal
} from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

// ── Types ─────────────────────────────────────────────────────────────────────
type Platform = "instagram" | "tiktok" | "twitter" | "facebook";
type PostStatus = "pending" | "done" | "error" | "posting";
type Tab = "video" | "compose" | "queue" | "accounts";

interface QueueItem {
  id: string; title: string; text: string; platforms: string[];
  status: PostStatus; created_at: string; posted_at?: string;
  results?: Record<string, { ok: boolean; error?: string }>;
}

interface Creds { instagram: { username: string; password: string }; tiktok_session: boolean; twitter_session: boolean; facebook_session: boolean; pexelsKey: string; hfToken: string; }

// ── Video constants ────────────────────────────────────────────────────────────
const VIDEO_TYPES = [
  { id: "teaser",      label: "Teaser",       icon: Clapperboard, color: "from-violet-500 to-purple-600", duration: "15s", desc: "Accroche rapide" },
  { id: "citation",    label: "Citation",     icon: Quote,        color: "from-amber-500 to-orange-600",  duration: "12s", desc: "Phrase forte animée" },
  { id: "promo",       label: "Promo Reel",   icon: Megaphone,    color: "from-pink-500 to-rose-600",     duration: "30s", desc: "Bénéfices + CTA" },
  { id: "booktrailer", label: "Book Trailer", icon: Film,         color: "from-cyan-500 to-blue-600",     duration: "45s", desc: "Style cinéma" },
  { id: "shorts",      label: "Shorts/Reel",  icon: TrendingUp,   color: "from-red-500 to-pink-600",      duration: "60s", desc: "Script TikTok" },
];

const FORMATS = [
  { id: "portrait",  label: "9:16",  w: 540, h: 960 },
  { id: "square",    label: "1:1",   w: 540, h: 540 },
  { id: "landscape", label: "16:9",  w: 960, h: 540 },
];

const THEMES = [
  { id: "dark",   label: "Dark",   bg1: "#0d0d1a", bg2: "#1a0a2e", accent: "#a855f7" },
  { id: "gold",   label: "Gold",   bg1: "#1a1200", bg2: "#2d1e00", accent: "#f59e0b" },
  { id: "ocean",  label: "Ocean",  bg1: "#00111a", bg2: "#001a2e", accent: "#06b6d4" },
  { id: "fire",   label: "Fire",   bg1: "#1a0500", bg2: "#2d0a00", accent: "#ef4444" },
  { id: "forest", label: "Forest", bg1: "#001a0a", bg2: "#002d12", accent: "#10b981" },
  { id: "rose",   label: "Rose",   bg1: "#1a0010", bg2: "#2d0020", accent: "#ec4899" },
];

const PLATFORMS: { id: Platform; label: string; color: string; bg: string }[] = [
  { id: "instagram", label: "Instagram", color: "text-pink-400",  bg: "bg-pink-500/20 border-pink-500/30" },
  { id: "tiktok",    label: "TikTok",    color: "text-red-400",   bg: "bg-red-500/20 border-red-500/30" },
  { id: "twitter",   label: "Twitter/X", color: "text-sky-400",   bg: "bg-sky-500/20 border-sky-500/30" },
  { id: "facebook",  label: "Facebook",  color: "text-blue-400",  bg: "bg-blue-500/20 border-blue-500/30" },
];

const SERVER = "http://localhost:8001";

// ── Video renderer — cinématique avec son ambiant ─────────────────────────────
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t: number) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" "); const lines: string[] = []; let cur = "";
  for (const w of words) { const t2 = cur ? cur + " " + w : w; if (ctx.measureText(t2).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t2; }
  if (cur) lines.push(cur); return lines;
}
interface Slide { text: string; subtext?: string; duration: number; style: string }

// ── Web Audio : son ambiant cinématique ───────────────────────────────────────
function buildCinematicAudio(
  audioCtx: AudioContext, dest: MediaStreamAudioDestinationNode,
  themeId: string, videoType: string, totalSec: number
) {
  const BASE: Record<string, number> = { dark:55, gold:82, ocean:65, fire:74, forest:49, rose:73 };
  const freq = BASE[themeId] ?? 55;
  const now = audioCtx.currentTime;

  // Master avec fade in/out
  const master = audioCtx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.38, now + 2.5);
  master.gain.setValueAtTime(0.38, now + Math.max(0, totalSec - 2.5));
  master.gain.linearRampToValueAtTime(0, now + totalSec);
  master.connect(dest);

  // Réverbe synthétique
  const revBuf = audioCtx.createBuffer(2, audioCtx.sampleRate * 2.5, audioCtx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = revBuf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/d.length, 1.8);
  }
  const reverb = audioCtx.createConvolver(); reverb.buffer = revBuf;
  const revGain = audioCtx.createGain(); revGain.gain.setValueAtTime(0.5, now);
  reverb.connect(revGain); revGain.connect(master);

  // Filtre passe-bas global (chaleur)
  const warmth = audioCtx.createBiquadFilter();
  warmth.type = "lowpass"; warmth.frequency.setValueAtTime(1800, now); warmth.Q.setValueAtTime(0.7, now);
  warmth.connect(master); warmth.connect(reverb);

  // Drones harmoniques (fondamentale + harmoniques)
  ([
    [freq,      0.55, "sine",     0.08],
    [freq*2,    0.22, "sine",     0.12],
    [freq*3,    0.09, "triangle", 0.18],
    [freq*0.5,  0.18, "sine",     0.05],
  ] as [number,number,OscillatorType,number][]).forEach(([f, g, type, lfoRate]) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, now);
    osc.detune.setValueAtTime((Math.random()-0.5)*12, now);
    // LFO pour mouvement vivant
    const lfo = audioCtx.createOscillator(); const lfoG = audioCtx.createGain();
    lfo.frequency.setValueAtTime(lfoRate, now); lfoG.gain.setValueAtTime(5, now);
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    lfo.start(now); lfo.stop(now + totalSec);
    gain.gain.setValueAtTime(g, now);
    osc.connect(gain); gain.connect(warmth);
    osc.start(now); osc.stop(now + totalSec);
  });

  // Pulse rythmique (promo / shorts / teaser)
  if (["promo","shorts","teaser"].includes(videoType)) {
    const bpm = videoType === "shorts" ? 120 : 95;
    const beat = 60 / bpm;
    const beats = Math.floor(totalSec / beat);
    for (let i = 0; i < beats; i++) {
      const t = now + i * beat;
      const o = audioCtx.createOscillator(); const g2 = audioCtx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(freq * 4, t);
      g2.gain.setValueAtTime(0, t);
      g2.gain.linearRampToValueAtTime(0.14, t + 0.008);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g2); g2.connect(master);
      o.start(t); o.stop(t + 0.25);
      // sous-beat (2e temps)
      if (i % 2 === 1) {
        const o2 = audioCtx.createOscillator(); const g3 = audioCtx.createGain();
        o2.type = "sine"; o2.frequency.setValueAtTime(freq*2, t);
        g3.gain.setValueAtTime(0, t); g3.gain.linearRampToValueAtTime(0.07, t+0.008); g3.gain.exponentialRampToValueAtTime(0.001, t+0.12);
        o2.connect(g3); g3.connect(master); o2.start(t); o2.stop(t+0.2);
      }
    }
  }

  // Shimmer haute fréquence (citation / booktrailer)
  if (["citation","booktrailer"].includes(videoType)) {
    const sh = audioCtx.createOscillator(); const shG = audioCtx.createGain();
    sh.type = "sine"; sh.frequency.setValueAtTime(freq*8, now);
    shG.gain.setValueAtTime(0.025, now);
    sh.connect(shG); shG.connect(reverb);
    sh.start(now); sh.stop(now + totalSec);
  }
}

// ── Helpers visuels ───────────────────────────────────────────────────────────
function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const vg = ctx.createRadialGradient(W/2, H*0.45, H*0.15, W/2, H*0.45, H*0.88);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}
function drawGrain(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Grain léger via fillRect aléatoires (plus rapide que getImageData sur gros canvas)
  ctx.globalAlpha = 0.028;
  for (let i = 0; i < 320; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random()*W, Math.random()*H, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
}
function drawLetterbox(ctx: CanvasRenderingContext2D, W: number, H: number, barH: number) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, barH); ctx.fillRect(0, H-barH, W, barH);
}
function drawAccentLine(ctx: CanvasRenderingContext2D, W: number, y: number, progress: number, accent: string) {
  const lw = W * 0.65 * easeOut(Math.min(1, progress * 2.5));
  ctx.fillStyle = accent; ctx.globalAlpha = 0.8;
  ctx.fillRect((W-lw)/2, y, lw, 2); ctx.globalAlpha = 1;
}
function drawParticles(ctx: CanvasRenderingContext2D, W: number, H: number, accent: string, frame: number) {
  for (let i = 0; i < 22; i++) {
    const x = (i*139.7 + frame*0.28) % W;
    const y = (i*89.3  + frame*0.17) % H;
    const a = 0.12 + 0.18 * Math.abs(Math.sin(frame*0.04 + i*0.7));
    const r = 0.8 + (i%3)*0.6;
    ctx.globalAlpha = a; ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Loader vidéo Pexels ───────────────────────────────────────────────────────
async function loadBgVideo(url: string): Promise<HTMLVideoElement | null> {
  return new Promise(resolve => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous"; v.muted = true; v.loop = true; v.playsInline = true;
    v.oncanplay = () => { v.play().catch(() => {}); resolve(v); };
    v.onerror = () => resolve(null);
    v.src = url;
    v.load();
    setTimeout(() => resolve(null), 12000); // timeout 12s
  });
}

// ── Renderer principal ────────────────────────────────────────────────────────
async function renderVideoToBlob(
  slides: Slide[], fmt: typeof FORMATS[0], thm: typeof THEMES[0],
  coverDataUrl?: string, videoType = "teaser", fps = 30,
  pexelsKey?: string, hfToken?: string,
  bookCategory?: string, bookTitle?: string,
  onStage?: (stage: string) => void
): Promise<Blob> {
  const W = fmt.w, H = fmt.h;
  const barH = Math.round(H * 0.075);
  const totalSec = slides.reduce((s, sl) => s + sl.duration, 0);

  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── Audio ──────────────────────────────────────────────────────────────────
  const audioCtx = new AudioContext();
  // Débloquer l'AudioContext (politique autoplay navigateur)
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
  const audioDest = audioCtx.createMediaStreamDestination();

  // Toujours générer le synth ambiant (fallback / sous-couche)
  buildCinematicAudio(audioCtx, audioDest, thm.id, videoType, totalSec);

  // MusicGen IA (si token HF fourni)
  if (hfToken) {
    onStage?.("🎵 Génération de la musique IA (MusicGen)…");
    try {
      const musicRes = await fetch("/api/generate-music", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-hf-token": hfToken },
        body: JSON.stringify({ videoType, theme: thm.id, duration: totalSec }),
        signal: AbortSignal.timeout(130_000),
      });
      if (musicRes.ok) {
        const audioData = await musicRes.arrayBuffer();
        const decodedAudio = await audioCtx.decodeAudioData(audioData);
        const musicSrc = audioCtx.createBufferSource();
        musicSrc.buffer = decodedAudio;
        musicSrc.loop = decodedAudio.duration < totalSec;
        const musicGain = audioCtx.createGain();
        // IA music plus fort, synth ambiant en sous-couche légère
        musicGain.gain.setValueAtTime(0, audioCtx.currentTime);
        musicGain.gain.linearRampToValueAtTime(0.75, audioCtx.currentTime + 2);
        musicGain.gain.setValueAtTime(0.75, audioCtx.currentTime + totalSec - 2);
        musicGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + totalSec);
        musicSrc.connect(musicGain); musicGain.connect(audioDest);
        musicSrc.start();
      }
    } catch (e) { console.warn("MusicGen indisponible, synth ambiant utilisé:", e); }
  }

  // ── Vidéo Pexels en fond ────────────────────────────────────────────────────
  let bgVideo: HTMLVideoElement | null = null;
  if (pexelsKey) {
    onStage?.("🎬 Chargement du fond vidéo cinématique (Pexels)…");
    try {
      const pvRes = await fetch("/api/pexels-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-pexels-key": pexelsKey },
        body: JSON.stringify({ category: bookCategory, title: bookTitle }),
      });
      const pvData = await pvRes.json() as { url?: string };
      if (pvData.url) bgVideo = await loadBgVideo(pvData.url);
    } catch (e) { console.warn("Pexels indisponible:", e); }
  }

  // Stream combiné vidéo + audio
  const mime = ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"]
    .find(m => MediaRecorder.isTypeSupported(m)) ?? "video/webm";
  const combined = new MediaStream([
    ...canvas.captureStream(fps).getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ]);
  const rec = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = []; rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  // Chargement couverture
  let cImg: HTMLImageElement | null = null;
  if (coverDataUrl) {
    cImg = await new Promise(r => {
      const i = new window.Image(); i.onload = () => r(i);
      i.onerror = () => r(null as unknown as HTMLImageElement); i.src = coverDataUrl;
    });
  }

  rec.start();
  let gFrame = 0;
  const TRANS = Math.round(fps * 0.45); // frames de transition

  for (const sl of slides) {
    const tf = Math.round(sl.duration * fps);
    for (let f = 0; f < tf; f++, gFrame++) {
      const p = f / tf;
      const fadeIn  = f < TRANS ? easeOut(f / TRANS) : 1;
      const fadeOut = f > tf - TRANS ? easeOut((tf - f) / TRANS) : 1;
      const fade = Math.min(fadeIn, fadeOut);

      // ── Fond ──────────────────────────────────────────────────────────────
      if (bgVideo && bgVideo.readyState >= 2) {
        // Fond vidéo Pexels — crop center-fill
        const vw = bgVideo.videoWidth || W, vh = bgVideo.videoHeight || H;
        const scale = Math.max(W / vw, H / vh);
        const dw = vw * scale, dh = vh * scale;
        ctx.drawImage(bgVideo, (W - dw) / 2, (H - dh) / 2, dw, dh);
        // Overlay couleur du thème (50% opacité pour garder identité)
        const bg2 = ctx.createLinearGradient(0, 0, W*0.6, H);
        bg2.addColorStop(0, thm.bg1 + "99"); bg2.addColorStop(1, thm.bg2 + "bb");
        ctx.fillStyle = bg2; ctx.fillRect(0, 0, W, H);
      } else {
        // ── Fond cinématique animé (gradient multicouche + bokeh) ──────────
        const t01 = gFrame / Math.max(1, slides.reduce((s,sl)=>s+sl.duration,0) * fps);
        // Fond base
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, thm.bg1); bg.addColorStop(1, thm.bg2);
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        // Lueur principale qui pulse doucement
        const pulseR = W * (0.55 + 0.08 * Math.sin(gFrame * 0.018));
        const glowY = H * (0.38 + 0.06 * Math.sin(gFrame * 0.011));
        const glow = ctx.createRadialGradient(W/2, glowY, 0, W/2, glowY, pulseR);
        glow.addColorStop(0, thm.accent + "28"); glow.addColorStop(0.5, thm.accent + "0e"); glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
        // Deuxième lueur décalée
        const glow2 = ctx.createRadialGradient(W*0.8, H*0.7, 0, W*0.8, H*0.7, W*0.45);
        glow2.addColorStop(0, thm.bg2 + "cc"); glow2.addColorStop(1, "transparent");
        ctx.fillStyle = glow2; ctx.fillRect(0, 0, W, H);
        // Bokeh — cercles flous animés
        for (let i = 0; i < 18; i++) {
          const bx = ((i * 137.5 + gFrame * 0.12) % W);
          const by = ((i * 97.3  + gFrame * 0.08) % H);
          const br = 8 + (i % 5) * 14;
          const ba = 0.04 + 0.04 * Math.abs(Math.sin(gFrame * 0.022 + i));
          const bg3 = ctx.createRadialGradient(bx, by, 0, bx, by, br);
          bg3.addColorStop(0, thm.accent + Math.round(ba * 255).toString(16).padStart(2, "0"));
          bg3.addColorStop(1, "transparent");
          ctx.fillStyle = bg3; ctx.fillRect(bx-br, by-br, br*2, br*2);
        }
        // Lignes horizontales subtiles (scanlines cinéma)
        ctx.globalAlpha = 0.03;
        for (let y = 0; y < H; y += 4) {
          ctx.fillStyle = "#000"; ctx.fillRect(0, y, W, 2);
        }
        ctx.globalAlpha = 1;
        // Dégradé bas (shadow pour texte)
        const shadowGrad = ctx.createLinearGradient(0, H*0.55, 0, H);
        shadowGrad.addColorStop(0, "transparent"); shadowGrad.addColorStop(1, "rgba(0,0,0,0.55)");
        ctx.fillStyle = shadowGrad; ctx.fillRect(0, H*0.55, W, H*0.45);
        // Ligne de lumière en haut
        ctx.globalAlpha = 0.12 + 0.06 * Math.sin(gFrame * 0.025);
        const topLine = ctx.createLinearGradient(0, 0, W, 0);
        topLine.addColorStop(0, "transparent"); topLine.addColorStop(0.5, thm.accent); topLine.addColorStop(1, "transparent");
        ctx.fillStyle = topLine; ctx.fillRect(0, 0, W, 1.5);
        ctx.globalAlpha = 1;
        // Étoiles/particules fines (constellation)
        for (let i = 0; i < 55; i++) {
          const sx = (i * 233.7 + t01 * 8) % W;
          const sy = (i * 151.3) % H;
          const sa = (0.15 + 0.25 * Math.abs(Math.sin(gFrame * 0.03 + i))) * (1 - i/80);
          const sr = 0.4 + (i%4) * 0.35;
          ctx.globalAlpha = sa; ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      drawParticles(ctx, W, H, thm.accent, gFrame);

      // ── Couverture avec Ken Burns ─────────────────────────────────────────
      if (cImg) {
        const bigStyle = ["title","intro","big","climax"].includes(sl.style);
        const maxW = bigStyle ? W * 0.50 : W * 0.26;
        const aspect = cImg.naturalHeight / Math.max(1, cImg.naturalWidth);
        const cW = maxW, cH = cW * aspect;
        const cX = bigStyle ? (W - cW) / 2 : W * 0.70;
        const cY = bigStyle ? H * 0.10 : H * 0.16;
        // Ken Burns: zoom lent
        const zoom = 1 + 0.065 * easeInOut(p);
        const zW = cW*zoom, zH = cH*zoom;
        ctx.globalAlpha = fade * 0.92;
        ctx.shadowColor = thm.accent; ctx.shadowBlur = 36 * fade;
        ctx.drawImage(cImg, cX-(zW-cW)/2, cY-(zH-cH)/2, zW, zH);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }

      // ── Effets post-process ───────────────────────────────────────────────
      drawGrain(ctx, W, H);
      drawVignette(ctx, W, H);

      // ── Ligne accent ──────────────────────────────────────────────────────
      const hasBigCover = cImg && ["title","intro","big"].includes(sl.style);
      const lineY = hasBigCover ? H * 0.70 : H * 0.09;
      drawAccentLine(ctx, W, lineY, p, thm.accent);

      // ── Texte ─────────────────────────────────────────────────────────────
      const textCenterY = hasBigCover ? H * 0.77 : H * 0.50;
      ctx.globalAlpha = fade;

      if (sl.style === "cta") {
        const ph = Math.round(H * 0.075), pw = W * 0.80;
        const px = (W-pw)/2, py = textCenterY - ph/2;
        ctx.globalAlpha = fade * 0.95;
        ctx.shadowColor = thm.accent; ctx.shadowBlur = 28 * fade;
        ctx.fillStyle = thm.accent;
        ctx.beginPath(); ctx.roundRect(px, py, pw, ph, ph/2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.round(W*0.041)}px system-ui`;
        ctx.textAlign = "center"; ctx.globalAlpha = fade;
        ctx.fillText(sl.text.substring(0,55), W/2, py + ph*0.66);
      } else {
        const isBig = ["big","title","climax","intro"].includes(sl.style);
        const fs = isBig ? W * 0.078 : W * 0.055;
        // Reveal progressif des mots
        const words = sl.text.split(" ");
        const shown = Math.max(1, Math.ceil(words.length * Math.min(1, p * 2.6)));
        const visText = words.slice(0, shown).join(" ");
        ctx.font = `bold ${Math.round(fs)}px system-ui`; ctx.textAlign = "center";
        const lines = wrapText(ctx, visText || " ", W * 0.86);
        const lh = fs * 1.42;
        const sy = textCenterY - (lines.length * lh) / 2;

        lines.forEach((ln, li) => {
          const wordFade = shown >= words.length ? 1 : (li < lines.length - 1 ? 1 : Math.min(1, (p*2.6 - Math.floor(p*2.6*0.9))));
          ctx.globalAlpha = fade * Math.max(0.18, wordFade);
          const offY = (1 - fadeIn) * H * 0.03;
          const lx = W/2, ly = sy + li*lh + offY;
          if (isBig) {
            // Ombre de profondeur
            ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 10;
            ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillText(ln, lx+2, ly+2);
            ctx.shadowBlur = 0;
            // Halo accent
            ctx.shadowColor = thm.accent; ctx.shadowBlur = 32 * fade;
            ctx.fillStyle = thm.accent; ctx.fillText(ln, lx, ly);
            ctx.shadowBlur = 0;
          } else {
            ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 7;
            ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillText(ln, lx+1.5, ly+1.5);
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#ffffff"; ctx.fillText(ln, lx, ly);
          }
        });

        if (sl.subtext && p > 0.32) {
          ctx.font = `${Math.round(W*0.033)}px system-ui`;
          ctx.globalAlpha = fade * Math.min(1, (p-0.32)/0.22);
          ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 4;
          ctx.fillStyle = "rgba(255,255,255,0.62)";
          wrapText(ctx, sl.subtext, W*0.80).forEach((l, i) =>
            ctx.fillText(l, W/2, sy + lines.length*lh + W*0.040*(i+1))
          );
          ctx.shadowBlur = 0;
        }
      }
      ctx.globalAlpha = 1;

      // ── Letterbox ─────────────────────────────────────────────────────────
      drawLetterbox(ctx, W, H, barH);

      // ── Fondu noir de transition ───────────────────────────────────────────
      if (fade < 0.98) {
        ctx.globalAlpha = (1 - fade) * 0.92;
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      await new Promise(r => setTimeout(r, 1000 / fps));
    }
  }

  await new Promise<void>(r => { rec.onstop = () => r(); rec.stop(); });
  try { await audioCtx.close(); } catch { /* ignore */ }
  try { bgVideo?.pause(); } catch { /* ignore */ }
  onStage?.("✅ Vidéo prête !");
  return new Blob(chunks, { type: mime });
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AutoPostPage() {
  const [tab, setTab] = useState<Tab>("compose");
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState("");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [serverInfo, setServerInfo] = useState<Record<string, unknown>>({});
  const [checking, setChecking] = useState(false);

  // Video
  const [videoType, setVideoType] = useState("teaser");
  const [videoFormat, setVideoFormat] = useState("portrait");
  const [videoTheme, setVideoTheme] = useState("dark");
  const [generating, setGenerating] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [script, setScript] = useState<Record<string, unknown> | null>(null);
  const [activeVariant, setActiveVariant] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStage, setRenderStage] = useState("");
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [videoCaption, setVideoCaption] = useState("");

  // Compose
  const [postText, setPostText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["instagram", "tiktok"]);
  const [includeCover, setIncludeCover] = useState(true);
  const [scheduleAt, setScheduleAt] = useState("");
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<Record<string, { ok: boolean; error?: string }> | null>(null);

  // Queue
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueFilter, setQueueFilter] = useState<"all" | "pending" | "done">("all");

  const [useWan, setUseWan] = useState(false);
  const [wanAvailable, setWanAvailable] = useState<boolean | null>(null);

  // Credentials (stored in localStorage, never server-side)
  const [creds, setCreds] = useState<Creds>({ instagram: { username: "", password: "" }, tiktok_session: false, twitter_session: false, facebook_session: false, pexelsKey: "", hfToken: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loginLoading, setLoginLoading] = useState<string | null>(null);
  const [loginMsg, setLoginMsg] = useState("");

  useEffect(() => {
    setBooks(getBooks());
    const saved = localStorage.getItem("ba_creds");
    if (saved) setCreds(JSON.parse(saved));
    checkConnection();
  }, []);

  const saveCreds = (next: Creds) => { setCreds(next); localStorage.setItem("ba_creds", JSON.stringify(next)); };

  const book = books.find(b => b.id === selectedBook);
  const fmt = FORMATS.find(f => f.id === videoFormat) || FORMATS[0];
  const thm = THEMES.find(t => t.id === videoTheme) || THEMES[0];

  // ── Server connection ────────────────────────────────────────────────────────
  const checkConnection = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch(`${SERVER}/api/book/status`, { signal: AbortSignal.timeout(3000) });
      const data = await res.json() as Record<string, unknown>;
      setServerInfo(data); setConnected(true);
      // Vérifier disponibilité Wan2.1
      try {
        const wRes = await fetch(`${SERVER}/api/book/wan-status`, { signal: AbortSignal.timeout(3000) });
        const wData = await wRes.json() as { available?: boolean };
        setWanAvailable(wData.available ?? false);
      } catch { setWanAvailable(false); }
    } catch { setConnected(false); setWanAvailable(false); }
    setChecking(false);
  }, []);

  const loadQueue = useCallback(async () => {
    if (!connected) return;
    setLoadingQueue(true);
    try {
      const res = await fetch(`${SERVER}/api/book/queue?status=all`);
      setQueue(await res.json() as QueueItem[]);
    } catch { /* ignore */ }
    setLoadingQueue(false);
  }, [connected]);

  useEffect(() => { if (tab === "queue") loadQueue(); }, [tab, loadQueue]);

  // ── Login sessions (open browser window for one-time login) ──────────────────
  const loginSession = async (platform: string) => {
    setLoginLoading(platform);
    setLoginMsg(`Ouverture du navigateur pour ${platform}… Connecte-toi puis le serveur sauvegarde la session.`);
    try {
      const res = await fetch(`${SERVER}/api/login/${platform}`, { method: "POST", signal: AbortSignal.timeout(300_000) });
      const data = await res.json() as Record<string, string>;
      if (data.ok) {
        saveCreds({ ...creds, [`${platform}_session`]: true } as Creds);
        setLoginMsg(`✓ Session ${platform} sauvegardée — publication automatique activée`);
      } else {
        setLoginMsg(`Erreur: ${data.message || "inconnue"}`);
      }
    } catch (e) { setLoginMsg(`Erreur: ${String(e)}`); }
    setLoginLoading(null);
  };

  // ── Post now ─────────────────────────────────────────────────────────────────
  const postNow = async () => {
    if (!postText.trim() || !selectedPlatforms.length || !connected) return;
    setPosting(true); setPostResult(null);
    try {
      const body: Record<string, unknown> = {
        text: postText, platforms: selectedPlatforms,
        credentials: { instagram: creds.instagram },
      };
      if (includeCover && book?.coverDataUrl) body.image_base64 = book.coverDataUrl;
      const res = await fetch(`${SERVER}/api/book/post`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json() as { results: Record<string, { ok: boolean; error?: string }> };
      setPostResult(data.results);
      if (Object.values(data.results).some(r => r.ok)) setPostText("");
    } catch (e) { setPostResult({ _error: { ok: false, error: String(e) } }); }
    setPosting(false);
  };

  // ── Add to queue ─────────────────────────────────────────────────────────────
  const addToQueue = async () => {
    if (!postText.trim() || !selectedPlatforms.length) return;
    if (connected) {
      try {
        const body: Record<string, unknown> = {
          title: book?.title || "Post",
          text: postText, platforms: selectedPlatforms,
          credentials: { instagram: creds.instagram },
          scheduled_at: scheduleAt || null,
        };
        if (includeCover && book?.coverDataUrl) body.image_base64 = book.coverDataUrl;
        await fetch(`${SERVER}/api/book/queue`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        await loadQueue(); setPostText(""); setScheduleAt("");
      } catch (e) { console.error(e); }
    }
  };

  const postNextInQueue = async () => {
    try { await fetch(`${SERVER}/api/book/post-next`, { method: "POST" }); setTimeout(loadQueue, 4000); }
    catch (e) { console.error(e); }
  };

  const deleteFromQueue = async (id: string) => {
    try { await fetch(`${SERVER}/api/book/queue/${id}`, { method: "DELETE" }); setQueue(q => q.filter(x => x.id !== id)); }
    catch { /* ignore */ }
  };

  // ── Video ─────────────────────────────────────────────────────────────────────
  const generateScript = async () => {
    if (!book) return;
    if (!creds.hfToken) {
      setScriptError("Token HuggingFace manquant — va dans l'onglet Comptes et ajoute ton token hf_... (gratuit sur huggingface.co/settings/tokens)");
      return;
    }
    setGenerating(true); setScript(null); setVideoBlobUrl(null); setScriptError(null); setActiveVariant(0);
    try {
      const res = await fetch("/api/video-script", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-hf-token": creds.hfToken },
        body: JSON.stringify({
          type: videoType,
          bookTitle: book.title,
          category: book.category,
          description: (book as unknown as Record<string, unknown>).description as string | undefined,
          targetAudience: (book as unknown as Record<string, unknown>).targetAudience as string | undefined,
          themes: (book as unknown as Record<string, unknown>).themes as string | undefined,
          price: (book as unknown as Record<string, unknown>).price as number | undefined,
          chapters: book.chapters,
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok || data.error) {
        const detail = data.detail ? ` — ${String(data.detail)}` : "";
        throw new Error(String(data.error || `Erreur serveur ${res.status}`) + detail);
      }
      setScript(data);
      const caps = data.captions as { instagram?: string } | undefined;
      const variantCap = (data.variants as { caption_instagram?: string }[])?.[0]?.caption_instagram;
      setVideoCaption(caps?.instagram || variantCap || "");
    } catch (e) {
      console.error("[generateScript]", e);
      const msg = e instanceof Error ? e.message : String(e);
      setScriptError(msg.includes("AbortError") ? "Timeout (60s) — réessaie ou vérifie ta clé Groq dans .env.local" : msg);
    }
    setGenerating(false);
  };

  // ── Construire les slides depuis le script IA ─────────────────────────────
  const buildSlides = (): Slide[] => {
    if (!script) return [];
    let slides: Slide[] = [];
    if (videoType === "teaser") {
      const raw = (script.slides as Slide[]) || [];
      const hooks = script.hooks as string[] | undefined;
      slides = hooks?.[0]
        ? [{ text: hooks[0], duration: 2.5, style: "big" }, ...raw]
        : raw;
    } else if (videoType === "promo") {
      const angle = activeVariant === 0
        ? (script.angle_a as { slides: Slide[] } | undefined)?.slides
        : (script.angle_b as { slides: Slide[] } | undefined)?.slides;
      slides = angle || [];
    } else if (videoType === "booktrailer") {
      slides = ((script.scenes as {text:string;narration?:string;duration:number;style:string}[]) || [])
        .map(s => ({ text: s.text, subtext: s.narration, duration: s.duration, style: s.style }));
    } else if (videoType === "citation") {
      const v = (script.variants as {intro:string;quote:string;punchline:string}[])?.[activeVariant];
      if (v) slides = [
        { text: v.intro || "", duration: 3, style: "normal" },
        { text: `"${v.quote}"`, duration: 6, style: "big" },
        { text: v.punchline || "", duration: 3, style: "normal" },
      ];
    } else if (videoType === "shorts") {
      slides = ((script.onscreenText as string[]) || []).map((t, i) => ({ text: t, duration: 7, style: i === 0 ? "big" : "normal" }));
      const hooksS = script.hooks as string[] | undefined;
      if (hooksS?.[0]) slides = [{ text: hooksS[0], duration: 3, style: "intro" }, ...slides];
    }
    if (!slides.length) slides = [{ text: book?.title || "", duration: 3, style: "title" }];
    slides.push({ text: book?.title || "", duration: 4, style: "title" });
    return slides;
  };

  // ── Génération HD via serveur Python (imageio + Pillow → vrai MP4) ─────────
  const renderVideoHD = async (slides: Slide[]) => {
    setRenderStage("🎵 Génération musique IA…");
    // Générer la musique d'abord si token HF
    let musicB64: string | null = null;
    if (creds.hfToken) {
      try {
        const totalSec = slides.reduce((s, sl) => s + sl.duration, 0);
        const mRes = await fetch("/api/generate-music", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-hf-token": creds.hfToken },
          body: JSON.stringify({ videoType, theme: videoTheme, duration: totalSec }),
          signal: AbortSignal.timeout(130_000),
        });
        if (mRes.ok) {
          const ab = await mRes.arrayBuffer();
          musicB64 = "data:audio/flac;base64," + btoa(String.fromCharCode(...new Uint8Array(ab)));
        }
      } catch (e) { console.warn("MusicGen:", e); }
    }
    setRenderProgress(20);
    setRenderStage(useWan ? "🤖 Génération fond Wan2.1 (peut prendre 1-3 min)…" : "🎬 Rendu vidéo HD côté serveur…");

    const body = {
      slides,
      theme: videoTheme,
      format: videoFormat,
      book_title: book?.title || "",
      book_category: book?.category || "",
      cover_base64: book?.coverDataUrl || null,
      pexels_key: creds.pexelsKey || null,
      hf_token: creds.hfToken || null,
      music_base64: musicB64,
      use_wan: useWan && (wanAvailable || !!creds.hfToken),
    };

    const ticker = setInterval(() => setRenderProgress(p => Math.min(90, p + 2)), 800);
    const res = await fetch(`${SERVER}/api/book/generate-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300_000),
    });
    clearInterval(ticker);

    if (!res.ok) {
      const err = await res.json() as { error?: string };
      throw new Error(err.error || `Erreur serveur ${res.status}`);
    }
    setRenderProgress(95);
    const videoBlob = await res.blob();
    return URL.createObjectURL(videoBlob);
  };

  // ── Génération Canvas (fallback navigateur) ───────────────────────────────
  const renderVideoCanvas = async (slides: Slide[]) => {
    const total = slides.reduce((s, sl) => s + sl.duration, 0);
    let elapsed = 0;
    const t = setInterval(() => { elapsed += 0.4; setRenderProgress(Math.min(90, Math.round(elapsed / total * 100))); }, 400);
    const blob = await renderVideoToBlob(
      slides, fmt, thm, book?.coverDataUrl, videoType, 30,
      creds.pexelsKey || undefined, creds.hfToken || undefined,
      book?.category, book?.title, (stage) => setRenderStage(stage)
    );
    clearInterval(t);
    return URL.createObjectURL(blob);
  };

  const renderVideo = async () => {
    if (!script) return;
    setRendering(true); setRenderProgress(0); setVideoBlobUrl(null); setRenderStage("🎬 Préparation…");
    try {
      const slides = buildSlides();
      let url: string;
      if (connected) {
        // Mode HD : serveur Python (imageio + Pillow → vrai MP4)
        url = await renderVideoHD(slides);
      } else {
        // Fallback : Canvas navigateur
        url = await renderVideoCanvas(slides);
      }
      setRenderProgress(100);
      setVideoBlobUrl(url);
    } catch (e) {
      console.error(e);
      setRenderStage(`❌ Erreur : ${String(e)}`);
    }
    setRendering(false);
  };

  const downloadVideo = () => {
    if (!videoBlobUrl) return;
    const ext = connected ? "mp4" : "webm";
    const a = document.createElement("a"); a.href = videoBlobUrl;
    a.download = `${book?.title || "video"}_${videoType}.${ext}`; a.click();
  };

  const generateCaption = () => {
    if (!book) return;
    const t = [
      `📚 "${book.title}" — ${book.category}\n\n🔥 Ce livre va changer ta façon de voir les choses.\n\nLien en bio 👇\n\n#livre #booktok #lecture #ebook #auteur`,
      `✨ "${book.title}" est disponible maintenant !\n\n${book.chapters?.slice(0, 3).map(c => `✅ ${c.title}`).join("\n") || ""}\n\n📩 Lien en bio\n\n#livrefrancais #coaching #développementpersonnel`,
      `🚀 "${book.title}" — Tout ce que j'ai appris, dans un seul livre.\n\nCommente "OUI" pour recevoir le lien 👇\n\n#booktok #auteur #ebook #motivation`,
    ];
    setPostText(t[Math.floor(Math.random() * t.length)]);
  };

  const pendingCount = queue.filter(q => q.status === "pending").length;
  const filteredQueue = queue.filter(q => queueFilter === "all" ? true : q.status === queueFilter);

  const statusBadge = () => {
    if (checking) return <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl text-white/40 text-xs"><Loader2 size={12} className="animate-spin" /> Connexion…</div>;
    if (connected) return <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs"><Wifi size={12} /> Serveur connecté</div>;
    return <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white/40 text-xs"><WifiOff size={12} /> Serveur hors ligne</div>;
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center"><Video size={20} className="text-white" /></div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Studio Social</h1>
          </div>
          <p className="text-white/50">Vidéos IA · Publication automatique · File programmée</p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge()}
          <button onClick={checkConnection} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl"><RefreshCw size={13} className={`text-white/40 ${checking ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      {/* Server offline banner */}
      {connected === false && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Terminal size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-amber-300 font-semibold text-sm">Lance le serveur Python pour la publication automatique</p>
              <div className="mt-2 space-y-1">
                <code className="block bg-black/40 text-amber-200 text-xs px-3 py-1.5 rounded-lg">pip install fastapi uvicorn instagrapi playwright</code>
                <code className="block bg-black/40 text-amber-200 text-xs px-3 py-1.5 rounded-lg">python -m playwright install chromium</code>
                <code className="block bg-black/40 text-emerald-300 text-xs px-3 py-1.5 rounded-lg font-bold">python social_server.py</code>
              </div>
              <p className="text-white/40 text-xs mt-2">Le fichier social_server.py est dans le dossier de ton projet BookAutomator.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 mb-6 w-fit overflow-x-auto">
        {([
          { id: "compose" as Tab, icon: Send,    label: "Composer & Poster" },
          { id: "queue"   as Tab, icon: List,    label: `File (${pendingCount})` },
          { id: "video"   as Tab, icon: Film,    label: "Vidéos IA" },
          { id: "accounts"as Tab, icon: KeyRound,label: "Comptes" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${tab === id ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white" : "text-white/40 hover:text-white"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ══ COMPOSE ══════════════════════════════════════════════════════════ */}
      {tab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {/* Book picker */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                <option value="">— Sélectionne un livre (optionnel) —</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title} ({b.category})</option>)}
              </select>
              {book && (
                <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl">
                  {book.coverDataUrl ? <img src={book.coverDataUrl} alt="" className="w-8 h-11 object-cover rounded" /> : <div className="w-8 h-11 bg-white/10 rounded" />}
                  <div className="flex-1"><p className="text-white text-sm font-medium">{book.title}</p></div>
                  <button onClick={generateCaption} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl text-xs hover:bg-purple-500/30 transition-colors">
                    <Zap size={11} /> Générer légende
                  </button>
                </div>
              )}
            </div>

            {/* Text */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-white/50 text-xs">Texte du post</label>
                <span className="text-white/25 text-xs">{postText.length}</span>
              </div>
              <textarea value={postText} onChange={e => setPostText(e.target.value)}
                placeholder="Écris ou génère ta légende..." rows={7}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 resize-none" />
            </div>

            {/* Schedule */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
              <label className="text-white/50 text-xs mb-2 block">Programmer à (optionnel)</label>
              <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={postNow} disabled={posting || !postText.trim() || !selectedPlatforms.length || !connected}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:opacity-40 text-white rounded-2xl font-semibold text-sm transition-all">
                {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {posting ? "Publication…" : "Poster maintenant"}
              </button>
              <button onClick={addToQueue} disabled={!postText.trim() || !selectedPlatforms.length || !connected}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 text-white/60 rounded-2xl text-sm font-medium transition-all">
                <Clock size={15} /> Programmer
              </button>
            </div>

            {/* Result */}
            {postResult && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                {Object.entries(postResult).map(([platform, res]) => (
                  <div key={platform} className={`flex items-center gap-3 p-2.5 rounded-xl ${res.ok ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                    {res.ok ? <CheckCircle size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-red-400" />}
                    <span className="text-white text-sm capitalize font-medium">{platform}</span>
                    {res.ok ? <span className="text-emerald-400 text-xs ml-auto">Publié ✓</span> : <span className="text-red-300 text-xs ml-auto truncate max-w-48">{res.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: platform + cover */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
              <label className="text-white/50 text-xs mb-2 block">Plateformes</label>
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setSelectedPlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${selectedPlatforms.includes(p.id) ? p.bg + " " + p.color : "bg-white/[0.02] border-white/[0.06] text-white/30"}`}>
                  <span className="flex-1 text-left">{p.label}</span>
                  {selectedPlatforms.includes(p.id) && <Check size={14} />}
                </button>
              ))}
            </div>
            <button onClick={() => setIncludeCover(v => !v)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${includeCover ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "bg-white/[0.02] border-white/[0.06] text-white/30"}`}>
              <Image size={16} /> <span className="flex-1 text-left">Inclure la couverture</span>
              {includeCover && <Check size={14} />}
            </button>

            {/* Server status */}
            {connected && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-1.5">
                <p className="text-white/40 text-xs font-semibold">Serveur</p>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded-lg ${(serverInfo.has_instagrapi as boolean) ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/30"}`}>Instagram {(serverInfo.has_instagrapi as boolean) ? "✓" : "—"}</span>
                  <span className={`text-xs px-2 py-1 rounded-lg ${(serverInfo.has_playwright as boolean) ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/30"}`}>TikTok/X {(serverInfo.has_playwright as boolean) ? "✓" : "—"}</span>
                </div>
                <p className="text-white/25 text-xs">{typeof serverInfo.posted_today === "number" ? serverInfo.posted_today : 0} posté(s) aujourd&apos;hui</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ QUEUE ════════════════════════════════════════════════════════════ */}
      {tab === "queue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
              {(["all", "pending", "done"] as const).map(f => (
                <button key={f} onClick={() => setQueueFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${queueFilter === f ? "bg-violet-500 text-white" : "text-white/40 hover:text-white"}`}>
                  {f === "all" ? "Tous" : f === "pending" ? `Attente (${pendingCount})` : "Publiés"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={postNextInQueue} disabled={!connected || pendingCount === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-medium disabled:opacity-40 transition-colors">
                <Play size={12} /> Poster le suivant
              </button>
              <button onClick={loadQueue} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl"><RefreshCw size={13} className={`text-white/40 ${loadingQueue ? "animate-spin" : ""}`} /></button>
            </div>
          </div>
          {filteredQueue.length === 0 ? (
            <div className="text-center py-16"><List size={32} className="text-white/15 mx-auto mb-3" /><p className="text-white/30">File vide</p></div>
          ) : (
            <div className="space-y-2">
              {filteredQueue.map(item => (
                <div key={item.id} className={`bg-white/[0.02] border rounded-2xl p-4 flex items-start gap-4 ${item.status === "done" ? "border-emerald-500/20" : item.status === "error" ? "border-red-500/20" : item.status === "posting" ? "border-yellow-500/30" : "border-white/[0.06]"}`}>
                  <div className="mt-0.5 shrink-0">
                    {item.status === "done" && <CheckCircle size={14} className="text-emerald-400" />}
                    {item.status === "error" && <XCircle size={14} className="text-red-400" />}
                    {item.status === "posting" && <Loader2 size={14} className="text-yellow-400 animate-spin" />}
                    {item.status === "pending" && <Clock size={14} className="text-white/30" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {item.platforms.map(p => { const pl = PLATFORMS.find(x => x.id === p); return <span key={p} className={`text-xs px-2 py-0.5 rounded-full border ${pl?.bg || "bg-white/10 border-white/20"} ${pl?.color || "text-white/50"}`}>{pl?.label || p}</span>; })}
                    </div>
                    <p className="text-white/60 text-xs line-clamp-2">{item.text}</p>
                    <p className="text-white/20 text-xs mt-1">{new Date(item.created_at).toLocaleString("fr-FR")}</p>
                    {item.results && (
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {Object.entries(item.results).map(([p, r]) => (
                          <span key={p} className={`text-xs px-2 py-0.5 rounded-lg ${r.ok ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                            {p} {r.ok ? "✓" : "✗"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {item.status === "pending" && (
                    <button onClick={() => deleteFromQueue(item.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg shrink-0">
                      <Trash2 size={12} className="text-white/25 hover:text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ VIDEO ════════════════════════════════════════════════════════════ */}
      {tab === "video" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <h2 className="text-white font-semibold text-sm">Livre</h2>
              <select value={selectedBook} onChange={e => { setSelectedBook(e.target.value); setScript(null); setVideoBlobUrl(null); }}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                <option value="">— Sélectionner —</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
              <h2 className="text-white font-semibold text-sm mb-2">Type</h2>
              {VIDEO_TYPES.map(vt => (
                <button key={vt.id} onClick={() => { setVideoType(vt.id); setScript(null); setVideoBlobUrl(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${videoType === vt.id ? "bg-white/8 border-violet-500/40" : "bg-white/[0.02] border-white/[0.05]"}`}>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${vt.color} flex items-center justify-center shrink-0`}><vt.icon size={14} className="text-white" /></div>
                  <div><p className={`text-sm font-medium ${videoType === vt.id ? "text-white" : "text-white/60"}`}>{vt.label} <span className="text-white/30 text-xs">{vt.duration}</span></p><p className="text-white/30 text-xs">{vt.desc}</p></div>
                </button>
              ))}
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {FORMATS.map(f => <button key={f.id} onClick={() => setVideoFormat(f.id)} className={`px-2 py-1.5 rounded-lg border text-xs transition-all ${videoFormat === f.id ? "border-violet-500/40 bg-violet-500/10 text-white" : "border-white/[0.05] text-white/40"}`}>{f.label}</button>)}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {THEMES.map(t => <button key={t.id} onClick={() => setVideoTheme(t.id)} className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${videoTheme === t.id ? "border-violet-500/50" : "border-white/[0.05]"}`}><div className="w-full h-5 rounded" style={{ background: `linear-gradient(135deg, ${t.bg1}, ${t.bg2})`, border: `1.5px solid ${t.accent}50` }} /><span className="text-xs text-white/40">{t.label}</span></button>)}
              </div>

              {/* ── Fond IA ─────────────────────────────────────────────── */}
              {connected && (
                <div className="border border-white/[0.06] rounded-xl p-3 space-y-2">
                  <p className="text-white/40 text-xs font-medium">Fond vidéo</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: false, label: "Gradient", sub: "Toujours dispo", active: !useWan },
                      { id: true,  label: "Wan2.1 IA", sub: (wanAvailable || creds.hfToken) ? "IA générative 🤖" : "Non installé", active: useWan },
                    ].map(opt => (
                      <button key={String(opt.id)}
                        onClick={() => { if (!opt.id || wanAvailable) setUseWan(opt.id as boolean); }}
                        disabled={opt.id === true && !wanAvailable && !creds.hfToken}
                        className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border text-xs transition-all disabled:opacity-30 ${opt.active ? "border-violet-500/50 bg-violet-500/10 text-white" : "border-white/[0.05] text-white/40"}`}>
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-white/30 text-[10px]">{opt.sub}</span>
                      </button>
                    ))}
                    {creds.pexelsKey && (
                      <button onClick={() => setUseWan(false)}
                        className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border text-xs transition-all ${!useWan && creds.pexelsKey ? "border-blue-500/50 bg-blue-500/10 text-blue-300" : "border-white/[0.05] text-white/40"}`}>
                        <span className="font-medium">Pexels</span>
                        <span className="text-white/30 text-[10px]">Stock vidéo</span>
                      </button>
                    )}
                  </div>
                  {useWan && wanAvailable && (
                    <p className="text-violet-400/70 text-[10px]">🤖 Wan2.1 génère un fond IA unique pour ce livre. Peut prendre 1–5 min.</p>
                  )}
                  {useWan && !wanAvailable && (
                    <p className="text-amber-400/70 text-[10px]">Lance: <code className="bg-black/30 px-1 rounded">pip install gradio_client</code> puis redémarre le serveur</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <button onClick={generateScript} disabled={generating || !book}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:opacity-40 text-white rounded-2xl font-semibold transition-all">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? "Génération du script IA…" : "Générer le script IA"}
            </button>
            {!book && (
              <p className="text-center text-white/30 text-xs">Sélectionne un livre dans le panneau gauche</p>
            )}
            {scriptError && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 space-y-2">
                <p className="text-red-400 text-xs font-semibold">❌ {scriptError.includes("Token HuggingFace") ? "Token HuggingFace manquant" : "Erreur de génération"}</p>
                {scriptError.includes("Token HuggingFace") ? (
                  <>
                    <p className="text-white/60 text-xs">Ton token HuggingFace n&apos;est pas encore sauvegardé sur ce navigateur.</p>
                    <button onClick={() => setTab("accounts")}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-medium hover:bg-purple-500/30 transition-colors">
                      <KeyRound size={12} /> Aller dans Comptes → Clés IA
                    </button>
                  </>
                ) : (
                  <p className="text-red-300/80 text-xs leading-relaxed">{scriptError}</p>
                )}
              </div>
            )}
            {script && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3 max-h-96 overflow-y-auto">
                {videoType === "citation" && Array.isArray(script.variants) && (
                  <div className="flex gap-1.5 flex-wrap">
                    {(script.variants as {style_name?:string}[]).map((v, i) => (
                      <button key={i} onClick={() => setActiveVariant(i)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${activeVariant === i ? "bg-amber-500/30 text-amber-300" : "bg-white/5 text-white/40"}`}>
                        {v.style_name || `Var. ${i + 1}`}
                      </button>
                    ))}
                  </div>
                )}
                <div className="space-y-1.5">
                  {videoType === "teaser" ? (
                    <>
                      {Array.isArray(script.hooks) ? (
                        <div className="space-y-1.5 mb-2">
                          <p className="text-white/40 text-xs font-semibold">Hooks A/B/C</p>
                          {(script.hooks as string[]).map((h, i) => (
                            <div key={i} className="flex gap-2 p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                              <span className="text-violet-400/60 text-xs shrink-0">H{i+1}</span>
                              <p className="text-white text-sm">{h}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {Array.isArray(script.slides) ? (script.slides as Slide[]).map((s, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 bg-white/[0.03] rounded-xl">
                          <span className="text-violet-400/60 text-xs shrink-0">{s.duration}s</span>
                          <p className="text-white text-sm">{s.text}</p>
                        </div>
                      )) : null}
                    </>
                  ) : videoType === "promo" ? (
                    <div className="space-y-2">
                      {script.headline ? <p className="text-amber-300 text-xs font-semibold px-1">{String(script.headline)}</p> : null}
                      {[
                        { key: "angle_a", label: "Angle A — Problème",        idx: 0 },
                        { key: "angle_b", label: "Angle B — Transformation",  idx: 1 },
                      ].map(({ key, label, idx }) => (
                        <div key={key}>
                          <button onClick={() => setActiveVariant(idx)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium mb-1.5 transition-all ${activeVariant === idx ? "bg-pink-500/20 border border-pink-500/30 text-pink-300" : "bg-white/5 text-white/40"}`}>
                            {label}
                          </button>
                          {activeVariant === idx ? (
                            Array.isArray((script[key] as { slides?: Slide[] })?.slides) ?
                              ((script[key] as { slides: Slide[] }).slides).map((s, i) => (
                                <div key={i} className="flex items-start gap-2 p-2 bg-white/[0.03] rounded-xl mb-1">
                                  <span className="text-pink-400/60 text-xs shrink-0">{s.duration}s</span>
                                  <div>
                                    <p className="text-white text-sm">{s.text}</p>
                                    {s.subtext ? <p className="text-white/40 text-xs mt-0.5">{s.subtext}</p> : null}
                                  </div>
                                </div>
                              )) : null
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : videoType === "citation" ? (
                    Array.isArray(script.variants) && (script.variants as unknown[])[activeVariant] != null ? (
                      <div className="p-3 bg-amber-500/8 border border-amber-500/15 rounded-xl space-y-1.5">
                        {(script.variants as {style_name?:string}[])[activeVariant]?.style_name
                          ? <p className="text-amber-400 text-xs font-semibold">{String((script.variants as {style_name?:string}[])[activeVariant]!.style_name)}</p>
                          : null}
                        <p className="text-white/50 text-xs italic">
                          {String((script.variants as {intro:string}[])[activeVariant].intro)}
                        </p>
                        <p className="text-white font-medium text-sm">
                          &quot;{String((script.variants as {quote:string}[])[activeVariant].quote)}&quot;
                        </p>
                        <p className="text-white/70 text-xs">
                          {String((script.variants as {punchline:string}[])[activeVariant].punchline)}
                        </p>
                      </div>
                    ) : null
                  ) : videoType === "shorts" ? (
                    <>
                      {Array.isArray(script.hooks) ? (
                        <div className="space-y-1.5 mb-2">
                          <p className="text-white/40 text-xs font-semibold">Hooks viraux</p>
                          {(script.hooks as string[]).map((h, i) => (
                            <div key={i} className="flex gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                              <span className="text-red-400/60 text-xs shrink-0">H{i+1}</span>
                              <p className="text-white text-sm">{h}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {script.script ? (
                        <div className="p-2.5 bg-white/[0.03] rounded-xl">
                          <p className="text-white/40 text-xs mb-1">Script voix</p>
                          <p className="text-white/70 text-xs leading-relaxed">{String(script.script).substring(0, 300)}{String(script.script).length > 300 ? "…" : ""}</p>
                        </div>
                      ) : null}
                    </>
                  ) : videoType === "booktrailer" ? (
                    <>
                      {script.logline ? (
                        <p className="text-cyan-300/70 text-xs italic px-1 mb-1">{String(script.logline)}</p>
                      ) : null}
                      {Array.isArray(script.scenes) ? (script.scenes as {id:number;text:string;duration:number;visual_cue?:string}[]).map(s => (
                        <div key={s.id} className="p-2.5 bg-white/[0.03] rounded-xl">
                          <p className="text-white/40 text-xs mb-1">Scène {s.id} · {s.duration}s</p>
                          <p className="text-white text-sm">{s.text}</p>
                          {s.visual_cue ? <p className="text-cyan-400/50 text-[10px] mt-0.5">🎬 {s.visual_cue}</p> : null}
                        </div>
                      )) : null}
                      {script.music_vibe ? (
                        <p className="text-purple-400/60 text-xs px-1">🎵 {String(script.music_vibe)}</p>
                      ) : null}
                    </>
                  ) : null}
                </div>
                {videoCaption && (
                  <div className="pt-2 border-t border-white/[0.06]">
                    <div className="flex justify-between mb-1"><span className="text-white/40 text-xs">Légende</span><button onClick={() => navigator.clipboard.writeText(videoCaption)} className="text-white/40 hover:text-white text-xs flex items-center gap-1"><Copy size={10} /> Copier</button></div>
                    <textarea value={videoCaption} onChange={e => setVideoCaption(e.target.value)} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white/60 text-xs focus:outline-none resize-none" />
                    <button onClick={() => { setPostText(videoCaption); setTab("compose"); }} className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-xl text-xs hover:bg-violet-500/30 transition-colors"><Send size={11} /> Utiliser dans Composer</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {script ? (
              <>
                <button onClick={renderVideo} disabled={rendering}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-40 text-white rounded-2xl font-semibold transition-all">
                  {rendering ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
                  {rendering ? `Rendu ${renderProgress}%…` : "Générer la vidéo"}
                </button>
                {rendering && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                    <p className="text-white/50 text-xs">{renderStage}</p>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${renderProgress}%` }} />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {creds.pexelsKey && <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-lg">🎬 Pexels</span>}
                      {creds.hfToken && <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-lg">🎵 MusicGen IA</span>}
                      {!creds.pexelsKey && !creds.hfToken && <span className="text-xs text-white/30">Synth ambiant · Ajoute tes clés IA pour plus</span>}
                    </div>
                  </div>
                )}
                {videoBlobUrl && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                    <p className="text-emerald-400 text-sm font-semibold flex items-center gap-1.5"><CheckCircle size={14} /> Vidéo prête !</p>
                    <video src={videoBlobUrl} controls className="w-full rounded-xl bg-black" style={{ maxHeight: videoFormat === "portrait" ? "400px" : "auto" }} />
                    <div className="flex gap-2">
                      <button onClick={downloadVideo} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-colors"><Download size={14} /> Télécharger</button>
                      <button onClick={() => { setPostText(videoCaption); setTab("compose"); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-xl text-sm font-medium hover:bg-violet-500/30 transition-colors"><Send size={14} /> Poster</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 flex flex-col items-center gap-3"><Clapperboard size={28} className="text-white/15" /><p className="text-white/30 text-sm text-center">Génère d&apos;abord le script</p></div>
            )}
          </div>
        </div>
      )}

      {/* ══ ACCOUNTS ═════════════════════════════════════════════════════════ */}
      {tab === "accounts" && (
        <div className="max-w-lg space-y-4">
          {/* Instagram */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center"><span className="text-white text-xs font-bold">IG</span></div>
              <p className="text-white font-semibold text-sm">Instagram</p>
              {creds.instagram.username && <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Configuré</span>}
            </div>
            <p className="text-white/40 text-xs">Identifiant + mot de passe → publication directe via instagrapi (sans API officielle)</p>
            <input value={creds.instagram.username} onChange={e => saveCreds({ ...creds, instagram: { ...creds.instagram, username: e.target.value } })}
              placeholder="Nom d'utilisateur Instagram" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
            <div className="relative">
              <input type={showPwd ? "text" : "password"} value={creds.instagram.password}
                onChange={e => saveCreds({ ...creds, instagram: { ...creds.instagram, password: e.target.value } })}
                placeholder="Mot de passe Instagram" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none pr-10" />
              <button onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">{showPwd ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
            <p className="text-white/25 text-xs">Stocké uniquement dans ton navigateur, jamais envoyé à un serveur externe.</p>
          </div>

          {/* TikTok */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center"><span className="text-white text-xs font-bold">TK</span></div>
              <p className="text-white font-semibold text-sm">TikTok</p>
              {creds.tiktok_session && <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Session active</span>}
            </div>
            <p className="text-white/40 text-xs">Le serveur ouvre Chrome, tu te connectes une fois → la session est sauvegardée automatiquement pour les prochains posts.</p>
            <button onClick={() => loginSession("tiktok")} disabled={!connected || loginLoading === "tiktok"}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 rounded-xl text-sm font-medium disabled:opacity-40 transition-colors">
              {loginLoading === "tiktok" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              {loginLoading === "tiktok" ? "Ouverture du navigateur…" : "Connecter TikTok (une seule fois)"}
            </button>
          </div>

          {/* Twitter/X */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center"><span className="text-white text-xs font-bold">X</span></div>
              <p className="text-white font-semibold text-sm">Twitter / X</p>
              {creds.twitter_session && <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Session active</span>}
            </div>
            <p className="text-white/40 text-xs">Même principe — le navigateur s&apos;ouvre, tu te connectes une fois, la session est sauvegardée.</p>
            <button onClick={() => loginSession("twitter")} disabled={!connected || loginLoading === "twitter"}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:bg-sky-500/30 rounded-xl text-sm font-medium disabled:opacity-40 transition-colors">
              {loginLoading === "twitter" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              {loginLoading === "twitter" ? "Ouverture du navigateur…" : "Connecter Twitter/X (une seule fois)"}
            </button>
          </div>

          {/* Facebook */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center"><span className="text-white text-xs font-bold">FB</span></div>
              <p className="text-white font-semibold text-sm">Facebook</p>
              {creds.facebook_session && <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Session active</span>}
            </div>
            <button onClick={() => loginSession("facebook")} disabled={!connected || loginLoading === "facebook"}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 rounded-xl text-sm font-medium disabled:opacity-40 transition-colors">
              {loginLoading === "facebook" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              {loginLoading === "facebook" ? "Ouverture du navigateur…" : "Connecter Facebook (une seule fois)"}
            </button>
          </div>

          {loginMsg && (
            <div className={`p-3 rounded-xl border text-sm ${loginMsg.startsWith("✓") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-white/5 border-white/10 text-white/60"}`}>
              {loginMsg}
            </div>
          )}

          {/* ── Clés IA Vidéo (gratuites) ────────────────────────────── */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-4">
            <div>
              <p className="text-white font-semibold text-sm mb-0.5">🎬 Pexels — Fond vidéo IA</p>
              <p className="text-white/40 text-xs mb-2">Compte gratuit → <a href="https://www.pexels.com/api/" target="_blank" className="text-blue-400 underline">pexels.com/api</a> · Copie ta clé ici</p>
              <input
                type="password"
                placeholder="Clé API Pexels (gratuit)"
                value={creds.pexelsKey}
                onChange={e => saveCreds({ ...creds, pexelsKey: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
              {creds.pexelsKey && <p className="text-emerald-400 text-xs mt-1">✓ Fonds cinématiques Pexels activés</p>}
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-0.5">🎵 HuggingFace — Musique IA (MusicGen)</p>
              <p className="text-white/40 text-xs mb-2">Compte gratuit → <a href="https://huggingface.co/settings/tokens" target="_blank" className="text-purple-400 underline">huggingface.co/settings/tokens</a> · Token READ gratuit</p>
              <input
                type="password"
                placeholder="Token HuggingFace hf_... (gratuit)"
                value={creds.hfToken}
                onChange={e => saveCreds({ ...creds, hfToken: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
              {creds.hfToken && <p className="text-emerald-400 text-xs mt-1">✓ Musique IA MusicGen (Meta/Facebook) activée</p>}
            </div>
            {!creds.pexelsKey && !creds.hfToken && (
              <p className="text-white/30 text-xs">Sans ces clés : synth ambiant + gradient (déjà bien). Avec : vraie vidéo + vraie musique IA 🎬</p>
            )}
          </div>

          {!connected && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
              <p className="text-amber-300 text-sm font-semibold mb-1">Serveur requis pour configurer les comptes</p>
              <p className="text-white/50 text-xs">Lance <code className="bg-black/30 px-1 rounded">python social_server.py</code> dans le dossier du projet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
