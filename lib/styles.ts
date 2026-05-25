export interface SavedStyle {
  id: string;
  name: string;
  styleDescription: string; // résumé de l'ADN stylistique extrait
  sampleText: string;       // texte d'exemple d'origine (tronqué)
  createdAt: string;
}

const KEY = "bookautomator_styles";

export function getSavedStyles(): SavedStyle[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function saveStyle(style: SavedStyle): void {
  const all = getSavedStyles();
  const idx = all.findIndex(s => s.id === style.id);
  if (idx >= 0) all[idx] = style; else all.unshift(style);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function deleteStyle(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getSavedStyles().filter(s => s.id !== id)));
}
