/**
 * CHARMISS CMS — REAL-TIME LIVE PREVIEW SYSTEM §11/§14 — the bridge that
 * lets Full Page Preview open a real Frontend page render for content that
 * hasn't been saved yet (no id in the real store). Not a backend/API: it's
 * `sessionStorage`, which a tab opened via `window.open()` from the same
 * page already shares with its opener — the exact "existing state" the
 * phase spec requires, nothing new invented. Entries are short-lived on
 * purpose (session-scoped, gone when the browser session ends) since a
 * draft preview is never meant to be a durable record.
 */
const PREFIX = "charmiss:admin:preview-draft:";

export function writePreviewDraft<T>(kind: string, data: T): string | undefined {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    sessionStorage.setItem(`${PREFIX}${kind}:${id}`, JSON.stringify(data));
    return id;
  } catch {
    // sessionStorage unavailable (private mode / quota) — caller should fall back to a saved-data-only preview, if any.
    return undefined;
  }
}

export function readPreviewDraft<T>(kind: string, id: string | null | undefined): T | undefined {
  if (!id) return undefined;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${kind}:${id}`);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}
