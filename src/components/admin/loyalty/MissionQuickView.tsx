import { StatusBadge } from "~/components/admin/StatusBadge";
import { MissionFlagIcon } from "~/components/admin/icons";
import { MISSION_STATUS_META, type AdminMission } from "~/lib/adminLoyaltyMissions";

/** Read-only — every field here is Cordy CRM's own Mission data. */
export function MissionQuickView(props: { mission: AdminMission }) {
  const m = () => props.mission;

  return (
    <div class="flex flex-col gap-5">
      <div class="flex items-start gap-3">
        <span class="flex size-14 shrink-0 items-center justify-center rounded-media bg-surface-pink text-brand-pink">
          <MissionFlagIcon class="size-6" />
        </span>
        <div class="min-w-0">
          <p class="truncate text-base font-semibold text-ink">{m().name}</p>
          <p class="text-sm text-ink-gray">+{m().coinReward.toLocaleString("th-TH")} คอยน์</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={MISSION_STATUS_META[m().status].tone}>{MISSION_STATUS_META[m().status].label}</StatusBadge>
        <StatusBadge tone="info">Source: {m().source}</StatusBadge>
      </div>

      <div>
        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-placeholder">รายละเอียด</p>
        <p class="text-sm text-ink-gray">{m().description}</p>
      </div>

      <div class="grid grid-cols-2 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
        <Field label="จำนวนผู้เข้าร่วม" value={`${m().participantCount.toLocaleString("th-TH")} คน`} />
        <Field label="Sync ล่าสุด" value={m().syncedAt} />
        <Field label="เริ่ม" value={m().startDate} />
        <Field label="สิ้นสุด" value={m().endDate} />
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
