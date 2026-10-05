import { Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { TierBadge } from "~/components/admin/loyalty/TierBadge";
import { CUSTOMER_SOURCE_META, CUSTOMER_STATUS_META, getCustomerFullName, getCustomerInitials, type Customer } from "~/lib/adminCustomers";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { getCustomerOrderCount, getCustomerTotalSpent } from "~/lib/customerResolvers";

/**
 * Phase 05 §12 — fast glance only (name/email/phone/status/member since/
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
        <StatusBadge tone={CUSTOMER_STATUS_META[c().status].tone}>{CUSTOMER_STATUS_META[c().status].label}</StatusBadge>
        <StatusBadge tone={CUSTOMER_SOURCE_META[c().source].tone}>{CUSTOMER_SOURCE_META[c().source].label}</StatusBadge>
        <Show when={c().tier}>{(tier) => <TierBadge tier={tier()} />}</Show>
      </div>

      <div class="grid grid-cols-2 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
        <Field label="เบอร์โทร" value={c().phone} />
        <Field label="เป็นสมาชิกตั้งแต่" value={c().memberSince || "-"} />
        <Field label="จำนวนคำสั่งซื้อ" value={String(orderCount())} />
        <Field label="ยอดซื้อสะสม" value={formatAdminCurrency(totalSpent())} />
        <Show when={c().loyaltyPoints !== undefined}>
          <Field label="Charmiss Coin" value={`${c().loyaltyPoints!.toLocaleString("th-TH")} คอยน์`} />
        </Show>
      </div>
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
