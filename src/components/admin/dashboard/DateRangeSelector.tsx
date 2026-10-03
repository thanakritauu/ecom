import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { Dialog } from "@kobalte/core/dialog";
import { createSignal, For } from "solid-js";
import { DASHBOARD_PERIOD_OPTIONS, type DashboardPeriodKey } from "~/lib/adminDashboard";
import { Button } from "~/components/shared/Button";
import { CalendarIcon, ChevronDownIcon, CloseXIcon } from "~/components/admin/icons";

/**
 * PART 4/22 — changes which KPI+chart dataset the Dashboard reads (handled
 * by the caller via `onChange`, not owned here). "กำหนดช่วงเวลา" opens a
 * small mock date-range dialog instead of immediately switching period —
 * there's no analytics backend to compute a real custom range against, so
 * applying it just re-selects the same stand-in dataset the other presets
 * use (see adminDashboard.ts), same as the rest of this prototype mocking a
 * result instead of a calculation.
 */
export function DateRangeSelector(props: { value: DashboardPeriodKey; onChange: (key: DashboardPeriodKey) => void }) {
  const [customOpen, setCustomOpen] = createSignal(false);
  const currentLabel = () => DASHBOARD_PERIOD_OPTIONS.find((o) => o.key === props.value)?.label ?? "";

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
                  onSelect={() => (opt.key === "custom" ? setCustomOpen(true) : props.onChange(opt.key))}
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
                <Dialog.Title class="text-base font-semibold text-ink">กำหนดช่วงเวลา</Dialog.Title>
                <Dialog.CloseButton
                  aria-label="ปิด"
                  class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink"
                >
                  <CloseXIcon />
                </Dialog.CloseButton>
              </div>
              <div class="mt-4 flex flex-col gap-3">
                <label class="flex flex-col gap-1.5 text-sm text-ink">
                  จากวันที่
                  <input type="date" class="h-11 rounded-card border border-border px-3 text-sm text-ink outline-none focus:border-brand-pink" />
                </label>
                <label class="flex flex-col gap-1.5 text-sm text-ink">
                  ถึงวันที่
                  <input type="date" class="h-11 rounded-card border border-border px-3 text-sm text-ink outline-none focus:border-brand-pink" />
                </label>
              </div>
              <Button
                type="button"
                variant="primary"
                class="mt-5 w-full"
                onClick={() => {
                  props.onChange("custom");
                  setCustomOpen(false);
                }}
              >
                ใช้ช่วงเวลานี้
              </Button>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog>
    </>
  );
}
