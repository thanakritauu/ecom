import { Show } from "solid-js";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { flashPriceFrom, type FlashPriceMode } from "~/lib/flashSalePricing";

/** TikTok style ราคาลด: "฿ [ ]  หรือ  [ ] ลด %". Typing in one side switches the mode to it; an empty required value shows "จำเป็น". */
export function PriceModeInput(props: {
  mode: FlashPriceMode;
  value: string;
  onMode: (mode: FlashPriceMode) => void;
  onValue: (value: string) => void;
  error?: string;
  field: string;
  label: string;
  disabled?: boolean;
}) {
  const box = (active: boolean) =>
    `flex h-10 min-w-0 flex-1 items-center gap-1 rounded-card border bg-surface-card px-2.5 text-sm focus-within:border-brand-pink ${
      props.error && (active || props.value.trim() === "") ? "border-system-red" : "border-border"
    } ${props.disabled ? "bg-surface-gray" : ""}`;
  const input = (mode: FlashPriceMode) => (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    if (props.mode !== mode) props.onMode(mode);
    props.onValue(e.currentTarget.value);
  };
  return (
    <div class="flex min-w-0 flex-col gap-1" data-field={props.field}>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class={box(props.mode === "baht")}>
          <span class="shrink-0 text-ink-gray">฿</span>
          <input
            type="number"
            min="0"
            inputmode="decimal"
            aria-label={`${props.label} (บาท)`}
            aria-invalid={!!props.error && props.mode === "baht"}
            value={props.mode === "baht" ? props.value : ""}
            disabled={props.disabled}
            onInput={input("baht")}
            class="w-full min-w-0 bg-transparent text-ink outline-none"
          />
        </label>
        <span class="shrink-0 text-xs text-ink-gray">หรือ</span>
        <label class={box(props.mode === "percent")}>
          <input
            type="number"
            min="1"
            max="99"
            inputmode="numeric"
            aria-label={`${props.label} (ลด %)`}
            aria-invalid={!!props.error && props.mode === "percent"}
            value={props.mode === "percent" ? props.value : ""}
            disabled={props.disabled}
            onInput={input("percent")}
            class="w-full min-w-0 bg-transparent text-right text-ink outline-none"
          />
          <span class="shrink-0 text-ink-gray">ลด %</span>
        </label>
      </div>
      <Show when={props.error}>
        <p class="text-xs text-system-red">{props.value.trim() === "" ? "จำเป็น" : props.error}</p>
      </Show>
    </div>
  );
}

export function LimitInput(props: { value: string; onValue: (v: string) => void; error?: string; field: string; label: string; disabled?: boolean }) {
  return (
    <div class="flex min-w-0 flex-col gap-1" data-field={props.field}>
      <input
        type="number"
        min="1"
        step="1"
        inputmode="numeric"
        aria-label={props.label}
        aria-invalid={!!props.error}
        value={props.value}
        disabled={props.disabled}
        placeholder="ไม่มีจำกัด"
        onInput={(e) => props.onValue(e.currentTarget.value)}
        class="h-10 w-full min-w-0 rounded-card border bg-surface-card px-3 text-sm text-ink outline-none placeholder:text-ink-placeholder focus:border-brand-pink disabled:bg-surface-gray"
        classList={{ "border-system-red": !!props.error, "border-border": !props.error }}
      />
      <Show when={props.error}>
        <p class="text-xs text-system-red">{props.error}</p>
      </Show>
    </div>
  );
}

/** "฿179" preview under a % price. */
export const previewOf = (normal: number, mode: FlashPriceMode, raw: string) => {
  const n = Number(raw);
  if (mode !== "percent" || raw.trim() === "" || Number.isNaN(n) || n < 1 || n > 99) return undefined;
  return `ขาย ${formatAdminCurrency(flashPriceFrom(normal, mode, n))}`;
};

