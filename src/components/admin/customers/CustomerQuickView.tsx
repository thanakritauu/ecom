import { Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { TierBadge } from "~/components/admin/loyalty/TierBadge";
import { CUSTOMER_SOURCE_META, getCustomerCode, getCustomerFullName, getCustomerInitials, type Customer } from "~/lib/adminCustomers";
import { ChevronRightIcon } from "~/components/admin/icons";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { getCustomerCoinHistory, getCustomerOrderCount, getCustomerTotalSpent } from "~/lib/customerResolvers";

/**
 * Phase 05 §12 — fast glance only (name/email/phone/member since/
 * orders/spent/loyalty), not a second Customer Detail page crammed into a
 * drawer. "ดูรายละเอียดทั้งหมด" is `QuickViewDrawer`'s own footer button, not
 * repeated here. Total Orders/Total Spent are derived live from the same
 * Order Store Customer Detail reads (`~/lib/customerResolvers`) — never a
 * second, independently-computed number.
 */
export function CustomerQuickView(props: { customer: Customer }) {
  const c = () => props.customer;
  const orderStore = useAdminOrders();
  const orderCount = () => getCustomerOrderCount(c().id, orderStore.orders());
  const totalSpent = () => getCustomerTotalSpent(c().id, orderStore.orders());
  const coinEntryCount = () => getCustomerCoinHistory(c(), orderStore.orders()).entries.length;

  return (
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <div class="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-pink text-lg font-semibold text-white">
          {getCustomerInitials(c())}
        </div>
        <div class="min-w-0">
          <p class="truncate text-base font-semibold text-ink">{getCustomerFullName(c())}</p>
          <p class="truncate text-sm text-ink-gray">{c().email}</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={CUSTOMER_SOURCE_META[c().source].tone}>{CUSTOMER_SOURCE_META[c().source].label}</StatusBadge>
        <Show when={c().tier}>{(tier) => <TierBadge tier={tier()} />}</Show>
      </div>

      <div class="grid grid-cols-2 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
        <Field label="รหัสลูกค้า" value={getCustomerCode(c())} />
        <Field label="เบอร์โทร" value={c().phone || "-"} />
        <Field label="เป็นสมาชิกตั้งแต่" value={c().memberSince || "-"} />
        <Field label="คำสั่งซื้อ" value={`${orderCount().toLocaleString("th-TH")} รายการ`} />
        <Field label="ยอดซื้อสะสม" value={formatAdminCurrency(totalSpent())} />
        <Field label="Charmiss Coin" value={`${(c().loyaltyPoints ?? 0).toLocaleString("th-TH")} คอยน์`} />
      </div>

      <a
        href={`/admin/customers/${c().id}#coin-history`}
        class="flex items-center justify-between gap-3 rounded-card border border-border p-3 text-sm transition-colors duration-150 lg:hover:bg-surface-pink/40"
      >
        <span class="font-medium text-ink">ประวัติคอยน์</span>
        <span class="flex items-center gap-1 text-ink-gray">
          {coinEntryCount().toLocaleString("th-TH")} รายการ
          <ChevronRightIcon class="size-5" />
        </span>
      </a>
    </div>
  );
}

function Field(props: { label: string; value: string }) {
  return (
    <div>
      <p class="text-xs text-ink-placeholder">{props.label}</p>
      <p class="font-medium text-ink">{props.value}</p>
    </div>
  );
}
