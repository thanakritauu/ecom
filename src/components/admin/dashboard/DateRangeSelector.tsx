import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { Dialog } from "@kobalte/core/dialog";
import { createSignal, For, Show } from "solid-js";
import { DASHBOARD_PERIOD_OPTIONS, type DashboardPeriodKey, type DateRange } from "~/lib/adminDashboard";
import { formatMarketingDate } from "~/lib/adminMarketing";
import { Button } from "~/components/shared/Button";
import { CalendarIcon, ChevronDownIcon, CloseXIcon } from "~/components/admin/icons";

const INPUT_CLASS = "h-11 w-full rounded-card border bg-surface-card px-4 text-sm text-ink outline-none focus:border-brand-pink";

/**
 * Period picker for the Dashboard and the Orders list. Presets switch right
 * away; "กำหนดช่วงเวลา" opens a dialog for a from/to date range, passed to
 * `onChange` as its second argument.
 */
export function DateRangeSelector(props: { value: DashboardPeriodKey; range?: DateRange; onChange: (key: DashboardPeriodKey, range?: DateRange) => void }) {
  const [customOpen, setCustomOpen] = createSignal(false);
  const [from, setFrom] = createSignal("");
  const [to, setTo] = createSignal("");
  const [error, setError] = createSignal<string>();

  const currentLabel = () => {
    if (props.value === "custom" && props.range) return `${formatMarketingDate(props.range.from)} - ${formatMarketingDate(props.range.to)}`;
    return DASHBOARD_PERIOD_OPTIONS.find((o) => o.key === props.value)?.label ?? "";
  };

  const openCustom = () => {
    setFrom(props.range?.from ?? "");
    setTo(props.range?.to ?? "");
    setError(undefined);
    setCustomOpen(true);
  };

  const apply = () => {
    if (!from() || !to()) return setError("กรุณาเลือกวันเริ่มและวันสิ้นสุด");
    if (to() < from()) return setError("วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่ม");
    props.onChange("custom", { from: from(), to: to() });
    setCustomOpen(false);
  };

  return (
    <>
      <DropdownMenu placement="bottom-end" gutter={8}>
        <DropdownMenu.Trigger class="flex min-h-11 w-full items-center justify-between gap-2 rounded-pill border border-border bg-surface-card px-4 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-pink/40 sm:w-auto">
          <span class="flex items-center gap-2">
            <CalendarIcon class="size-4 shrink-0 text-ink-gray" />
            {currentLabel()}
          </span>
          <ChevronDownIcon class="size-4 shrink-0 text-ink-gray" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content class="z-50 w-56 rounded-card border border-border bg-surface-card p-2 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
            <For each={DASHBOARD_PERIOD_OPTIONS}>
              {(opt) => (
                <DropdownMenu.Item
                  onSelect={() => (opt.key === "custom" ? openCustom() : props.onChange(opt.key))}
                  class={`flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink ${
                    opt.key === props.value ? "font-semibold text-brand-pink" : "text-ink"
                  }`}
                >
                  {opt.label}
                </DropdownMenu.Item>
              )}
            </For>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu>

      <Dialog open={customOpen()} onOpenChange={setCustomOpen}>
        <Dialog.Portal>
          <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Dialog.Content class="w-full max-w-sm rounded-card bg-surface-card p-5 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
              <div class="flex items-center justify-between">
                <Dialog.Title class="text-lg font-semibold text-ink">กำหนดช่วงเวลา</Dialog.Title>
                <Dialog.CloseButton aria-label="ปิด" class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink">
                  <CloseXIcon />
                </Dialog.CloseButton>
              </div>
              <div class="mt-4 flex flex-col gap-4">
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">
                    วันเริ่ม <span class="text-system-red">*</span>
                  </span>
                  <input type="date" value={from()} onInput={(e) => setFrom(e.currentTarget.value)} class={`${INPUT_CLASS} ${error() && !from() ? "border-system-red" : "border-border"}`} />
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">
                    วันสิ้นสุด <span class="text-system-red">*</span>
                  </span>
                  <input type="date" value={to()} min={from() || undefined} onInput={(e) => setTo(e.currentTarget.value)} class={`${INPUT_CLASS} ${error() && (!to() || to() < from()) ? "border-system-red" : "border-border"}`} />
                </label>
                <Show when={error()}>
                  <p role="alert" class="text-sm text-system-red">
                    {error()}
                  </p>
                </Show>
              </div>
              <div class="mt-5 flex gap-3">
                <Button type="button" variant="outline" class="flex-1" onClick={() => setCustomOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="button" variant="primary" class="flex-1" onClick={apply}>
                  ใช้ช่วงเวลานี้
                </Button>
              </div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog>
    </>
  );
}
