import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { AdminHeroSlide } from "~/components/home/HeroBanner";
import { HomepageSections } from "~/components/home/HomepageSections";
import { DragHandleIcon, DuplicateIcon, EyeIcon, PlusIcon, TrashIcon, LayersIcon } from "~/components/admin/icons";
import { ChevronIcon } from "~/components/shared/ChevronIcon";
import type { HomepageSection, HomepageSectionType } from "~/lib/pageSections";
import { CanvasFrame, type SectionBox } from "./CanvasFrame";
import { EyeOffIcon, InsertPopover } from "./BuilderPanels";
import { sectionTypeLabel } from "./builderLibrary";
import { indexFromBoxes, type DragPayload, type DropTarget, type HitTest } from "./builderState";

export type BuilderDevice = "desktop" | "tablet" | "mobile";
export const DEVICE_WIDTH: Record<BuilderDevice, number> = { desktop: 1280, tablet: 768, mobile: 375 };
export const DEVICE_LABEL: Record<BuilderDevice, string> = { desktop: "เดสก์ท็อป", tablet: "แท็บเล็ต", mobile: "มือถือ" };

export type SectionAction = "up" | "down" | "duplicate" | "toggle" | "delete";

/** One section as the storefront draws it (hero = its first slide, like the carousel's opening frame). Hidden sections still draw, dimmed, so they stay editable. */
function CanvasSectionBody(props: { section: HomepageSection; homepage: boolean }) {
  const shown = createMemo(() => ({ ...props.section, enabled: true }));
  return (
    <Show
      when={props.section.type === "hero"}
      fallback={<HomepageSections sections={[shown()]} productRows={props.homepage ? 1 : undefined} swipe={props.homepage} />}
    >
      <AdminHeroSlide section={shown()} asset={shown().assets[0]} />
    </Show>
  );
}

/**
 * The builder's center column: the real storefront sections in a frame of the
 * chosen device's width (desktop 1280 scaled to fit, tablet 768, mobile 375),
 * with an overlay that does all the editing: click to select (pink outline +
 * name tag), hover toolbar, "+" between sections, and the pink drop line
 * while something is dragged over it.
 */
export function BuilderCanvas(props: {
  sections: HomepageSection[];
  device: BuilderDevice;
  homepage: boolean;
  selectedId: string | null;
  errorIds: Set<string>;
  dropTarget: DropTarget | null;
  dragId: string | null;
  dragging: boolean;
  registerZone: (hit: HitTest, scroller: () => HTMLElement | undefined) => void;
  onStartDrag: (e: PointerEvent, payload: DragPayload) => void;
  consumedClick: () => boolean;
  onSelect: (id: string | null) => void;
  onAction: (id: string, action: SectionAction) => void;
  onInsert: (index: number, type: HomepageSectionType) => void;
  /** Gives the parent a way to scroll a section into view (publish errors, layers list). */
  ref?: (api: { scrollTo: (id: string) => void }) => void;
  emptyHint?: string;
}) {
  let scroller!: HTMLDivElement;
  let stage!: HTMLDivElement;
  const [boxes, setBoxes] = createSignal<SectionBox[]>([]);
  const [contentHeight, setContentHeight] = createSignal(600);
  const [available, setAvailable] = createSignal(900);
  const [hoverId, setHoverId] = createSignal<string | null>(null);
  const [insertAt, setInsertAt] = createSignal<{ index: number; x: number; y: number } | null>(null);

  const width = () => DEVICE_WIDTH[props.device];
  const scale = () => Math.min(1, Math.max(240, available() - (framed() ? 72 : 48)) / width());
  const framed = () => props.device !== "desktop";

  onMount(() => {
    const ro = new ResizeObserver(() => setAvailable(scroller.clientWidth));
    ro.observe(scroller);
    onCleanup(() => ro.disconnect());
  });

  const boxOf = (id: string) => boxes().find((b) => b.id === id);
  /** Overlay rectangles in stage pixels, never thinner than 28px so an empty/tiny section stays clickable. */
  const rectOf = (id: string) => {
    const b = boxOf(id);
    if (!b) return undefined;
    const top = b.top * scale();
    return { top, height: Math.max(28, (b.bottom - b.top) * scale()) };
  };
  const gapY = (index: number) => {
    const list = props.sections;
    if (list.length === 0) return 0;
    if (index <= 0) return (boxOf(list[0].id)?.top ?? 0) * scale();
    const prev = boxOf(list[Math.min(index, list.length) - 1].id);
    return (prev?.bottom ?? 0) * scale();
  };

  const hit: HitTest = (x, y) => {
    const rect = scroller.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
    const s = stage.getBoundingClientRect();
    const localY = (y - s.top) / scale();
    const ordered = props.sections.map((sec) => boxOf(sec.id)).filter((b): b is SectionBox => !!b);
    return indexFromBoxes(ordered, localY);
  };
  props.registerZone(hit, () => scroller);

  props.ref?.({
    scrollTo: (id) => {
      const r = rectOf(id);
      if (!r) return;
      const stageTop = stage.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTo({ top: Math.max(0, stageTop + r.top - 32), behavior: "smooth" });
    },
  });

  const dropLineY = () => (props.dropTarget?.zone === "canvas" ? gapY(props.dropTarget.index) : null);

  const openInsert = (index: number, button: HTMLElement) => {
    const r = button.getBoundingClientRect();
    setInsertAt({ index, x: r.left + r.width / 2, y: r.bottom });
  };

  const toolbarButton = "flex size-8 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div
      ref={scroller}
      class="relative h-full overflow-auto bg-surface-gray/70"
      onClick={(e) => {
        if (e.target === e.currentTarget && !props.consumedClick()) props.onSelect(null);
      }}
    >
      <div class="mx-auto py-6" style={{ width: `${width() * scale() + (framed() ? 24 : 0)}px` }} onClick={(e) => e.target === e.currentTarget && props.onSelect(null)}>
        <div class="bg-white" classList={{ "rounded-[28px] border-[12px] border-ink/85 shadow-card": framed(), "shadow-card": !framed() }}>
          <div ref={stage} class="group/stage relative" classList={{ "overflow-hidden rounded-[16px]": framed() }} style={{ width: `${width() * scale()}px`, height: `${contentHeight() * scale()}px` }}>
            <div class="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale()})`, width: `${width()}px` }}>
              <CanvasFrame
                width={width()}
                onLayout={(b, h) => {
                  setBoxes(b);
                  setContentHeight(h);
                }}
              >
                <For each={props.sections}>
                  {(section) => (
                    <div data-builder-section={section.id} style={{ opacity: section.enabled ? 1 : 0.35 }}>
                      <CanvasSectionBody section={section} homepage={props.homepage} />
                    </div>
                  )}
                </For>
              </CanvasFrame>
            </div>

            {/* Editing overlay */}
            <div class="absolute inset-0">
              <Show when={props.sections.length === 0}>
                <div class="absolute inset-4 flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-brand-pink/40 px-6 text-center" classList={{ "border-brand-pink bg-surface-pink/40": props.dropTarget?.zone === "canvas" }}>
                  <LayersIcon class="size-8 text-brand-pink" />
                  <p class="text-sm font-medium text-ink">ลากส่วนจากคลังด้านซ้ายมาวางที่นี่</p>
                  <p class="text-xs text-ink-gray">{props.emptyHint ?? "หรือกดปุ่มด้านล่างเพื่อเพิ่มส่วนแรก"}</p>
                  <button type="button" onClick={(e) => openInsert(0, e.currentTarget)} class="mt-2 flex min-h-10 items-center gap-1.5 rounded-pill bg-brand-pink px-4 text-sm font-medium text-white hover:bg-brand-pink/90">
                    <PlusIcon class="size-4" /> เพิ่มส่วน
                  </button>
                </div>
              </Show>

              <For each={props.sections}>
                {(section, index) => {
                  const rect = () => rectOf(section.id);
                  const selected = () => props.selectedId === section.id;
                  const hovered = () => hoverId() === section.id && !props.dragging;
                  const label = () => section.name || sectionTypeLabel(section.type);
                  return (
                    <Show when={rect()}>
                      {(r) => (
                        <div
                          class="absolute inset-x-0 cursor-pointer"
                          style={{ top: `${r().top}px`, height: `${r().height}px` }}
                          onPointerEnter={() => setHoverId(section.id)}
                          onPointerLeave={() => setHoverId((id) => (id === section.id ? null : id))}
                          onClick={() => !props.consumedClick() && props.onSelect(section.id)}
                        >
                          <div
                            class="pointer-events-none absolute inset-0"
                            classList={{
                              "outline outline-2 -outline-offset-2 outline-brand-pink": selected(),
                              "outline outline-1 -outline-offset-1 outline-brand-pink/60": !selected() && hovered(),
                              "outline outline-2 -outline-offset-2 outline-system-red": !selected() && !hovered() && props.errorIds.has(section.id),
                              "opacity-40": props.dragId === section.id,
                              "bg-white/50": props.dragId === section.id,
                            }}
                          />
                          <Show when={!section.enabled}>
                            <span class="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-pill bg-ink/75 px-2.5 py-1 text-xs font-medium text-white">
                              <EyeOffIcon class="size-3.5" /> ซ่อนอยู่ ไม่แสดงบนหน้าร้าน
                            </span>
                          </Show>
                          <Show when={selected() || hovered()}>
                            <span
                              class="pointer-events-none absolute left-0 top-0 max-w-[45%] truncate rounded-br-card px-2.5 py-1 text-xs font-medium text-white"
                              classList={{ "bg-brand-pink": selected(), "bg-brand-pink/70": !selected() }}
                            >
                              {label()}
                            </span>
                            <div class="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-pill border border-border bg-surface-card p-0.5 shadow-card" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                aria-label={`ลาก ${label()}`}
                                title="ลากเพื่อย้าย"
                                onPointerDown={(e) => props.onStartDrag(e, { kind: "move", id: section.id, label: label() })}
                                class={`${toolbarButton} cursor-grab touch-none active:cursor-grabbing`}
                              >
                                <DragHandleIcon class="size-4" />
                              </button>
                              <button type="button" aria-label="ย้ายขึ้น" title="ย้ายขึ้น" disabled={index() === 0} onClick={() => props.onAction(section.id, "up")} class={toolbarButton}>
                                <ChevronIcon direction="up" class="size-5" />
                              </button>
                              <button type="button" aria-label="ย้ายลง" title="ย้ายลง" disabled={index() === props.sections.length - 1} onClick={() => props.onAction(section.id, "down")} class={toolbarButton}>
                                <ChevronIcon direction="down" class="size-5" />
                              </button>
                              <button type="button" aria-label="ทำสำเนา" title="ทำสำเนา" onClick={() => props.onAction(section.id, "duplicate")} class={toolbarButton}>
                                <DuplicateIcon class="size-4" />
                              </button>
                              <button type="button" aria-label={section.enabled ? "ซ่อน" : "แสดง"} title={section.enabled ? "ซ่อน" : "แสดง"} onClick={() => props.onAction(section.id, "toggle")} class={toolbarButton}>
                                <Show when={section.enabled} fallback={<EyeOffIcon class="size-4" />}>
                                  <EyeIcon class="size-4" />
                                </Show>
                              </button>
                              <button type="button" aria-label="ลบ" title="ลบ" onClick={() => props.onAction(section.id, "delete")} class={`${toolbarButton} hover:!bg-danger-soft hover:!text-danger-strong`}>
                                <TrashIcon class="size-4" />
                              </button>
                            </div>
                          </Show>
                        </div>
                      )}
                    </Show>
                  );
                }}
              </For>

              {/* "+" at every gap (top, between, bottom) */}
              <Show when={props.sections.length > 0 && !props.dragging}>
                <For each={Array.from({ length: props.sections.length + 1 }, (_, i) => i)}>
                  {(gap) => (
                    <div
                      class="absolute left-1/2 z-20"
                      style={{ top: `${gapY(gap)}px`, transform: `translate(-50%, ${gap === 0 ? "4px" : gap === props.sections.length ? "calc(-100% - 4px)" : "-50%"})` }}
                    >
                      <button
                        type="button"
                        aria-label="เพิ่มส่วนตรงนี้"
                        title="เพิ่มส่วนตรงนี้"
                        onClick={(e) => openInsert(gap, e.currentTarget)}
                        class="flex size-7 items-center justify-center rounded-pill border border-brand-pink bg-surface-card text-brand-pink opacity-0 shadow-card transition-opacity duration-150 hover:bg-brand-pink hover:text-white focus-visible:opacity-100 group-hover/stage:opacity-100"
                        classList={{ "!opacity-100": insertAt()?.index === gap }}
                      >
                        <PlusIcon class="size-4" />
                      </button>
                    </div>
                  )}
                </For>
              </Show>

              <Show when={dropLineY() !== null && props.sections.length > 0}>
                <div class="pointer-events-none absolute inset-x-0 z-30 h-1 -translate-y-1/2 bg-brand-pink shadow-[0_0_0_2px_rgba(255,255,255,0.8)]" style={{ top: `${Math.max(2, Math.min(dropLineY()!, contentHeight() * scale() - 2))}px` }} />
              </Show>
            </div>
          </div>
        </div>
      </div>

      <Show when={insertAt()}>
        {(at) => (
          <InsertPopover
            x={at().x}
            y={at().y}
            onClose={() => setInsertAt(null)}
            onPick={(type) => {
              props.onInsert(at().index, type);
              setInsertAt(null);
            }}
          />
        )}
      </Show>
    </div>
  );
}
