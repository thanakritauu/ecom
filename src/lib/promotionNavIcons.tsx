import type { Component } from "solid-js";
import { TagIcon, StarIcon, FireIcon, GiftIcon, SparkleIcon, HeartIcon } from "~/components/shared/icons";
import glowIcon from "~/assets/icons/nav/glow.png";
import flashSaleIcon from "~/assets/icons/nav/flashsale.png";
import bestSellerIcon from "~/assets/icons/nav/promotion.png";
import newIcon from "~/assets/icons/nav/new.png";
import hotIcon from "~/assets/icons/nav/hot.png";
import nineNineIcon from "~/assets/icons/nav/nine-nine.png";

/** Full-colour nav artwork (64×64 squares — 32px @2x), never recoloured; takes the caller's square `size-*` class like any other icon. */
const artwork =
  (src: string): Component<{ class?: string }> =>
  (props) => <img src={src} alt="" class={`object-contain ${props.class ?? ""}`} />;

export type PromotionNavIconOption = { key: string; label: string; Icon: Component<{ class?: string }> };

export const PROMOTION_NAV_ICON_OPTIONS: PromotionNavIconOption[] = [
  { key: "tag", label: "Tag", Icon: TagIcon },
  { key: "star", label: "Star", Icon: StarIcon },
  { key: "fire", label: "Fire", Icon: FireIcon },
  { key: "gift", label: "Gift", Icon: GiftIcon },
  { key: "sparkle", label: "Sparkle", Icon: SparkleIcon },
  { key: "heart", label: "Heart", Icon: HeartIcon },
  { key: "glow", label: "Glow", Icon: artwork(glowIcon) },
  { key: "flashsale", label: "Flash Sale", Icon: artwork(flashSaleIcon) },
  { key: "bestseller", label: "ขายดี", Icon: artwork(bestSellerIcon) },
  { key: "new", label: "มาใหม่", Icon: artwork(newIcon) },
  { key: "hot", label: "กำลังฮิต", Icon: artwork(hotIcon) },
  { key: "nine-nine", label: "9.9", Icon: artwork(nineNineIcon) },
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
