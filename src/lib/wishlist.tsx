import { createContext, createEffect, createSignal, onMount, useContext, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { useAuth } from "./auth";
import { pushToast } from "./toast";

type WishlistContextValue = {
  has: (productId: string) => boolean;
  count: () => number;
  /** Saved product ids, oldest first. */
  ids: () => string[];
  /** Resolves/rejects like a real `POST /wishlist/:id` toggle call. */
  toggle: (productId: string) => Promise<void>;
  /** Wishlist requires an account — backed by the real Auth state now that one exists. */
  isLoggedIn: () => boolean;
  /** Guest tapped a heart: opens login, and saves this product as soon as they're signed in (dropped if they close the popup). */
  saveAfterLogin: (productId: string) => void;
};

const WishlistContext = createContext<WishlistContextValue>();
const STORAGE_KEY = "charmiss:wishlist";

function readInitial(): string[] {
  if (isServer) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function WishlistProvider(props: { children: JSX.Element }) {
  // Always start `[]` on both server AND client — see the identical note in
  // cart.tsx's CartProvider for why reading localStorage synchronously here
  // instead causes the Wishlist to get stuck looking empty after a real
  // page reload (a hydration mismatch), even though localStorage has data.
  const [ids, setIds] = createSignal<string[]>([]);
  onMount(() => setIds(readInitial()));
  const auth = useAuth();

  const persist = (next: string[]) => {
    setIds(next);
    if (!isServer) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* private-mode/quota — in-memory only for this tab */
      }
    }
  };

  const toggle: WishlistContextValue["toggle"] = async (productId) => {
    await new Promise((resolve) => setTimeout(resolve, 350 + Math.random() * 200));
    if (Math.random() < 0.06) {
      throw new Error("WISHLIST_TOGGLE_FAILED");
    }
    const current = ids();
    persist(
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const [pendingId, setPendingId] = createSignal<string>();
  const saveAfterLogin = (productId: string) => {
    setPendingId(productId);
    auth.openAuthModal();
  };
  createEffect(() => {
    const id = pendingId();
    if (!id) return;
    if (auth.isAuthenticated()) {
      setPendingId(undefined);
      if (!ids().includes(id)) persist([...ids(), id]);
      pushToast("บันทึกในรายการโปรดแล้ว");
    } else if (!auth.isAuthModalOpen()) {
      setPendingId(undefined); // closed the login popup without signing in
    }
  });

  return (
    <WishlistContext.Provider
      value={{ has: (id) => ids().includes(id), count: () => ids().length, ids, toggle, isLoggedIn: auth.isAuthenticated, saveAfterLogin }}
    >
      {props.children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
