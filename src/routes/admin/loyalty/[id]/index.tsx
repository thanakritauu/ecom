import { createMemo, createSignal, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { PointsCoinIcon, RefreshIcon } from "~/components/admin/icons";
import { COIN_RULE_STATUS_META } from "~/lib/adminLoyaltyRules";
import { useAdminLoyalty } from "~/lib/adminLoyaltyStore";
import { pushToast } from "~/lib/toast";

/** Read-only Detail — every Cordy CRM field here (name/condition/coinAmount/status/source) has no edit affordance; "จัดการใน Cordy CRM" is the only way to change a Loyalty Rule, per Phase 08.1's spec. */
export default function AdminLoyaltyDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminLoyalty();
  const navigate = useNavigate();
  const rule = createMemo(() => store.getById(params.id));

  const [syncing, setSyncing] = createSignal(false);

  const handleSync = async () => {
    const current = rule();
    if (!current) return;
    setSyncing(true);
    await store.syncSelected([current.id]);
    setSyncing(false);
    pushToast("Sync ข้อมูลจาก Cordy CRM เรียบร้อยแล้ว", "success");
  };

  const openCordyCrm = () => pushToast("(จำลอง) กำลังเปิด Cordy CRM ในแท็บใหม่", "success");

  return (
    <Show
      when={rule()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สะสมคอยน์", href: "/admin/loyalty" }]} />
          <EmptyState icon={<PointsCoinIcon />} title="ไม่พบกติกานี้" description="กติกาอาจยังไม่ได้ Sync มาจาก Cordy CRM หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าสะสมคอยน์" onAction={() => navigate("/admin/loyalty")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const r = current;
        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สะสมคอยน์", href: "/admin/loyalty" }, { label: r().name }]} />
            <PageHeader
              title={r().name}
              description={r().condition}
              actions={
                <div class="flex items-center gap-2">
                  <Button variant="outline" onClick={handleSync} loading={syncing()}>
                    <RefreshIcon class="size-4" /> Sync
                  </Button>
                  <Button variant="primary" onClick={openCordyCrm}>
                    จัดการใน Cordy CRM
                  </Button>
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title="รายละเอียด / เงื่อนไข">
                  <p class="text-sm text-ink-gray">{r().condition}</p>
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะ">
                  <StatusBadge tone={COIN_RULE_STATUS_META[r().status].tone} class="w-fit">
                    {COIN_RULE_STATUS_META[r().status].label}
                  </StatusBadge>
                </Section>

                <Section title="จำนวนคอยน์">
                  <p class="text-2xl font-bold text-ink">+{r().coinAmount.toLocaleString("th-TH")}</p>
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
