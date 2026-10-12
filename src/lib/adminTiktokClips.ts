import { createSignal, onMount } from "solid-js";
import { isServer } from "solid-js/web";
import { TIKTOK_REVIEW_CLIPS } from "./tiktokReviews";
import { normalizeSkuRefs, skuRefsFromProductIds, type ProductSkuRef } from "./productSkuRef";

/**
 * "คลิปรีวิว TikTok": the clips the PDP and Home's #CharmissReviews rail show.
 * Seeded from `tiktokReviews.ts`; the storefront reads this store's key live
 * (`storefrontTiktokClips.ts`: active clips, in this order).
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
  /** Products whose PDP shows this clip first. Empty = Home rail / other PDPs only. Kept equal to the ids in `products` (older readers). */
  productIds: string[];
  /**
   * The same links per SKU: empty `variantIds` = the whole product, else only
   * those options (their PDP shows it first while that option is picked).
   * Always set after normalizing; filled from `productIds` for older records.
   */
  products?: ProductSkuRef[];
  /** Off = hidden everywhere on the storefront. Always false while `draft`. */
  active: boolean;
  /**
   * Draft-first rule: a new clip is saved as แบบร่าง (only a title needed,
   * the link may still be blank) and never shows on the storefront until its
   * first publish. Optional so clips saved before drafts read as published.
   */
  draft?: boolean;
};

export function buildMockTiktokClips(): AdminTiktokClip[] {
  return TIKTOK_REVIEW_CLIPS.map((clip) => ({
    id: `clip-${clip.videoId}`,
    videoId: clip.videoId,
    author: clip.author,
    title: clip.title,
    productIds: clip.productIds ?? [],
    products: skuRefsFromProductIds(clip.productIds),
    active: true,
  }));
}

/** Reads `@handle` + video id out of a pasted TikTok link; `undefined` when it isn't one. */
export function parseTiktokUrl(url: string): { author: string; videoId: string } | undefined {
  const match = url.trim().match(/tiktok\.com\/@([\w.-]+)\/video\/(\d+)/i);
  return match ? { author: match[1], videoId: match[2] } : undefined;
}

export const tiktokClipUrl = (clip: Pick<AdminTiktokClip, "author" | "videoId">) => `https://www.tiktok.com/@${clip.author}/video/${clip.videoId}`;

export const TIKTOK_CLIPS_STORAGE_KEY = "charmiss:admin:tiktok-clips";
const STORAGE_KEY = TIKTOK_CLIPS_STORAGE_KEY;
const SEED_VERSION_KEY = "charmiss:admin:tiktok-clips:seed-version";
const SEED_VERSION = 1;
/** Fired after every save so the storefront rails in the same tab refresh (other tabs get `storage`). */
export const TIKTOK_CLIPS_CHANGED_EVENT = "charmiss:tiktok-clips-changed";

/** `products` wins; a record without it reads its `productIds` as whole-product links. */
function clipProducts(c: Partial<AdminTiktokClip>): ProductSkuRef[] {
  return Array.isArray(c.products) ? normalizeSkuRefs(c.products) : skuRefsFromProductIds(Array.isArray(c.productIds) ? c.productIds.filter((x) => typeof x === "string") : []);
}

function normalizeClip(c: Partial<AdminTiktokClip> & { id: string }): AdminTiktokClip {
  const products = clipProducts(c);
  return {
    id: c.id,
    videoId: c.videoId ?? "",
    author: c.author ?? "",
    title: c.title ?? "",
    coverUrl: c.coverUrl || undefined,
    productIds: products.map((r) => r.productId),
    products,
    draft: c.draft === true,
    // A draft is never live, whatever `active` says.
    active: c.draft === true ? false : c.active !== false,
  };
}

/**
 * What a draft clip still lacks before it can go live (same checks as the
 * editor's บันทึกและเผยแพร่), as field names for the เผยแพร่ toast. Empty =
 * ready to publish.
 */
export function tiktokClipPublishProblems(clip: AdminTiktokClip, all: AdminTiktokClip[]): string[] {
  const problems: string[] = [];
  if (!clip.videoId || !clip.author || all.some((c) => c.id !== clip.id && c.videoId === clip.videoId)) problems.push("ลิงก์คลิป TikTok");
  if (!clip.title.trim()) problems.push("ชื่อคลิป");
  return problems;
}

/** The saved clip list, or the seed when nothing (or an older version) is stored. Shared by Admin and the storefront reader. */
export function readStoredTiktokClips(): AdminTiktokClip[] {
  if (isServer) return buildMockTiktokClips();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const version = Number(localStorage.getItem(SEED_VERSION_KEY) ?? 0);
    // No migrations yet — a stored copy from an unknown/older version just falls back to the seed.
    if (raw && version === SEED_VERSION) return (JSON.parse(raw) as AdminTiktokClip[]).map(normalizeClip);
  } catch {
    // storage unavailable — seed.
  }
  return buildMockTiktokClips();
}

const [clips, setClips] = createSignal<AdminTiktokClip[]>(buildMockTiktokClips());
let hydrated = false;

function hydrate() {
  if (hydrated || isServer) return;
  hydrated = true;
  setClips(readStoredTiktokClips());
}

function mutate(fn: (list: AdminTiktokClip[]) => AdminTiktokClip[]) {
  const next = fn(clips()).map(normalizeClip);
  setClips(next);
  if (isServer) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
  } catch {}
  window.dispatchEvent(new Event(TIKTOK_CLIPS_CHANGED_EVENT));
}

const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 350 + Math.random() * 250));
let nextId = 1;

export type TiktokClipInput = Omit<AdminTiktokClip, "id">;

/**
 * Links exactly `clipIds` to this product and unlinks every other clip from
 * it (Admin product form, "คลิปรีวิว TikTok"; applied when the product is saved).
 */
export function setProductTiktokClips(productId: string, clipIds: string[]) {
  hydrate();
  const want = new Set(clipIds);
  mutate((list) =>
    list.map((c) => {
      const refs = c.products ?? skuRefsFromProductIds(c.productIds);
      const has = refs.some((r) => r.productId === productId);
      if (want.has(c.id) === has) return c;
      // Linking from the product form = the whole product; unlinking drops that product's link (whatever SKUs it had).
      const products = has ? refs.filter((r) => r.productId !== productId) : [...refs, { productId, variantIds: [] }];
      return { ...c, products, productIds: products.map((r) => r.productId) };
    }),
  );
}

/**
 * Keeps `products` and `productIds` in step for a save: an input with
 * `products` wins (ids follow); one with only `productIds` (an editor that
 * doesn't pick SKUs) keeps the SKU picks the clip already had for products
 * still linked and adds the rest as whole products.
 */
function withProducts(input: TiktokClipInput, prev?: AdminTiktokClip): TiktokClipInput {
  if (input.products) {
    const products = normalizeSkuRefs(input.products);
    return { ...input, products, productIds: products.map((r) => r.productId) };
  }
  const before = prev?.products ?? [];
  const products = input.productIds.map((productId) => before.find((r) => r.productId === productId) ?? { productId, variantIds: [] });
  return { ...input, products, productIds: products.map((r) => r.productId) };
}

export function useAdminTiktokClips() {
  onMount(hydrate);
  return {
    clips,
    getById: (id: string) => clips().find((c) => c.id === id),
    /** Clips linked to this product — the ones its PDP shows first (storefront: `tiktokClipsForProduct`). */
    clipsForProduct: (productId: string) => clips().filter((c) => (c.products ?? skuRefsFromProductIds(c.productIds)).some((r) => r.productId === productId)),
    /** Resolves to the clip's id (the new id when adding). */
    saveClip: async (id: string | null, input: TiktokClipInput): Promise<string> => {
      await simulateDelay();
      if (id) {
        mutate((list) => list.map((c) => (c.id === id ? { ...c, ...withProducts(input, c) } : c)));
        return id;
      }
      const newId = `clip-new-${Date.now()}-${nextId++}`;
      mutate((list) => [...list, { ...withProducts(input), id: newId }]);
      return newId;
    },
    removeClip: async (id: string) => {
      await simulateDelay();
      mutate((list) => list.filter((c) => c.id !== id));
    },
    /** แสดง / ไม่แสดง for a published clip; a draft goes live only through `publishClip`. */
    setActive: (id: string, active: boolean) => mutate((list) => list.map((c) => (c.id === id && !c.draft ? { ...c, active } : c))),
    /** Draft-first: a draft's first publish (shown on the storefront). The caller runs the publish checks first. */
    publishClip: (id: string) => mutate((list) => list.map((c) => (c.id === id ? { ...c, draft: false, active: true } : c))),
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
