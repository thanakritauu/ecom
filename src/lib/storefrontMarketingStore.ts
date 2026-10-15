import { isServer } from "solid-js/web";
import { buildMockPromotions, MARKETING_SEED_VERSION, normalizePromotions, type Promotion } from "./adminMarketing";

/** Same keys (+ `:seed-version`) `adminMarketingStore` persists to. Read-only on the storefront; the customer side never writes them. */
export const PROMOTIONS_STORAGE_KEY = "charmiss:admin:marketing:promotions";
export const COUPONS_STORAGE_KEY = "charmiss:admin:marketing:coupons";

const idNumber = (id: string) => Number(id.match(/-(\d+)$/)?.[1] ?? 0);

/** The stored Admin copy, upgraded the same way Admin would if it hasn't been opened since a seed bump (in memory only). */
export function readStoredMarketing<T extends { id: string }>(key: string, seeds: () => T[], normalize: (list: T[]) => T[]): T[] {
  if (isServer) return seeds();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return seeds();
    const stored = normalize(JSON.parse(raw) as T[]);
    if (Number(localStorage.getItem(`${key}:seed-version`) ?? 1) < MARKETING_SEED_VERSION) {
      return [...stored.filter((p) => idNumber(p.id) >= 1000), ...seeds()];
    }
    return stored;
  } catch {
    return seeds();
  }
}

/** Every stored promotion (any status); callers keep the live ones. */
export const readStoredPromotions = (): Promotion[] => readStoredMarketing(PROMOTIONS_STORAGE_KEY, buildMockPromotions, normalizePromotions);
