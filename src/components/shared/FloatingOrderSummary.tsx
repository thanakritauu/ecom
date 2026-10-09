import { Show } from "solid-js";
import { formatTHB } from "./PriceDisplay";
import { Button } from "./Button";

/**
 * Generic floating/sticky quick-access order summary — originally built for
 * Checkout (`FloatingOrderSummaryBar`), promoted here so Cart can reuse the
 * exact same container/spacing/button treatment instead of a duplicate
 * component. Container/spacing/button treatment mirror StickyAddToCartBar
 * (Product Detail's floating CTA) — `fixed inset-x-0 bottom-0` bar,
 * `max-w-container-wide` inner row, `border-t` + upward shadow, `size="sm"`
 * Button — not a new visual pattern.
 *
 * Deliberately takes plain numbers/callbacks rather than a page-specific
 * totals shape (Checkout's `CheckoutTotals`, Cart's bare `total()`) so each
 * caller supplies only the data it actually has — `discount`/`shippingFee`
 * left `undefined` simply omits that segment instead of fabricating a value
 * the page doesn't compute (Cart has no coupon/shipping calculation).
 * `onCta` (Checkout: async submit handler) and `ctaHref` (Cart: plain
 * `/checkout` link) are mutually exclusive, matching Button's own href-vs-
 * onClick duality.
 */
export function FloatingOrderSummary(props: {
  itemCount: number;
  discount?: number;
  shippingFee?: number;
  total: number;
  ctaLabel: string;
  ctaLoadingLabel?: string;
  onCta?: () => void;
  ctaHref?: string;
  ctaLoading?: boolean;
  ctaDisabled?: boolean;
  error?: string;
  /** Cart's Header is never `minimal`, so BottomNav (Global Responsive §4) shares the screen with this bar on Tablet/Mobile — set on that one caller to clear it. Checkout's `minimal` Header never mounts BottomNav, so it omits this and keeps sitting flush at `bottom-0` exactly as before. */
  stackAboveBottomNav?: boolean;
}) {
  const shippingLabel = () => (props.shippingFee === 0 ? "ฟรี" : formatTHB(props.shippingFee ?? 0));
  const ctaLabel = () => (props.ctaLoading ? (props.ctaLoadingLabel ?? "กำลังดำเนินการ...") : props.ctaLabel);

  return (
    <div
      class="fixed inset-x-0 z-20 border-t border-surface-gray bg-white shadow-[0_-2px_12px_rgba(90,106,133,0.10)]"
      classList={{ "bottom-16 lg:bottom-0": props.stackAboveBottomNav, "bottom-0": !props.stackAboveBottomNav }}
      style={{ "padding-bottom": "env(safe-area-inset-bottom)" }}
    >
      <Show when={props.error}>
        <p class="mx-auto max-w-container-wide px-4 pt-2 text-xs text-system-red lg:px-[150px]" role="alert">
          {props.error}
        </p>
      </Show>

      <div class="mx-auto flex max-w-container-wide flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4 lg:px-[150px]">
        {/* LEFT — condensed summary, one wrapping row, segments spaced by gap-x; segments only appear when the caller actually has that data */}
        <p class="flex min-w-0 flex-1 flex-wrap gap-x-3 text-left text-sm text-ink-gray">
          <span>{props.itemCount} รายการ</span>
          <Show when={props.discount !== undefined && props.discount > 0}>
            <span class="text-success">ส่วนลด -{formatTHB(props.discount ?? 0)}</span>
          </Show>
          <Show when={props.shippingFee !== undefined}>
            <span>
              ค่าจัดส่ง <span classList={{ "text-success": props.shippingFee === 0 }}>{shippingLabel()}</span>
            </span>
          </Show>
        </p>

        {/* RIGHT — grand total (visually heavier than the left meta) + CTA, grouped and right-aligned */}
        <div class="flex shrink-0 items-center justify-between gap-4 md:justify-end md:text-right">
          <p class="flex items-baseline gap-2">
            <span class="text-sm font-medium text-ink md:text-base">ยอดชำระทั้งหมด</span>
            <span class="text-lg font-bold text-brand-pink md:text-xl lg:text-2xl">{formatTHB(props.total)}</span>
          </p>
          <Show
            when={props.ctaHref}
            fallback={
              <Button
                type="button"
                variant="primary"
                size="sm"
                class="shrink-0"
                loading={props.ctaLoading}
                disabled={props.ctaDisabled}
                onClick={props.onCta}
              >
                {ctaLabel()}
              </Button>
            }
          >
            <Show
              when={!props.ctaDisabled}
              fallback={
                <Button type="button" variant="primary" size="sm" class="shrink-0" disabled>
                  {ctaLabel()}
                </Button>
              }
            >
              <Button href={props.ctaHref!} variant="primary" size="sm" class="shrink-0">
                {ctaLabel()}
              </Button>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}
