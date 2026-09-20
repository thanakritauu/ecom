import { For, Show } from "solid-js";
import { AdminFloatingBar } from "./AdminFloatingBar";

export type BulkAction = {
  label: string;
  onClick: () => void;
  /** Destructive actions (Delete, Cancel, ...) get the red treatment and stay visually separated from routine actions — Global Admin UX Rule #3. */
  tone?: "default" | "danger";
  disabled?: boolean;
};

/**
 * Global Admin UX Rule #2/3/4 — appears the moment at least one row is
 * selected, always states the count, and every action here must already be
 * valid for the whole current selection (the caller disables what doesn't
 * apply rather than this component guessing). Reused as-is by Products,
 * Orders, and any future list module with bulk actions — nothing here is
 * Product- or Order-specific.
 */
export function AdminBulkActionBar(props: { count: number; onClear: () => void; actions: BulkAction[] }) {
  return (
    <Show when={props.count > 0}>
      <AdminFloatingBar>
        <div class="flex w-full flex-wrap items-center gap-3">
          <p class="whitespace-nowrap text-sm font-medium text-ink">เลือกแล้ว {props.count} รายการ</p>
          <button type="button" onClick={props.onClear} class="whitespace-nowrap text-sm text-ink-gray hover:text-ink hover:underline">
            ล้างการเลือก
          </button>
          <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
            <For each={props.actions}>
              {(action) => (
                <button
                  type="button"
                  disabled={action.disabled}
                  onClick={action.onClick}
                  class={`min-h-11 whitespace-nowrap rounded-pill px-3.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                    action.tone === "danger" ? "bg-danger-soft text-danger-strong hover:bg-danger-soft/70" : "bg-surface-pink text-brand-pink hover:bg-surface-pink/70"
                  }`}
                >
                  {action.label}
                </button>
              )}
            </For>
          </div>
        </div>
      </AdminFloatingBar>
    </Show>
  );
}
