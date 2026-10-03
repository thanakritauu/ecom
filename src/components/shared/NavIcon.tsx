import { getPromotionNavIcon, isImageIconSrc } from "~/lib/promotionNavIcons";

/**
 * CMS Dashboard & Admin UX Refinement §10 — the one place that turns a
 * `NavigationItem.icon` string into a rendered icon, for BOTH the Customer
 * Frontend (Header.tsx/MobileMenu.tsx) and Admin (Navigation list/preview/
 * form). Renders an uploaded image if `icon` looks like one, otherwise falls
 * back to the legacy `PROMOTION_NAV_ICON_OPTIONS` key lookup unchanged — so
 * existing NavigationItems (seeded with a key like "tag"/"fire") keep
 * rendering exactly as they did before this change.
 */
export function NavIcon(props: { icon?: string; class?: string }) {
  const icon = props.icon;
  if (!icon) return null;
  if (isImageIconSrc(icon)) {
    return <img src={icon} alt="" class={props.class} style={{ "object-fit": "cover" }} />;
  }
  const Icon = getPromotionNavIcon(icon);
  return Icon ? <Icon class={props.class} /> : null;
}
