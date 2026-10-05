import { CUSTOMER_TIER_META, type CustomerTier } from "~/lib/adminCustomers";

/**
 * Member tier as the storefront shows it (`/account/points`' TierBadge +
 * TierMark): the tier's medal artwork next to its name in the tier's own
 * colours — `~/lib/membership`'s `TIERS` data, never an admin-only palette.
 * `short` drops "Charmiss" for tight table cells.
 */
export function TierBadge(props: { tier: CustomerTier; short?: boolean; class?: string }) {
  const tier = () => CUSTOMER_TIER_META[props.tier];
  return (
    <span class={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap ${props.class ?? ""}`}>
      <TierMark tier={props.tier} class="h-6" />
      <span class="rounded-pill px-2.5 py-1 text-xs font-medium" style={{ "background-color": tier().bg, color: tier().fg }}>
        {props.short ? tier().shortName : tier().name}
      </span>
    </span>
  );
}

/** The tier's medal (ribbon artwork, 82×98) — sized by height so all three line up, same as the storefront. */
export function TierMark(props: { tier: CustomerTier; class?: string }) {
  return <img src={CUSTOMER_TIER_META[props.tier].mark} alt="" class={`w-auto shrink-0 ${props.class ?? "h-10"}`} />;
}
