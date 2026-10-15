import { createSignal, onCleanup } from "solid-js";
import type { HomepageSection, HomepageSectionType } from "~/lib/pageSections";

/**
 * Undo / redo for the page builder (session only). Typing into one field
 * fires a change per keystroke, so commits sharing a `mergeKey` within
 * `MERGE_MS` fold into one history step.
 */
const MERGE_MS = 1200;
const MAX_STEPS = 100;

export function createSectionHistory(initial: HomepageSection[]) {
  const [present, setPresent] = createSignal<HomepageSection[]>(initial);
  const [past, setPast] = createSignal<HomepageSection[][]>([]);
  const [future, setFuture] = createSignal<HomepageSection[][]>([]);
  let lastKey: string | undefined;
  let lastAt = 0;

  const commit = (next: HomepageSection[], mergeKey?: string) => {
    const now = Date.now();
    const merge = !!mergeKey && mergeKey === lastKey && now - lastAt < MERGE_MS;
    if (!merge) setPast((list) => [...list.slice(-(MAX_STEPS - 1)), present()]);
    setFuture([]);
    lastKey = mergeKey;
    lastAt = now;
    setPresent(next);
  };
  const undo = () => {
    const list = past();
    if (list.length === 0) return false;
    setFuture((f) => [present(), ...f]);
    setPresent(list[list.length - 1]);
    setPast(list.slice(0, -1));
    lastKey = undefined;
    return true;
  };
  const redo = () => {
    const list = future();
    if (list.length === 0) return false;
    setPast((p) => [...p, present()]);
    setPresent(list[0]);
    setFuture(list.slice(1));
    lastKey = undefined;
    return true;
  };
  /** Replaces the content without an undo step (opening a page, discarding edits). */
  const reset = (sections: HomepageSection[]) => {
    setPast([]);
    setFuture([]);
    lastKey = undefined;
    setPresent(sections);
  };

  return { present, commit, undo, redo, reset, canUndo: () => past().length > 0, canRedo: () => future().length > 0 };
}

export type DragPayload = { kind: "move"; id: string; label: string } | { kind: "new"; type: HomepageSectionType; label: string };
export type DropZone = "canvas" | "layers";
export type DropTarget = { zone: DropZone; index: number };

/** Where a pointer at (x, y) would drop, or null when it isn't over this zone. */
export type HitTest = (x: number, y: number) => number | null;

/**
 * Pointer-event drag and drop (mouse, pen and touch), no HTML5 DnD: a drag
 * starts after the pointer moves 5px, the ghost label follows the pointer,
 * and each registered zone (canvas, layers list) reports the index it would
 * drop at. Scroll containers registered with a zone auto-scroll near their
 * edges while dragging.
 */
export function createDragController(onDrop: (payload: DragPayload, target: DropTarget) => void) {
  const [drag, setDrag] = createSignal<{ payload: DragPayload; x: number; y: number; target: DropTarget | null } | null>(null);
  const zones = new Map<DropZone, { hit: HitTest; scroller?: () => HTMLElement | undefined }>();
  let justDropped = false;
  let raf = 0;
  let pointer = { x: 0, y: 0 };

  const registerZone = (zone: DropZone, hit: HitTest, scroller?: () => HTMLElement | undefined) => {
    zones.set(zone, { hit, scroller });
    onCleanup(() => zones.delete(zone));
  };

  const hitTest = (x: number, y: number): DropTarget | null => {
    for (const [zone, z] of zones) {
      const index = z.hit(x, y);
      if (index !== null) return { zone, index };
    }
    return null;
  };

  const autoScroll = () => {
    const current = drag();
    if (!current) return;
    for (const z of zones.values()) {
      const el = z.scroller?.();
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (pointer.x < rect.left || pointer.x > rect.right) continue;
      const edge = 56;
      if (pointer.y < rect.top + edge && pointer.y > rect.top - 40) el.scrollTop -= Math.ceil((rect.top + edge - pointer.y) / 4);
      else if (pointer.y > rect.bottom - edge && pointer.y < rect.bottom + 40) el.scrollTop += Math.ceil((pointer.y - (rect.bottom - edge)) / 4);
    }
    setDrag({ ...current, x: pointer.x, y: pointer.y, target: hitTest(pointer.x, pointer.y) });
    raf = requestAnimationFrame(autoScroll);
  };

  const start = (e: PointerEvent, payload: DragPayload) => {
    if (e.button !== 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;
    const move = (ev: PointerEvent) => {
      pointer = { x: ev.clientX, y: ev.clientY };
      if (!active) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        active = true;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
        setDrag({ payload, x: ev.clientX, y: ev.clientY, target: hitTest(ev.clientX, ev.clientY) });
        raf = requestAnimationFrame(autoScroll);
      }
      ev.preventDefault();
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      cancelAnimationFrame(raf);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      if (!active) return;
      const target = ev.type === "pointerup" ? hitTest(ev.clientX, ev.clientY) : null;
      setDrag(null);
      justDropped = true;
      setTimeout(() => (justDropped = false), 0);
      if (target) onDrop(payload, target);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  /** True right after a drag ended, so the click that follows a drop doesn't also select/insert. */
  const consumedClick = () => justDropped;

  return { drag, start, registerZone, consumedClick };
}

/** Index a pointer at `y` would drop at in a list of vertical boxes (`top`/`bottom` in the same coordinates as `y`). */
export function indexFromBoxes(boxes: { top: number; bottom: number }[], y: number): number {
  for (let i = 0; i < boxes.length; i++) {
    if (y < (boxes[i].top + boxes[i].bottom) / 2) return i;
  }
  return boxes.length;
}

/** A move from `from` dropped at gap `gap` (0..length) lands at this final index. */
export function moveTargetIndex(from: number, gap: number): number {
  return gap > from ? gap - 1 : gap;
}

export function formatSavedTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
