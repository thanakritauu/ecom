import { CUSTOMER_TIER_META, type CustomerTier } from "~/lib/adminCustomers";

/**
 * Member tier badge: the tier's name in the tier's own colours
 * (`~/lib/membership`'s `TIERS` data, never an admin-only palette). Badge
 * only, no medal artwork (owner request for the Customers pages).
 * `short` drops "Charmiss" for tight table cells.
 */
export function TierBadge(props: { tier: CustomerTier; short?: boolean; class?: string }) {
  const tier = () => CUSTOMER_TIER_META[props.tier];
  return (
    <span
      class={`inline-flex w-fit whitespace-nowrap rounded-pill px-2.5 py-1 text-xs font-medium ${props.class ?? ""}`}
      style={{ "background-color": tier().bg, color: tier().fg }}
    >
      {props.short ? tier().shortName : tier().name}
    </span>
  );
}

/** The tier's medal (ribbon artwork, 82×98) — sized by height so all three line up, same as the storefront. */
export function TierMark(props: { tier: CustomerTier; class?: string }) {
  return <img src={CUSTOMER_TIER_META[props.tier].mark} alt="" class={`w-auto shrink-0 ${props.class ?? "h-10"}`} />;
}
