import JSZip from "jszip";
import type { Book } from "./books";

export async function generateEpub(book: Book, watermark?: string): Promise<Blob> {
  const zip = new JSZip();

  const id = `book-${book.id}`;
  const chapters = book.chapters;

  // ── mimetype (must be first, uncompressed) ────────────────────────────────
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // ── META-INF/container.xml ────────────────────────────────────────────────
  zip.folder("META-INF")!.file("container.xml", `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const oebps = zip.folder("OEBPS")!;

  // ── CSS ────────────────────────────────────────────────────────────────────
  oebps.file("style.css", `
body { font-family: Georgia, serif; font-size: 1em; line-height: 1.8; margin: 0; padding: 0; color: #1a1a1a; }
h1 { font-size: 2em; text-align: center; margin: 2em 0 1em; }
h2 { font-size: 1.4em; margin: 1.5em 0 0.5em; border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }
h3 { font-size: 1.1em; margin: 1.2em 0 0.4em; }
p { margin: 0.8em 0; text-align: justify; }
.cover { text-align: center; padding: 3em 2em; background: #1a1a2e; color: white; min-height: 80vh; display: flex; flex-direction: column; justify-content: center; }
.cover h1 { color: white; font-size: 2.5em; }
.cover .author { color: #a78bfa; font-size: 1.2em; margin-top: 1em; }
.watermark { color: #ccc; font-size: 0.7em; text-align: center; margin-top: 4em; font-style: italic; }
`);

  // ── Cover page ────────────────────────────────────────────────────────────
  oebps.file("cover.xhtml", `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${esc(book.title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <div class="cover">
    <h1>${esc(book.title)}</h1>
    <p class="author">${esc(book.authorName || "")}</p>
    <p style="color:#6b7280;font-size:0.85em;margin-top:2em">${esc(book.category)}</p>
    ${watermark ? `<p class="watermark">Copie de révision — ${esc(watermark)}</p>` : ""}
  </div>
</body>
</html>`);

  // ── TOC page ──────────────────────────────────────────────────────────────
  const tocItems = chapters.map((c, i) => `<li><a href="chapter${i + 1}.xhtml">${esc(c.title)}</a></li>`).join("\n    ");
  oebps.file("toc.xhtml", `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Table des matières</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <h1>Table des matières</h1>
  <ol>${tocItems}</ol>
</body>
</html>`);

  // ── Chapter files ──────────────────────────────────────────────────────────
  chapters.forEach((ch, i) => {
    const bodyHtml = ch.content
      .split(/\n\n+/)
      .map(para => {
        const trimmed = para.trim();
        if (!trimmed) return "";
        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          return `<h2>${esc(trimmed.replace(/\*\*/g, ""))}</h2>`;
        }
        if (trimmed.startsWith("## ")) return `<h2>${esc(trimmed.slice(3))}</h2>`;
        if (trimmed.startsWith("### ")) return `<h3>${esc(trimmed.slice(4))}</h3>`;
        return `<p>${esc(trimmed).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
      })
      .join("\n");

    oebps.file(`chapter${i + 1}.xhtml`, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${esc(ch.title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <h1>${esc(ch.title)}</h1>
  ${bodyHtml}
  ${watermark ? `<p class="watermark">Copie de révision — ${esc(watermark)}</p>` : ""}
</body>
</html>`);
  });

  // ── content.opf ───────────────────────────────────────────────────────────
  const manifest = [
    `<item id="style" href="style.css" media-type="text/css"/>`,
    `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="toc-page" href="toc.xhtml" media-type="application/xhtml+xml"/>`,
    ...chapters.map((_, i) => `<item id="ch${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`),
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
  ].join("\n    ");

  const spine = [
    `<itemref idref="cover"/>`,
    `<itemref idref="toc-page"/>`,
    ...chapters.map((_, i) => `<itemref idref="ch${i + 1}"/>`),
  ].join("\n    ");

  oebps.file("content.opf", `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="${id}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${esc(book.title)}</dc:title>
    <dc:creator>${esc(book.authorName || "Auteur")}</dc:creator>
    <dc:language>fr</dc:language>
    <dc:identifier id="${id}">${id}</dc:identifier>
    <dc:date>${book.createdAt.slice(0, 10)}</dc:date>
  </metadata>
  <manifest>
    ${manifest}
  </manifest>
  <spine toc="ncx">
    ${spine}
  </spine>
</package>`);

  // ── toc.ncx ────────────────────────────────────────────────────────────────
  const navPoints = chapters.map((ch, i) => `
    <navPoint id="np${i + 1}" playOrder="${i + 2}">
      <navLabel><text>${esc(ch.title)}</text></navLabel>
      <content src="chapter${i + 1}.xhtml"/>
    </navPoint>`).join("");

  oebps.file("toc.ncx", `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${esc(book.title)}</text></docTitle>
  <navMap>
    <navPoint id="np0" playOrder="1">
      <navLabel><text>Couverture</text></navLabel>
      <content src="cover.xhtml"/>
    </navPoint>
    ${navPoints}
  </navMap>
</ncx>`);

  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function downloadEpub(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".epub") ? filename : `${filename}.epub`;
  a.click();
  URL.revokeObjectURL(url);
}
