/**
 * One-time pass over everything the prototype keeps in localStorage
 * (`charmiss:*`): text saved before the human-copy rule (seed copies, Admin
 * edits, past orders) still carries em dashes, arrows and middle dots, and
 * those stores only re-seed when their own SEED_VERSION moves. Runs from
 * `entry-client.tsx` before anything mounts, so every store reads the
 * cleaned value. Only string values change; ids/keys/numbers are untouched.
 * Card masks (••••) are kept.
 */
const DONE_KEY = "charmiss:copy-cleanup:v1";

export function cleanCopy(text: string): string {
  return text
    .replace(/\s*—\s*/g, " ")
    .replace(/–/g, "-")
    .replace(/\s*→\s*/g, " ")
    .replace(/\s*›\s*/g, " ")
    .replace(/\s*·\s*/g, " ")
    .replace(/…/g, "...")
    .replace(/[“”]/g, '"')
    .replace(/[⚠🎉👋]️?\s*/gu, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

const MARKS = /[—–→›·…“”⚠🎉👋]/u;

function cleanValue(value: unknown): unknown {
  if (typeof value === "string") return MARKS.test(value) ? cleanCopy(value) : value;
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanValue(v)]));
  }
  return value;
}

export function runLegacyCopyCleanup() {
  try {
    if (localStorage.getItem(DONE_KEY)) return;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("charmiss:")) continue;
      const raw = localStorage.getItem(key);
      if (!raw || !MARKS.test(raw)) continue;
      try {
        localStorage.setItem(key, JSON.stringify(cleanValue(JSON.parse(raw))));
      } catch {
        // Not JSON (a plain string value).
        localStorage.setItem(key, cleanCopy(raw));
      }
    }
    localStorage.setItem(DONE_KEY, "1");
  } catch {
    // Storage unavailable; nothing to clean.
  }
}
