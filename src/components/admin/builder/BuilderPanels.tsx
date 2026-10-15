import { createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { DragHandleIcon, DuplicateIcon, EyeIcon, PlusIcon, TrashIcon, ChevronDownIcon } from "~/components/admin/icons";
import { SectionTypeIcon } from "~/components/admin/content/SectionTypeIcon";
import { ChevronIcon } from "~/components/shared/ChevronIcon";
import type { HomepageSection, HomepageSectionType } from "~/lib/pageSections";
import { LIBRARY_GROUPS, libraryItems, sectionTypeLabel } from "./builderLibrary";
import { indexFromBoxes, type DragPayload, type DropTarget, type HitTest } from "./builderState";

export function EyeOffIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M2.5 12S6 5 12 5c1.9 0 3.6.7 5 1.6M21.5 12S18 19 12 19c-1.9 0-3.6-.7-5-1.6" stroke-linejoin="round" stroke-linecap="round" />
      <path d="M4 20 20 4" stroke-linecap="round" />
    </svg>
  );
}

/**
 * Component library, grouped (สื่อ / สินค้า / สำเร็จรูป / เนื้อหา). Each item
 * can be dragged onto the canvas or the layers list; a plain click inserts it
 * after the selected section (or at the end).
 */
export function LibraryPanel(props: { onStartDrag: (e: PointerEvent, payload: DragPayload) => void; onPick: (type: HomepageSectionType) => void; consumedClick: () => boolean }) {
  const items = () => libraryItems();
  return (
    <div class="flex flex-col gap-4">
      <For each={LIBRARY_GROUPS}>
        {(group) => (
          <Show when={items().some((i) => i.group === group.id)}>
            <div class="flex flex-col gap-2">
              <p class="text-xs font-medium text-ink-gray">{group.label}</p>
              <div class="grid grid-cols-2 gap-2">
                <For each={items().filter((i) => i.group === group.id)}>
                  {(item) => (
                    <button
                      type="button"
                      title={item.description || item.label}
                      onPointerDown={(e) => props.onStartDrag(e, { kind: "new", type: item.type, label: item.label })}
                      onClick={() => !props.consumedClick() && props.onPick(item.type)}
                      class="flex min-h-[72px] cursor-grab touch-none select-none flex-col items-center justify-center gap-1.5 rounded-card border border-border bg-surface-card px-2 py-2.5 text-center text-xs font-medium text-ink transition-colors duration-150 hover:border-brand-pink hover:bg-surface-pink/60 active:cursor-grabbing"
                    >
                      <span class="text-brand-pink">
                        <SectionTypeIcon type={item.type} class="size-5" />
                      </span>
                      <span class="leading-snug">{item.label}</span>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>
        )}
      </For>
    </div>
  );
}

/** The same library as a compact pick list, for the "+" popover on the canvas and the insert sheet on small screens. */
export function InsertMenu(props: { onPick: (type: HomepageSectionType) => void }) {
  const items = () => libraryItems();
  return (
    <div class="flex flex-col gap-3">
      <For each={LIBRARY_GROUPS}>
        {(group) => (
          <Show when={items().some((i) => i.group === group.id)}>
            <div class="flex flex-col gap-1">
              <p class="px-2 text-xs font-medium text-ink-gray">{group.label}</p>
              <For each={items().filter((i) => i.group === group.id)}>
                {(item) => (
                  <button
                    type="button"
                    onClick={() => props.onPick(item.type)}
                    class="flex min-h-10 items-center gap-2.5 rounded-card px-2 py-1.5 text-left text-sm font-normal text-ink hover:bg-surface-pink"
                  >
                    <span class="flex size-7 shrink-0 items-center justify-center rounded-media bg-surface-pink/70 text-brand-pink">
                      <SectionTypeIcon type={item.type} class="size-4" />
                    </span>
                    <span class="min-w-0">
                      <span class="block font-medium">{item.label}</span>
                      <Show when={item.description}>
                        <span class="line-clamp-1 block text-xs leading-[1.75] text-ink-gray">{item.description}</span>
                      </Show>
                    </span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        )}
      </For>
    </div>
  );
}

/** Floating "+" popover: fixed at the button that opened it, closes on outside press or Escape. */
export function InsertPopover(props: { x: number; y: number; onPick: (type: HomepageSectionType) => void; onClose: () => void }) {
  let el!: HTMLDivElement;
  const onDown = (e: PointerEvent) => {
    if (!el.contains(e.target as Node)) props.onClose();
  };
  const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.onClose();
  onMount(() => {
    setTimeout(() => window.addEventListener("pointerdown", onDown), 0);
    window.addEventListener("keydown", onKey);
  });
  onCleanup(() => {
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("keydown", onKey);
  });
  const width = 300;
  const left = () => Math.max(12, Math.min(props.x - width / 2, (typeof window === "undefined" ? 1280 : window.innerWidth) - width - 12));
  const maxH = () => (typeof window === "undefined" ? 480 : Math.max(240, window.innerHeight - props.y - 24));
  const top = () => (maxH() < 320 ? Math.max(12, props.y - 420) : props.y + 8);
  return (
    <div
      ref={el}
      role="dialog"
      aria-label="เพิ่มส่วน"
      class="fixed z-40 overflow-y-auto rounded-card border border-border bg-surface-card p-2 shadow-card"
      style={{ left: `${left()}px`, top: `${top()}px`, width: `${width}px`, "max-height": `${Math.min(420, Math.max(maxH(), 320))}px` }}
    >
      <InsertMenu onPick={props.onPick} />
    </div>
  );
}

/**
 * "รายการส่วน" (layers): every section in page order. Drag the handle to
 * reorder (pointer events, touch too), click a row to select it, eye to
 * show/hide. `full` is the small-screen list mode: bigger rows with move /
 * duplicate / delete buttons and a "+" between rows.
 */
export function LayersList(props: {
  sections: HomepageSection[];
  selectedId: string | null;
  errorIds: Set<string>;
  full?: boolean;
  dropTarget: DropTarget | null;
  dragId: string | null;
  registerZone: (hit: HitTest, scroller?: () => HTMLElement | undefined) => void;
  scroller?: () => HTMLElement | undefined;
  onStartDrag: (e: PointerEvent, payload: DragPayload) => void;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onMove?: (id: string, dir: -1 | 1) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onInsertAt?: (index: number, anchor: HTMLElement) => void;
  consumedClick: () => boolean;
}) {
  let list!: HTMLDivElement;
  const rows = () => Array.from(list?.querySelectorAll<HTMLElement>("[data-layer-row]") ?? []);
  props.registerZone((x, y) => {
    if (!list) return null;
    const rect = list.getBoundingClientRect();
    if (rect.width === 0 || x < rect.left || x > rect.right || y < rect.top - 24 || y > rect.bottom + 24) return null;
    return indexFromBoxes(rows().map((r) => r.getBoundingClientRect()), y);
  }, props.scroller);

  /** Drop line position (px from the list top) for the current drop gap. */
  const lineTop = () => {
    const t = props.dropTarget;
    if (!t || t.zone !== "layers" || !list) return null;
    const rs = rows();
    const base = list.getBoundingClientRect().top;
    if (rs.length === 0) return 0;
    if (t.index >= rs.length) return rs[rs.length - 1].getBoundingClientRect().bottom - base + 2;
    return rs[t.index].getBoundingClientRect().top - base - 3;
  };

  const AddGap = (p: { index: number }): JSX.Element => (
    <Show when={props.full && props.onInsertAt}>
      <div class="flex justify-center py-1">
        <button
          type="button"
          onClick={(e) => props.onInsertAt?.(p.index, e.currentTarget)}
          aria-label="เพิ่มส่วนตรงนี้"
          class="flex size-8 items-center justify-center rounded-pill border border-dashed border-brand-pink/60 bg-surface-card text-brand-pink hover:bg-surface-pink"
        >
          <PlusIcon class="size-4" />
        </button>
      </div>
    </Show>
  );

  return (
    <div ref={list} class="relative flex flex-col" classList={{ "gap-1": !props.full }}>
      <AddGap index={0} />
      <For each={props.sections}>
        {(section, index) => (
          <>
            <div
              data-layer-row
              class="flex items-center gap-1.5 rounded-card border bg-surface-card transition-colors duration-150"
              classList={{
                "border-brand-pink bg-surface-pink/50": props.selectedId === section.id,
                "border-system-red": props.selectedId !== section.id && props.errorIds.has(section.id),
                "border-border": props.selectedId !== section.id && !props.errorIds.has(section.id),
                "opacity-40": props.dragId === section.id,
                "min-h-10 px-1.5": !props.full,
                "min-h-14 px-2": props.full,
              }}
            >
              <button
                type="button"
                aria-label={`ลาก ${section.name} เพื่อจัดลำดับ`}
                onPointerDown={(e) => props.onStartDrag(e, { kind: "move", id: section.id, label: section.name || sectionTypeLabel(section.type) })}
                class="flex shrink-0 cursor-grab touch-none items-center justify-center rounded-pill text-ink-placeholder hover:text-ink active:cursor-grabbing"
                classList={{ "size-7": !props.full, "size-10": props.full }}
              >
                <DragHandleIcon class="size-4" />
              </button>
              <button
                type="button"
                onClick={() => !props.consumedClick() && props.onSelect(section.id)}
                class="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left font-normal"
              >
                <span class="shrink-0 text-ink-gray">
                  <SectionTypeIcon type={section.type} class="size-4" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm text-ink" classList={{ "text-ink-gray line-through": !section.enabled }}>
                    {section.name || sectionTypeLabel(section.type)}
                  </span>
                  <Show when={props.full}>
                    <span class="block truncate text-xs text-ink-gray">{sectionTypeLabel(section.type)}{section.enabled ? "" : " (ซ่อนอยู่)"}</span>
                  </Show>
                </span>
                <Show when={props.errorIds.has(section.id)}>
                  <span class="size-2 shrink-0 rounded-pill bg-system-red" aria-label="ข้อมูลยังไม่ครบ" />
                </Show>
              </button>
              <Show when={props.full}>
                <button type="button" aria-label="ย้ายขึ้น" disabled={index() === 0} onClick={() => props.onMove?.(section.id, -1)} class="flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink disabled:opacity-30">
                  <ChevronIcon direction="up" class="size-5" />
                </button>
                <button type="button" aria-label="ย้ายลง" disabled={index() === props.sections.length - 1} onClick={() => props.onMove?.(section.id, 1)} class="flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink disabled:opacity-30">
                  <ChevronIcon direction="down" class="size-5" />
                </button>
              </Show>
              <button
                type="button"
                aria-label={section.enabled ? `ซ่อน ${section.name}` : `แสดง ${section.name}`}
                onClick={() => props.onToggle(section.id)}
                class="flex shrink-0 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink hover:text-ink"
                classList={{ "size-7": !props.full, "size-9": props.full }}
              >
                <Show when={section.enabled} fallback={<EyeOffIcon class="size-4" />}>
                  <EyeIcon class="size-4" />
                </Show>
              </button>
              <Show when={props.full}>
                <button type="button" aria-label={`ทำสำเนา ${section.name}`} onClick={() => props.onDuplicate?.(section.id)} class="hidden size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink sm:flex">
                  <DuplicateIcon class="size-4" />
                </button>
                <button type="button" aria-label={`ลบ ${section.name}`} onClick={() => props.onDelete?.(section.id)} class="flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray hover:bg-danger-soft hover:text-danger-strong">
                  <TrashIcon class="size-4" />
                </button>
              </Show>
            </div>
            <AddGap index={index() + 1} />
          </>
        )}
      </For>
      <Show when={lineTop() !== null}>
        <div class="pointer-events-none absolute inset-x-0 z-10 h-1 rounded-pill bg-brand-pink" style={{ top: `${lineTop()}px` }} />
      </Show>
    </div>
  );
}

/** Collapsible block in the left column. */
export function PanelSection(props: { title: string; open: boolean; onToggle: () => void; count?: number; children: JSX.Element }) {
  return (
    <div class="flex flex-col">
      <button type="button" onClick={props.onToggle} class="flex min-h-11 items-center justify-between gap-2 px-4 text-sm font-medium text-ink">
        <span>
          {props.title}
          <Show when={props.count !== undefined}>
            <span class="ml-1.5 text-ink-gray">({props.count})</span>
          </Show>
        </span>
        <ChevronDownIcon class={`size-4 text-ink-gray transition-transform duration-150 ${props.open ? "rotate-180" : ""}`} />
      </button>
      <Show when={props.open}>
        <div class="px-4 pb-4">{props.children}</div>
      </Show>
    </div>
  );
}

export function useDisclosure(initial: boolean) {
  const [open, setOpen] = createSignal(initial);
  return [open, () => setOpen((v) => !v)] as const;
}
