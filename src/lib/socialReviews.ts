import ugc1 from "~/assets/images/reviews/ugc-1.png";
import ugc2 from "~/assets/images/reviews/ugc-2.png";
import ugc3 from "~/assets/images/reviews/ugc-3.png";
import productLipTintMain from "~/assets/images/products/product-lip-tint-main.png";
import productCushionHero from "~/assets/images/hero/hero-banner-1.png";
import productCushionMain from "~/assets/images/account/order-item-blush.png";

/**
 * Phase 03 — Social Review source layer (Instagram / TikTok).
 *
 * There is no Instagram/TikTok integration (or any backend) in this project
 * yet, so this file defines only:
 *   1. `SocialReview` — the ONE normalized shape every consumer reads. Admin
 *      and the PDP never see provider-specific data.
 *   2. `SocialReviewProvider` — the adapter contract each platform
 *      implements (`listReviews` / `getReviewById`).
 *   3. Mock adapters for development, clearly marked as such.
 *
 * Real adapters are intentionally NOT written: endpoints, auth and response
 * shapes must come from the actual API setup, not be guessed. When they
 * exist they must run server-side (SolidStart `"use server"` functions) —
 * access tokens/app secrets never go in client code — map the platform's
 * response into `SocialReview`, and replace the mock in `SOCIAL_REVIEW_PROVIDERS`.
 * Nothing else (Admin, PDP) needs to change.
 */

export type SocialProvider = "instagram" | "tiktok";

export const SOCIAL_PROVIDER_META: Record<SocialProvider, { label: string }> = {
  instagram: { label: "Instagram" },
  tiktok: { label: "TikTok" },
};

export type SocialReview = {
  /** `${provider}:${externalId}` — unique across providers. */
  id: string;
  provider: SocialProvider;
  /** The platform's own post/video id. */
  externalId: string;
  /** Real catalog product id — from the platform (e.g. a product tag) or `SOCIAL_CONTENT_PRODUCT_MAP`. Unset = not mapped yet. */
  productId?: string;
  author: string;
  avatarUrl?: string;
  content: string;
  mediaType: "image" | "video";
  /** Direct media URL as returned by the provider — used only when the provider allows direct playback/display. */
  mediaUrl?: string;
  thumbnailUrl?: string;
  /** Link to the original post. */
  permalink?: string;
  /** ISO 8601. */
  publishedAt: string;
  /** 1–5, only when the source carries one. */
  rating?: number;
};

export interface SocialReviewProvider {
  provider: SocialProvider;
  /** `false` = mock/dev data; real credentials/config not set up yet. */
  configured: boolean;
  listReviews(): Promise<SocialReview[]>;
  getReviewById(externalId: string): Promise<SocialReview | undefined>;
}

/**
 * Product mapping layer — social posts usually carry no product id, so
 * `${provider}:${externalId}` → real catalog product id lives here
 * (config, not a fake id on the post). A provider-supplied `productId`
 * always wins. Every id here must exist in `products.ts`.
 */
export const SOCIAL_CONTENT_PRODUCT_MAP: Record<string, string> = {
  "instagram:mock-ig-1002": "best-1",
  "tiktok:mock-tt-2001": "feature-1",
  "tiktok:mock-tt-2002": "best-1",
  "tiktok:mock-tt-2003": "feature-1",
};

export function withProductMapping(review: SocialReview): SocialReview {
  return review.productId ? review : { ...review, productId: SOCIAL_CONTENT_PRODUCT_MAP[review.id] };
}

/**
 * Runtime guard for anything that crosses a storage/API boundary — a
 * malformed or partially-deleted entry is dropped (returns `undefined`)
 * instead of crashing whoever renders it.
 */
export function normalizeSocialReview(raw: unknown): SocialReview | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Partial<SocialReview>;
  if (r.provider !== "instagram" && r.provider !== "tiktok") return undefined;
  if (typeof r.externalId !== "string" || !r.externalId) return undefined;
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  return {
    id: `${r.provider}:${r.externalId}`,
    provider: r.provider,
    externalId: r.externalId,
    productId: str(r.productId),
    author: str(r.author) ?? SOCIAL_PROVIDER_META[r.provider].label,
    avatarUrl: str(r.avatarUrl),
    content: typeof r.content === "string" ? r.content : "",
    mediaType: r.mediaType === "video" ? "video" : "image",
    mediaUrl: str(r.mediaUrl),
    thumbnailUrl: str(r.thumbnailUrl),
    permalink: str(r.permalink),
    publishedAt: str(r.publishedAt) ?? new Date(0).toISOString(),
    rating: typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5 ? r.rating : undefined,
  };
}

// ---------------------------------------------------------------------------
// Mock adapters (development only). Media reuses images already bundled in
// this project — no remote media is copied in. No permalinks: there are no
// real post URLs to point at, and inventing one would be a fake link.
// ---------------------------------------------------------------------------

type MockEntry = Omit<SocialReview, "id" | "provider">;

function createMockProvider(provider: SocialProvider, entries: MockEntry[]): SocialReviewProvider {
  const list = () => entries.map((e) => withProductMapping({ ...e, id: `${provider}:${e.externalId}`, provider }));
  const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 300 + Math.random() * 300));
  return {
    provider,
    configured: false,
    async listReviews() {
      await delay();
      return list();
    },
    async getReviewById(externalId) {
      await delay();
      return list().find((r) => r.externalId === externalId);
    },
  };
}

export const MOCK_INSTAGRAM_REVIEWS: MockEntry[] = [
  {
    externalId: "mock-ig-1001",
    productId: "best-1",
    author: "ปาล์มมี่ ก.",
    content: "ทินท์ตัวนี้เนื้อฉ่ำ ไม่เหนียว สีชัดตั้งแต่ปาดแรก ติดทนทั้งวัน ✨",
    mediaType: "image",
    thumbnailUrl: ugc1,
    publishedAt: "2026-09-12T10:00:00.000Z",
    rating: 5,
  },
  {
    externalId: "mock-ig-1002",
    author: "Nutcha S.",
    content: "ลิปทินท์สีสวยมาก ฉ่ำวาว ติดทนจริง กินข้าวแล้วยังอยู่ 💖",
    mediaType: "image",
    thumbnailUrl: ugc2,
    publishedAt: "2026-09-08T08:30:00.000Z",
    rating: 5,
  },
  {
    externalId: "mock-ig-1003",
    author: "ฝ้าย ธ.",
    content: "แพ็กเกจน่ารักมาก ซื้อมาเป็นของขวัญ เพื่อนชอบมาก",
    mediaType: "image",
    thumbnailUrl: ugc3,
    publishedAt: "2026-09-01T13:15:00.000Z",
  },
];

export const MOCK_TIKTOK_REVIEWS: MockEntry[] = [
  {
    externalId: "mock-tt-2001",
    author: "Mint P.",
    content: "รีวิวคุชชั่น SPF50+ ใช้จริง 8 ชั่วโมง กลางแดด ผิวยังสวยอยู่",
    mediaType: "video",
    thumbnailUrl: productCushionHero,
    publishedAt: "2026-09-15T12:00:00.000Z",
  },
  {
    externalId: "mock-tt-2002",
    author: "แพรวา ส.",
    content: "สวอชลิปทินท์ครบทุกสี สีไหนเหมาะกับผิวแบบไหน ดูในคลิปเลย",
    mediaType: "video",
    thumbnailUrl: productLipTintMain,
    publishedAt: "2026-09-10T09:45:00.000Z",
  },
  {
    externalId: "mock-tt-2003",
    author: "June K.",
    content: "แต่งหน้าไปทำงานใน 5 นาที ด้วยคุชชั่นตลับเดียว",
    mediaType: "video",
    thumbnailUrl: productCushionMain,
    publishedAt: "2026-09-03T07:20:00.000Z",
  },
];

/** The registry Admin reads from. Swap a mock for the real (server-side) adapter here once configured. */
export const SOCIAL_REVIEW_PROVIDERS: SocialReviewProvider[] = [
  createMockProvider("instagram", MOCK_INSTAGRAM_REVIEWS),
  createMockProvider("tiktok", MOCK_TIKTOK_REVIEWS),
];

export type ProviderFetchResult =
  | { provider: SocialProvider; configured: boolean; status: "success"; reviews: SocialReview[] }
  | { provider: SocialProvider; configured: boolean; status: "error"; reviews: [] };

/** Fetches every provider independently — one platform failing never hides the other's content. */
export async function fetchAllSocialReviews(providers = SOCIAL_REVIEW_PROVIDERS): Promise<ProviderFetchResult[]> {
  const settled = await Promise.allSettled(providers.map((p) => p.listReviews()));
  return settled.map((s, i) => {
    const { provider, configured } = providers[i];
    if (s.status === "rejected") return { provider, configured, status: "error", reviews: [] };
    const reviews = s.value.map(normalizeSocialReview).filter((r): r is SocialReview => !!r);
    return { provider, configured, status: "success", reviews };
  });
}
