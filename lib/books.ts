export interface Book {
  id: string;
  title: string;
  category: string;
  status: "brouillon" | "prêt" | "publié";
  pages: number;
  hasCover: boolean;
  coverDataUrl?: string;
  checklistPct: number;
  platforms: string[];
  chapters: { title: string; content: string }[];
  tags?: string[];
  authorName?: string;
  language?: string;
  wordCountTarget?: number;
  salesData?: { date: string; units: number; revenue: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface ChapterVersion {
  content: string;
  savedAt: string;
  label?: string;
}

const KEY = "bookautomator_books";
const VERSIONS_KEY = "bookautomator_versions";

export function getBooks(): Book[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch { return []; }
}

export function saveBook(book: Book): void {
  const books = getBooks();
  const idx = books.findIndex(b => b.id === book.id);
  if (idx >= 0) books[idx] = book;
  else books.unshift(book);
  localStorage.setItem(KEY, JSON.stringify(books));
}

export function deleteBook(id: string): void {
  const books = getBooks().filter(b => b.id !== id);
  localStorage.setItem(KEY, JSON.stringify(books));
}

export function getBook(id: string): Book | null {
  return getBooks().find(b => b.id === id) || null;
}

export function newBook(title: string, category: string): Book {
  return {
    id: Date.now().toString(),
    title,
    category,
    status: "brouillon",
    pages: 0,
    hasCover: false,
    checklistPct: 0,
    platforms: [],
    chapters: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Chapter versioning
function versionsKey(bookId: string, chapterIdx: number) {
  return `${VERSIONS_KEY}_${bookId}_${chapterIdx}`;
}

export function saveChapterVersion(bookId: string, chapterIdx: number, content: string, label?: string): void {
  if (typeof window === "undefined") return;
  const key = versionsKey(bookId, chapterIdx);
  const versions: ChapterVersion[] = JSON.parse(localStorage.getItem(key) || "[]");
  versions.unshift({ content, savedAt: new Date().toISOString(), label });
  // Keep max 10 versions per chapter
  localStorage.setItem(key, JSON.stringify(versions.slice(0, 10)));
}

export function getChapterVersions(bookId: string, chapterIdx: number): ChapterVersion[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(versionsKey(bookId, chapterIdx)) || "[]");
  } catch { return []; }
}

// Sales data helpers
export function addSaleEntry(bookId: string, entry: { date: string; units: number; revenue: number }): void {
  const book = getBook(bookId);
  if (!book) return;
  const sales = book.salesData || [];
  sales.push(entry);
  saveBook({ ...book, salesData: sales });
}
