import { StatusBadge } from "~/components/admin/StatusBadge";
import { PointsCoinIcon } from "~/components/admin/icons";
import { COIN_RULE_STATUS_META, type AdminCoinRule } from "~/lib/adminLoyaltyRules";

/** Read-only — every field here is Cordy CRM's own Loyalty Rule data (see `adminLoyaltyRules.ts`'s doc comment), so this view has no edit/delete affordance anywhere, unlike `CategoryQuickView`'s shape it otherwise mirrors. */
export function CoinRuleQuickView(props: { rule: AdminCoinRule }) {
  const r = () => props.rule;

  return (
    <div class="flex flex-col gap-5">
      <div class="flex items-start gap-3">
        <span class="flex size-14 shrink-0 items-center justify-center rounded-media bg-surface-pink text-brand-pink">
          <PointsCoinIcon class="size-6" />
        </span>
        <div class="min-w-0">
          <p class="truncate text-base font-semibold text-ink">{r().name}</p>
          <p class="text-sm text-ink-gray">+{r().coinAmount.toLocaleString("th-TH")} คอยน์</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={COIN_RULE_STATUS_META[r().status].tone}>{COIN_RULE_STATUS_META[r().status].label}</StatusBadge>
        <StatusBadge tone="info">Source: {r().source}</StatusBadge>
      </div>

      <div>
        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-placeholder">เงื่อนไข</p>
        <p class="text-sm text-ink-gray">{r().condition}</p>
      </div>

      <div class="flex items-center justify-between text-xs text-ink-placeholder">
        <span>Sync ล่าสุด</span>
        <span>{r().syncedAt}</span>
      </div>
    </div>
  );
}
