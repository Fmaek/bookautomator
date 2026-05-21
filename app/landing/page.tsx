"use client";
import { useState, useEffect } from "react";
import { Globe, Loader2, Download, Copy, Eye, EyeOff, Sparkles } from "lucide-react";
import { getBooks, type Book } from "@/lib/books";

export default function LandingPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState("");
  const [price, setPrice] = useState("9,99");
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { setBooks(getBooks()); }, []);

  const book = books.find(b => b.id === selectedBook);

  const generate = async () => {
    if (!selectedBook && !book) return;
    setLoading(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "landing",
          bookTitle: book?.title || "",
          authorName: book?.authorName || "",
          description: "",
          category: book?.category || "",
          price,
        }),
      });
      const data = await res.json();
      setContent(data.landing || "");
    } catch { }
    setLoading(false);
  };

  const buildHtml = (landingText: string, b: Book) => {
    const sections = landingText.split("\n").filter(l => l.trim());
    const coverImg = b?.coverDataUrl
      ? `<img src="${b.coverDataUrl}" alt="${b.title}" style="width:200px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.4);" />`
      : `<div style="width:200px;height:300px;background:linear-gradient(135deg,#6d28d9,#db2777);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px;text-align:center;padding:20px;">${b?.title || "Livre"}</div>`;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${b?.title || "Page de vente"}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0a0a0f; color:#e5e5e5; line-height:1.7; }
  .hero { background:linear-gradient(135deg,#1a0533 0%,#0d1a33 50%,#0a1a0a 100%); padding:80px 24px; text-align:center; }
  .hero h1 { font-size:clamp(2rem,5vw,3.5rem); font-weight:900; background:linear-gradient(135deg,#c084fc,#ec4899,#f97316); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:20px; line-height:1.1; }
  .hero .subtitle { font-size:1.2rem; color:#a0a0b0; max-width:600px; margin:0 auto 40px; }
  .cover-wrap { display:inline-block; margin-bottom:40px; }
  .cta-btn { display:inline-block; padding:18px 48px; background:linear-gradient(135deg,#7c3aed,#db2777); color:white; font-size:1.1rem; font-weight:700; border-radius:50px; text-decoration:none; box-shadow:0 0 40px rgba(124,58,237,0.4); transition:transform 0.2s,box-shadow 0.2s; cursor:pointer; border:none; }
  .cta-btn:hover { transform:translateY(-2px); box-shadow:0 0 60px rgba(124,58,237,0.6); }
  .price { font-size:3rem; font-weight:900; color:#a78bfa; margin:20px 0; }
  .section { padding:60px 24px; max-width:800px; margin:0 auto; }
  .section h2 { font-size:1.8rem; font-weight:800; color:white; margin-bottom:24px; }
  .section p { color:#b0b0c0; font-size:1rem; margin-bottom:16px; }
  .benefits { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:20px; margin-top:24px; }
  .benefit { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:24px; }
  .benefit::before { content:"✓"; display:block; color:#a78bfa; font-size:1.4rem; font-weight:900; margin-bottom:10px; }
  .testimonials { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:20px; }
  .testimonial { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:24px; }
  .stars { color:#f59e0b; font-size:1.1rem; margin-bottom:12px; }
  .faq-item { border-bottom:1px solid rgba(255,255,255,0.06); padding:20px 0; }
  .faq-item strong { color:white; display:block; margin-bottom:8px; }
  .guarantee { background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(5,150,105,0.1)); border:1px solid rgba(16,185,129,0.2); border-radius:16px; padding:32px; text-align:center; }
  .guarantee h3 { color:#34d399; font-size:1.4rem; margin-bottom:12px; }
  footer { text-align:center; padding:40px; color:#444; font-size:0.85rem; border-top:1px solid rgba(255,255,255,0.05); }
</style>
</head>
<body>
<div class="hero">
  <div class="cover-wrap">${coverImg}</div>
  <h1>${b?.title || "Titre du livre"}</h1>
  <p class="subtitle">Par ${b?.authorName || "L'auteur"}</p>
  <div class="price">${price} €</div>
  <button class="cta-btn" onclick="alert('Lien d\\'achat à configurer')">📖 Obtenir le livre maintenant</button>
</div>

<div style="max-width:800px;margin:0 auto;">
  <div class="section">
    <pre style="white-space:pre-wrap;font-family:inherit;color:#c0c0d0;line-height:1.8;">${landingText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
  </div>
</div>

<div style="background:rgba(124,58,237,0.05);border-top:1px solid rgba(124,58,237,0.15);padding:60px 24px;text-align:center;">
  <h2 style="color:white;font-size:1.8rem;margin-bottom:12px;">Prêt à transformer ta vie ?</h2>
  <p style="color:#a0a0b0;margin-bottom:28px;">Rejoins des milliers de lecteurs qui ont déjà changé leur parcours</p>
  <button class="cta-btn" onclick="alert('Lien d\\'achat à configurer')">🚀 Commencer maintenant — ${price} €</button>
</div>

<footer>
  <p>© ${new Date().getFullYear()} ${b?.authorName || "L'auteur"} · Créé avec BookAutomator</p>
</footer>
</body>
</html>`;
  };

  const exportHtml = () => {
    if (!content || !book) return;
    const html = buildHtml(content, book);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `page-vente-${book.title.replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const preview = () => {
    if (!content || !book) return;
    setPreviewHtml(buildHtml(content, book));
    setShowPreview(true);
  };

  const ic = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50";

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Générateur de Page de Vente</h1>
        <p className="text-white/50">Copywriting IA · Export HTML prêt à publier · Inclut couverture + prix</p>
      </div>

      {showPreview && previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 bg-[#1a1a2e] border-b border-white/10">
            <h3 className="text-white font-semibold">Aperçu de la page de vente</h3>
            <div className="flex gap-2">
              <button onClick={exportHtml}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm transition-colors">
                <Download size={13} /> Télécharger HTML
              </button>
              <button onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-colors">
                Fermer
              </button>
            </div>
          </div>
          <iframe srcDoc={previewHtml} className="flex-1 w-full" title="preview" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Configuration</h2>

          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Livre</label>
            <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
              <option value="">Choisir un livre...</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>

          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Prix de vente</label>
            <div className="flex gap-2">
              <input value={price} onChange={e => setPrice(e.target.value)} placeholder="9,99" className={`${ic} flex-1`} />
              <span className="flex items-center text-white/50 text-sm px-3">€</span>
            </div>
          </div>

          {book && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <p className="text-purple-300 text-xs font-medium">{book.title}</p>
              <p className="text-white/40 text-xs">{book.category} · {book.pages} pages · {book.hasCover ? "✓ Couverture" : "Pas de couverture"}</p>
            </div>
          )}

          <button onClick={generate} disabled={loading || !selectedBook}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Génération en cours..." : "Générer le copywriting IA"}
          </button>

          {content && (
            <div className="flex gap-2">
              <button onClick={preview}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 text-blue-300 rounded-xl text-sm transition-colors">
                <Eye size={13} /> Prévisualiser
              </button>
              <button onClick={exportHtml}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-sm transition-colors">
                <Download size={13} /> Exporter HTML
              </button>
              <button onClick={() => navigator.clipboard.writeText(content)}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl text-sm transition-colors">
                <Copy size={13} />
              </button>
            </div>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
          {content ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Copywriting généré</h3>
                <span className="text-white/30 text-xs">{content.length} caractères</span>
              </div>
              <div className="overflow-y-auto max-h-[60vh]">
                <pre className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-sans">{content}</pre>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <Globe size={48} className="text-white/15 mb-4" />
              <p className="text-white/30 text-sm">Le copywriting de ta page de vente</p>
              <p className="text-white/20 text-xs mt-1">apparaîtra ici après génération</p>
              <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl max-w-xs">
                <p className="text-white/40 text-xs text-center">
                  La page inclut : titre H1, sous-titre, problème, promesse, bénéfices, témoignages, FAQ, garantie et CTA
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
