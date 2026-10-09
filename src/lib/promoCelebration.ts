import { createEffect, on, onCleanup, type Accessor } from "solid-js";
import { confettiBurst } from "./confetti";

/**
 * Cart promo celebration, shared by every promo banner (free shipping, gift,
 * each ขั้นบันได tier): the first time a shopper sees something unlocked the
 * banner pops and shoots confetti; reopening the cart doesn't repeat it.
 * Only after the cart drops back under that threshold and reaches it again
 * does it celebrate once more. Each unlock has its own key (promo + tier +
 * threshold + gift), so a new promo or a changed tier celebrates too.
 * Remembered in localStorage so a reload with the same cart stays quiet.
 */
const CELEBRATED_KEY = "charmiss:promo-celebrated";

export type CelebrationTarget = { key: string; unlocked: boolean };

function readCelebrated(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CELEBRATED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeCelebrated(keys: Set<string>) {
  try {
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...keys]));
  } catch {}
}

/**
 * Pops `el()` and bursts confetti once for each newly unlocked key. Several
 * keys unlocking together (one item jumps two tiers) make one celebration.
 */
export function createPromoCelebration(el: () => HTMLElement | undefined, targets: Accessor<CelebrationTarget[]>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));

  createEffect(
    on(targets, (list) => {
      const fresh = () => {
        const done = readCelebrated();
        return list.filter((t) => t.unlocked && !done.has(t.key)).map((t) => t.key);
      };
      if (fresh().length === 0) return;
      // Let the mini cart finish sliding in before celebrating.
      clearTimeout(timer);
      timer = setTimeout(() => {
        const node = el();
        const keys = fresh();
        if (!node?.isConnected || keys.length === 0) return;
        const done = readCelebrated();
        keys.forEach((k) => done.add(k));
        writeCelebrated(done);
        if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
          node.animate([{ transform: "scale(1)" }, { transform: "scale(1.04)" }, { transform: "scale(1)" }], { duration: 450, easing: "ease-out" });
        }
        confettiBurst(node);
      }, 350);
    }),
  );
}

/**
 * Re-arms a key when the cart drops from unlocked to locked. Call it from
 * somewhere always mounted (CartDrawer's body), so a drop that happens while
 * no banner is on screen still counts. Only a real unlocked to locked change
 * clears it, never the empty cart a page starts with before the saved cart loads.
 */
export function rearmPromoCelebrations(targets: Accessor<CelebrationTarget[]>) {
  createEffect(
    on(targets, (now, prev) => {
      if (!prev) return;
      const wasUnlocked = new Set(prev.filter((t) => t.unlocked).map((t) => t.key));
      const dropped = now.filter((t) => !t.unlocked && wasUnlocked.has(t.key)).map((t) => t.key);
      if (dropped.length === 0) return;
      const done = readCelebrated();
      dropped.forEach((k) => done.delete(k));
      writeCelebrated(done);
    }),
  );
}

export const freeShippingKey = (s: { id: string; threshold: number; unit: string }) => `ship:${s.id}@${s.unit}${s.threshold}`;
export const giftTierKey = (promoId: string, t: { index: number; threshold: number; product: { id: string } }, unit: string) =>
  `gift:${promoId}@${t.index}:${unit}${t.threshold}:${t.product.id}`;
