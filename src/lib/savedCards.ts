import type { CardBrand } from "./payment";

/**
 * Saved payment cards (mock — no account/card-vault backend yet). The sample
 * card is the mock persona's (`accountData.ts` `MOCK_USER`, Nutcha S.). Only what a
 * gateway's card vault would hand back is kept: brand, last 4, expiry, name
 * and a token. Never the full number or CVV. A real integration replaces
 * this with the gateway's saved-card API; checkout only sees `SavedCard`.
 *
 * Which cards show (checkout): `?card=saved` forces the sample card,
 * `?card=none` forces none; otherwise a signed-in member gets the sample card
 * plus any card they saved, and a guest gets none (saving needs an account).
 */
export type SavedCard = { id: string; brand: CardBrand; last4: string; expiry: string; holder: string; token: string };

const STORAGE_KEY = "charmiss:saved-cards";
/** Sample cards the shopper deleted — they'd otherwise come back on every read. */
const REMOVED_KEY = "charmiss:saved-cards:removed";

export const SAMPLE_SAVED_CARDS: SavedCard[] = [
  { id: "card-sample-visa", brand: "visa", last4: "4242", expiry: "12/28", holder: "NUTCHA S", token: "mock_tok_saved_4242" },
];

export function loadStoredCards(): SavedCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as SavedCard[]) : [];
    return Array.isArray(list) ? list.filter((c) => c && c.id && c.last4 && c.token) : [];
  } catch {
    return [];
  }
}

/** Adds (or replaces, same brand + last 4 + expiry) a card in the mock vault. */
export function storeCard(card: SavedCard) {
  try {
    const rest = loadStoredCards().filter((c) => !(c.brand === card.brand && c.last4 === card.last4 && c.expiry === card.expiry));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([card, ...rest]));
  } catch {
    // Storage unavailable (private mode) — the payment itself still succeeded.
  }
}

function loadRemovedIds(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(REMOVED_KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Deletes a card from the mock vault (the account's card page). */
export function removeCard(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loadStoredCards().filter((c) => c.id !== id)));
    if (SAMPLE_SAVED_CARDS.some((c) => c.id === id)) localStorage.setItem(REMOVED_KEY, JSON.stringify([...new Set([...loadRemovedIds(), id])]));
  } catch {}
}

export function resolveSavedCards(mode: "saved" | "none" | undefined, signedIn: boolean): SavedCard[] {
  if (mode === "none") return [];
  if (mode === "saved" || signedIn) {
    const stored = loadStoredCards();
    const removed = loadRemovedIds();
    const samples = SAMPLE_SAVED_CARDS.filter(
      (s) => !removed.includes(s.id) && !stored.some((c) => c.id === s.id || (c.last4 === s.last4 && c.brand === s.brand)),
    );
    return [...stored, ...samples];
  }
  return [];
}
