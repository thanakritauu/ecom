import type { Order } from "./types";
import tierGlowMark from "~/assets/icons/tier-glow.png";
import tierRadianceMark from "~/assets/icons/tier-radiance.png";
import tierIconMark from "~/assets/icons/tier-icon.png";

/**
 * Member tiers Charmiss Glow → Radiance → Icon (mock — no loyalty backend): climbed by this calendar year's
 * paid spend. Only orders that were paid and not cancelled count; numbers
 * and perks are placeholders until the real loyalty rules exist.
 */
export type TierId = "glow" | "radiance" | "icon";

export type Tier = {
  id: TierId;
  name: string;
  /** Without "Charmiss" — for tight spots like the progress-bar labels. */
  shortName: string;
  /** Yearly spend (฿) that unlocks this tier. */
  minSpend: number;
  perks: string[];
  /** Coin earn multiplier on top of the base rate (`computeCoinsEarned` in cartSelectors.ts) — what the "รับคอยน์ x…" perk promises. */
  coinMultiplier: number;
  /** Tier colour (fills, badges, ladder dot) and the text colour that sits on it. */
  bg: string;
  fg: string;
  /** This tier's medal artwork. */
  mark: string;
};

export const TIERS: Tier[] = [
  {
    id: "glow",
    name: "Charmiss Glow",
    shortName: "Glow",
    minSpend: 0,
    coinMultiplier: 1,
    bg: "#F6B7C8",
    fg: "#713B50",
    mark: tierGlowMark,
    perks: ["รับ 1 คอยน์ ทุก ฿10", "คูปองวันเกิด ฿50"],
  },
  {
    id: "radiance",
    name: "Charmiss Radiance",
    shortName: "Radiance",
    minSpend: 3000,
    coinMultiplier: 1.5,
    bg: "#D982A1",
    fg: "#FFFFFF",
    mark: tierRadianceMark,
    perks: ["รับคอยน์ x1.5", "คูปองวันเกิด ฿100", "ส่วนลดพิเศษเฉพาะสมาชิก"],
  },
  {
    id: "icon",
    name: "Charmiss Icon",
    shortName: "Icon",
    minSpend: 10000,
    coinMultiplier: 2,
    bg: "#8E4667",
    fg: "#FFFFFF",
    mark: tierIconMark,
    perks: ["รับคอยน์ x2", "คูปองวันเกิด ฿300", "สิทธิ์ช้อปสินค้าใหม่ก่อนใคร"],
  },
];

/** Where a tier's dot sits on the progress bar (0–1, same scale as `resolveTier().progress`): evenly spaced. */
export const tierPosition = (tier: Tier) => TIERS.indexOf(tier) / (TIERS.length - 1);

/** This year's paid spend (cancelled and unpaid orders excluded). */
export function yearlySpend(orders: Order[], year = new Date().getFullYear()): number {
  return orders
    .filter((o) => o.status !== "cancelled" && o.status !== "pending_payment" && new Date(o.placedAt).getFullYear() === year)
    .reduce((sum, o) => sum + o.total, 0);
}

export function resolveTier(spend: number): { current: Tier; next?: Tier; toNext: number; progress: number } {
  const index = TIERS.reduce((found, tier, i) => (spend >= tier.minSpend ? i : found), 0);
  const current = TIERS[index];
  const next = TIERS[index + 1];
  const toNext = next ? Math.max(0, next.minSpend - spend) : 0;
  // Tiers sit evenly on the bar (Radiance in the middle); within each step the fill is proportional to the spend.
  const segment = next ? (spend - current.minSpend) / (next.minSpend - current.minSpend) : 0;
  const progress = Math.min(1, (index + segment) / (TIERS.length - 1));
  return { current, next, toNext, progress };
}

export const getTier = (id: TierId): Tier => TIERS.find((t) => t.id === id) ?? TIERS[0];
