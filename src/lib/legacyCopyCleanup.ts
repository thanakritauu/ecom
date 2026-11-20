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
  runPointsWordingCleanup();
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

/**
 * Charmiss Coin was renamed คะแนน Charmiss Club ("คอยน์" → "คะแนน"): text saved before that (Admin's
 * homepage and popup copy, past orders) gets the same rename once, like the pass above.
 */
const POINTS_DONE_KEY = "charmiss:points-wording:v1";
const COIN_WORDS = /คอยน์|Charmiss Coin/;

export function renameCoinWording(text: string): string {
  return text
    .replace(/([฀-๿]) Charmiss Coins?\b/g, "$1คะแนน Charmiss Club")
    .replace(/Charmiss Coins?\b/g, "คะแนน Charmiss Club")
    .replace(/คอยน์/g, "คะแนน");
}

function renameValue(value: unknown): unknown {
  if (typeof value === "string") return COIN_WORDS.test(value) ? renameCoinWording(value) : value;
  if (Array.isArray(value)) return value.map(renameValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, renameValue(v)]));
  return value;
}

function runPointsWordingCleanup() {
  try {
    if (localStorage.getItem(POINTS_DONE_KEY)) return;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("charmiss:")) continue;
      const raw = localStorage.getItem(key);
      if (!raw || !COIN_WORDS.test(raw)) continue;
      try {
        localStorage.setItem(key, JSON.stringify(renameValue(JSON.parse(raw))));
      } catch {
        localStorage.setItem(key, renameCoinWording(raw));
      }
    }
    localStorage.setItem(POINTS_DONE_KEY, "1");
  } catch {
    // Storage unavailable; nothing to rename.
  }
}
