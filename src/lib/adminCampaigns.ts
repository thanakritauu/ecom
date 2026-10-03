import type { StatusTone } from "~/components/admin/StatusBadge";
import { isValidDateRange } from "./adminMarketing";
import type { PromotionPageProductRef } from "./adminContent";
import { type HomepageCta, normalizeHomepageDestination } from "./adminHomepage";
import heroBanner1 from "~/assets/images/hero/hero-banner-1.png";
import heroBanner2 from "~/assets/images/hero/hero-banner-2.png";
import heroBanner3 from "~/assets/images/hero/hero-banner-3.png";
import { upgradeSeedBanners } from "./seedBanners";

/**
 * Campaign Management — structurally the same "content bundle" shape as
 * Promotion Page (`adminContent.ts`): banner + copy + product list +
 * destination, admin-settable status only (never a scheduler flipping it on
 * its own). The one deliberate difference from Promotion Page is there is no
 * `navigation` block — Campaigns don't surface in the Frontend Top
 * Navigation, that stays a Promotion-Page-only feature. A Campaign can later
 * be embedded into a Homepage "campaign" section (see `adminHomepage.ts`),
 * but this file has no dependency on Homepage beyond reusing its shared
 * `HomepageBanners`/`HomepageDestination`/`HomepageCta` shapes.
 */
export type CampaignStatus = "draft" | "scheduled" | "published" | "unpublished";

export const CAMPAIGN_STATUS_META: Record<CampaignStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "แบบร่าง", tone: "neutral" },
  scheduled: { label: "ตั้งเวลาไว้", tone: "info" },
  published: { label: "เผยแพร่แล้ว", tone: "success" },
  unpublished: { label: "ยกเลิกการเผยแพร่", tone: "warning" },
};

export type CampaignBanners = {
  desktop: string;
  tablet: string;
  mobile: string;
};

export type Campaign = {
  id: string;
  name: string;
  /** URL-safe, unique across campaigns. Same slug convention as Promotion Page's own slug. */
  slug: string;
  status: CampaignStatus;
  banners: CampaignBanners;
  title: string;
  description: string;
  cta: HomepageCta;
  products: PromotionPageProductRef[];
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
};

export type CampaignFormValues = Omit<Campaign, "id" | "createdAt" | "updatedAt">;

/** Same rules as `adminContent.ts`'s `slugify` — plain ASCII lowercase + hyphen is the whole alphabet a slug needs. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Root-cause guard, same shape as `normalizePromotionPage`/
 * `normalizeHomepageSection` — anything read back out of `localStorage` may
 * predate a field the current `Campaign` shape relies on, so every campaign
 * is normalized before a component ever reads it.
 */
export function normalizeCampaign(c: Partial<Campaign> & { id: string }): Campaign {
  return {
    id: c.id,
    name: c.name ?? "",
    slug: c.slug ?? "",
    status: c.status ?? "draft",
    banners: upgradeSeedBanners({
      desktop: c.banners?.desktop ?? "",
      tablet: c.banners?.tablet ?? "",
      mobile: c.banners?.mobile ?? "",
    }),
    title: c.title ?? "",
    description: c.description ?? "",
    cta: {
      label: c.cta?.label ?? "",
      destination: normalizeHomepageDestination(c.cta?.destination),
    },
    products: Array.isArray(c.products)
      ? c.products.map((ref) => ({ productId: ref.productId, variantIds: Array.isArray(ref.variantIds) ? ref.variantIds : [] }))
      : [],
    startDate: c.startDate ?? "",
    startTime: c.startTime ?? "00:00",
    endDate: c.endDate ?? "",
    endTime: c.endTime ?? "23:59",
    createdAt: c.createdAt ?? "",
    updatedAt: c.updatedAt ?? "",
  };
}

/** Case-insensitive; `excludeId` lets Edit compare against every *other* campaign. */
export function isSlugTaken(campaigns: Campaign[], slug: string, excludeId?: string): boolean {
  const target = slug.trim().toLowerCase();
  return campaigns.some((c) => c.id !== excludeId && c.slug.trim().toLowerCase() === target);
}

/**
 * Pure derived "can a shopper see this right now" check — never mutates
 * `status` itself (that would be a real scheduler/engine, which this
 * prototype deliberately avoids, same as `isPromotionPageVisible`). Unlike
 * Promotion Page's own visibility check, this also respects the *end*
 * boundary: published + past the End date/time means no longer visible.
 */
export function isCampaignVisible(campaign: Pick<Campaign, "status" | "startDate" | "startTime" | "endDate" | "endTime">, nowMs: number = Date.now()): boolean {
  if (campaign.status !== "published") return false;
  const hasStart = !!campaign.startDate;
  const hasEnd = !!campaign.endDate;
  if (!hasStart && !hasEnd) return true;

  const start = hasStart ? new Date(`${campaign.startDate}T${campaign.startTime || "00:00"}`).getTime() : undefined;
  const end = hasEnd ? new Date(`${campaign.endDate}T${campaign.endTime || "23:59"}`).getTime() : undefined;

  if (start !== undefined && end !== undefined) {
    if (!Number.isFinite(start) || !Number.isFinite(end)) return true;
    return nowMs >= start && nowMs <= end;
  }
  if (start !== undefined) {
    return Number.isFinite(start) ? nowMs >= start : true;
  }
  if (end !== undefined) {
    return Number.isFinite(end) ? nowMs <= end : true;
  }
  return true;
}

/**
 * A Draft can be saved with almost nothing filled in; only *Publish* demands
 * the campaign is actually presentable. Returns Thai messages ready to show
 * as-is (toast and/or inline), empty array = safe to publish.
 */
export function validateCampaignPublish(
  values: Pick<CampaignFormValues, "name" | "slug" | "title" | "banners" | "products" | "startDate" | "startTime" | "endDate" | "endTime">,
): string[] {
  const errors: string[] = [];
  if (!values.name.trim()) errors.push("กรุณากรอกชื่อ Campaign");
  if (!values.slug.trim()) errors.push("กรุณากรอก Slug");
  if (!values.title.trim()) errors.push("กรุณากรอก Title");
  if (!values.banners.desktop) errors.push("กรุณาอัปโหลด Desktop Banner");
  if (values.products.length === 0) errors.push("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
  if (values.startDate && values.endDate && !isValidDateRange(values.startDate, values.startTime, values.endDate, values.endTime)) {
    errors.push("ช่วงวันที่ไม่ถูกต้อง");
  }
  return errors;
}

const TODAY_LABEL = "18 ก.ย. 2569";

const CAMPAIGN_SEEDS: (Omit<Campaign, "id" | "createdAt" | "updatedAt"> & { id: string })[] = [
  {
    id: "campaign-001",
    name: "Charmiss Glow Week",
    slug: "charmiss-glow-week",
    status: "published",
    banners: { desktop: heroBanner1, tablet: heroBanner1, mobile: heroBanner1 },
    title: "Glow Week",
    description: "รวมไอเทมบำรุงผิวเปล่งประกายรับสัปดาห์ใหม่ ลดสูงสุด 40% พร้อมของแถมพิเศษ",
    cta: { label: "ช้อปเลย", destination: { type: "internal", path: "/products" } },
    products: [
      { productId: "best-1", variantIds: [] },
      { productId: "best-3", variantIds: [] },
      { productId: "feature-1", variantIds: [] },
    ],
    startDate: "2026-09-10",
    startTime: "00:00",
    endDate: "2026-09-20",
    endTime: "23:59",
  },
  {
    id: "campaign-002",
    name: "แคมเปญต้อนรับปลายเดือน",
    slug: "end-of-month-campaign",
    status: "scheduled",
    banners: { desktop: heroBanner2, tablet: heroBanner2, mobile: "" },
    title: "End of Month Beauty Refresh",
    description: "เติมความสวยก่อนสิ้นเดือน พร้อมส่วนลดพิเศษเฉพาะแคมเปญนี้เท่านั้น",
    cta: { label: "ดูสินค้าทั้งหมด", destination: { type: "internal", path: "/products" } },
    products: [
      { productId: "best-5", variantIds: [] },
      { productId: "feature-2", variantIds: [] },
      { productId: "trend-1", variantIds: [] },
    ],
    startDate: "2026-09-28",
    startTime: "00:00",
    endDate: "2026-09-30",
    endTime: "23:59",
  },
  {
    id: "campaign-003",
    name: "Charmiss x Sanrio Glow Cushion Campaign",
    slug: "sanrio-glow-cushion-campaign",
    status: "published",
    banners: { desktop: heroBanner3, tablet: heroBanner3, mobile: heroBanner3 },
    title: "Sanrio Glow Cushion",
    description: "คุชชั่นเนื้อเนียนละมุน ลิขสิทธิ์แท้ Sanrio จำนวนจำกัด ช้อปก่อนหมดแคมเปญ",
    cta: { label: "ช้อปคอลเลกชัน", destination: { type: "internal", path: "/products" } },
    products: [
      { productId: "feature-1", variantIds: [] },
      { productId: "best-1", variantIds: ["coral"] },
      { productId: "new-2", variantIds: [] },
    ],
    startDate: "2026-09-01",
    startTime: "00:00",
    endDate: "2026-10-31",
    endTime: "23:59",
  },
  {
    id: "campaign-004",
    name: "แคมเปญร่างทดสอบ",
    slug: "draft-test-campaign",
    status: "draft",
    banners: { desktop: "", tablet: "", mobile: "" },
    title: "",
    description: "",
    cta: { label: "", destination: { type: "none" } },
    products: [],
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "23:59",
  },
];

/**
 * Fixed, hand-picked string-literal ids (not an incrementing counter) — this
 * exact incrementing-counter bug was already found and fixed elsewhere in
 * this codebase (`adminHomepage.ts`'s `buildHomepageSectionBaseline`): a
 * baseline builder must be pure, so calling it twice in one session never
 * produces two "different" seed lists.
 */
export function buildMockCampaigns(): Campaign[] {
  return CAMPAIGN_SEEDS.map((seed) => ({ ...seed, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}
