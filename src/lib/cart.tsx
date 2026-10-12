import { createContext, createEffect, createMemo, createSignal, onMount, useContext, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import type { CartLine } from "./types";

type CartContextValue = {
  lines: () => CartLine[];
  count: () => number;
  /**
   * What the Header / BottomNav cart badges show — `count()`, except that
   * right after an add it holds the old number until the fly-to-cart photo
   * lands (`releaseCartBadge` in ~/lib/flyToCart), so the number changes as
   * the product "arrives".
   */
  badgeCount: () => number;
  /**
   * Stands in for `POST /cart/lines`. Resolves ~500ms later like a real
   * network call and has a small chance to reject so the Quick Add UI has a
   * real error path to recover from until the backend is wired up. Does NOT
   * open the Cart Drawer — add-to-cart feedback is the fly-to-cart animation
   * (`~/lib/flyToCart`), which each entry point plays on success; the Drawer
   * only opens from Header's cart button. `openDrawer: true` opts back in.
   */
  addLine: (productId: string, variantId?: string, qty?: number, opts?: { openDrawer?: boolean }) => Promise<void>;
  /** Clamped to >=1 by the caller (QuantityStepper already does this) — this just persists whatever it's given. */
  updateQty: (productId: string, variantId: string | undefined, qty: number) => void;
  removeLine: (productId: string, variantId: string | undefined) => void;
  /** Only ever called after a confirmed order success (see Checkout) — never before, so a failed/cancelled order never loses the shopper's cart. */
  clearCart: () => void;
  drawerOpen: () => boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  /** The option the customer picked for each free gift that has several (gift key -> variant id). */
  giftChoices: () => Record<string, string>;
  setGiftChoice: (giftKey: string, variantId: string) => void;
};

const CartContext = createContext<CartContextValue>();

const STORAGE_KEY = "charmiss:cart";
const GIFT_CHOICES_KEY = "charmiss:cart-gift-choices";

function readInitial(): CartLine[] {
  if (isServer) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

// Module-level so ~/lib/flyToCart (plain module, no context) can release it. Only ever flipped on the client.
const [badgeHeld, setBadgeHeld] = createSignal(false);
let badgeHoldTimer: ReturnType<typeof setTimeout> | undefined;

function holdCartBadge() {
  setBadgeHeld(true);
  clearTimeout(badgeHoldTimer);
  // Safety net: never leave the badge stale if no flight ever lands (e.g. the add came from somewhere without one).
  badgeHoldTimer = setTimeout(() => setBadgeHeld(false), 2500);
}

export function releaseCartBadge() {
  clearTimeout(badgeHoldTimer);
  setBadgeHeld(false);
}

export function CartProvider(props: { children: JSX.Element }) {
  // Always start `[]` on both server AND client — matching SSR exactly
  // avoids a hydration mismatch. Reading localStorage synchronously here
  // made the *client's* initial value disagree with what SSR rendered
  // whenever the cart was non-empty; Solid's rendering then adopts the
  // server's (empty) DOM as-is and never reconciles against the differing
  // initial signal, so the Header count and every cart view got stuck at 0
  // even though localStorage genuinely had lines in it — exactly the same
  // failure mode the Promo Strip had, and the same fix (read the real
  // value in `onMount`, strictly after hydration, instead of up front).
  const [lines, setLines] = createSignal<CartLine[]>([]);
  onMount(() => setLines(readInitial()));
  const [drawerOpen, setDrawerOpen] = createSignal(false);
  // The Drawer opens from several places now (Header's cart icon, every
  // Product Card, Product Detail) instead of one local `createDialogOpenState`
  // tied to a single trigger button — so focus-restore-on-close lives here,
  // centrally, and works no matter which of those triggered it. Same
  // "restore on the next tick so ours wins over Kobalte's own focus
  // settling" reasoning as `focusRestore.ts`.
  let drawerTrigger: HTMLElement | null = null;
  const openDrawer = () => {
    drawerTrigger = isServer ? null : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    const el = drawerTrigger;
    drawerTrigger = null;
    setDrawerOpen(false);
    if (el) setTimeout(() => el.focus(), 0);
  };

  const persist = (next: CartLine[]) => {
    setLines(next);
    if (!isServer) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage can be unavailable (private mode / quota) — cart state just
        // stays in-memory for this tab, which is an acceptable degrade.
      }
    }
  };

  const addLine: CartContextValue["addLine"] = async (productId, variantId, qty = 1, opts) => {
    await new Promise((resolve) => setTimeout(resolve, 450 + Math.random() * 250));
    if (Math.random() < 0.06) {
      throw new Error("ADD_TO_CART_FAILED");
    }
    // The fly-to-cart animation releases this when it lands; opening the drawer instead shows the new count at once.
    if (!opts?.openDrawer) holdCartBadge();
    const current = lines();
    const existing = current.find((l) => l.productId === productId && l.variantId === variantId);
    if (existing) {
      persist(
        current.map((l) =>
          l === existing ? { ...l, qty: l.qty + qty } : l,
        ),
      );
    } else {
      persist([...current, { productId, variantId, qty }]);
    }
    if (opts?.openDrawer) openDrawer();
  };

  const updateQty: CartContextValue["updateQty"] = (productId, variantId, qty) => {
    persist(
      lines().map((l) => (l.productId === productId && l.variantId === variantId ? { ...l, qty } : l)),
    );
  };

  const removeLine: CartContextValue["removeLine"] = (productId, variantId) => {
    persist(lines().filter((l) => !(l.productId === productId && l.variantId === variantId)));
  };

  // Picked gift options live with the cart (survive reloads) and go when the cart does after an order.
  const [giftChoices, setGiftChoices] = createSignal<Record<string, string>>({});
  onMount(() => {
    try {
      setGiftChoices(JSON.parse(localStorage.getItem(GIFT_CHOICES_KEY) ?? "{}") as Record<string, string>);
    } catch {
      // unreadable: no saved picks.
    }
  });
  const writeGiftChoices = (next: Record<string, string>) => {
    setGiftChoices(next);
    try {
      localStorage.setItem(GIFT_CHOICES_KEY, JSON.stringify(next));
    } catch {
      // in-memory only for this tab.
    }
  };
  const setGiftChoice = (giftKey: string, variantId: string) => writeGiftChoices({ ...giftChoices(), [giftKey]: variantId });

  const clearCart = () => {
    persist([]);
    writeGiftChoices({});
  };

  const count = createMemo(() => lines().reduce((sum, l) => sum + l.qty, 0));
  const [badgeCount, setBadgeCount] = createSignal(0);
  createEffect(() => {
    const current = count();
    if (!badgeHeld()) setBadgeCount(current);
  });

  return (
    <CartContext.Provider
      value={{
        lines,
        count,
        badgeCount,
        addLine,
        updateQty,
        removeLine,
        clearCart,
        drawerOpen,
        openDrawer,
        closeDrawer,
        giftChoices,
        setGiftChoice,
      }}
    >
      {props.children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
