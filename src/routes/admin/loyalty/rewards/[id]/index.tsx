import { createMemo, createSignal, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ImageIcon, RewardGiftIcon, RefreshIcon } from "~/components/admin/icons";
import { REWARD_STATUS_META, REWARD_TYPE_META } from "~/lib/adminLoyaltyRewards";
import { useAdminRewards } from "~/lib/adminLoyaltyRewardStore";
import { useAdminProducts } from "~/lib/adminProductStore";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";

/** Cordy-owned fields (name/type/coinCost/stockRemaining/status/dates) read-only; "แก้ไขการแสดงผล" is the only edit affordance, scoped to the Presentation layer alone. */
export default function AdminLoyaltyRewardDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminRewards();
  const productStore = useAdminProducts();
  const couponStore = useAdminMarketing().coupons;
  const navigate = useNavigate();
  const reward = createMemo(() => store.getById(params.id));

  const [syncing, setSyncing] = createSignal(false);

  const handleSync = async () => {
    const r = reward();
    if (!r) return;
    setSyncing(true);
    await store.syncSelected([r.id]);
    setSyncing(false);
    pushToast("Sync ข้อมูลจาก Cordy CRM เรียบร้อยแล้ว", "success");
  };

  const openCordyCrm = () => pushToast("(จำลอง) กำลังเปิด Cordy CRM ในแท็บใหม่", "success");

  return (
    <Show
      when={reward()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สะสมแต้ม", href: "/admin/loyalty" }, { label: "ของรางวัล", href: "/admin/loyalty/rewards" }]} />
          <EmptyState icon={<RewardGiftIcon />} title="ไม่พบของรางวัลนี้" description="ข้อมูลอาจยังไม่ได้ Sync มาจาก Cordy CRM หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าของรางวัล" onAction={() => navigate("/admin/loyalty/rewards")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const r = current;
        const linkedProduct = () => (r().linkedProductId ? productStore.products().find((p) => p.id === r().linkedProductId) : undefined);
        const linkedCoupon = () => (r().linkedCouponId ? couponStore.getById(r().linkedCouponId!) : undefined);
        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สะสมแต้ม", href: "/admin/loyalty" }, { label: "ของรางวัล", href: "/admin/loyalty/rewards" }, { label: r().displayName }]} />
            <PageHeader
              title={r().displayName}
              description={r().displayDescription}
              actions={
                <div class="flex flex-wrap items-center gap-2">
                  <Button variant="primary" href={`/admin/loyalty/rewards/${r().id}/edit`}>
                    แก้ไขการแสดงผล
                  </Button>
                  <Button variant="outline" onClick={handleSync} loading={syncing()}>
                    <RefreshIcon class="size-4" /> Sync
                  </Button>
                  <Button variant="outline" onClick={openCordyCrm}>
                    จัดการใน Cordy CRM
                  </Button>
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title="รูปของรางวัล">
                  <div class="flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-card bg-surface-gray/60 text-ink-placeholder">
                    <Show when={r().image} fallback={<ImageIcon class="size-8" />}>
                      <img src={r().image} alt="" class="size-full object-cover" />
                    </Show>
                  </div>
                </Section>

                <Section title="รายละเอียดที่แสดง">
                  <p class="text-sm text-ink-gray">{r().displayDescription || "-"}</p>
                </Section>

                <Section title="เชื่อมกับ Ecommerce">
                  <Row label="สินค้าที่เชื่อม" value={linkedProduct()?.name ?? "ไม่เชื่อมกับสินค้า"} />
                  <Row label="คูปองที่เชื่อม" value={linkedCoupon()?.code ?? "ไม่เชื่อมกับคูปอง"} />
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะ">
                  <div class="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={REWARD_STATUS_META[r().status].tone}>{REWARD_STATUS_META[r().status].label}</StatusBadge>
                    <StatusBadge tone={r().visible ? "success" : "neutral"}>{r().visible ? "แสดงบน Charmiss" : "ซ่อนบน Charmiss"}</StatusBadge>
                  </div>
                </Section>

                <Section title="ประเภทของรางวัล (Cordy)">
                  <StatusBadge tone="info" class="w-fit">
                    {REWARD_TYPE_META[r().rewardType].label}
                  </StatusBadge>
                </Section>

                <Section title="คอยน์และจำนวน (Cordy)">
                  <Row label="จำนวนคอยน์ที่ใช้" value={r().coinCost.toLocaleString("th-TH")} />
                  <Row label="จำนวนคงเหลือ" value={r().stockRemaining.toLocaleString("th-TH")} />
                </Section>

                <Section title="ระยะเวลา (Cordy)">
                  <Row label="เริ่ม" value={r().startDate} />
                  <Row label="สิ้นสุด" value={r().endDate} />
                </Section>

                <Section title="ข้อมูลการเชื่อมต่อ">
                  <Row label="Source" value={r().source} />
                  <Row label="Sync ล่าสุด" value={r().syncedAt} />
                </Section>
              </div>
            </div>
          </div>
        );
      }}
    </Show>
  );
}

function Section(props: { title: string; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between gap-3 text-sm">
      <dt class="text-ink-gray">{props.label}</dt>
      <dd class="font-medium text-ink">{props.value}</dd>
    </div>
  );
}
