import { isServer } from "solid-js/web";
import type { FlashCampaignItem, FlashSaleCampaign } from "./flashSaleCampaigns";
import { isInFlashSale, type LegacyFlashProduct } from "./flashSalePricing";

/**
 * Moving the old per-product flash sale (`LegacyFlashFields`) into flash sale
 * campaigns (`flashSaleCampaigns.ts`). Kept free of the marketing modules so
 * the product store can run it while it reads products.
 */
export const FLASH_CAMPAIGNS_STORAGE_KEY = "charmiss:admin:marketing:flash-campaigns";

const TODAY_LABEL = "17 ก.ย. 2569";
const BKK = 7 * 3600_000;
const DAY = 24 * 3600_000;
const bkMidnight = (t: number) => Math.floor((t + BKK) / DAY) * DAY - BKK;

/** Bangkok date + time of an epoch; an end exactly at midnight reads as the day before at 23:59. */
export function bangkokDateTime(ms: number, end = false): { date: string; time: string } {
  if (end && ms === bkMidnight(ms)) {
    const iso = new Date(ms - DAY + BKK).toISOString();
    return { date: iso.slice(0, 10), time: "23:59" };
  }
  const iso = new Date(ms + BKK).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

const emptyCampaign = (id: string, name: string): FlashSaleCampaign => ({
  id,
  name,
  status: "active",
  schedule: "range",
  startDate: "",
  startTime: "00:00",
  endDate: "",
  endTime: "23:59",
  dailyAllDay: true,
  dailyStart: "12:00",
  dailyEnd: "14:00",
  items: [],
  createdAt: TODAY_LABEL,
  updatedAt: TODAY_LABEL,
});

/**
 * The old per-product flash sale as campaigns: products with the same
 * schedule share one campaign (daily round = รอบรายวัน ทั้งวัน; a one-off
 * window = ช่วงเวลา), each keeping its own prices and limits. The first is
 * named "แฟลชเซล", the rest "แฟลชเซล 2", "แฟลชเซล 3" (by end time).
 */
export function migrateFlashCampaigns(products: LegacyFlashProduct[]): FlashSaleCampaign[] {
  const groups = new Map<string, { daily: boolean; startsAt?: number; endsAt?: number; items: FlashCampaignItem[] }>();
  for (const p of products) {
    if (!isInFlashSale(p) || !p.flashSale) continue;
    const key = p.flashSaleDaily ? "daily" : `${p.flashSaleStartsAt ?? ""}|${p.flashSaleEndsAt}`;
    const group = groups.get(key) ?? { daily: !!p.flashSaleDaily, startsAt: p.flashSaleStartsAt, endsAt: p.flashSaleEndsAt, items: [] };
    group.items.push({ productId: p.id, flash: p.flashSale });
    groups.set(key, group);
  }
  const ordered = [...groups.values()].sort((a, b) => (a.daily === b.daily ? (a.endsAt ?? 0) - (b.endsAt ?? 0) : a.daily ? -1 : 1));
  return ordered.map((g, i) => {
    const c = emptyCampaign(`flashsale-${i + 1}`, i === 0 ? "แฟลชเซล" : `แฟลชเซล ${i + 1}`);
    c.items = g.items;
    if (g.daily) {
      c.schedule = "daily";
      return c;
    }
    if (g.startsAt !== undefined) Object.assign(c, (({ date, time }) => ({ startDate: date, startTime: time }))(bangkokDateTime(g.startsAt)));
    if (g.endsAt !== undefined) Object.assign(c, (({ date, time }) => ({ endDate: date, endTime: time }))(bangkokDateTime(g.endsAt, true)));
    return c;
  });
}

/** Writes the migrated campaigns once (when nothing is stored yet). */
export function ensureFlashCampaignsMigrated(legacyProducts: () => LegacyFlashProduct[]) {
  if (isServer) return;
  try {
    if (localStorage.getItem(FLASH_CAMPAIGNS_STORAGE_KEY) !== null) return;
    localStorage.setItem(FLASH_CAMPAIGNS_STORAGE_KEY, JSON.stringify(migrateFlashCampaigns(legacyProducts())));
  } catch {}
}
