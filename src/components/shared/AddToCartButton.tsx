import { splitProps, type JSX } from "solid-js";
import { Button } from "./Button";
import { CartIcon } from "./icons";

/**
 * Design system rule — the ONE "เพิ่มลงตะกร้า" button, everywhere (Product
 * Card grid + list, PDP, PDP sticky bar, Product Option Modal) and at every
 * screen size: primary pink, cart icon + the full label "เพิ่มลงตะกร้า".
 * Never drop the icon, never shorten the label; where space is tight the
 * button scales down instead (`size`).
 *
 * - `lg`: PDP main CTA (52px).
 * - `md`: Product Option Modal (52px).
 * - `compact`: PDP sticky bar — 40px, 16px icon, 24px side
 *   padding on phones (16px below 375px so the one-row bar still fits a
 *   360px screen), `md` from `sm`.
 * - `card`: Product Card — 40px; 16px side padding below `sm`
 *   (a ~134px wide mobile card has no room for 24px), 24px from `sm`.
 *
 * Purchase-control text standard: the label is 14px (`text-sm`) at every
 * size and breakpoint, and every QuantityStepper number uses the same 14px
 * — one size for "จำนวน" and "เพิ่มลงตะกร้า" everywhere. Tight spots get
 * less padding, never smaller (or bigger) text.
 */
export function AddToCartButton(
  props: {
    size?: "lg" | "md" | "compact" | "card";
    outOfStock?: boolean;
    /** Replaces the label only for a transient state (e.g. "ลองอีกครั้ง" after an error). */
    label?: string;
    loading?: boolean;
    class?: string;
  } & Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "class">,
) {
  const [local, rest] = splitProps(props, ["size", "outOfStock", "label", "loading", "class", "disabled"]);
  const size = () => local.size ?? "md";
  const sizeClass = () =>
    ({
      lg: "h-[52px] !gap-2 !px-6 !text-sm",
      md: "h-[52px] !gap-2 !px-6 !text-sm",
      compact: "h-10 !min-h-10 !gap-1 !px-6 !text-sm max-[374px]:!px-4 sm:h-[52px] sm:!gap-2",
      card: "h-10 !min-h-10 !gap-1 !px-4 !text-sm sm:!gap-1.5 sm:!px-6",
    })[size()];
  const iconClass = () => ({ lg: "size-6", md: "size-6", compact: "size-4 sm:size-6", card: "size-4 sm:size-5" })[size()];

  return (
    <Button
      type="button"
      variant="primary"
      {...rest}
      class={`whitespace-nowrap ${sizeClass()} ${local.class ?? ""}`}
      disabled={local.disabled || local.outOfStock}
      loading={local.loading}
    >
      <CartIcon class={`shrink-0 ${iconClass()}`} />
      <span>{local.label ?? (local.outOfStock ? "สินค้าหมด" : "เพิ่มลงตะกร้า")}</span>
    </Button>
  );
}
