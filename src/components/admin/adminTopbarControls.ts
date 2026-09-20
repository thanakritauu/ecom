/**
 * Final UI & Regression Overrides #4 — Admin User and Language must render
 * from the same padding/height/radius/surface scale, not two hand-tuned
 * values that happen to look similar. This is that one shared token:
 * `h-11` (44px, matches Bell's `size-11`), `px-3` horizontal padding,
 * `rounded-pill`, `bg-surface-gray` surface. AdminUserMenu's trigger uses it
 * directly; LanguageSwitcher's toggle reaches the same 44px/pill/surface-gray
 * result through its own container+two-buttons structure (a segmented
 * control has no single element to attach one shared class to), so the
 * values below are the definition either way — changing this changes both.
 */
export const ADMIN_TOPBAR_CONTROL_CLASS =
  "flex h-11 items-center gap-2 rounded-pill bg-surface-gray px-3 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-gray/70";
