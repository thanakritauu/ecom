/** Thai mobile number, with or without dashes, e.g. "081-234-5678" or "0812345678". */
export const PHONE_PATTERN = /^0\d{1,2}-?\d{3}-?\d{4}$/;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let validationFocusAt = 0;
/** True right after `focusFirstInvalid` moved focus (so a focus-in handler shouldn't scroll again). */
export const isValidationFocus = () => Date.now() - validationFocusAt < 500;

/**
 * Submit with errors → bring the first invalid field (DOM order = reading order) into view and focus it.
 * Every field marks itself `aria-invalid` (see `TextField`), so this works for any form without a field list.
 * Scrolls to the field's label, clear of the sticky header (which slides back in on an upward scroll).
 * Returns false when nothing in `root` is invalid.
 */
export function focusFirstInvalid(root: ParentNode = document): boolean {
  const invalid = Array.from(root.querySelectorAll<HTMLElement>('[aria-invalid="true"]'));
  if (invalid.length === 0) return false;
  // A disabled select (e.g. อำเภอ before จังหวัด) can't take focus — scroll to it, focus the next one that can.
  const target = invalid[0];
  const focusable = invalid.find((el) => !(el as HTMLInputElement).disabled);
  const anchor = (target.id && document.querySelector<HTMLElement>(`label[for="${CSS.escape(target.id)}"]`)) || target;
  const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
  const top = anchor.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  // Flag for focus-in scroll helpers (the address form's keyboard nudge) — this scroll already placed the field.
  validationFocusAt = Date.now();
  focusable?.focus({ preventScroll: true });
  return true;
}
