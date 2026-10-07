/**
 * Add-to-cart feedback — replaces auto-opening the Cart Drawer. A small
 * rounded photo of the product flies on an arc from where the shopper added
 * it (the product photo, else the clicked control) into the cart icon, then
 * the icon + count badge bump. Client-only; call it after `cart.addLine`
 * resolves (never on failure — errors keep their toast).
 *
 * Targets are marked with `data-cart-target` (Header's cart button, the
 * BottomNav "ตะกร้า" item) and their count badge with `data-cart-badge`.
 * The target is picked by what's actually on screen: BottomNav when it's
 * displayed (tablet / mobile — it's `lg:hidden`), else Header's button.
 * When the Header is hidden by hide-on-scroll its button is above the
 * viewport, so the photo flies to that button's x at the top edge instead.
 *
 * The badge number itself changes on landing: `cart.addLine` holds the
 * badge (`badgeCount`), `releaseCartBadge` here lets the new number in just
 * before the bump.
 *
 * prefers-reduced-motion: no flight, only the bump.
 */
import { releaseCartBadge } from "./cart";

const BOX = 56;
// ~1s so the count visibly changes as the photo lands, not as the button is pressed.
const DURATION = 1000;
const STEPS = 24;

type Point = { x: number; y: number };

function isDisplayed(el: Element) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function inViewport(r: DOMRect) {
  return r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
}

function center(r: DOMRect): Point {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function pickTarget(): { el?: HTMLElement; point: Point } {
  const shown = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")].filter(isDisplayed);
  const visible = shown.filter((el) => inViewport(el.getBoundingClientRect()));
  const el = visible.find((e) => e.dataset.cartTarget === "bottom-nav") ?? visible[0];
  if (el) return { el, point: center(el.getBoundingClientRect()) };
  // Header slid away (hide-on-scroll): aim where its button would come back in.
  const hidden = shown[0];
  if (hidden) return { el: hidden, point: { x: center(hidden.getBoundingClientRect()).x, y: 24 } };
  return { point: { x: window.innerWidth - 32, y: 24 } };
}

/** The first candidate that's displayed and on screen (e.g. the PDP gallery photo, else its sticky bar). */
function pickSource(sources: (Element | null | undefined)[]) {
  const shown = sources.filter((el): el is Element => !!el && isDisplayed(el));
  return shown.find((el) => inViewport(el.getBoundingClientRect())) ?? shown[0];
}

function bump(target?: HTMLElement) {
  if (!target) return;
  target.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], {
    duration: 320,
    easing: "ease-out",
  });
  const badge = target.querySelector<HTMLElement>("[data-cart-badge]");
  if (badge) {
    // Restart the shared `animate-badge-pop` keyframe.
    badge.classList.remove("animate-badge-pop");
    void badge.offsetWidth;
    badge.classList.add("animate-badge-pop");
  }
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * `sources`: candidates for the start point, in preference order — the first one on screen wins.
 * `image`: photo to show when the chosen source has no `<img>` of its own (e.g. a button row).
 */
export function flyToCart(opts: { sources: (Element | null | undefined)[]; image?: string }) {
  if (typeof window === "undefined") return;
  const target = pickTarget();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const source = pickSource(opts.sources);
  if (reduced || !source) {
    releaseCartBadge();
    requestAnimationFrame(() => bump(target.el));
    return;
  }

  const img = source instanceof HTMLImageElement ? source : source.querySelector("img");
  const src = img?.currentSrc || img?.src || opts.image;
  // A container source (e.g. the sticky bar) starts from its own photo when it shows one.
  const from = center((img && isDisplayed(img) ? img : source).getBoundingClientRect());
  const to = target.point;

  const box = document.createElement("div");
  box.setAttribute("aria-hidden", "true");
  box.className = "pointer-events-none fixed z-[70] overflow-hidden rounded-xl border-2 border-white bg-surface-pink shadow-[0_8px_24px_rgba(90,106,133,0.35)]";
  Object.assign(box.style, { left: `${from.x - BOX / 2}px`, top: `${from.y - BOX / 2}px`, width: `${BOX}px`, height: `${BOX}px` });
  if (src) {
    const photo = document.createElement("img");
    photo.src = src;
    photo.alt = "";
    photo.className = "size-full object-cover";
    box.appendChild(photo);
  }
  document.body.appendChild(box);

  // Quadratic Bézier with its control point lifted above both ends, so the
  // photo arcs up and over (toward the Header) or up then down (toward BottomNav).
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lift = Math.min(160, 60 + Math.hypot(dx, dy) * 0.25);
  // Clamped to the viewport's top so a flight up to the Header never leaves the screen.
  const ctrl = { x: from.x + dx * 0.5, y: Math.max(Math.min(from.y, to.y) - lift, 12) };
  const frames: Keyframe[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = easeInOut(i / STEPS);
    const u = 1 - t;
    const x = u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x - from.x;
    const y = u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y - from.y;
    const p = i / STEPS;
    const scale = p < 0.15 ? 1 + p : 1.15 - 0.85 * ((p - 0.15) / 0.85);
    frames.push({ transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity: p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3 });
  }
  const anim = box.animate(frames, { duration: DURATION, easing: "linear", fill: "forwards" });
  let landed = false;
  const done = () => {
    if (landed) return;
    landed = true;
    box.remove();
    releaseCartBadge();
    // Next frame, so a badge that just appeared (0 → 1) exists before it's bumped.
    requestAnimationFrame(() => bump(target.el));
  };
  anim.onfinish = done;
  anim.oncancel = done;
  // Same landing time even when the browser pauses animations (background tab) — the count still updates on time.
  setTimeout(done, DURATION + 50);
}
