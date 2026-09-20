import { createContext, createSignal, onMount, useContext, type JSX } from "solid-js";
import { isServer } from "solid-js/web";

export type AdminSession = {
  name: string;
  email: string;
  role: string;
};

/**
 * The one mock admin persona — this prototype has no admin backend/user
 * table, matching the same "single example persona" approach as the
 * customer side's MOCK_USER (accountData.ts).
 */
const MOCK_ADMIN: AdminSession = {
  name: "Admin User",
  email: "admin@charmiss.local",
  role: "Super Admin",
};

type AdminAuthContextValue = {
  /**
   * False until the (client-only) persisted session has been read once.
   * `/admin.tsx`'s route guard must wait for this before deciding whether to
   * redirect to `/admin/login` — deciding from the SSR-safe default (signed
   * out) would bounce an already-logged-in admin to the login page for a
   * frame on every hard refresh, then snap back once hydration catches up.
   */
  isReady: () => boolean;
  admin: () => AdminSession | null;
  isAuthenticated: () => boolean;
  /**
   * Stands in for a real `POST /admin/auth/login` — no admin backend exists,
   * so any email/password signs in as the one mock persona. Same shape as
   * customer auth's `login()`: simulated network delay + a small chance to
   * reject, so the login form's error state has something real to exercise.
   */
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue>();

const STORAGE_KEY = "charmiss:admin:auth";

function readInitial(): AdminSession | null {
  if (isServer) return null;
  try {
    return localStorage.getItem(STORAGE_KEY) ? MOCK_ADMIN : null;
  } catch {
    return null;
  }
}

export function AdminAuthProvider(props: { children: JSX.Element }) {
  // Same SSR-safe hydration fix as the customer AuthProvider: start signed
  // out on both server and client, then read the real persisted session in
  // `onMount`, strictly after hydration.
  const [admin, setAdmin] = createSignal<AdminSession | null>(null);
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    setAdmin(readInitial());
    setReady(true);
  });

  const login: AdminAuthContextValue["login"] = async (_email, _password) => {
    await new Promise((resolve) => setTimeout(resolve, 450 + Math.random() * 250));
    if (Math.random() < 0.06) {
      throw new Error("ADMIN_LOGIN_FAILED");
    }
    setAdmin(MOCK_ADMIN);
    if (!isServer) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // storage can be unavailable (private mode / quota) — session just stays in-memory for this tab.
      }
    }
  };

  const logout = () => {
    setAdmin(null);
    if (!isServer) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isReady: ready,
        admin,
        isAuthenticated: () => admin() !== null,
        login,
        logout,
      }}
    >
      {props.children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
