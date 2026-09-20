import type { Component } from "solid-js";
import { TagIcon, StarIcon, FireIcon, GiftIcon, SparkleIcon, HeartIcon } from "~/components/shared/icons";

/**
 * Nav add-on §3 — "ใช้ Icon Library เดิม ... ไม่ต้องสร้าง Icon Library ใหม่".
 * A `PromotionPage.navigation.icon` stores one of these string keys, never an
 * uploaded file — this registry is the single place that turns a key back
 * into the real icon component, shared as-is by the Admin Icon Picker
 * (`PromotionPageForm.tsx`) and the actual Frontend Top Navigation
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
