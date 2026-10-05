import { createSignal, onMount } from "solid-js";
import { isServer } from "solid-js/web";
import { TIKTOK_REVIEW_CLIPS } from "./tiktokReviews";

/**
 * "คลิปรีวิว TikTok" — Admin's mock management of the clips the PDP and
 * Home's #CharmissReviews rail show (storefront: `tiktokReviews.ts` +
 * `TikTokReviewRail`). Seeded from the storefront's own clip list; the
 * storefront still reads `tiktokReviews.ts` directly, so edits here are a
 * mock of what a CMS-backed list would look like, not yet live.
 *
 * Kept as a module-level store (no Provider) so it works without a new
 * provider in `routes/admin.tsx` — same localStorage + seed-version pattern
 * as `adminProductStore.tsx`.
 */
export type AdminTiktokClip = {
  id: string;
  /** The number at the end of the TikTok URL (`tiktok.com/@handle/video/<id>`). */
  videoId: string;
  /** Creator handle, without the "@". */
  author: string;
  title: string;
  /** Uploaded cover. Unset = the cover TikTok returns for this video (seed clips only — see tiktokPosters.ts). */
  coverUrl?: string;
  /** Products whose PDP shows this clip first. Empty = Home rail / other PDPs only. */
  productIds: string[];
  /** Off = hidden everywhere on the storefront. */
  active: boolean;
};

export function buildMockTiktokClips(): AdminTiktokClip[] {
  return TIKTOK_REVIEW_CLIPS.map((clip) => ({
    id: `clip-${clip.videoId}`,
    videoId: clip.videoId,
    author: clip.author,
    title: clip.title,
    productIds: clip.productIds ?? [],
    active: true,
  }));
}

/** Reads `@handle` + video id out of a pasted TikTok link; `undefined` when it isn't one. */
export function parseTiktokUrl(url: string): { author: string; videoId: string } | undefined {
  const match = url.trim().match(/tiktok\.com\/@([\w.-]+)\/video\/(\d+)/i);
  return match ? { author: match[1], videoId: match[2] } : undefined;
}

export const tiktokClipUrl = (clip: Pick<AdminTiktokClip, "author" | "videoId">) => `https://www.tiktok.com/@${clip.author}/video/${clip.videoId}`;

const STORAGE_KEY = "charmiss:admin:tiktok-clips";
const SEED_VERSION_KEY = "charmiss:admin:tiktok-clips:seed-version";
const SEED_VERSION = 1;

function normalizeClip(c: Partial<AdminTiktokClip> & { id: string }): AdminTiktokClip {
  return {
    id: c.id,
    videoId: c.videoId ?? "",
    author: c.author ?? "",
    title: c.title ?? "",
    coverUrl: c.coverUrl || undefined,
    productIds: Array.isArray(c.productIds) ? c.productIds : [],
    active: c.active !== false,
  };
}

const [clips, setClips] = createSignal<AdminTiktokClip[]>(buildMockTiktokClips());
let hydrated = false;

function hydrate() {
  if (hydrated || isServer) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const version = Number(localStorage.getItem(SEED_VERSION_KEY) ?? 0);
    // No migrations yet — a stored copy from an unknown/older version just falls back to the seed.
    if (raw && version === SEED_VERSION) setClips((JSON.parse(raw) as AdminTiktokClip[]).map(normalizeClip));
  } catch {
    // storage unavailable — stays in-memory for this tab.
  }
}

function mutate(fn: (list: AdminTiktokClip[]) => AdminTiktokClip[]) {
  const next = fn(clips()).map(normalizeClip);
  setClips(next);
  if (isServer) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
  } catch {}
}

const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 350 + Math.random() * 250));
let nextId = 1;

export type TiktokClipInput = Omit<AdminTiktokClip, "id">;

export function useAdminTiktokClips() {
  onMount(hydrate);
  return {
    clips,
    getById: (id: string) => clips().find((c) => c.id === id),
    /** Clips linked to this product — the ones its PDP shows first (storefront: `tiktokClipsForProduct`). */
    clipsForProduct: (productId: string) => clips().filter((c) => c.productIds.includes(productId)),
    saveClip: async (id: string | null, input: TiktokClipInput) => {
      await simulateDelay();
      if (id) mutate((list) => list.map((c) => (c.id === id ? { ...c, ...input } : c)));
      else mutate((list) => [...list, { ...input, id: `clip-new-${Date.now()}-${nextId++}` }]);
    },
    removeClip: async (id: string) => {
      await simulateDelay();
      mutate((list) => list.filter((c) => c.id !== id));
    },
    setActive: (id: string, active: boolean) => mutate((list) => list.map((c) => (c.id === id ? { ...c, active } : c))),
    move: (index: number, delta: number) =>
      mutate((list) => {
        const target = index + delta;
        if (target < 0 || target >= list.length) return list;
        const next = [...list];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      }),
  };
}
