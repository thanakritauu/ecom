import { createMemo, createSignal, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { MissionFlagIcon, RefreshIcon } from "~/components/admin/icons";
import { MISSION_STATUS_META } from "~/lib/adminLoyaltyMissions";
import { useAdminMissions } from "~/lib/adminLoyaltyMissionStore";
import { pushToast } from "~/lib/toast";

/** Read-only Detail — Mission Rule/Business Logic is entirely the CRM's; no edit affordance anywhere. */
export default function AdminLoyaltyMissionDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminMissions();
  const navigate = useNavigate();
  const mission = createMemo(() => store.getById(params.id));

  const [syncing, setSyncing] = createSignal(false);

  const handleSync = async () => {
    const m = mission();
    if (!m) return;
    setSyncing(true);
    await store.syncSelected([m.id]);
    setSyncing(false);
    pushToast("Sync ข้อมูลจาก Charmiss Club CRM เรียบร้อยแล้ว", "success");
  };

  const openCrm = () => pushToast("(จำลอง) กำลังเปิด Charmiss Club CRM ในแท็บใหม่", "success");

  return (
    <Show
      when={mission()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สะสมแต้ม", href: "/admin/loyalty" }, { label: "ภารกิจ", href: "/admin/loyalty/missions" }]} />
          <EmptyState icon={<MissionFlagIcon />} title="ไม่พบภารกิจนี้" description="ข้อมูลอาจยังไม่ได้ Sync มาจาก Charmiss Club CRM หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าภารกิจ" onAction={() => navigate("/admin/loyalty/missions")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const m = current;
        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สะสมแต้ม", href: "/admin/loyalty" }, { label: "ภารกิจ", href: "/admin/loyalty/missions" }, { label: m().name }]} />
            <PageHeader
              title={m().name}
              description={m().description}
              actions={
                <div class="flex items-center gap-2">
                  <Button variant="outline" onClick={handleSync} loading={syncing()}>
                    <RefreshIcon class="size-4" /> Sync
                  </Button>
                  <Button variant="primary" onClick={openCrm}>
                    จัดการใน Charmiss Club CRM
                  </Button>
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title="รายละเอียด / เงื่อนไข">
                  <p class="text-sm text-ink-gray">{m().description}</p>
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะ">
                  <StatusBadge tone={MISSION_STATUS_META[m().status].tone} class="w-fit">
                    {MISSION_STATUS_META[m().status].label}
                  </StatusBadge>
                </Section>

                <Section title="คอยน์ที่ได้รับ">
                  <p class="text-2xl font-bold text-ink">+{m().coinReward.toLocaleString("th-TH")}</p>
                </Section>

                <Section title="จำนวนผู้เข้าร่วม">
                  <p class="text-2xl font-bold text-ink">{m().participantCount.toLocaleString("th-TH")}</p>
                </Section>

                <Section title="ระยะเวลา">
                  <Row label="เริ่ม" value={m().startDate} />
                  <Row label="สิ้นสุด" value={m().endDate} />
                </Section>

                <Section title="ข้อมูลการเชื่อมต่อ">
                  <Row label="Source" value={m().source} />
                  <Row label="Sync ล่าสุด" value={m().syncedAt} />
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
