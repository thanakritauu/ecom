import { Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { ImageIcon } from "~/components/admin/icons";
import { REWARD_STATUS_META, REWARD_TYPE_META, type AdminReward } from "~/lib/adminLoyaltyRewards";

/** Charmiss Club CRM-owned fields (name/type/coinCost/stockRemaining/status) shown read-only; Charmiss-owned Presentation fields (displayName/displayDescription/image/visible) shown as what a customer would actually see. */
export function RewardQuickView(props: { reward: AdminReward }) {
  const r = () => props.reward;

  return (
    <div class="flex flex-col gap-5">
      <div class="flex items-start gap-3">
        <div class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
          <Show when={r().image} fallback={<ImageIcon class="size-5" />}>
            <img src={r().image} alt="" class="size-full object-cover" />
          </Show>
        </div>
        <div class="min-w-0">
          <p class="truncate text-base font-semibold text-ink">{r().displayName}</p>
          <p class="text-sm text-ink-gray">ใช้ {r().coinCost.toLocaleString("th-TH")} คอยน์</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={REWARD_STATUS_META[r().status].tone}>{REWARD_STATUS_META[r().status].label}</StatusBadge>
        <StatusBadge tone={r().visible ? "success" : "neutral"}>{r().visible ? "แสดงบน Charmiss" : "ซ่อนบน Charmiss"}</StatusBadge>
        <StatusBadge tone="info">{REWARD_TYPE_META[r().rewardType].label}</StatusBadge>
      </div>

      <div>
        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-placeholder">รายละเอียดที่แสดง</p>
        <p class="text-sm text-ink-gray">{r().displayDescription || "-"}</p>
      </div>

      <div class="grid grid-cols-2 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
        <Field label="จำนวนคงเหลือ" value={r().stockRemaining.toLocaleString("th-TH")} />
        <Field label="Sync ล่าสุด" value={r().syncedAt} />
        <Field label="เริ่ม" value={r().startDate} />
        <Field label="สิ้นสุด" value={r().endDate} />
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
