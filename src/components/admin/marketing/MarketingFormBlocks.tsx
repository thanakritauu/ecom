import { For, Show, type JSX } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { ChoiceRadio } from "./ChoiceRadio";
import { COMBINABLE_KINDS, COMBINABLE_META, type CombinableKind } from "~/lib/adminMarketing";
import { AUDIENCE_KIND_META, AUDIENCE_KINDS, type Audience, type AudienceKind } from "~/lib/marketingAudience";
import { TIERS, type TierId } from "~/lib/membership";

/**
 * The blocks every promotion tool's form shares (promotions and coupons
 * alike), in one order: ข้อมูลพื้นฐาน, สิทธิประโยชน์, สินค้า, จำกัดการใช้,
 * การแสดงผล, การใช้ร่วมกับโปรอื่น.
 */
export function FormSection(props: { title: string; description?: string; children: JSX.Element }) {
  return (
    <section class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <div class="flex flex-col gap-1">
        <h2 class="text-base font-semibold text-ink">{props.title}</h2>
        <Show when={props.description}>
          <p class="text-xs text-ink-gray">{props.description}</p>
        </Show>
      </div>
      {props.children}
    </section>
  );
}

/** A label + hint on the left, a control on the right. */
export function SettingRow(props: { title: string; hint?: string; children: JSX.Element }) {
  return (
    <div class="flex items-center justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm font-medium text-ink">{props.title}</p>
        <Show when={props.hint}>
          <p class="text-xs text-ink-gray">{props.hint}</p>
        </Show>
      </div>
      {props.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ช่วงเวลา
// ---------------------------------------------------------------------------

export type PeriodValue = { startDate: string; startTime: string; endDate: string; endTime: string };

/** Today in Bangkok as YYYY-MM-DD. */
const bangkokToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const endOfMonth = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
};

const PRESETS: { label: string; end: (today: string) => string }[] = [
  { label: "วันนี้", end: (t) => t },
  { label: "7 วัน", end: (t) => addDays(t, 6) },
  { label: "30 วัน", end: (t) => addDays(t, 29) },
  { label: "สิ้นเดือนนี้", end: endOfMonth },
];

/** Start / end date-time (Bangkok) with quick presets that start today. */
export function PeriodFields(props: {
  value: PeriodValue;
  onChange: (patch: Partial<PeriodValue>) => void;
  errors: Record<string, string | undefined>;
  disabled?: boolean;
  hint: string;
}) {
  return (
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-sm font-medium text-ink">ช่วงเวลา</span>
        <div class="flex flex-wrap gap-2">
          <For each={PRESETS}>
            {(preset) => (
              <button
                type="button"
                disabled={props.disabled}
                onClick={() => {
                  const today = bangkokToday();
                  props.onChange({ startDate: today, startTime: "00:00", endDate: preset.end(today), endTime: "23:59" });
                }}
                class="min-h-9 rounded-pill border border-border bg-surface-card px-3 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-pink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {preset.label}
              </button>
            )}
          </For>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="วันเริ่ม" required type="date" value={props.value.startDate} onInput={(e) => props.onChange({ startDate: e.currentTarget.value })} data-field="startDate" error={props.errors.startDate} disabled={props.disabled} />
        <TextField label="เวลาเริ่ม" type="time" value={props.value.startTime} onInput={(e) => props.onChange({ startTime: e.currentTarget.value })} disabled={props.disabled} />
        <TextField label="วันสิ้นสุด" required type="date" value={props.value.endDate} onInput={(e) => props.onChange({ endDate: e.currentTarget.value })} data-field="endDate" error={props.errors.endDate} disabled={props.disabled} />
        <TextField label="เวลาสิ้นสุด" type="time" value={props.value.endTime} onInput={(e) => props.onChange({ endTime: e.currentTarget.value })} disabled={props.disabled} />
      </div>
      <p class="text-xs text-ink-gray">{props.hint}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// กลุ่มลูกค้า
// ---------------------------------------------------------------------------

/** Form state for the audience: the kind plus the tier ticks (kept while switching kinds). */
export type AudienceDraft = { kind: AudienceKind; tiers: TierId[] };

export const toAudienceDraft = (a: Audience | undefined): AudienceDraft => ({ kind: a?.kind ?? "all", tiers: a?.kind === "tiers" ? [...(a.tiers ?? [])] : [] });

/** Saved form: ทั้งหมด is unset. */
export const fromAudienceDraft = (d: AudienceDraft): Audience | undefined =>
  d.kind === "all" ? undefined : d.kind === "tiers" ? { kind: "tiers", tiers: TIERS.map((t) => t.id).filter((id) => d.tiers.includes(id)) } : { kind: d.kind };

/** The one audience rule: เฉพาะระดับ needs at least one tier. */
export const audienceError = (d: AudienceDraft): string | undefined => (d.kind === "tiers" && d.tiers.length === 0 ? "กรุณาเลือกระดับสมาชิกอย่างน้อย 1 ระดับ" : undefined);

export function AudienceField(props: {
  value: AudienceDraft;
  onChange: (next: AudienceDraft) => void;
  error?: string;
  disabled?: boolean;
  /** A tool that fixes the audience (คูปองลูกค้าใหม่): shown, not editable. */
  locked?: boolean;
}) {
  const toggleTier = (id: TierId, on: boolean) =>
    props.onChange({ ...props.value, tiers: on ? [...props.value.tiers.filter((t) => t !== id), id] : props.value.tiers.filter((t) => t !== id) });
  return (
    <div data-field="audience" class="flex flex-col gap-3">
      <span class="text-sm font-medium text-ink">กลุ่มลูกค้า</span>
      <Show
        when={!props.locked}
        fallback={
          <p class="rounded-card bg-surface-gray px-3 py-2.5 text-sm text-ink">
            {AUDIENCE_KIND_META[props.value.kind].label} <span class="text-ink-gray">{AUDIENCE_KIND_META[props.value.kind].hint}</span>
          </p>
        }
      >
        <ChoiceRadio
          name="marketing-audience"
          value={props.value.kind}
          disabled={props.disabled}
          onChange={(kind) => props.onChange({ ...props.value, kind })}
          options={AUDIENCE_KINDS.map((kind) => ({ value: kind, label: AUDIENCE_KIND_META[kind].label, hint: AUDIENCE_KIND_META[kind].hint }))}
        />
        <Show when={props.value.kind === "tiers"}>
          <div class="flex flex-wrap gap-2" role="group" aria-label="ระดับ Charmiss Club">
            <For each={TIERS}>
              {(tier) => (
                <label class="flex min-h-11 cursor-pointer items-center gap-2 rounded-card border border-border bg-surface-card px-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    class="size-4 rounded accent-brand-pink"
                    checked={props.value.tiers.includes(tier.id)}
                    disabled={props.disabled}
                    onChange={(e) => toggleTier(tier.id, e.currentTarget.checked)}
                  />
                  {tier.name}
                </label>
              )}
            </For>
          </div>
        </Show>
        <Show when={props.error}>
          <p class="text-sm text-system-red">{props.error}</p>
        </Show>
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// การใช้ร่วมกับโปรอื่น
// ---------------------------------------------------------------------------

/** Form state: the ticked kinds (all ticked = unset when saved). */
export const toCombinableDraft = (list: CombinableKind[] | undefined): CombinableKind[] => (list ? [...list] : [...COMBINABLE_KINDS]);
export const fromCombinableDraft = (list: CombinableKind[]): CombinableKind[] | undefined =>
  COMBINABLE_KINDS.every((k) => list.includes(k)) ? undefined : COMBINABLE_KINDS.filter((k) => list.includes(k));

export function CombinableField(props: { value: CombinableKind[]; onChange: (next: CombinableKind[]) => void; disabled?: boolean }) {
  return (
    <div class="flex flex-col gap-2">
      <For each={COMBINABLE_KINDS}>
        {(kind) => (
          <label class="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-card border border-border bg-surface-card px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              class="mt-0.5 size-4 shrink-0 rounded accent-brand-pink"
              checked={props.value.includes(kind)}
              disabled={props.disabled}
              onChange={(e) => props.onChange(e.currentTarget.checked ? [...props.value.filter((k) => k !== kind), kind] : props.value.filter((k) => k !== kind))}
            />
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="font-medium text-ink">{COMBINABLE_META[kind].label}</span>
              <Show when={COMBINABLE_META[kind].hint}>
                <span class="text-xs text-ink-gray">{COMBINABLE_META[kind].hint}</span>
              </Show>
            </span>
          </label>
        )}
      </For>
      <p class="text-xs text-ink-gray">ติ๊กออกเพื่อไม่ให้ใช้ร่วมกับโปรประเภทนั้นในคำสั่งซื้อเดียวกัน</p>
    </div>
  );
}
