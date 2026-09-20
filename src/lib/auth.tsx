import { createContext, createSignal, onMount, useContext, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import type { User } from "./types";
import { MOCK_USER } from "./accountData";
import { createDialogOpenState } from "./focusRestore";

type AuthContextValue = {
  user: () => User | null;
  isAuthenticated: () => boolean;
  /**
   * Stands in for a real `POST /auth/login` — no auth backend exists yet, so
   * this always signs in as the single mock persona (matching Figma's own
   * one example user). Same shape as `addLine` in cart.tsx: simulated
   * network delay, small chance to reject so the Guest state's login button
   * has a real error/retry path to exercise.
   */
  login: () => Promise<void>;
  logout: () => void;
  /**
   * Auth Modal state lives here (not a separate store) since it's Auth UI
   * state, not a new concept — `openAuthModal()` is callable from any
   * component (Header, ProductCard/ProductGallery's wishlist guest-block,
   * Account's guest prompt, ...), not owned by any single one of them.
   * There is no `returnContext`/`redirect` concept anymore: a modal opens
   * *on top of* whatever page the shopper is already on, so closing it
   * (on success or cancel) already "returns" them there — that mechanism
   * only existed because Login used to be a full page navigation.
   */
  isAuthModalOpen: () => boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
};

const AuthContext = createContext<AuthContextValue>();

const STORAGE_KEY = "charmiss:auth";

function readInitial(): User | null {
  if (isServer) return null;
  try {
    return localStorage.getItem(STORAGE_KEY) ? MOCK_USER : null;
  } catch {
    return null;
  }
}

export function AuthProvider(props: { children: JSX.Element }) {
  // Same SSR-safe hydration fix as CartProvider/WishlistProvider: start `null`
  // on both server and client, then read the real (persisted) session in
  // `onMount`, strictly after hydration — reading localStorage synchronously
  // here would make the client's initial render disagree with SSR's and
  // freeze the Header's logged-in state at "guest" forever after a hard
  // refresh, the exact bug already fixed once for Cart and Wishlist.
  const [user, setUser] = createSignal<User | null>(null);
  onMount(() => setUser(readInitial()));

  const login: AuthContextValue["login"] = async () => {
    await new Promise((resolve) => setTimeout(resolve, 450 + Math.random() * 250));
    if (Math.random() < 0.06) {
      throw new Error("LOGIN_FAILED");
    }
    setUser(MOCK_USER);
    if (!isServer) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // storage can be unavailable (private mode / quota) — session just stays in-memory for this tab.
      }
    }
  };

  const logout = () => {
    setUser(null);
    if (!isServer) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  };

  // `createDialogOpenState` (not a plain signal) — this modal is controlled
  // externally (a plain button calls `openAuthModal()`, not Kobalte's own
  // `<Dialog.Trigger>`), so Kobalte has no trigger reference to restore
  // focus to on close; this utility remembers `document.activeElement` at
  // open time and restores it, same as CartDrawer/MobileMenu already do.
  const [authModalOpen, setAuthModalOpen] = createDialogOpenState();

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: () => user() !== null,
        login,
        logout,
        isAuthModalOpen: authModalOpen,
        openAuthModal: () => setAuthModalOpen(true),
        closeAuthModal: () => setAuthModalOpen(false),
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
