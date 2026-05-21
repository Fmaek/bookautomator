"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Send, Camera, Share2, Clock, Trash2, Play, CheckCircle,
  XCircle, Loader2, Settings, RefreshCw, BookOpen, Zap,
  History, List, Wifi, WifiOff, Copy, Image
} from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

const DEFAULT_URL = "http://localhost:8000";
const PLATFORMS = [
  { id: "facebook",  label: "Facebook",  icon: Share2,  color: "text-blue-400",  bg: "bg-blue-500/20 border-blue-500/30" },
  { id: "instagram", label: "Instagram", icon: Camera,  color: "text-pink-400",  bg: "bg-pink-500/20 border-pink-500/30" },
];

type QueueItem = {
  id: string; title: string; text: string; platforms: string[];
  status: "pending" | "posting" | "done" | "error";
  created_at: string; posted_at: string | null; results: Record<string, string>;
};

type Tab = "compose" | "queue" | "history" | "settings";

export default function AutoPostPage() {
  const [tab, setTab]               = useState<Tab>("compose");
  const [apiUrl, setApiUrl]         = useState(DEFAULT_URL);
  const [connected, setConnected]   = useState<boolean | null>(null);
  const [checking, setChecking]     = useState(false);

  // Compose
  const [books, setBooks]           = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [postText, setPostText]     = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook", "instagram"]);
  const [sending, setSending]       = useState(false);
  const [sendResult, setSendResult] = useState<string>("");
  const [includeCover, setIncludeCover] = useState(true);

  // Queue / History
  const [queue, setQueue]     = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [status, setStatus]   = useState<Record<string, unknown>>({});
  const [loadingQ, setLoadingQ] = useState(false);
  const [postingNow, setPostingNow] = useState(false);

  // Settings
  const [savedUrl, setSavedUrl] = useState(DEFAULT_URL);
  const [schedTimes, setSchedTimes] = useState("09:00, 12:00, 18:00, 21:00");

  useEffect(() => {
    const stored = localStorage.getItem("ba_autopost_url") || DEFAULT_URL;
    setApiUrl(stored);
    setSavedUrl(stored);
    setBooks(getBooks());
  }, []);

  const call = useCallback(async (path: string, opts?: RequestInit) => {
    const url = (localStorage.getItem("ba_autopost_url") || DEFAULT_URL) + path;
    const res = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(opts?.headers || {}) } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, []);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    try {
      await call("/api/book/status");
      setConnected(true);
    } catch {
      setConnected(false);
    }
    setChecking(false);
  }, [call]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const loadQueue = useCallback(async () => {
    setLoadingQ(true);
    try {
      const [q, h, s] = await Promise.all([
        call("/api/book/queue?status=all"),
        call("/api/book/history"),
        call("/api/book/status"),
      ]);
      setQueue(q);
      setHistory(h);
      setStatus(s);
    } catch {
      // ignore
    }
    setLoadingQ(false);
  }, [call]);

  useEffect(() => {
    if (tab === "queue" || tab === "history") loadQueue();
  }, [tab, loadQueue]);

  // Auto-refresh queue every 8s when on queue tab
  useEffect(() => {
    if (tab !== "queue") return;
    const t = setInterval(loadQueue, 8000);
    return () => clearInterval(t);
  }, [tab, loadQueue]);

  const selectedBookData = books.find(b => b.id === selectedBook);

  const handleSend = async () => {
    if (!postText.trim() || selectedPlatforms.length === 0) return;
    setSending(true);
    setSendResult("");
    try {
      let image_base64: string | null = null;
      if (includeCover && selectedBookData?.coverDataUrl) {
        // Extract base64 from data URL (strip prefix)
        const b64 = selectedBookData.coverDataUrl.split(",")[1] || null;
        image_base64 = b64;
      }

      const body: Record<string, unknown> = {
        title: selectedBookData?.title || "Promotion livre",
        text: postText,
        platforms: selectedPlatforms,
      };
      if (image_base64) body.image_base64 = image_base64;

      const result = await call("/api/book/queue", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setSendResult(`✓ Ajouté à la file (id: ${result.id}) · ${result.queue_count} en attente`);
      setPostText("");
    } catch (e) {
      setSendResult(`Erreur: ${e instanceof Error ? e.message : "connexion impossible"}`);
    }
    setSending(false);
  };

  const handlePostNow = async () => {
    setPostingNow(true);
    try {
      await call("/api/book/post-next", { method: "POST" });
      setTimeout(loadQueue, 3000);
    } catch (e) {
      alert(`Erreur: ${e instanceof Error ? e.message : "connexion impossible"}`);
    }
    setPostingNow(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await call(`/api/book/queue/${id}`, { method: "DELETE" });
      loadQueue();
    } catch {
      // ignore
    }
  };

  const saveSettings = async () => {
    localStorage.setItem("ba_autopost_url", apiUrl);
    setSavedUrl(apiUrl);
    try {
      const times = schedTimes.split(",").map(t => t.trim()).filter(Boolean);
      await call("/api/book/config", {
        method: "POST",
        body: JSON.stringify({ schedule_times: times }),
      });
    } catch {
      // ignore
    }
    await checkConnection();
  };

  const generateCaption = () => {
    if (!selectedBookData) return;
    const ch = selectedBookData.chapters?.[0]?.content?.substring(0, 200) || "";
    const templates = [
      `📚 Découvrez "${selectedBookData.title}" — ${selectedBookData.category}\n\n${ch ? `"${ch.trim()}..."\n\n` : ""}🔥 Disponible maintenant ! Lien en bio.\n\n#livre #livres #lecture #auteur #ebook`,
      `✨ Mon nouveau livre est là !\n\n"${selectedBookData.title}"\n\nCe livre va changer ta vision sur ${selectedBookData.category?.toLowerCase()}.\n\n👇 Lien en bio pour le commander\n\n#auteurindépendant #livresfrancais #ebook #lecture`,
      `🚀 Nouveau livre — "${selectedBookData.title}"\n\nSi tu veux progresser en ${selectedBookData.category?.toLowerCase()}, ce livre est pour toi.\n\n💡 ${selectedBookData.chapters?.length || 0} chapitres · ${selectedBookData.pages || 0} pages\n\n📩 Lien en bio\n\n#livre #motivation #développementpersonnel`,
    ];
    setPostText(templates[Math.floor(Math.random() * templates.length)]);
  };

  const statusColor = (s: string) => {
    if (s === "done")    return "text-emerald-400";
    if (s === "error")   return "text-red-400";
    if (s === "posting") return "text-yellow-400";
    return "text-white/40";
  };

  const statusIcon = (s: string) => {
    if (s === "done")    return <CheckCircle size={13} className="text-emerald-400" />;
    if (s === "error")   return <XCircle size={13} className="text-red-400" />;
    if (s === "posting") return <Loader2 size={13} className="text-yellow-400 animate-spin" />;
    return <Clock size={13} className="text-white/30" />;
  };

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Post Automatique</h1>
          <p className="text-white/50">Publie tes promotions de livres sur Facebook & Instagram</p>
        </div>
        <div className="flex items-center gap-3">
          {connected === null || checking ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl text-white/40 text-sm">
              <Loader2 size={13} className="animate-spin" /> Vérification...
            </div>
          ) : connected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
              <Wifi size={13} /> Connecté · {savedUrl.replace("http://", "")}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
              <WifiOff size={13} /> Hors ligne — lance tiktok_webapp
            </div>
          )}
          <button onClick={checkConnection} disabled={checking}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
            <RefreshCw size={14} className={`text-white/40 ${checking ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {!connected && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <p className="text-amber-300 text-sm font-medium mb-1">⚠️ Backend non détecté</p>
          <p className="text-white/50 text-sm">Lance ton projet <code className="bg-white/10 px-1.5 rounded text-white/80">tiktok_webapp</code> localement puis clique sur Reconnexion.</p>
          <p className="text-white/40 text-xs mt-1">Commande: <code className="bg-white/10 px-1 rounded">python main.py</code> dans le dossier tiktok_webapp</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 mb-6 w-fit">
        {[
          { id: "compose" as Tab, icon: Send,    label: "Composer" },
          { id: "queue"   as Tab, icon: List,    label: `File ${status.queue_count !== undefined ? `(${status.queue_count})` : ""}` },
          { id: "history" as Tab, icon: History, label: "Historique" },
          { id: "settings"as Tab, icon: Settings,label: "Réglages" },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === id ? "bg-purple-500 text-white" : "text-white/40 hover:text-white"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── COMPOSE ─────────────────────────────────────────────────────── */}
      {tab === "compose" && (
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3 space-y-4">
            {/* Book selector */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
              <label className="text-white/60 text-xs mb-2 block">Livre concerné</label>
              <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                <option value="">— Sélectionne un livre —</option>
                {books.map(b => (
                  <option key={b.id} value={b.id}>{b.title} ({b.category})</option>
                ))}
              </select>
              {selectedBookData && (
                <div className="mt-3 flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  {selectedBookData.coverDataUrl ? (
                    <img src={selectedBookData.coverDataUrl} alt="" className="w-10 h-14 object-cover rounded-lg" />
                  ) : (
                    <div className="w-10 h-14 bg-white/10 rounded-lg flex items-center justify-center">
                      <BookOpen size={14} className="text-white/30" />
                    </div>
                  )}
                  <div>
                    <p className="text-white text-sm font-medium">{selectedBookData.title}</p>
                    <p className="text-white/40 text-xs">{selectedBookData.chapters?.length || 0} chapitres · {selectedBookData.pages || 0} pages</p>
                  </div>
                  <button onClick={generateCaption}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 text-purple-300 rounded-xl text-xs transition-colors">
                    <Zap size={11} /> Générer légende
                  </button>
                </div>
              )}
            </div>

            {/* Post text */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-white/60 text-xs">Texte du post</label>
                <span className="text-white/25 text-xs">{postText.length} / 2000</span>
              </div>
              <textarea value={postText} onChange={e => setPostText(e.target.value)}
                placeholder="Écris ta promotion ici, ou clique sur « Générer légende » pour l'auto-générer..."
                rows={9} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-purple-500/50 resize-none leading-relaxed" />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => navigator.clipboard.writeText(postText)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl text-xs transition-colors">
                  <Copy size={11} /> Copier
                </button>
              </div>
            </div>

            {/* Send button */}
            <button onClick={handleSend} disabled={sending || !postText.trim() || selectedPlatforms.length === 0 || !connected}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? "Ajout à la file..." : "Ajouter à la file d'attente"}
            </button>

            {sendResult && (
              <div className={`p-3 rounded-xl text-sm text-center border ${sendResult.startsWith("✓") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
                {sendResult}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="col-span-2 space-y-4">
            {/* Platform selector */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
              <label className="text-white/60 text-xs mb-3 block">Plateformes</label>
              <div className="space-y-2">
                {PLATFORMS.map(({ id, label, icon: Icon, color, bg }) => (
                  <button key={id}
                    onClick={() => setSelectedPlatforms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${selectedPlatforms.includes(id) ? bg + " " + color : "bg-white/[0.02] border-white/[0.06] text-white/30"}`}>
                    <Icon size={16} />
                    <span>{label}</span>
                    {selectedPlatforms.includes(id) && <CheckCircle size={14} className="ml-auto" />}
                  </button>
                ))}
              </div>
              <p className="text-white/25 text-xs mt-2">TikTok = vidéo uniquement (via le système vidéo)</p>
            </div>

            {/* Cover toggle */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
              <label className="text-white/60 text-xs mb-3 block">Couverture</label>
              <button onClick={() => setIncludeCover(v => !v)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${includeCover ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "bg-white/[0.02] border-white/[0.06] text-white/30"}`}>
                <Image size={16} />
                <span>Inclure la couverture</span>
                {includeCover && <CheckCircle size={14} className="ml-auto" />}
              </button>
              {includeCover && !selectedBookData?.coverDataUrl && (
                <p className="text-amber-400/70 text-xs mt-2">Ce livre n&apos;a pas de couverture générée.</p>
              )}
            </div>

            {/* Quick post */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
              <label className="text-white/60 text-xs mb-3 block">Post rapide</label>
              <button onClick={handlePostNow} disabled={postingNow || !connected}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-40">
                {postingNow ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Poster le prochain maintenant
              </button>
              <p className="text-white/25 text-xs mt-2 text-center">
                {status.queue_count !== undefined ? `${status.queue_count} post(s) en attente` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── QUEUE ────────────────────────────────────────────────────────── */}
      {tab === "queue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-sm">
              <span className="text-white/50">{queue.filter(q => q.status === "pending").length} en attente</span>
              <span className="text-yellow-400/70">{queue.filter(q => q.status === "posting").length} en cours</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePostNow} disabled={postingNow || !connected || queue.filter(q => q.status === "pending").length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-sm transition-colors disabled:opacity-40">
                {postingNow ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                Poster maintenant
              </button>
              <button onClick={loadQueue} disabled={loadingQ}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                <RefreshCw size={14} className={`text-white/40 ${loadingQ ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-16">
              <List size={32} className="text-white/15 mx-auto mb-3" />
              <p className="text-white/30">File vide — compose un post pour l&apos;ajouter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map(item => (
                <div key={item.id}
                  className={`bg-white/[0.02] border rounded-2xl p-4 flex items-start gap-4 transition-all ${item.status === "posting" ? "border-yellow-500/30" : item.status === "done" ? "border-emerald-500/20" : item.status === "error" ? "border-red-500/20" : "border-white/[0.06]"}`}>
                  <div className="mt-0.5">{statusIcon(item.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white text-sm font-medium truncate">{item.title}</p>
                      <div className="flex gap-1">
                        {item.platforms.map(p => (
                          <span key={p} className={`text-xs px-1.5 py-0.5 rounded-md border ${p === "facebook" ? "bg-blue-500/20 border-blue-500/30 text-blue-300" : "bg-pink-500/20 border-pink-500/30 text-pink-300"}`}>
                            {p === "facebook" ? "FB" : "IG"}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-white/40 text-xs line-clamp-2">{item.text}</p>
                    {item.results && Object.keys(item.results).length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {Object.entries(item.results).map(([plat, res]) => (
                          <span key={plat} className={`text-xs px-2 py-0.5 rounded-lg ${res === "ok" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                            {plat}: {res === "ok" ? "✓" : res.slice(0, 20)}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-white/20 text-xs mt-1">
                      {item.posted_at ? `Posté ${new Date(item.posted_at).toLocaleString("fr")}` : `Créé ${new Date(item.created_at).toLocaleString("fr")}`}
                    </p>
                  </div>
                  {item.status === "pending" && (
                    <button onClick={() => handleDelete(item.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors shrink-0">
                      <Trash2 size={13} className="text-white/25 hover:text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY ─────────────────────────────────────────────────────── */}
      {tab === "history" && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="text-center py-16">
              <History size={32} className="text-white/15 mx-auto mb-3" />
              <p className="text-white/30">Aucun post dans l&apos;historique</p>
            </div>
          ) : history.map(item => (
            <div key={item.id} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 flex items-start gap-4">
              <div className="mt-0.5">{statusIcon(item.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white text-sm font-medium truncate">{item.title}</p>
                  <div className="flex gap-1">
                    {item.platforms.map(p => (
                      <span key={p} className={`text-xs px-1.5 py-0.5 rounded-md border ${p === "facebook" ? "bg-blue-500/20 border-blue-500/30 text-blue-300" : "bg-pink-500/20 border-pink-500/30 text-pink-300"}`}>
                        {p === "facebook" ? "FB" : "IG"}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-white/40 text-xs line-clamp-1">{item.text}</p>
                {item.results && Object.keys(item.results).length > 0 && (
                  <div className="flex gap-2 mt-1.5">
                    {Object.entries(item.results).map(([plat, res]) => (
                      <span key={plat} className={`text-xs px-2 py-0.5 rounded-lg ${res === "ok" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                        {plat}: {res === "ok" ? "✓ publié" : `✗ ${res.slice(0, 20)}`}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-white/20 text-xs mt-1">
                  {item.posted_at ? new Date(item.posted_at).toLocaleString("fr") : "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SETTINGS ────────────────────────────────────────────────────── */}
      {tab === "settings" && (
        <div className="max-w-xl space-y-6">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-5">
            <h3 className="text-white font-semibold">Connexion au serveur</h3>

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">URL du serveur tiktok_webapp</label>
              <input value={apiUrl} onChange={e => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50" />
              <p className="text-white/30 text-xs mt-1">Par défaut : http://localhost:8000</p>
            </div>

            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Horaires de publication auto (virgule séparateur)</label>
              <input value={schedTimes} onChange={e => setSchedTimes(e.target.value)}
                placeholder="09:00, 12:00, 18:00, 21:00"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50" />
              <p className="text-white/30 text-xs mt-1">Heure locale — format HH:MM</p>
            </div>

            <button onClick={saveSettings}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors">
              <CheckCircle size={14} /> Sauvegarder & tester la connexion
            </button>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Connexion aux réseaux</h3>
            <p className="text-white/50 text-sm mb-4">La connexion se fait via le serveur tiktok_webapp. Clique sur les boutons ci-dessous pour ouvrir un navigateur et te connecter.</p>
            <div className="flex gap-3">
              <button onClick={() => call("/api/login/facebook", { method: "POST" }).catch(() => alert("Serveur non disponible"))}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 text-blue-300 rounded-xl text-sm font-medium transition-colors">
                <Share2 size={14} /> Connexion Facebook
              </button>
              <button onClick={() => call("/api/login/instagram", { method: "POST" }).catch(() => alert("Serveur non disponible"))}
                className="flex items-center gap-2 px-4 py-2.5 bg-pink-500/20 border border-pink-500/30 hover:bg-pink-500/30 text-pink-300 rounded-xl text-sm font-medium transition-colors">
                <Camera size={14} /> Connexion Instagram
              </button>
            </div>
          </div>

          <div className="bg-amber-500/[0.07] border border-amber-500/20 rounded-2xl p-5">
            <p className="text-amber-300 text-sm font-semibold mb-2">Comment ça marche</p>
            <ol className="text-white/50 text-sm space-y-2">
              <li>1. Lance <code className="bg-white/10 px-1 rounded text-white/80">python main.py</code> dans ton dossier <code className="bg-white/10 px-1 rounded text-white/80">tiktok_webapp</code></li>
              <li>2. Connecte tes comptes Facebook & Instagram via les boutons ci-dessus</li>
              <li>3. Compose tes posts, ajoute-les à la file</li>
              <li>4. Clique &quot;Poster maintenant&quot; ou laisse le planificateur poster automatiquement</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
