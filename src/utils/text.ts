/**
 * Normalizes text for search comparisons: lowercases and strips diacritics
 * (e.g. "Rés Més" -> "res mes") so accent-insensitive matching works.
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function matchesSearch(value: string, query: string): boolean {
  return normalizeForSearch(value).includes(normalizeForSearch(query));
}
