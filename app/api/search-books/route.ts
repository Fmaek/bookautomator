import { NextRequest, NextResponse } from "next/server";

export interface BookResult {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  coverUrl: string | null;
  subjects: string[];
  description: string;
  source: "openlibrary" | "gutenberg";
  openLibraryKey?: string;
  downloadLinks: { format: string; url: string; label: string }[];
  readUrl?: string;
  isPublicDomain: boolean;
  language: string;
}

async function searchOpenLibrary(query: string, type: "author" | "title" | "subject"): Promise<BookResult[]> {
  const param = type === "author" ? "author" : type === "title" ? "title" : "subject";
  const fields = "key,title,author_name,first_publish_year,cover_i,has_fulltext,ia,subject,language";
  const url = `https://openlibrary.org/search.json?${param}=${encodeURIComponent(query)}&limit=30&fields=${fields}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return [];
  const data = await res.json();

  const results: BookResult[] = [];
  for (const doc of (data.docs || []).slice(0, 25)) {
    const langs: string[] = doc.language || [];
    // Prefer French books, but also include books without language info if author search
    const hasFrench = langs.length === 0 || langs.some((l: string) => l === "fre" || l === "fra" || l === "fr");
    if (!hasFrench && type === "subject") continue;

    const year = doc.first_publish_year || null;
    // Public domain: published before 1928 (or author likely dead 70+ years)
    const isPublicDomain = year !== null && year < 1928;

    const downloadLinks: { format: string; url: string; label: string }[] = [];
    if (doc.has_fulltext && doc.ia && doc.ia.length > 0) {
      const iaId = doc.ia[0];
      downloadLinks.push({ format: "epub", url: `https://archive.org/download/${iaId}/${iaId}.epub`, label: "EPUB" });
      downloadLinks.push({ format: "pdf",  url: `https://archive.org/download/${iaId}/${iaId}.pdf`,  label: "PDF"  });
      downloadLinks.push({ format: "txt",  url: `https://archive.org/download/${iaId}/${iaId}.txt`,  label: "TXT"  });
    }

    const key = doc.key || "";
    results.push({
      id: key,
      title: doc.title || "Sans titre",
      authors: doc.author_name || [],
      year,
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      subjects: (doc.subject || []).slice(0, 5),
      description: "",
      source: "openlibrary",
      openLibraryKey: key,
      downloadLinks,
      readUrl: doc.has_fulltext && doc.ia?.length ? `https://archive.org/details/${doc.ia[0]}` : `https://openlibrary.org${key}`,
      isPublicDomain,
      language: langs.includes("fre") || langs.includes("fra") ? "fr" : langs[0] || "?",
    });
  }
  return results;
}

async function searchGutenberg(query: string): Promise<BookResult[]> {
  const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}&languages=fr`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return [];
  const data = await res.json();

  return (data.results || []).slice(0, 15).map((book: {
    id: number;
    title: string;
    authors: { name: string }[];
    subjects: string[];
    formats: Record<string, string>;
    bookshelves: string[];
  }) => {
    const formats = book.formats || {};
    const downloadLinks: { format: string; url: string; label: string }[] = [];
    if (formats["application/epub+zip"]) downloadLinks.push({ format: "epub", url: formats["application/epub+zip"], label: "EPUB" });
    if (formats["application/pdf"])       downloadLinks.push({ format: "pdf",  url: formats["application/pdf"],       label: "PDF"  });
    if (formats["text/plain"])            downloadLinks.push({ format: "txt",  url: formats["text/plain"],            label: "TXT"  });
    const cover = formats["image/jpeg"] || null;

    return {
      id: `gut-${book.id}`,
      title: book.title,
      authors: (book.authors || []).map((a: { name: string }) => a.name),
      year: null,
      coverUrl: cover,
      subjects: (book.subjects || []).slice(0, 4),
      description: (book.bookshelves || []).join(", "),
      source: "gutenberg" as const,
      downloadLinks,
      readUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
      isPublicDomain: true,
      language: "fr",
    };
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();
  const type  = (searchParams.get("type") || "author") as "author" | "title" | "subject";

  if (!query || query.length < 2) {
    return NextResponse.json({ books: [] });
  }

  try {
    const [olResults, gutResults] = await Promise.allSettled([
      searchOpenLibrary(query, type),
      searchGutenberg(query),
    ]);

    const ol  = olResults.status  === "fulfilled" ? olResults.value  : [];
    const gut = gutResults.status === "fulfilled" ? gutResults.value : [];

    // Merge: Gutenberg first (all public domain + downloadable), then OL
    const seen = new Set<string>();
    const books: BookResult[] = [];
    for (const b of [...gut, ...ol]) {
      const key = `${b.title.toLowerCase().trim()}|${b.authors.join(",").toLowerCase()}`;
      if (!seen.has(key)) { seen.add(key); books.push(b); }
    }

    return NextResponse.json({ books: books.slice(0, 40) });
  } catch (err: unknown) {
    return NextResponse.json({ books: [], error: String(err) });
  }
}
