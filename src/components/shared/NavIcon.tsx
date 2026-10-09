import { isImageIconSrc } from "~/lib/adminNavigation";

/**
 * CMS Dashboard & Admin UX Refinement §10 — the one place that turns a
 * `NavigationItem.icon` string into a rendered icon, for BOTH the Customer
 * Frontend (Header.tsx/MobileMenu.tsx) and Admin (Navigation list/preview/
 * form). Only an uploaded image renders; anything else (empty, or a retired
 * preset key from old saved data) renders nothing.
 */
export function NavIcon(props: { icon?: string; class?: string }) {
  const icon = props.icon;
  if (!icon || !isImageIconSrc(icon)) return null;
  return <img src={icon} alt="" class={props.class} style={{ "object-fit": "cover" }} />;
}
