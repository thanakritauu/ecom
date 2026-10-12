import { Show } from "solid-js";
import { Switch } from "@kobalte/core/switch";

/**
 * CMS + Frontend Final Refinement §3/§4 — the shared Toggle every "สถานะ"
 * (active/inactive) field switches to, replacing a `<select>` dropdown.
 * Built once here (no Toggle/Switch component existed anywhere in this admin
 * before — confirmed by search) so Category/Brand, and any future on/off
 * field, all share the exact same control instead of each rolling its own.
 * Same Kobalte subpath-import convention as `ConfirmDialog`/`FilterBar`/etc.
 * already use for other primitives (Dialog, Popover, ...).
 */
export function Toggle(props: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Shown next to the control — defaults to the exact same "เปิดใช้งาน"/"ปิดใช้งาน" labels every status field in this admin already uses. */
  onLabel?: string;
  offLabel?: string;
  disabled?: boolean;
  /** Accessible name when the visible label is left empty (`onLabel=""` / `offLabel=""`), e.g. a switch inside a table row. */
  ariaLabel?: string;
}) {
  const label = () => (props.checked ? props.onLabel ?? "เปิดใช้งาน" : props.offLabel ?? "ปิดใช้งาน");

  return (
    <Switch checked={props.checked} onChange={props.onChange} disabled={props.disabled} class="inline-flex items-center gap-2.5" aria-label={props.ariaLabel}>
      <Switch.Input class="peer sr-only" aria-label={props.ariaLabel} />
      <Switch.Control class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-pill bg-surface-gray transition-colors duration-150 data-[checked]:bg-success peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-pink data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60">
        <Switch.Thumb class="block size-5 translate-x-0.5 rounded-full bg-surface-card shadow transition-transform duration-150 data-[checked]:translate-x-[22px]" />
      </Switch.Control>
      <Show when={label()}>
        <span class="select-none text-sm font-medium text-ink">{label()}</span>
      </Show>
    </Switch>
  );
}
