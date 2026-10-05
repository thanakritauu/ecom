import type { Product } from "./types";

/**
 * Product search — one matcher shared by the header autocomplete and the
 * `/products?search=` results page, so the dropdown's "ดูผลการค้นหาทั้งหมด (N)"
 * count is always the number of products that page then lists.
 *
 * A query is split on whitespace and every word must appear in the product
 * name (case-insensitive), so "คุชชั่น 01" finds "… คุชชั่น … 01 ไลท์เบจ".
 */
export function searchTokens(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function matchesSearch(name: string, query: string): boolean {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return true;
  const haystack = name.toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

/** Autocomplete ranking: names that start with the query first, then any word starting with it, then best sellers. */
export function searchProducts(products: Product[], query: string): Product[] {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return [];
  const q = tokens.join(" ");
  const rank = (p: Product) => {
    const name = p.name.toLowerCase();
    if (name.startsWith(q)) return 0;
    if (name.split(/\s+/).some((word) => word.startsWith(tokens[0]))) return 1;
    return 2;
  };
  return products
    .filter((p) => matchesSearch(p.name, query))
    .map((p) => ({ p, r: rank(p) }))
    .sort((a, b) => a.r - b.r || (b.p.soldCount ?? 0) - (a.p.soldCount ?? 0))
    .map(({ p }) => p);
}

/** Splits `text` into plain / matched runs so the dropdown can bold the typed words. */
export function highlightSegments(text: string, query: string): { text: string; match: boolean }[] {
  const tokens = searchTokens(query).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (tokens.length === 0) return [{ text, match: false }];
  const re = new RegExp(`(${tokens.join("|")})`, "gi");
  return text
    .split(re)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, match: tokens.some((t) => new RegExp(`^${t}$`, "i").test(part)) }));
}
