import { query } from "@solidjs/router";
import { TIKTOK_REVIEW_CLIPS, tiktokVideoUrl, type TikTokReviewClip } from "./tiktokReviews";

/** A clip Admin added (not in the seed list) whose cover should be looked up too. */
export type PosterClip = Pick<TikTokReviewClip, "videoId" | "author">;
const MAX_EXTRA_CLIPS = 30;

/**
 * Cover images for the TikTok review clips, so the rails can show a poster
 * and load TikTok's player only when a clip is tapped (8 eager players per
 * page got the site's visitors rate-limited/blocked by TikTok's bot
 * protection, and made Home/PDP heavy).
 *
 * Runs on the server only: the browser never calls TikTok's oEmbed. Cover
 * URLs are signed and expire (`x-expires`), so they can't be hard-coded —
 * each is cached in memory until shortly before it expires (max 6h), fetched
 * 2 at a time to stay under oEmbed's rate limit. A failed lookup keeps the
 * last good cover, or returns none (the card then shows a titled TikTok
 * tile), and isn't retried for 15 minutes — TikTok's edge (Akamai) answers
 * bursts with 403s, so retrying on every page view would only extend a block.
 */
type PosterEntry = { url: string; expiresAt: number };

const CACHE = new Map<string, PosterEntry>();
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const EXPIRY_MARGIN_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;
const RETRY_AFTER_FAILURE_MS = 15 * 60 * 1000;
const FAILED_UNTIL = new Map<string, number>();

async function fetchPoster(clip: PosterClip): Promise<PosterEntry | undefined> {
  const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokVideoUrl(clip))}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return undefined;
  const data = (await res.json()) as { thumbnail_url?: string };
  if (!data.thumbnail_url) return undefined;
  const signedExpiry = Number(new URL(data.thumbnail_url).searchParams.get("x-expires")) * 1000;
  const expiresAt = Math.min(Date.now() + MAX_AGE_MS, signedExpiry ? signedExpiry - EXPIRY_MARGIN_MS : Infinity);
  return { url: data.thumbnail_url, expiresAt };
}

export const getTikTokPosters = query(async (extra: PosterClip[] = []): Promise<Record<string, string>> => {
  "use server";
  const now = Date.now();
  // Admin-added clips arrive from the browser: only well-formed TikTok ids/handles, capped.
  const safeExtra = (Array.isArray(extra) ? extra : [])
    .filter((c) => /^\d{8,25}$/.test(String(c?.videoId)) && /^[\w.-]{1,40}$/.test(String(c?.author)))
    .slice(0, MAX_EXTRA_CLIPS)
    .map((c) => ({ videoId: String(c.videoId), author: String(c.author) }));
  const byId = new Map<string, PosterClip>([...TIKTOK_REVIEW_CLIPS, ...safeExtra].map((c) => [c.videoId, c]));
  const stale = [...byId.values()].filter(
    (c) => (CACHE.get(c.videoId)?.expiresAt ?? 0) <= now && (FAILED_UNTIL.get(c.videoId) ?? 0) <= now,
  );
  for (let i = 0; i < stale.length; i += 2) {
    await Promise.all(
      stale.slice(i, i + 2).map(async (clip) => {
        const id = clip.videoId;
        const entry = await fetchPoster(clip).catch(() => undefined);
        if (entry) {
          CACHE.set(id, entry);
          FAILED_UNTIL.delete(id);
        } else {
          FAILED_UNTIL.set(id, now + RETRY_AFTER_FAILURE_MS);
        }
      }),
    );
  }
  return Object.fromEntries([...CACHE].filter(([id]) => byId.has(id)).map(([id, entry]) => [id, entry.url]));
}, "tiktok-posters");
