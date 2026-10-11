import type { FormErrors } from "./adminFormValidation";

/**
 * Drawers and dialogs scroll inside their own body, not the window, so the
 * shared `reportFormErrors` page scroll can't reach their fields. Call this
 * right after it with the drawer's scrolling body: it brings the topmost
 * broken field (`data-field`) into view inside that body.
 */
export function scrollToFirstErrorIn(container: HTMLElement | undefined, errors: FormErrors) {
  if (!container) return;
  setTimeout(() => {
    const first = Array.from(container.querySelectorAll<HTMLElement>("[data-field]")).find((el) => (el.dataset.field ?? "") in errors);
    if (!first) return;
    first.scrollIntoView({ block: "center", behavior: "smooth" });
    const focusable = first.matches("input, select, textarea") ? first : first.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])");
    focusable?.focus({ preventScroll: true });
  }, 0);
}
