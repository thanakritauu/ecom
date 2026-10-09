import { Show } from "solid-js";
import { mediaImage } from "~/lib/media";
import { DragHandleIcon, ImageIcon, ChevronDownIcon, TrashIcon, DuplicateIcon } from "~/components/admin/icons";
import { HOMEPAGE_SECTION_TYPE_META, type HomepageSection } from "~/lib/adminHomepage";
import { HomepageSectionForm } from "./HomepageSectionForm";
import { Toggle } from "~/components/admin/Toggle";
import { StatusBadge } from "~/components/admin/StatusBadge";

/**
 * §6/§7/§20/§21 — one section row: thumbnail/name/type/status/drag-handle/
 * Edit/Enable-Disable/Delete, expanding in place (not a separate dialog) to
 * `HomepageSectionForm` when "แก้ไข" is toggled. Drag-and-drop + up/down move
 * buttons together, same redundant-reorder pattern `PromotionPageProductPicker`
 * already established for Promotion Pages' product list.
 */
export function HomepageSectionCard(props: {
  section: HomepageSection;
  index: number;
  total: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (next: HomepageSection) => void;
  onToggleEnabled: () => void;
  onDelete: () => void;
  /** Optional — the Homepage Editor doesn't pass this (Homepage has no Duplicate requirement); the Landing Page section builder does (§10). */
  onDuplicate?: () => void;
  onMove: (dir: -1 | 1) => void;
  onDragStart: () => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}) {
  const s = () => props.section;

  return (
    <div class="flex flex-col rounded-card border border-border bg-surface-card" draggable="true" onDragStart={props.onDragStart} onDragOver={props.onDragOver} onDrop={props.onDrop}>
      <div class="flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <span class="hidden cursor-grab text-ink-placeholder sm:block" aria-hidden="true">
          <DragHandleIcon class="size-4" />
        </span>

        <div class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
          <Show when={mediaImage(s().banners.desktop)} fallback={<ImageIcon class="size-5" />}>
            <img src={mediaImage(s().banners.desktop)} alt="" class="size-full object-cover" />
          </Show>
        </div>

        <div class="min-w-0 flex-1 basis-40">
          <div class="flex flex-wrap items-center gap-2">
            <p class="truncate text-sm font-medium text-ink">{s().name || "-"}</p>
            <StatusBadge tone="info">{HOMEPAGE_SECTION_TYPE_META[s().type].label}</StatusBadge>
          </div>
          <Show when={s().title}>
            <p class="truncate text-sm text-ink-gray">{s().title}</p>
          </Show>
        </div>

        <div class="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1">
          {/* Native HTML5 drag-and-drop (the drag handle above) doesn't work
              reliably via touch on mobile browsers — Move Up/Down stay the
              one reorder control that's always available there, not just a
              desktop-only extra alongside dragging. */}
          <button type="button" onClick={() => props.onMove(-1)} disabled={props.index === 0} aria-label="ย้ายขึ้น" class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink disabled:cursor-not-allowed disabled:opacity-30">
            <ChevronDownIcon class="size-4 rotate-180" />
          </button>
          <button type="button" onClick={() => props.onMove(1)} disabled={props.index === props.total - 1} aria-label="ย้ายลง" class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink disabled:cursor-not-allowed disabled:opacity-30">
            <ChevronDownIcon class="size-4" />
          </button>

          <div class="mx-1">
            <Toggle checked={s().enabled} onChange={() => props.onToggleEnabled()} onLabel="แสดง" offLabel="ไม่แสดง" />
          </div>

          <button type="button" onClick={props.onToggleExpand} class="min-h-9 rounded-pill border border-border px-3 text-sm font-medium text-ink hover:bg-surface-pink">
            {props.expanded ? "ซ่อนรายละเอียด" : "แก้ไข"}
          </button>

          <Show when={props.onDuplicate}>
            <button type="button" onClick={props.onDuplicate} aria-label={`ทำสำเนา ${s().name}`} class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink">
              <DuplicateIcon class="size-4" />
            </button>
          </Show>

          <button type="button" onClick={props.onDelete} aria-label={`ลบ ${s().name}`} class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-danger-soft hover:text-danger-strong">
            <TrashIcon class="size-4" />
          </button>
        </div>
      </div>

      <Show when={props.expanded}>
        <HomepageSectionForm section={s()} onChange={props.onChange} />
      </Show>
    </div>
  );
}
