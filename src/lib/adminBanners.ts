import type { StatusTone } from "~/components/admin/StatusBadge";
import { isValidDateRange } from "./adminMarketing";
import { normalizeHomepageDestination, type HomepageBanners, type HomepageDestination } from "./adminHomepage";
import heroBanner2 from "~/assets/images/hero/hero-banner-2.png";
import heroBanner3 from "~/assets/images/hero/hero-banner-3.png";
import { upgradeSeedBanners, HERO1_BANNERS } from "./seedBanners";

/**
 * Storefront banner standard (`ResponsiveBanner.tsx`'s `BANNER_ASPECT_CLASS`)
 * — three real crops, each shown whole in a box of its own ratio. Every
 * Admin banner upload slot/preview reads its hint + aspect from here so the
 * sizes Admin asks for are the sizes the storefront actually renders.
 */
export type BannerDevice = "desktop" | "tablet" | "mobile";

export const BANNER_DEVICE_SPECS: Record<BannerDevice, { label: string; size: string; ratio: string; aspectClass: string }> = {
  desktop: { label: "Desktop", size: "1920×640px", ratio: "3:1", aspectClass: "aspect-[3/1]" },
  tablet: { label: "Tablet", size: "1024×768px", ratio: "4:3", aspectClass: "aspect-[4/3]" },
  mobile: { label: "Mobile", size: "750×1000px", ratio: "3:4", aspectClass: "aspect-[3/4]" },
};

export function bannerSizeHint(device: BannerDevice): string {
  return `แนะนำ ${BANNER_DEVICE_SPECS[device].size} (${BANNER_DEVICE_SPECS[device].ratio})`;
}

/**
 * Banner Management — a standalone media/CTA entity: unlike Promotion Page
 * (a whole landing page with title/description/products/nav) a Banner *is*
 * the clickable creative, so it only needs the three device images plus one
 * `HomepageDestination` (reused directly from `adminHomepage.ts` — never a
 * second destination shape). One admin-settable `status` field, same
 * "not a scheduler" rule `isPromotionPageVisible` already established:
 * nothing here ever mutates `status` on its own.
 */
export type BannerStatus = "draft" | "scheduled" | "published" | "unpublished" | "expired";

export const BANNER_STATUS_META: Record<BannerStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "แบบร่าง", tone: "neutral" },
  scheduled: { label: "ตั้งเวลาไว้", tone: "info" },
  published: { label: "เผยแพร่แล้ว", tone: "success" },
  unpublished: { label: "ยกเลิกการเผยแพร่", tone: "warning" },
  expired: { label: "หมดอายุ", tone: "neutral" },
};

export type BannerPlacement = "homepage_hero" | "homepage_promotion" | "campaign" | "other";

export const BANNER_PLACEMENT_META: Record<BannerPlacement, { label: string }> = {
  homepage_hero: { label: "Homepage Hero" },
  homepage_promotion: { label: "Homepage Promotion" },
  campaign: { label: "Campaign" },
  other: { label: "อื่นๆ" },
};

export type Banner = {
  id: string;
  name: string;
  placement: BannerPlacement;
  status: BannerStatus;
  /** Same `{desktop,tablet,mobile}` shape as `HomepageBanners` — reused directly, never redefined. */
  banners: HomepageBanners;
  /** Reused directly from `adminHomepage.ts` — no separate CTA label field, a banner image IS the whole clickable creative. */
  destination: HomepageDestination;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
};

export type BannerFormValues = Omit<Banner, "id" | "createdAt" | "updatedAt">;

/**
 * Root-cause guard, same pattern as `normalizePromotionPage`/
 * `normalizeHomepageSection` — anything read back out of `localStorage` may
 * predate a field the current `Banner` shape relies on, so every banner is
 * normalized before a component ever reads it.
 */
export function normalizeBanner(b: Partial<Banner> & { id: string }): Banner {
  return {
    id: b.id,
    name: b.name ?? "",
    placement: b.placement ?? "other",
    status: b.status ?? "draft",
    banners: upgradeSeedBanners({
      desktop: b.banners?.desktop ?? "",
      tablet: b.banners?.tablet ?? "",
      mobile: b.banners?.mobile ?? "",
    }),
    destination: normalizeHomepageDestination(b.destination),
    startDate: b.startDate ?? "",
    startTime: b.startTime ?? "00:00",
    endDate: b.endDate ?? "",
    endTime: b.endTime ?? "23:59",
    createdAt: b.createdAt ?? "",
    updatedAt: b.updatedAt ?? "",
  };
}

/** Which device slots have a non-empty image — used by the List's "Device" column (join with " / " to display). */
export function getBannerDevices(banner: Pick<Banner, "banners">): ("desktop" | "tablet" | "mobile")[] {
  const devices: ("desktop" | "tablet" | "mobile")[] = [];
  if (banner.banners.desktop) devices.push("desktop");
  if (banner.banners.tablet) devices.push("tablet");
  if (banner.banners.mobile) devices.push("mobile");
  return devices;
}

/**
 * Pure derived-visibility check only — never a scheduler, never mutates
 * `status` itself (same rule `isPromotionPageVisible` established). Unlike
 * Promotion Page's simpler "start date only" rule, a Banner has a real end
 * date, so both boundaries are checked here.
 */
export function isBannerLive(banner: Pick<Banner, "status" | "startDate" | "startTime" | "endDate" | "endTime">, nowMs: number = Date.now()): boolean {
  if (banner.status !== "published") return false;
  if (!banner.startDate) return true;
  const start = new Date(`${banner.startDate}T${banner.startTime || "00:00"}`).getTime();
  if (!Number.isFinite(start)) return true;
  if (nowMs < start) return false;
  if (banner.endDate) {
    const end = new Date(`${banner.endDate}T${banner.endTime || "23:59"}`).getTime();
    if (Number.isFinite(end) && nowMs > end) return false;
  }
  return true;
}

/** Only Publish demands the banner is actually presentable — a Draft can be saved with almost nothing filled in. Empty array = safe to publish. */
export function validateBannerPublish(values: Pick<BannerFormValues, "name" | "banners" | "startDate" | "startTime" | "endDate" | "endTime">): string[] {
  const errors: string[] = [];
  if (!values.name.trim()) errors.push("กรุณากรอกชื่อ Banner");
  if (!values.banners.desktop) errors.push("กรุณาอัปโหลด Desktop Banner");
  if (values.startDate && values.endDate && !isValidDateRange(values.startDate, values.startTime, values.endDate, values.endTime)) {
    errors.push("ช่วงวันที่ไม่ถูกต้อง");
  }
  return errors;
}

const TODAY_LABEL = "18 ก.ย. 2569";

/**
 * Fixed string-literal ids (not an incrementing counter) — same rationale as
 * `buildHomepageSectionBaseline`'s own note: this baseline builder may be
 * called more than once per session from independent code paths, and a
 * counter would make two calls produce different-looking "same" data.
 * Destinations are internal/external only (no promotion-page ids) to stay
 * self-contained from the Promotion Pages module.
 */
export function buildMockBanners(): Banner[] {
  return [
    {
      // Storefront sync — the live Home hero's first slide (Iconic Glow), real 3-size crops, no link, no end date.
      id: "banner-001",
      name: "Hero Banner หน้าแรก",
      placement: "homepage_hero",
      status: "published",
      banners: { ...HERO1_BANNERS },
      destination: { type: "none" },
      startDate: "",
      startTime: "00:00",
      endDate: "",
      endTime: "23:59",
      createdAt: TODAY_LABEL,
      updatedAt: TODAY_LABEL,
    },
    {
      id: "banner-002",
      name: "Promotion Banner กลางหน้า",
      placement: "homepage_promotion",
      status: "scheduled",
      banners: { desktop: heroBanner2, tablet: heroBanner2, mobile: "" },
      destination: { type: "internal", path: "/promotion/promotions" },
      startDate: "2026-09-25",
      startTime: "00:00",
      endDate: "2026-09-27",
      endTime: "23:59",
      createdAt: TODAY_LABEL,
      updatedAt: TODAY_LABEL,
    },
    {
      id: "banner-003",
      name: "Campaign Banner 9.9",
      placement: "campaign",
      // Storefront sync — the 9.9 campaign ended on 9 ก.ย.; its page is unpublished too.
      status: "expired",
      banners: { desktop: heroBanner3, tablet: heroBanner3, mobile: heroBanner3 },
      destination: { type: "external", url: "https://charmiss.co.th/9-9" },
      startDate: "2026-09-01",
      startTime: "00:00",
      endDate: "2026-09-09",
      endTime: "23:59",
      createdAt: TODAY_LABEL,
      updatedAt: TODAY_LABEL,
    },
    {
      id: "banner-004",
      name: "Banner ร่างทดสอบ",
      placement: "other",
      status: "draft",
      banners: { desktop: "", tablet: "", mobile: "" },
      destination: { type: "none" },
      startDate: "",
      startTime: "00:00",
      endDate: "",
      endTime: "23:59",
      createdAt: TODAY_LABEL,
      updatedAt: TODAY_LABEL,
    },
    {
      id: "banner-005",
      name: "Banner โปรปีใหม่ที่ผ่านมา",
      placement: "homepage_hero",
      status: "unpublished",
      banners: { desktop: heroBanner2, tablet: "", mobile: "" },
      destination: { type: "internal", path: "/account" },
      startDate: "2026-01-01",
      startTime: "00:00",
      endDate: "2026-01-15",
      endTime: "23:59",
      createdAt: TODAY_LABEL,
      updatedAt: TODAY_LABEL,
    },
  ];
}

/**
 * Storefront sync seed upgrade, same versioned shape as
 * `upgradePromotionPageSeeds` (`adminContent.ts`) — run once per version step
 * by `adminBannerStore.tsx`; each step only touches a banner still in its
 * old seed shape, so admin edits survive.
 *  - v2: "Hero Banner หน้าแรก" → the live hero's real crops, no end date;
 *    "Campaign Banner 9.9" → expired.
 */
export const BANNER_SEED_VERSION = 3;

export function upgradeBannerSeeds(stored: Banner[], fromVersion: number): Banner[] {
  if (fromVersion >= 3) return stored;
  const seeds = buildMockBanners();
  return stored.map((b) => {
    // v3 — `/promotions` never had a route; any saved banner still pointing there moves to the real promotions page.
    if (b.destination?.type === "internal" && b.destination.path === "/promotions") b = { ...b, destination: { ...b.destination, path: "/promotion/promotions" } };
    if (fromVersion >= 2) return b;
    if (b.id === "banner-001" && b.endDate === "2026-09-30") return { ...seeds[0], createdAt: b.createdAt, updatedAt: b.updatedAt };
    if (b.id === "banner-003" && b.status === "published" && b.endDate === "2026-10-31") return { ...b, status: "expired", endDate: "2026-09-09" };
    return b;
  });
}
