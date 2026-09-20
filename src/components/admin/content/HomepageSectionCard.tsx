import { Show } from "solid-js";
import { DragHandleIcon, ImageIcon, ChevronDownIcon, TrashIcon, DuplicateIcon } from "~/components/admin/icons";
import { HOMEPAGE_SECTION_TYPE_META, type HomepageSection } from "~/lib/adminHomepage";
import { HomepageSectionForm } from "./HomepageSectionForm";

/**
 * §6/§7/§20/§21 — one section row: thumbnail/name/type/status/drag-handle/
 * Edit/Enable-Disable/Delete, expanding in place (not a separate dialog) to
 * `HomepageSectionForm` when "แก้ไข" is toggled. Drag-and-drop + ‹/› move
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
    <div class="flex flex-col rounded-card border border-surface-gray bg-white" draggable="true" onDragStart={props.onDragStart} onDragOver={props.onDragOver} onDrop={props.onDrop}>
      <div class="flex items-center gap-3 p-3 sm:p-4">
        <span class="hidden cursor-grab text-ink-placeholder sm:block" aria-hidden="true">
          <DragHandleIcon class="size-4" />
        </span>

        <div class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
          <Show when={s().banners.desktop} fallback={<ImageIcon class="size-5" />}>
            <img src={s().banners.desktop} alt="" class="size-full object-cover" />
          </Show>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="truncate font-medium text-ink">{s().name || "(ไม่มีชื่อ Section)"}</p>
            <span class="shrink-0 rounded-pill bg-surface-gray px-2 py-0.5 text-xs font-medium text-ink-gray">{HOMEPAGE_SECTION_TYPE_META[s().type].label}</span>
            <Show when={!s().enabled}>
              <span class="shrink-0 rounded-pill bg-surface-gray px-2 py-0.5 text-xs font-medium text-ink-gray">ปิดใช้งาน</span>
            </Show>
          </div>
          <Show when={s().title}>
            <p class="truncate text-sm text-ink-gray">{s().title}</p>
          </Show>
        </div>

        <div class="flex shrink-0 items-center gap-1">
          {/* Native HTML5 drag-and-drop (the drag handle above) doesn't work
              reliably via touch on mobile browsers — Move Up/Down stay the
              one reorder control that's always available there, not just a
              desktop-only extra alongside dragging. */}
          <button type="button" onClick={() => props.onMove(-1)} disabled={props.index === 0} aria-label="ย้ายขึ้น" class="flex size-8 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-gray disabled:cursor-not-allowed disabled:opacity-30">
            <ChevronDownIcon class="size-4 rotate-180" />
          </button>
          <button type="button" onClick={() => props.onMove(1)} disabled={props.index === props.total - 1} aria-label="ย้ายลง" class="flex size-8 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-gray disabled:cursor-not-allowed disabled:opacity-30">
            <ChevronDownIcon class="size-4" />
          </button>

          <label class="mx-1 flex items-center gap-1.5">
            <input type="checkbox" checked={s().enabled} onChange={props.onToggleEnabled} class="size-4 rounded accent-brand-pink" aria-label={`เปิด/ปิดใช้งาน ${s().name}`} />
            <span class="hidden text-xs text-ink-gray sm:inline">เปิดใช้งาน</span>
          </label>

          <button type="button" onClick={props.onToggleExpand} class="min-h-9 rounded-pill border border-surface-gray px-3 text-sm font-medium text-ink hover:bg-surface-pink">
            {props.expanded ? "ย่อ" : "แก้ไข"}
          </button>

          <Show when={props.onDuplicate}>
            <button type="button" onClick={props.onDuplicate} aria-label={`ทำสำเนา ${s().name}`} class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-gray">
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
