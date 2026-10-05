import { createContext, createSignal, onMount, useContext, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import type { User } from "./types";
import { MOCK_USER } from "./accountData";
import { createDialogOpenState } from "./focusRestore";
import { lookupCrmMember, type SignInIdentity } from "./crm";
import { recordMemberSignIn } from "./memberRegistry";

/** What sign-in found: an existing Charmiss Club (CRM) member whose coins were carried over, or a brand-new member. */
export type SignInResult = { member: "crm" | "new"; coinsTransferred: number; name: string };

type AuthContextValue = {
  user: () => User | null;
  isAuthenticated: () => boolean;
  /**
   * Stands in for a real sign-in / sign-up (no auth backend): one call for
   * every method (phone + OTP, email + OTP, LINE, Google). Looks the person up
   * in the Charmiss Club CRM — a match signs them in as that member with their
   * coins carried over automatically; otherwise a new member is created. Either
   * way the member's record (and where they came from) is written for Admin.
   */
  login: (identity: SignInIdentity) => Promise<SignInResult>;
  logout: () => void;
  /** Stands in for `PATCH /me` — the account's "ข้อมูลส่วนตัว" page; kept in this browser only. */
  updateProfile: (patch: ProfilePatch) => Promise<void>;
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

export type ProfilePatch = Partial<Pick<User, "name" | "email" | "phone" | "birthDate" | "gender">>;

const AuthContext = createContext<AuthContextValue>();

const STORAGE_KEY = "charmiss:auth";
const PROFILE_KEY = "charmiss:auth:profile";

function readProfile(): ProfilePatch {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") as ProfilePatch;
  } catch {
    return {};
  }
}

type StoredSession = Pick<User, "name" | "email" | "phone" | "coinBalance" | "memberSource">;

function readInitial(): User | null {
  if (isServer) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // "1" = a session from before sign-in carried member details — the original mock persona.
    const session: Partial<StoredSession> = raw === "1" ? {} : (JSON.parse(raw) as StoredSession);
    return { ...MOCK_USER, ...session, ...readProfile() };
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

  const login: AuthContextValue["login"] = async (identity) => {
    const crm = await lookupCrmMember(identity);
    const session: StoredSession = {
      name: crm?.name ?? identity.name ?? MOCK_USER.name,
      phone: identity.method === "phone" ? identity.value : (crm?.phone ?? ""),
      email: identity.method === "email" || identity.method === "google" ? identity.value : (crm?.email ?? ""),
      // CRM members start with the coins carried over; a new member starts at 0.
      coinBalance: crm?.coins ?? 0,
      memberSource: crm ? "crm" : "new",
    };
    recordMemberSignIn(identity, crm, session);
    setUser({ ...MOCK_USER, ...session });
    if (!isServer) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        localStorage.removeItem(PROFILE_KEY); // profile edits belonged to the previous account
      } catch {
        // storage can be unavailable (private mode / quota) — session just stays in-memory for this tab.
      }
    }
    return { member: crm ? "crm" : "new", coinsTransferred: crm?.coins ?? 0, name: session.name };
  };

  const logout = () => {
    setUser(null);
    if (!isServer) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  };

  const updateProfile: AuthContextValue["updateProfile"] = async (patch) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const next = { ...readProfile(), ...patch };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {}
    setUser((u) => (u ? { ...u, ...next } : u));
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
        updateProfile,
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
