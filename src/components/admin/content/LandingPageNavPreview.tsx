import { Dynamic } from "solid-js/web";
import { getPromotionNavIcon } from "~/lib/promotionNavIcons";

const STATIC_ITEMS_BEFORE = ["Home", "Products"];
const STATIC_ITEMS_AFTER = ["Best Seller", "New Arrivals"];

/**
 * Landing Page Architecture & Promotion Page Migration — was
 * `PromotionNavPreview.tsx`. Live "Frontend Navigation Preview": the exact
 * `Header.tsx` pink-bar treatment, with the real neighboring nav labels
 * (`Home Products [Icon] Label Best Seller ...`) around the one item that
 * actually updates as Label/Icon change — so what an admin sees here
 * matches what ships to `Header.tsx`/`MobileMenu.tsx`, not a re-imagined
 * mini nav bar drawn separately for this dialog.
 */
export function LandingPageNavPreview(props: { label: string; iconKey: string }) {
  return (
    <div class="flex items-center gap-4 overflow-x-auto rounded-card bg-brand-pink px-4 py-3">
      {STATIC_ITEMS_BEFORE.map((label) => (
        <span class="shrink-0 whitespace-nowrap text-sm font-medium text-white/70">{label}</span>
      ))}
      <span class="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-pill bg-white/15 px-2 py-1 text-sm font-semibold text-white">
        {/* `Dynamic` (not a plain resolved-once component reference) — this same
            instance's `iconKey` prop keeps changing as the admin clicks
            different icon options, and only `Dynamic` re-swaps which
            component is actually mounted on every such change. */}
        <Dynamic component={getPromotionNavIcon(props.iconKey)} class="size-4 shrink-0" />
        {props.label || "Menu Label"}
      </span>
      {STATIC_ITEMS_AFTER.map((label) => (
        <span class="shrink-0 whitespace-nowrap text-sm font-medium text-white/70">{label}</span>
      ))}
    </div>
  );
}
