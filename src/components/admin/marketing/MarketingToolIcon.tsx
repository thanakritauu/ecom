import type { Component } from "solid-js";
import { Dynamic } from "solid-js/web";
import { BundleBoxIcon, CouponTicketIcon, FlashBoltIcon, PromotionTagIcon, RewardGiftIcon } from "~/components/admin/icons";
import type { MarketingTool } from "~/lib/adminMarketing";

type IconProps = { class?: string };

function NewCustomerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="10" cy="8" r="3.3" />
      <path d="M3.5 20c.8-3.2 3.2-5 6.5-5 1.3 0 2.5.3 3.5.8" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M18 14v6M15 17h6" stroke-linecap="round" />
    </svg>
  );
}

function CodeTagIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="m9 10-2 2 2 2M15 10l2 2-2 2M12.8 9.5l-1.6 5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

function TruckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M2.5 6.5h11v9.5h-11zM13.5 10h4l3 3v3h-7" stroke-linejoin="round" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}

function StepsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M3.5 20h17M5 20v-4h4v4M10 20v-8h4v8M15 20V7h4v13" stroke-linejoin="round" />
    </svg>
  );
}

function BuyGetIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M5 8h9l-1 11H6L5 8Z" stroke-linejoin="round" />
      <path d="M7.5 8V6.5a2 2 0 0 1 4 0V8" />
      <path d="M18 9v6M15 12h6" stroke-linecap="round" />
    </svg>
  );
}

const TOOL_ICONS: Record<MarketingTool, Component<IconProps>> = {
  product_discount: PromotionTagIcon,
  flash_sale: FlashBoltIcon,
  coupon: CouponTicketIcon,
  coupon_new: NewCustomerIcon,
  coupon_code: CodeTagIcon,
  gift_with_purchase: RewardGiftIcon,
  free_shipping: TruckIcon,
  tiered_discount: StepsIcon,
  bundle: BundleBoxIcon,
  buy_x_get_y: BuyGetIcon,
};

/** The tool's icon (gallery cards, form page titles, list badges). */
export function MarketingToolIcon(props: { tool: MarketingTool; class?: string }) {
  return <Dynamic component={TOOL_ICONS[props.tool]} class={props.class} />;
}

/** Icon in a soft pink square: the gallery card and the form page title. */
export function MarketingToolIconBox(props: { tool: MarketingTool; size?: "sm" | "md" }) {
  return (
    <span
      class={`flex shrink-0 items-center justify-center rounded-card bg-surface-pink text-brand-pink ${props.size === "sm" ? "size-9" : "size-11"}`}
      aria-hidden="true"
    >
      <MarketingToolIcon tool={props.tool} class={props.size === "sm" ? "size-5" : "size-6"} />
    </span>
  );
}
