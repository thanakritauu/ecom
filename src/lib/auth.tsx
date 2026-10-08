import { createContext, createSignal, onMount, useContext, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import type { User } from "./types";
import { MOCK_USER } from "./accountData";
import { createDialogOpenState } from "./focusRestore";
import { lookupCrmMember, type SignInIdentity } from "./crm";
import { recordMemberProfile, recordMemberSignIn } from "./memberRegistry";

/** What sign-in found: an existing Charmiss Club (CRM) member whose coins were carried over, or a brand-new member. */
export type SignInResult = {
  member: "crm" | "new";
  coinsTransferred: number;
  name: string;
  /** Profile fields neither the CRM nor this member's saved profile has — the Auth Modal asks for these ("ข้อมูลเพิ่มเติม"). */
  missingProfile: ProfileExtraField[];
};

/** The "ข้อมูลเพิ่มเติม" fields asked after sign-in when missing — same fields as `/account/profile`'s วันเกิด / เพศ. */
export type ProfileExtraField = "birthDate" | "gender";

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
/** Pre-`accountKey` sessions kept one profile for "whoever is signed in" — still read for those. */
const PROFILE_KEY = "charmiss:auth:profile";
/**
 * Profile edits per account (keyed by `accountKey`), so signing out and back in
 * as the same member keeps what they saved — e.g. a skipped "ข้อมูลเพิ่มเติม"
 * step is asked again only if birth date / gender are still missing.
 */
const PROFILES_KEY = "charmiss:auth:profiles";

function readProfiles(): Record<string, ProfilePatch> {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? "{}") as Record<string, ProfilePatch>;
  } catch {
    return {};
  }
}

function readProfile(accountKey: string | undefined): ProfilePatch {
  try {
    if (accountKey) return readProfiles()[accountKey] ?? {};
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") as ProfilePatch;
  } catch {
    return {};
  }
}

type StoredSession = Pick<User, "name" | "email" | "phone" | "coinBalance" | "memberSource" | "birthDate" | "gender"> & {
  /** Which member this is across sign-ins: the CRM member id, else the phone digits / email signed in with. */
  accountKey?: string;
  crmMemberId?: string;
};

/** `accountKey` for a sign-in — the CRM member id when matched, so phone/LINE/email all land on the same profile. */
function accountKeyFor(identity: SignInIdentity, crmMemberId: string | undefined): string {
  if (crmMemberId) return crmMemberId;
  return identity.method === "phone" ? `phone:${identity.value.replace(/\D/g, "")}` : `${identity.method}:${identity.value.trim().toLowerCase()}`;
}

function readInitial(): User | null {
  if (isServer) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // "1" = a session from before sign-in carried member details — the original mock persona.
    const session: Partial<StoredSession> = raw === "1" ? {} : (JSON.parse(raw) as StoredSession);
    return { ...MOCK_USER, ...session, ...readProfile(session.accountKey) };
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
  // The signed-in member's `accountKey` / CRM id — where `updateProfile` saves, and how Admin's record is found.
  let account: Pick<StoredSession, "accountKey" | "crmMemberId"> = {};
  onMount(() => {
    setUser(readInitial());
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && raw !== "1") {
        const { accountKey, crmMemberId } = JSON.parse(raw) as StoredSession;
        account = { accountKey, crmMemberId };
      }
    } catch {}
  });

  const login: AuthContextValue["login"] = async (identity) => {
    const crm = await lookupCrmMember(identity);
    const session: StoredSession = {
      name: crm?.name ?? identity.name ?? MOCK_USER.name,
      phone: identity.method === "phone" ? identity.value : (crm?.phone ?? ""),
      email: identity.method === "email" || identity.method === "google" ? identity.value : (crm?.email ?? ""),
      // CRM members start with the coins carried over; a new member starts at 0.
      coinBalance: crm?.coins ?? 0,
      memberSource: crm ? "crm" : "new",
      birthDate: crm?.birthDate,
      gender: crm?.gender,
      accountKey: accountKeyFor(identity, crm?.crmMemberId),
      crmMemberId: crm?.crmMemberId,
    };
    account = { accountKey: session.accountKey, crmMemberId: session.crmMemberId };
    recordMemberSignIn(identity, crm, session);
    // What this member saved before (on this browser) wins over the CRM copy.
    const saved = isServer ? {} : readProfile(session.accountKey);
    const signedIn: User = { ...MOCK_USER, ...session, ...saved };
    setUser(signedIn);
    if (!isServer) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        localStorage.removeItem(PROFILE_KEY); // legacy single profile — belonged to the previous account
      } catch {
        // storage can be unavailable (private mode / quota) — session just stays in-memory for this tab.
      }
    }
    const missingProfile = (["birthDate", "gender"] as const).filter((field) => !signedIn[field]);
    return { member: crm ? "crm" : "new", coinsTransferred: crm?.coins ?? 0, name: signedIn.name, missingProfile };
  };

  const logout = () => {
    setUser(null);
    account = {};
    if (!isServer) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  };

  const updateProfile: AuthContextValue["updateProfile"] = async (patch) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const next = { ...readProfile(account.accountKey), ...patch };
    try {
      if (account.accountKey) localStorage.setItem(PROFILES_KEY, JSON.stringify({ ...readProfiles(), [account.accountKey]: next }));
      else localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {}
    setUser((u) => (u ? { ...u, ...next } : u));
    const u = user();
    if (u && ("birthDate" in patch || "gender" in patch)) {
      recordMemberProfile({ crmMemberId: account.crmMemberId, phone: u.phone, email: u.email }, {
        ...("birthDate" in patch && { birthDate: patch.birthDate ?? "" }), // cleared on the profile page → cleared in Admin too
        ...("gender" in patch && { gender: patch.gender }),
      });
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
