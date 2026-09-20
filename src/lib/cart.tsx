import { createContext, createMemo, createSignal, onMount, useContext, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import type { CartLine } from "./types";

type CartContextValue = {
  lines: () => CartLine[];
  count: () => number;
  /**
   * Stands in for `POST /cart/lines`. Resolves ~500ms later like a real
   * network call and has a small chance to reject so the Quick Add UI has a
   * real error path to recover from until the backend is wired up. Opens
   * the shared Cart Drawer on success by default — every "Add to Cart" entry
   * point (Product Card, Product Detail, ...) gets that for free instead of
   * each one remembering to open it itself.
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
};

const CartContext = createContext<CartContextValue>();

const STORAGE_KEY = "charmiss:cart";

function readInitial(): CartLine[] {
  if (isServer) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
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
    if (opts?.openDrawer !== false) openDrawer();
  };

  const updateQty: CartContextValue["updateQty"] = (productId, variantId, qty) => {
    persist(
      lines().map((l) => (l.productId === productId && l.variantId === variantId ? { ...l, qty } : l)),
    );
  };

  const removeLine: CartContextValue["removeLine"] = (productId, variantId) => {
    persist(lines().filter((l) => !(l.productId === productId && l.variantId === variantId)));
  };

  const clearCart = () => persist([]);

  const count = createMemo(() => lines().reduce((sum, l) => sum + l.qty, 0));

  return (
    <CartContext.Provider
      value={{
        lines,
        count,
        addLine,
        updateQty,
        removeLine,
        clearCart,
        drawerOpen,
        openDrawer,
        closeDrawer,
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
