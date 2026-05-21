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
  createdAt: string;
  updatedAt: string;
}

const KEY = "bookautomator_books";

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
