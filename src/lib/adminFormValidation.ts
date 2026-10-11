import { pushToast } from "./toast";

/**
 * The one "ข้อมูลยังไม่ครบ" behaviour every Admin create / edit form uses.
 *
 * - Each form keeps its errors as `Record<fieldKey, message>` and marks the
 *   matching field's wrapper (or input) with `data-field="fieldKey"`.
 * - On save, `reportFormErrors(errors, labels)` returns `true` when there are
 *   errors: it shows an error toast ("ยังกรอกข้อมูลไม่ครบ N รายการ" + the field
 *   names) and scrolls to the first broken field on the page.
 * - `<FormErrorSummary>` (components/admin) lists the same fields at the top
 *   of the form; each name scrolls to its field.
 * - Forms clear a field's error as soon as it's fixed (`clearFieldError`).
 */
export type FormErrors = Record<string, string>;

/** Room for the sticky Admin top bar when scrolling a field into view. */
const TOP_OFFSET = 96;

/** Scrolls to (and focuses, when it can) the field marked `data-field={key}`, else the first `aria-invalid` field. */
export function scrollToField(key?: string): boolean {
  if (typeof document === "undefined") return false;
  const el =
    (key ? document.querySelector<HTMLElement>(`[data-field="${CSS.escape(key)}"]`) : null) ??
    document.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!el) return false;
  const top = el.getBoundingClientRect().top + window.scrollY - TOP_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  const focusable = el.matches("input, select, textarea, [contenteditable='true']")
    ? el
    : el.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable='true']");
  focusable?.focus({ preventScroll: true });
  return true;
}

/** The first errored field in page order (so the scroll lands on the topmost one, not the first key in the object). */
function firstFieldInPageOrder(keys: string[]): string | undefined {
  if (typeof document === "undefined") return keys[0];
  const found = keys
    .map((key) => ({ key, el: document.querySelector<HTMLElement>(`[data-field="${CSS.escape(key)}"]`) }))
    .filter((x): x is { key: string; el: HTMLElement } => !!x.el)
    .sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  return found[0]?.key ?? keys[0];
}

/**
 * Call after setting the form's errors. Returns `true` (and tells the admin
 * what's missing) when the form must not be saved.
 */
export function reportFormErrors(errors: FormErrors, labels: Record<string, string> = {}): boolean {
  const keys = Object.keys(errors);
  if (keys.length === 0) return false;
  const names = keys.map((k) => labels[k] ?? errors[k]);
  pushToast(`ยังกรอกข้อมูลไม่ครบ ${keys.length} รายการ`, "error", names.join(", "));
  // After the errors render (red borders / messages), so the scroll target and aria-invalid exist.
  setTimeout(() => scrollToField(firstFieldInPageOrder(keys)), 0);
  return true;
}

/** Drops one field's error once it's been fixed (keeps the others). */
export function clearFieldError(errors: FormErrors, key: string): FormErrors {
  if (!(key in errors)) return errors;
  const { [key]: _fixed, ...rest } = errors;
  return rest;
}
