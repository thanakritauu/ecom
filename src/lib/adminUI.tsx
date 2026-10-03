import { createContext, createSignal, onMount, useContext, type JSX } from "solid-js";
import { isServer } from "solid-js/web";

export type AdminLanguage = "th" | "en";
export type AdminThemeMode = "light" | "dark";

type AdminUIContextValue = {
  sidebarCollapsed: () => boolean;
  toggleSidebarCollapsed: () => void;
  language: () => AdminLanguage;
  setLanguage: (lang: AdminLanguage) => void;
  themeMode: () => AdminThemeMode;
  setThemeMode: (mode: AdminThemeMode) => void;
};

const AdminUIContext = createContext<AdminUIContextValue>();

const COLLAPSED_KEY = "charmiss:admin:ui:sidebarCollapsed";
const LANGUAGE_KEY = "charmiss:admin:ui:language";
/** CMS + Frontend Final Refinement §9 — Charmiss CMS only, never read/written by the Customer Frontend. */
const THEME_KEY = "charmiss:admin:ui:themeMode";

/**
 * Global Admin UI preferences (Global UI Correction #5/#8) — sidebar
 * collapse state and the language switcher's selection. Both are plain UI
 * state with no backend, so a signal + localStorage is enough (same
 * SSR-safe hydration pattern as adminAuth.tsx: start from a deterministic
 * default on server and first client render, then read the persisted value
 * in `onMount`, strictly after hydration, to avoid a mismatch flash).
 */
export function AdminUIProvider(props: { children: JSX.Element }) {
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);
  const [language, setLanguageSignal] = createSignal<AdminLanguage>("th");
  const [themeMode, setThemeModeSignal] = createSignal<AdminThemeMode>("light");

  onMount(() => {
    try {
      if (localStorage.getItem(COLLAPSED_KEY) === "1") setSidebarCollapsed(true);
      const storedLang = localStorage.getItem(LANGUAGE_KEY);
      if (storedLang === "th" || storedLang === "en") setLanguageSignal(storedLang);
      const storedTheme = localStorage.getItem(THEME_KEY);
      if (storedTheme === "light" || storedTheme === "dark") setThemeModeSignal(storedTheme);
    } catch {
      // storage can be unavailable (private mode / quota) — preferences just stay in-memory for this tab.
    }
  });

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((v) => {
      const next = !v;
      if (!isServer) {
        try {
          localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
        } catch {}
      }
      return next;
    });
  };

  const setLanguage = (lang: AdminLanguage) => {
    setLanguageSignal(lang);
    if (!isServer) {
      try {
        localStorage.setItem(LANGUAGE_KEY, lang);
      } catch {}
    }
  };

  const setThemeMode = (mode: AdminThemeMode) => {
    setThemeModeSignal(mode);
    if (!isServer) {
      try {
        localStorage.setItem(THEME_KEY, mode);
      } catch {}
    }
  };

  return (
    <AdminUIContext.Provider
      value={{ sidebarCollapsed, toggleSidebarCollapsed, language, setLanguage, themeMode, setThemeMode }}
    >
      {props.children}
    </AdminUIContext.Provider>
  );
}

export function useAdminUI() {
  const ctx = useContext(AdminUIContext);
  if (!ctx) throw new Error("useAdminUI must be used within AdminUIProvider");
  return ctx;
}
