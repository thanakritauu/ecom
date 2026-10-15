import { createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";
import { Portal } from "solid-js/web";

export type SectionBox = { id: string; top: number; bottom: number };

const FRAME_STYLE = `
html, body { margin: 0; padding: 0; background: #fff; overflow: hidden; }
[data-builder-section] { position: relative; }
[data-builder-section][data-empty] { min-height: 72px; background: repeating-linear-gradient(135deg, #fafafa 0 12px, #f3f3f3 12px 24px); }
[data-builder-section][data-empty]::after {
  content: attr(data-empty-label); position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font: 500 14px/1.6 system-ui, sans-serif; color: #8a8a8a; text-align: center; padding: 0 16px;
}
`;

/**
 * Renders `children` (the real storefront section components, same Solid
 * tree so every storefront store/context keeps working) inside a same-origin
 * iframe that is exactly `width` px wide. Tailwind's sm/md/lg breakpoints are
 * media queries, so only a real viewport of the device's width shows the
 * tablet/mobile layouts the way shoppers see them. The page's stylesheets are
 * mirrored into the frame (and re-mirrored when Vite hot-swaps them).
 *
 * The frame is purely visual (`pointer-events: none`), so links, buttons and
 * carousels inside it can't navigate while editing; the builder's overlay on
 * top handles every click. `onLayout` reports each `[data-builder-section]`
 * box and the total content height, which the frame also takes as its own
 * height (the canvas scrolls, not the frame).
 */
export function CanvasFrame(props: {
  width: number;
  children: JSX.Element;
  onLayout: (boxes: SectionBox[], height: number) => void;
  emptyLabel?: string;
}) {
  let iframe!: HTMLIFrameElement;
  const [doc, setDoc] = createSignal<Document>();
  const [height, setHeight] = createSignal(600);
  let cleanup: (() => void) | undefined;

  const mirrorStyles = (d: Document) => {
    d.head.querySelectorAll("[data-builder-mirror]").forEach((n) => n.remove());
    document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
      const copy = d.importNode(node, true) as HTMLElement;
      copy.setAttribute("data-builder-mirror", "");
      d.head.appendChild(copy);
    });
  };

  const setup = () => {
    const d = iframe.contentDocument;
    if (!d || !d.body) return;
    d.documentElement.lang = "th";
    const base = d.createElement("base");
    base.href = `${location.origin}/`;
    d.head.appendChild(base);
    const own = d.createElement("style");
    own.textContent = FRAME_STYLE;
    mirrorStyles(d);
    d.head.appendChild(own);

    let styleTimer: ReturnType<typeof setTimeout> | undefined;
    const headObserver = new MutationObserver(() => {
      clearTimeout(styleTimer);
      styleTimer = setTimeout(() => {
        mirrorStyles(d);
        d.head.appendChild(own);
      }, 50);
    });
    headObserver.observe(document.head, { childList: true, subtree: true, characterData: true });

    const win = d.defaultView as (Window & typeof globalThis) | null;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const els = Array.from(d.querySelectorAll<HTMLElement>("[data-builder-section]"));
      for (const el of els) {
        const hasContent = Array.from(el.children).some((c) => c.getBoundingClientRect().height > 1);
        if (!hasContent && !el.hasAttribute("data-empty")) {
          el.setAttribute("data-empty", "");
          el.setAttribute("data-empty-label", props.emptyLabel ?? "ส่วนนี้ยังไม่มีเนื้อหาที่จะแสดง");
        } else if (hasContent && el.hasAttribute("data-empty")) {
          el.removeAttribute("data-empty");
        }
        resizeObserver?.observe(el);
      }
      const boxes = els.map((el) => {
        const r = el.getBoundingClientRect();
        return { id: el.dataset.builderSection ?? "", top: r.top, bottom: r.bottom };
      });
      const total = Math.max(240, Math.ceil(d.body.scrollHeight));
      setHeight(total);
      props.onLayout(boxes, total);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resizeObserver = win?.ResizeObserver ? new win.ResizeObserver(schedule) : undefined;
    resizeObserver?.observe(d.body);
    const bodyObserver = new MutationObserver(schedule);
    bodyObserver.observe(d.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "src"] });
    // Images and fonts finishing late change heights without a mutation.
    d.addEventListener("load", schedule, true);
    const poll = setInterval(schedule, 1000);

    cleanup = () => {
      headObserver.disconnect();
      bodyObserver.disconnect();
      resizeObserver?.disconnect();
      clearInterval(poll);
      clearTimeout(styleTimer);
      if (frame) cancelAnimationFrame(frame);
    };
    setDoc(d);
    schedule();
  };

  onMount(() => {
    // The `srcdoc` document is only there on `load` (before that the frame holds a throwaway about:blank).
    iframe.addEventListener("load", setup, { once: true });
  });
  onCleanup(() => cleanup?.());

  return (
    <>
      <iframe
        ref={iframe}
        srcdoc="<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>"
        title="พื้นที่ออกแบบหน้า"
        tabIndex={-1}
        aria-hidden="true"
        class="pointer-events-none block border-0 bg-white"
        style={{ width: `${props.width}px`, height: `${height()}px` }}
      />
      <Show when={doc()}>{(d) => <Portal mount={d().body}>{props.children}</Portal>}</Show>
    </>
  );
}
