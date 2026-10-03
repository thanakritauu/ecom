import { StatusBadge } from "~/components/admin/StatusBadge";
import { CUSTOMER_TIER_META, getCustomerFullName, getCustomerInitials, type Customer } from "~/lib/adminCustomers";
import { LOYALTY_MEMBER_STATUS_META, type AdminLoyaltyMember } from "~/lib/adminLoyaltyMembers";

/** Read-only — every field on `member` is Cordy CRM's own Membership data; `customer` is looked up live from `useAdminCustomers()`, never duplicated. */
export function LoyaltyMemberQuickView(props: { member: AdminLoyaltyMember; customer: Customer | undefined }) {
  const m = () => props.member;
  const c = () => props.customer;

  return (
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <div class="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-pink text-lg font-semibold text-white">
          {c() ? getCustomerInitials(c()!) : "?"}
        </div>
        <div class="min-w-0">
          <p class="truncate text-base font-semibold text-ink">{c() ? getCustomerFullName(c()!) : "(ไม่พบข้อมูลลูกค้า)"}</p>
          <p class="truncate text-sm text-ink-gray">{c()?.email ?? "-"}</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone="info">{CUSTOMER_TIER_META[m().tier].label}</StatusBadge>
        <StatusBadge tone={LOYALTY_MEMBER_STATUS_META[m().status].tone}>{LOYALTY_MEMBER_STATUS_META[m().status].label}</StatusBadge>
        <StatusBadge tone="info">Source: {m().source}</StatusBadge>
      </div>

      <div class="grid grid-cols-2 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
        <Field label="Member ID" value={m().memberId} />
        <Field label="เข้าร่วมเมื่อ" value={m().joinedAt || "-"} />
        <Field label="คอยน์ที่ได้รับ" value={`+${m().coinsEarned.toLocaleString("th-TH")}`} />
        <Field label="คอยน์ที่ใช้" value={m().coinsUsed.toLocaleString("th-TH")} />
        <Field label="คอยน์คงเหลือ" value={m().coinsRemaining.toLocaleString("th-TH")} />
        <Field label="Sync ล่าสุด" value={m().syncedAt} />
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
