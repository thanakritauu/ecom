import { For } from "solid-js";
import { CheckIcon } from "~/components/shared/icons";
import { TierMark } from "~/components/admin/loyalty/TierBadge";
import { TIER_COIN_MULTIPLIER } from "~/lib/adminCustomers";
import { useAdminLoyaltyMembers } from "~/lib/adminLoyaltyMemberStore";
import { TIERS } from "~/lib/membership";

/**
 * "ระดับสมาชิก" — read-only overview of the storefront's tier ladder
 * (`~/lib/membership`'s `TIERS`: threshold, perks, medal artwork) with each
 * tier's coin multiplier and how many members sit in it right now. Lives on
 * the สะสมคอยน์ page as a section rather than its own route; nothing here is
 * editable — tiers are defined by the Charmiss Club program, same as the rules.
 */
export function TierOverview() {
  const memberStore = useAdminLoyaltyMembers();
  const countIn = (id: string) => memberStore.members().filter((m) => m.tier === id).length;

  return (
    <section aria-labelledby="tier-overview-heading" class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <div class="flex flex-col gap-1">
        <h2 id="tier-overview-heading" class="text-base font-semibold text-ink">
          ระดับสมาชิก
        </h2>
        <p class="text-sm text-ink-gray">เลื่อนระดับจากยอดชำระจริงภายในปีปฏิทินนี้ (ไม่นับคำสั่งซื้อที่ยกเลิกหรือยังไม่ชำระ) — ข้อมูลเดียวกับหน้า Charmiss Club ของลูกค้า</p>
      </div>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <For each={TIERS}>
          {(tier) => (
            <div class="flex flex-col gap-3 rounded-card border border-border p-4">
              <div class="flex items-center gap-3">
                <TierMark tier={tier.id} class="h-12" />
                <div class="min-w-0">
                  <p class="font-semibold text-ink">{tier.name}</p>
                  <p class="text-sm text-ink-gray">{tier.minSpend === 0 ? "เริ่มต้นเมื่อสมัครสมาชิก" : `ยอดซื้อต่อปี ฿${tier.minSpend.toLocaleString("th-TH")} ขึ้นไป`}</p>
                </div>
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-1 rounded-card bg-surface-gray/60 px-3 py-2 text-sm">
                <span class="text-ink-gray">
                  ตัวคูณคอยน์ <span class="font-semibold text-ink">×{TIER_COIN_MULTIPLIER[tier.id]}</span>
                </span>
                <span class="text-ink-gray">
                  สมาชิก <span class="font-semibold text-ink">{countIn(tier.id).toLocaleString("th-TH")}</span> คน
                </span>
              </div>
              <ul class="flex flex-col gap-1 text-sm text-ink">
                <For each={tier.perks}>
                  {(perk) => (
                    <li class="flex items-start gap-1.5">
                      <CheckIcon class="mt-1 size-3.5 shrink-0 text-brand-pink" />
                      {perk}
                    </li>
                  )}
                </For>
              </ul>
            </div>
          )}
        </For>
      </div>
    </section>
  );
}
