import { isServer } from "solid-js/web";
import type { AdminProduct } from "./adminProductStore";
import { normalizeAudience, type Audience } from "./marketingAudience";
import { formatMarketingDate, normalizeCombinable, normalizeMarketingStatus, type CombinableKind, type MarketingPhase, type MarketingStatus } from "./adminMarketing";
import { flashPricesOf, normalizeFlashSaleConfig, type FlashSaleConfig } from "./flashSalePricing";
import { FLASH_CAMPAIGNS_STORAGE_KEY } from "./flashSaleMigration";

export { FLASH_CAMPAIGNS_STORAGE_KEY, bangkokDateTime, migrateFlashCampaigns } from "./flashSaleMigration";

/**
 * Flash sale CAMPAIGNS (รอบแฟลชเซล, TikTok Shop "flash deal" style). Each
 * campaign has its own schedule, กลุ่มลูกค้า, การใช้ร่วมกับโปรอื่น and a list
 * of products, each with its own flash price and limits (`FlashSaleConfig`,
 * `flashSalePricing.ts`). Draft-first like every marketing tool (`status`).
 *
 * Schedule (Bangkok time, UTC+7):
 * - `range` (ช่วงเวลา): one window from start to end date-time.
 * - `daily` (รอบรายวัน): every day `dailyStart`-`dailyEnd` (or all day),
 *   optionally only between `startDate` and `endDate` (empty = no limit).
 * An end time of 23:59 means the end of that day (midnight).
 *
 * The storefront (`productCatalog.tsx`) prices a product from the LIVE
 * campaigns that hold it (status active, inside a round, shopper in the
 * audience); when two live campaigns hold the same product, the lower flash
 * price wins.
 */
export type FlashScheduleKind = "range" | "daily";

export type FlashCampaignItem = { productId: string; flash: FlashSaleConfig };

export type FlashSaleCampaign = {
  id: string;
  name: string;
  status: MarketingStatus;
  schedule: FlashScheduleKind;
  /** `range`: the window (required). `daily`: optional first / last day of the rounds. */
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  /** `daily` only: the round runs all day (00:00 to midnight). */
  dailyAllDay: boolean;
  /** `daily` only (HH:mm), when not all day. */
  dailyStart: string;
  dailyEnd: string;
  audience?: Audience;
  combinableWith?: CombinableKind[];
  items: FlashCampaignItem[];
  createdAt: string;
  updatedAt: string;
};

const TODAY_LABEL = "17 ก.ย. 2569";
const BKK = 7 * 3600_000;
const DAY = 24 * 3600_000;

// ---------------------------------------------------------------------------
// Time (Bangkok)
// ---------------------------------------------------------------------------

const bkMidnight = (t: number) => Math.floor((t + BKK) / DAY) * DAY - BKK;

function minutesOf(hhmm: string | undefined): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? "");
  if (!m) return undefined;
  const n = Number(m[1]) * 60 + Number(m[2]);
  return n >= 0 && n < 1440 ? n : undefined;
}
/** An end time: 23:59 is the end of the day. */
const endMinutesOf = (hhmm: string | undefined) => (hhmm === "23:59" ? 1440 : minutesOf(hhmm));

/** Epoch ms of a Bangkok date + time (`end`: 23:59 = midnight after it). Undefined when the date is empty or bad. */
export function bangkokEpoch(date: string, time: string, end = false): number | undefined {
  if (!date) return undefined;
  const day = Date.parse(`${date}T00:00:00+07:00`);
  if (Number.isNaN(day)) return undefined;
  const mins = end ? endMinutesOf(time || "23:59") : minutesOf(time || "00:00");
  return day + (mins ?? 0) * 60_000;
}

/** The campaign's outer bounds: range = its window; daily = its optional first / last day. */
function outerBounds(c: FlashSaleCampaign): { from: number; to: number } {
  return {
    from: bangkokEpoch(c.startDate, c.startTime) ?? Number.NEGATIVE_INFINITY,
    to: bangkokEpoch(c.endDate, c.endTime, true) ?? Number.POSITIVE_INFINITY,
  };
}

/** One daily round on the Bangkok day starting at `dayStart`. */
function dailyRound(c: FlashSaleCampaign, dayStart: number): [number, number] | undefined {
  if (c.dailyAllDay) return [dayStart, dayStart + DAY];
  const a = minutesOf(c.dailyStart);
  const b = endMinutesOf(c.dailyEnd);
  if (a === undefined || b === undefined || b <= a) return undefined;
  return [dayStart + a * 60_000, dayStart + b * 60_000];
}

/** Admin state (same words as every marketing tool): a daily campaign between rounds still reads กำลังดำเนินการ. */
export function flashCampaignPhase(c: FlashSaleCampaign, now = Date.now()): MarketingPhase {
  if (c.status === "draft") return "draft";
  if (c.status !== "active") return "disabled";
  const { from, to } = outerBounds(c);
  if (now < from) return "scheduled";
  if (now >= to) return "expired";
  return "live";
}

/** The round running right now (clipped to the outer bounds), or undefined when the campaign isn't selling now. */
export function flashCampaignRoundAt(c: FlashSaleCampaign, now = Date.now()): { startsAt: number; endsAt: number } | undefined {
  if (flashCampaignPhase(c, now) !== "live") return undefined;
  const { from, to } = outerBounds(c);
  if (c.schedule === "range") return Number.isFinite(to) ? { startsAt: from, endsAt: to } : undefined;
  const round = dailyRound(c, bkMidnight(now));
  if (!round || now < round[0] || now >= round[1]) return undefined;
  return { startsAt: Math.max(round[0], from), endsAt: Math.min(round[1], to) };
}

/** Every start / end moment after `now` within a day (the storefront refreshes right then). */
export function flashCampaignBoundaries(c: FlashSaleCampaign, now = Date.now()): number[] {
  if (c.status !== "active") return [];
  const { from, to } = outerBounds(c);
  const times = [from, to];
  if (c.schedule === "daily") {
    const today = bkMidnight(now);
    for (const day of [today, today + DAY]) times.push(...(dailyRound(c, day) ?? []));
  }
  return times.filter((t) => Number.isFinite(t) && t > now && t - now <= DAY);
}

/** Selling rounds from `from` to `to` (sorted), for overlap checks. */
function roundsBetween(c: FlashSaleCampaign, from: number, to: number): [number, number][] {
  const outer = outerBounds(c);
  const a = Math.max(from, outer.from);
  const b = Math.min(to, outer.to);
  if (a >= b) return [];
  if (c.schedule === "range") return [[a, b]];
  const out: [number, number][] = [];
  for (let day = bkMidnight(a); day < b; day += DAY) {
    const r = dailyRound(c, day);
    if (!r) break;
    const s = Math.max(r[0], a);
    const e = Math.min(r[1], b);
    if (s < e) out.push([s, e]);
  }
  return out;
}

/** Do two campaigns sell at the same moment, from now on (checked over the next year)? */
export function flashSchedulesOverlap(x: FlashSaleCampaign, y: FlashSaleCampaign, now = Date.now()): boolean {
  const to = now + 366 * DAY;
  const a = roundsBetween(x, now, to);
  const b = roundsBetween(y, now, to);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i][0] < b[j][1] && b[j][0] < a[i][1]) return true;
    if (a[i][1] <= b[j][1]) i++;
    else j++;
  }
  return false;
}

/** Other published campaigns that sell the same products at the same time as `c` (the form warns; the lower price wins). */
export function flashCampaignOverlaps(c: FlashSaleCampaign, all: FlashSaleCampaign[], now = Date.now()): { campaign: FlashSaleCampaign; productIds: string[] }[] {
  const mine = new Set(c.items.map((i) => i.productId));
  const out: { campaign: FlashSaleCampaign; productIds: string[] }[] = [];
  for (const other of all) {
    if (other.id === c.id || other.status !== "active") continue;
    const shared = other.items.map((i) => i.productId).filter((id) => mine.has(id));
    if (shared.length === 0 || !flashSchedulesOverlap(c, other, now)) continue;
    out.push({ campaign: other, productIds: shared });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const dateTime = (date: string, time: string) => `${formatMarketingDate(date)} ${time} น.`;

/** "ทุกวัน 12:00-14:00 น." / "ทุกวัน ทั้งวัน" (+ "ตั้งแต่ ... ถึง ...") / "17 ต.ค. 2569 10:00 น. - 18 ต.ค. 2569 23:59 น.". */
export function formatFlashSchedule(c: Pick<FlashSaleCampaign, "schedule" | "startDate" | "startTime" | "endDate" | "endTime" | "dailyAllDay" | "dailyStart" | "dailyEnd">): string {
  if (c.schedule === "range") {
    if (!c.startDate && !c.endDate) return "ยังไม่ได้ตั้งเวลา";
    return `${c.startDate ? dateTime(c.startDate, c.startTime || "00:00") : "-"} - ${c.endDate ? dateTime(c.endDate, c.endTime || "23:59") : "-"}`;
  }
  const round = c.dailyAllDay ? "ทุกวัน ทั้งวัน" : `ทุกวัน ${c.dailyStart || "-"}-${c.dailyEnd || "-"} น.`;
  const from = c.startDate ? ` ตั้งแต่ ${formatMarketingDate(c.startDate)}` : "";
  const to = c.endDate ? ` ถึง ${formatMarketingDate(c.endDate)}` : "";
  return `${round}${from}${to}`;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

/** What a saved แบบร่าง still lacks before it can go live (same rules as the form's full check). Empty = ready. */
export function flashCampaignPublishProblems(c: FlashSaleCampaign, productById: (id: string) => AdminProduct | undefined): string[] {
  const missing: string[] = [];
  if (!c.name.trim()) missing.push("ชื่อแคมเปญ");
  if (c.schedule === "range") {
    const from = bangkokEpoch(c.startDate, c.startTime);
    const to = bangkokEpoch(c.endDate, c.endTime, true);
    if (from === undefined) missing.push("วันเริ่ม");
    if (to === undefined) missing.push("วันสิ้นสุด");
    else if (from !== undefined && to <= from) missing.push("ช่วงเวลา");
  } else if (!c.dailyAllDay && !dailyRound(c, 0)) missing.push("เวลารอบรายวัน");
  if (c.audience?.kind === "tiers" && !c.audience.tiers?.length) missing.push("กลุ่มลูกค้า");
  const priced = c.items.filter((i) => {
    const p = productById(i.productId);
    return p && flashPricesOf(p, i.flash).length > 0;
  });
  if (c.items.length === 0) missing.push("สินค้า");
  else if (priced.length < c.items.length) missing.push("ราคาแฟลชเซล");
  return missing;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

export function normalizeFlashCampaigns(list: FlashSaleCampaign[]): FlashSaleCampaign[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((c) => !!c && typeof c.id === "string")
    .map((c) => ({
      id: c.id,
      name: str(c.name),
      status: normalizeMarketingStatus(c.status),
      schedule: c.schedule === "daily" ? "daily" : "range",
      startDate: str(c.startDate),
      startTime: str(c.startTime, "00:00"),
      endDate: str(c.endDate),
      endTime: str(c.endTime, "23:59"),
      dailyAllDay: c.dailyAllDay !== false,
      dailyStart: str(c.dailyStart, "12:00"),
      dailyEnd: str(c.dailyEnd, "14:00"),
      audience: normalizeAudience(c.audience),
      combinableWith: normalizeCombinable(c.combinableWith),
      items: Array.isArray(c.items)
        ? c.items
            .filter((i) => !!i && typeof i.productId === "string")
            .map((i) => ({ productId: i.productId, flash: normalizeFlashSaleConfig(i.flash) ?? { level: "product", mode: "percent", value: 10, options: [] } }))
            .filter((i, idx, all) => all.findIndex((x) => x.productId === i.productId) === idx)
        : [],
      createdAt: str(c.createdAt, TODAY_LABEL),
      updatedAt: str(c.updatedAt, TODAY_LABEL),
    }));
}

/** The stored campaigns, or null when none were ever stored (not migrated yet). */
export function readStoredFlashCampaigns(): FlashSaleCampaign[] | null {
  if (isServer) return null;
  try {
    const raw = localStorage.getItem(FLASH_CAMPAIGNS_STORAGE_KEY);
    return raw ? normalizeFlashCampaigns(JSON.parse(raw) as FlashSaleCampaign[]) : null;
  } catch {
    return null;
  }
}
