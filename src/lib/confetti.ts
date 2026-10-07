/**
 * Small paper-confetti burst from an element (Web Animations API, no library).
 * Pieces shoot up/out from the element's top edge, tumble and fall, then are
 * removed. Fixed-position layer above every modal/drawer, pointer-events off.
 * Skipped entirely for prefers-reduced-motion.
 */
const COLORS = ["#7650FF", "#27CD97", "#F42C58", "#FFC83D", "#FF9300", "#FFFFFF"];

export function confettiBurst(from: Element, count = 42) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const rect = from.getBoundingClientRect();
  if (!rect.width) return;

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:80;overflow:hidden";
  document.body.appendChild(layer);

  let remaining = count;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    const w = 6 + Math.random() * 5;
    const h = Math.random() < 0.5 ? w : w * 0.45;
    // Start spread along the element's top edge.
    const x0 = rect.left + rect.width * (0.15 + Math.random() * 0.7);
    const y0 = rect.top + rect.height * 0.35;
    piece.style.cssText = `position:absolute;left:${x0}px;top:${y0}px;width:${w}px;height:${h}px;background:${COLORS[i % COLORS.length]};border-radius:${Math.random() < 0.3 ? "50%" : "2px"};box-shadow:0 0 0 0.5px rgba(0,0,0,0.06)`;
    layer.appendChild(piece);

    const dx = (Math.random() - 0.5) * Math.min(rect.width * 1.2, 520);
    const up = 90 + Math.random() * 120;
    const fall = 140 + Math.random() * 220;
    const spin = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540);
    // ~3.1–3.7s: a slow, floaty spread (was 1.1–1.7s).
    const duration = 3100 + Math.random() * 600;
    piece
      .animate(
        [
          { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
          { transform: `translate(${dx * 0.6}px,${-up}px) rotate(${spin * 0.4}deg)`, opacity: 1, offset: 0.35 },
          { transform: `translate(${dx}px,${fall - up}px) rotate(${spin}deg)`, opacity: 0 },
        ],
        { duration, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)", delay: Math.random() * 120, fill: "forwards" },
      )
      .finished.catch(() => {})
      .finally(() => {
        if (--remaining === 0) layer.remove();
      });
  }
}
