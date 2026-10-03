import {
  MOCK_INSTAGRAM_REVIEWS,
  MOCK_TIKTOK_REVIEWS,
  normalizeSocialReview,
  withProductMapping,
  type SocialReview,
} from "./socialReviews";

/**
 * Phase 03 — Featured Review selection: which social posts Admin pinned to
 * which Product, in display order. Each entry stores a normalized
 * `SocialReview` snapshot, so the PDP renders from this data alone and never
 * calls Instagram/TikTok from the browser (Admin refreshes the snapshot by
 * re-saving). No max count — none exists elsewhere in the system, so none is
 * invented here.
 */
export type FeaturedReviewAssignment = {
  productId: string;
  /** Display order = array order. */
  reviews: SocialReview[];
  updatedAt: string;
};

export const FEATURED_REVIEWS_STORAGE_KEY = "charmiss:admin:content:featured-reviews";

export function normalizeFeaturedAssignment(raw: unknown): FeaturedReviewAssignment | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const a = raw as Partial<FeaturedReviewAssignment>;
  if (typeof a.productId !== "string" || !a.productId) return undefined;
  const reviews = (Array.isArray(a.reviews) ? a.reviews : [])
    .map(normalizeSocialReview)
    .filter((r): r is SocialReview => !!r)
    // Featuring a post on a product is what binds it to that product.
    .map((r) => ({ ...r, productId: a.productId }));
  return { productId: a.productId, reviews, updatedAt: typeof a.updatedAt === "string" ? a.updatedAt : "" };
}

export function normalizeFeaturedAssignments(raw: unknown): FeaturedReviewAssignment[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeFeaturedAssignment).filter((a): a is FeaturedReviewAssignment => !!a && a.reviews.length > 0);
}

/** Dev baseline so a fresh browser shows the feature — built from the same mock adapter entries Admin lists, on real product ids. */
export function buildMockFeaturedAssignments(): FeaturedReviewAssignment[] {
  const ig = (externalId: string) => MOCK_INSTAGRAM_REVIEWS.find((e) => e.externalId === externalId)!;
  const tt = (externalId: string) => MOCK_TIKTOK_REVIEWS.find((e) => e.externalId === externalId)!;
  const snap = (provider: SocialReview["provider"], e: ReturnType<typeof ig>) =>
    withProductMapping({ ...e, id: `${provider}:${e.externalId}`, provider });
  return normalizeFeaturedAssignments([
    { productId: "best-1", reviews: [snap("instagram", ig("mock-ig-1001")), snap("tiktok", tt("mock-tt-2002")), snap("instagram", ig("mock-ig-1002"))], updatedAt: "18 ก.ย. 2569" },
    { productId: "feature-1", reviews: [snap("tiktok", tt("mock-tt-2001"))], updatedAt: "18 ก.ย. 2569" },
  ]);
}
