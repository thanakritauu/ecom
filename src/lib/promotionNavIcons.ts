import type { Component } from "solid-js";
import { TagIcon, StarIcon, FireIcon, GiftIcon, SparkleIcon, HeartIcon } from "~/components/shared/icons";

/**
 * Nav add-on §3 — "ใช้ Icon Library เดิม ... ไม่ต้องสร้าง Icon Library ใหม่".
 * A `NavigationItem.icon` (see `adminNavigation.ts`) stores one of these
 * string keys, never an uploaded file — this registry is the single place
 * that turns a key back into the real icon component, shared as-is by the
 * Admin Navigation icon picker and the actual Frontend Top Navigation
 * (`Header.tsx`/`MobileMenu.tsx`), so a key can never render differently in
 * the two places.
 */
export type PromotionNavIconOption = { key: string; label: string; Icon: Component<{ class?: string }> };

export const PROMOTION_NAV_ICON_OPTIONS: PromotionNavIconOption[] = [
  { key: "tag", label: "Tag", Icon: TagIcon },
  { key: "star", label: "Star", Icon: StarIcon },
  { key: "fire", label: "Fire", Icon: FireIcon },
  { key: "gift", label: "Gift", Icon: GiftIcon },
  { key: "sparkle", label: "Sparkle", Icon: SparkleIcon },
  { key: "heart", label: "Heart", Icon: HeartIcon },
];

export function getPromotionNavIcon(key: string): Component<{ class?: string }> | undefined {
  return PROMOTION_NAV_ICON_OPTIONS.find((opt) => opt.key === key)?.Icon;
}

/**
 * CMS Dashboard & Admin UX Refinement §10 — `NavigationItem.icon` now also
 * accepts an uploaded image (an object URL / data URI / absolute path)
 * instead of only one of the keys above. Distinguishing the two by shape
 * (rather than adding a second field) means every existing NavigationItem
 * saved with a legacy key keeps resolving through `getPromotionNavIcon`
 * completely unchanged — only a newly-uploaded icon takes this path. See
 * `~/components/shared/NavIcon.tsx`, the one render helper both the
 * Customer Frontend (Header/MobileMenu) and Admin (Navigation list/preview/
 * form) use, so the two can never disagree on how a given `icon` value
 * should render.
 */
export function isImageIconSrc(icon: string): boolean {
  return icon.startsWith("data:") || icon.startsWith("blob:") || icon.startsWith("http://") || icon.startsWith("https://") || icon.startsWith("/");
}
