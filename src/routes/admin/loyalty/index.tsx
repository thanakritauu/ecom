import { createMemo, For } from "solid-js";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { TierOverview } from "~/components/admin/loyalty/TierOverview";
import { useAdminCustomers } from "~/lib/adminCustomerStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { COIN_EARN_RATE, COIN_REDEMPTION_STEP, COIN_TO_BAHT_RATE, MAX_COIN_REDEMPTION } from "~/lib/cartSelectors";
import { TIERS } from "~/lib/membership";

/**
 * Charmiss Club — the storefront's member program as it runs today: the tier
 * ladder (`~/lib/membership`) and the coin rules (`~/lib/cartSelectors`
 * constants). Both are hardcoded on the storefront, so this page only shows
 * them; each customer's tier and coins live on the customer record.
 */
export default function AdminLoyaltyPage() {
  const customers = useAdminCustomers();

  const bahtPerCoin = Math.round(1 / COIN_EARN_RATE);
  const coinsPerBaht = Math.round(1 / COIN_TO_BAHT_RATE);
  const multipliers = TIERS.map((t) => `${t.shortName} x${t.coinMultiplier}`).join(", ");

  const COIN_RULES: { label: string; value: string }[] = [
    { label: "การได้รับคอยน์", value: `ทุก ${formatAdminCurrency(bahtPerCoin)} ที่ชำระ ได้ 1 คอยน์ ไม่รวมค่าจัดส่ง` },
    { label: "ตัวคูณตามระดับสมาชิก", value: multipliers },
    { label: "คอยน์เข้าบัญชี", value: "เมื่อคำสั่งซื้อส่งสำเร็จ" },
    { label: "มูลค่าคอยน์", value: `${coinsPerBaht.toLocaleString("th-TH")} คอยน์ เท่ากับ ${formatAdminCurrency(1)}` },
    { label: "ใช้คอยน์ทีละ", value: `${COIN_REDEMPTION_STEP.toLocaleString("th-TH")} คอยน์` },
    { label: "ใช้ได้สูงสุดต่อคำสั่งซื้อ", value: `${MAX_COIN_REDEMPTION.toLocaleString("th-TH")} คอยน์ หรือ ${formatAdminCurrency(MAX_COIN_REDEMPTION * COIN_TO_BAHT_RATE)}` },
    { label: "ใช้จ่ายค่าจัดส่ง", value: "ไม่ได้" },
    { label: "วันหมดอายุ", value: "ไม่มีวันหมดอายุ" },
  ];

  const stats = createMemo(() => {
    const list = customers.customers();
    return {
      members: list.length,
      coins: list.reduce((sum, c) => sum + (c.loyaltyPoints ?? 0), 0),
      fromCrm: list.filter((c) => c.source === "crm_migrated").length,
    };
  });

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "Charmiss Club" }]} />
      <PageHeader
        title="Charmiss Club"
        description="ดูระดับสมาชิกและกติกาคอยน์ที่ลูกค้าเห็นบนเว็บไซต์"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <Button variant="outline" href="/admin/customers">
              ดูรายชื่อลูกค้า
            </Button>
          </div>
        }
      />

      <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Stat label="สมาชิกทั้งหมด" value={`${stats().members.toLocaleString("th-TH")} คน`} />
        <Stat label="คอยน์คงเหลือรวม" value={`${stats().coins.toLocaleString("th-TH")} คอยน์`} />
        <Stat label="ย้ายมาจาก CRM" value={`${stats().fromCrm.toLocaleString("th-TH")} คน`} />
      </div>

      <TierOverview />

      <section class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
        <div class="flex flex-col gap-1">
          <h2 class="text-base font-semibold text-ink">กติกาคอยน์</h2>
          <p class="text-sm text-ink-gray">กติกาเดียวกับหน้าตะกร้า หน้าชำระเงิน และหน้าคอยน์ของลูกค้า</p>
        </div>
        <dl class="flex flex-col gap-1.5 text-sm">
          <For each={COIN_RULES}>
            {(rule) => (
              <div class="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0">
                <dt class="text-ink-gray">{rule.label}</dt>
                <dd class="text-right font-medium text-ink">{rule.value}</dd>
              </div>
            )}
          </For>
        </dl>
      </section>
    </div>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div class="flex flex-col gap-1 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <p class="text-sm text-ink-gray">{props.label}</p>
      <p class="text-2xl font-bold text-ink">{props.value}</p>
    </div>
  );
}
