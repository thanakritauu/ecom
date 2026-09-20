import { createContext, createSignal, onMount, useContext, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { useAuth } from "./auth";

type WishlistContextValue = {
  has: (productId: string) => boolean;
  count: () => number;
  /** Resolves/rejects like a real `POST /wishlist/:id` toggle call. */
  toggle: (productId: string) => Promise<void>;
  /** Wishlist requires an account — backed by the real Auth state now that one exists. */
  isLoggedIn: () => boolean;
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

  return (
    <WishlistContext.Provider
      value={{ has: (id) => ids().includes(id), count: () => ids().length, toggle, isLoggedIn: auth.isAuthenticated }}
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
