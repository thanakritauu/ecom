import { useAdminUI, type AdminLanguage } from "~/lib/adminUI";

const OPTIONS: { value: AdminLanguage; label: string }[] = [
  { value: "th", label: "ไทย" },
  { value: "en", label: "English" },
];

/**
 * Global UI Correction #8 — a global Admin UI control, not tied to any one
 * page. Prototype scope: switches the active-state UI here and persists the
 * choice (adminUI.tsx), with no full translation system behind it yet — a
 * simple structure later phases can extend without a large i18n rewrite.
 *
 * Final UI & Regression Overrides #4: this renders to the exact same 44px
 * height / pill radius / `bg-surface-gray` surface as `ADMIN_TOPBAR_CONTROL_CLASS`
 * (adminTopbarControls.ts, used by AdminUserMenu) — `p-1` container +
 * `min-h-9` toggle buttons is just how a two-option segmented control reaches
 * that same 44px total, since (unlike a single trigger) it needs two
 * independently-highlightable regions inside one surface.
 */
export function LanguageSwitcher(props: { class?: string }) {
  const ui = useAdminUI();

  return (
    <div class={`flex items-center rounded-pill bg-surface-gray p-1 text-sm font-medium ${props.class ?? ""}`} role="group" aria-label="เปลี่ยนภาษา">
      {OPTIONS.map((opt) => (
        <button
          type="button"
          aria-pressed={ui.language() === opt.value}
          onClick={() => ui.setLanguage(opt.value)}
          class={`min-h-9 whitespace-nowrap rounded-pill px-3 transition-colors duration-150 ${
            ui.language() === opt.value ? "bg-brand-pink text-white" : "text-ink-gray hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
