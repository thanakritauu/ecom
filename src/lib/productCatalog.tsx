import { createContext, createMemo, createSignal, onCleanup, onMount, useContext, type Accessor, type JSX } from "solid-js";
import {
  buildAdminProductBaseline,
  buildLegacyAdminProductBaseline,
  ensureFlashCampaignsFromProducts,
  isProductOnSale,
  lowStockThresholdOf,
  normalizeAdminProduct,
  PRODUCTS_CHANGED_EVENT,
  PRODUCTS_STORAGE_KEY,
  readPersistedAdminProducts,
  type AdminProduct,
} from "./adminProductStore";
import type { Product } from "./types";
import { applyFlashPricing, type FlashPricedProduct } from "./flashSalePricing";
import { flashCampaignBoundaries, flashCampaignRoundAt, FLASH_CAMPAIGNS_STORAGE_KEY, migrateFlashCampaigns, readStoredFlashCampaigns, type FlashSaleCampaign } from "./flashSaleCampaigns";
import { MARKETING_CHANGED_EVENT } from "./marketingEvents";
import { GUEST_SHOPPER, matchesAudience, type Shopper } from "./marketingAudience";
import { useAuth } from "./auth";
import { createMockOrderRepository, createOrderHistory } from "./orderHistory";
import { resolveTier, yearlySpend } from "./membership";
import { HIDDEN_REVIEWS_CHANGED_EVENT, HIDDEN_REVIEWS_STORAGE_KEY, readHiddenReviewKeys, reviewKey } from "./adminProductReviews";
import { buildMockPromotions, isMarketingLive, marketingWindow, type Promotion } from "./adminMarketing";
import { applyProductDiscounts, isPriceLevelDiscount } from "./productDiscountPricing";
import { PROMOTIONS_STORAGE_KEY, readStoredPromotions } from "./storefrontMarketingStore";

/** Stock at or below this shows "เหลือ X ชิ้นสุดท้าย" in the cart: the product's own Admin setting (default 5). */
export const storefrontLowStockThreshold = (product: Product) => lowStockThresholdOf(product as Partial<AdminProduct>);

/**
 * Architecture Cleanup & Source of Truth — the storefront's one read path
 * into the exact same Product data Admin manages, same "Admin store +
 * read-only mirror" pattern already established for Category
 * (`categoryContent.tsx`), Collection (`collectionContent.tsx`), and
 * Landing Page (`promotionPages.tsx`) — not a
 * new architecture, the one missing instance of an existing one.
 * `adminProductStore.tsx` (`useAdminProducts()`) stays the Admin-only write
 * side; this file never writes to `localStorage`, only reads the same key.
 *
 * `AdminProduct` is a strict superset of the customer-facing `Product`
 * (`type AdminProduct = Product & {...admin-only fields}`, see
 * `adminProductStore.tsx`), so no transformation/stripping step is needed to
 * hand this data to a storefront component that only reads `Product` fields
 * — the "derived read model" the target architecture asks for is this
 * mirror itself (same data, read-only, always in sync via the same
 * `localStorage` key), not a second reshaped dataset.
 */
function fallbackProducts(): AdminProduct[] {
  return buildAdminProductBaseline().map(normalizeAdminProduct);
}

/**
 * Only products Admin has on sale ("เปิดขาย") reach the storefront; drafts and
 * switched-off products are hidden everywhere. Reviews Admin hid (รีวิว >
 * รีวิวสินค้า) are dropped here too, so the PDP and the Option Modal never
 * show them.
 */
function readStoredProducts(): AdminProduct[] {
  const hidden = readHiddenReviewKeys();
  return (readPersistedAdminProducts() ?? fallbackProducts())
    .filter(isProductOnSale)
    .map((p) => (hidden.size > 0 && p.reviews?.length ? { ...p, reviews: p.reviews.filter((r) => !hidden.has(reviewKey(p.id, r.id))) } : p));
}

/** The seed campaigns (the seed catalog's flash sale, migrated): what SSR and the first client paint use. */
const seedCampaigns = () => migrateFlashCampaigns(buildLegacyAdminProductBaseline());

/** Stored campaigns (migrating the old per-product flash sale first, once). */
function readCampaigns(): FlashSaleCampaign[] {
  ensureFlashCampaignsFromProducts();
  return readStoredFlashCampaigns() ?? seedCampaigns();
}

/**
 * Each product's flash sale from the LIVE campaigns (switched on, inside a
 * round, shopper in its กลุ่มลูกค้า): price = the campaign's flash price,
 * `compareAtPrice` = the normal price, `flashDeal` = the cart limits and
 * `flashSaleEndsAt` = the end of the round (card / PDP / Home countdown).
 * When two live campaigns hold the same product, the lower flash price wins
 * (same price: the one with a flash price, then the one ending first).
 * Products in no live campaign are as stored.
 */
export function withLiveFlashSale(list: AdminProduct[], campaigns: FlashSaleCampaign[], shopper: Shopper, now = Date.now()): AdminProduct[] {
  const live = campaigns
    .filter((c) => matchesAudience(c.audience, shopper))
    .map((c) => ({ c, round: flashCampaignRoundAt(c, now) }))
    .filter((x): x is { c: FlashSaleCampaign; round: { startsAt: number; endsAt: number } } => !!x.round);
  if (live.length === 0) return list;
  return list.map((p) => {
    let best: { priced: AdminProduct & FlashPricedProduct; endsAt: number; campaign: FlashSaleCampaign } | undefined;
    for (const { c, round } of live) {
      const item = c.items.find((i) => i.productId === p.id);
      if (!item) continue;
      // A config with no price below normal (older data) still shows the product in the flash sale at its normal price, as before campaigns.
      const priced = applyFlashPricing(p, item.flash);
      const better =
        !best ||
        priced.price < best.priced.price ||
        (priced.price === best.priced.price && (!!priced.flashDeal > !!best.priced.flashDeal || (!!priced.flashDeal === !!best.priced.flashDeal && round.endsAt < best.endsAt)));
      if (better) best = { priced, endsAt: round.endsAt, campaign: c };
    }
    if (!best) return p;
    // The campaign's "การใช้ร่วมกับโปรอื่น" rides on the deal, so the cart knows what may stack on the flash units.
    const priced = best.priced.flashDeal ? { ...best.priced, flashDeal: { ...best.priced.flashDeal, combinableWith: best.campaign.combinableWith } } : best.priced;
    return { ...priced, flashSaleEndsAt: best.endsAt, flashSaleStartsAt: undefined };
  });
}

/**
 * Layer 1 of the storefront pricing, after the flash sale: sale-price
 * ส่วนลดสินค้า (no minimum, no cap) that are live for this shopper lower the
 * covered SKUs' prices (`applyProductDiscounts`), so cards, the PDP and the
 * cart show the same discounted price. Ones with a minimum or cap are applied
 * by the cart (`priceCart`).
 */
export function withProductDiscounts(list: AdminProduct[], promotions: Promotion[], shopper: Shopper, now = Date.now()): AdminProduct[] {
  const live = promotions.filter((p) => isPriceLevelDiscount(p) && isMarketingLive(p, now) && matchesAudience(p.audience, shopper));
  if (live.length === 0) return list;
  return list.map((p) => applyProductDiscounts(p, live));
}

/** The next moment a campaign round or a sale-price product discount starts or ends (to refresh right then), if any within a day. */
function nextPriceBoundary(campaigns: FlashSaleCampaign[], promotions: Promotion[], now = Date.now()): number | undefined {
  const promoTimes = promotions
    .filter((p) => p.status === "active" && isPriceLevelDiscount(p))
    .flatMap((p) => {
      const { startsAt, endsAt } = marketingWindow(p);
      return [startsAt, endsAt + 1];
    })
    .filter((t) => Number.isFinite(t) && t > now && t - now < 24 * 3600_000);
  const times = [...campaigns.flatMap((c) => flashCampaignBoundaries(c, now)), ...promoTimes];
  return times.length > 0 ? Math.min(...times) : undefined;
}

type ProductCatalogContextValue = {
  /** `false` until the real (client-only) `localStorage` read has happened — SSR and the client's first paint both render the same baseline (see `fallbackProducts`), so there's no hydration mismatch. */
  ready: Accessor<boolean>;
  products: Accessor<AdminProduct[]>;
  getById: (id: string) => AdminProduct | undefined;
  getBySlug: (slug: string) => AdminProduct | undefined;
  /** Products whose own `categoryId` classifies them under this Category — derived live, never a second stored list. */
  getByCategory: (categoryId: string) => AdminProduct[];
  /** Resolves an ordered list of product ids (e.g. a Collection's own `productId[]`) against the live catalog — the one place "reference → real Product" resolution happens, reused by Homepage/Landing Page Product sections alike. */
  getByIds: (ids: string[]) => AdminProduct[];
  /** Who is shopping (guest / new / returning, member tier): decides which flash sales, promotions and coupons apply (`matchesAudience`). */
  shopper: Accessor<Shopper>;
};

const ProductCatalogContext = createContext<ProductCatalogContextValue>();

export function ProductCatalogProvider(props: { children: JSX.Element }) {
  /**
   * กลุ่มลูกค้า: a guest is a new customer with no tier. A signed-in member
   * is returning once they have a paid (not cancelled, not awaiting payment)
   * order; a member who just signed up (`memberSource: "new"`) has none yet.
   * Their tier comes from this year's paid spend, same as Checkout and
   * /account/points.
   */
  const auth = useAuth();
  const orderHistory = createOrderHistory(() => createMockOrderRepository());
  const shopper = createMemo((): Shopper => {
    const user = auth.user();
    if (!user) return GUEST_SHOPPER;
    const orders = user.memberSource === "new" ? [] : orderHistory.orders();
    const hasPaidOrder = orders.some((o) => o.status !== "cancelled" && o.status !== "pending_payment");
    return { signedIn: true, hasPaidOrder, tier: resolveTier(yearlySpend(orders)).current.id };
  });

  // The seed's flash sale is the daily round (always live), so SSR and the first client paint still agree.
  const [baseProducts, setBaseProducts] = createSignal<AdminProduct[]>(fallbackProducts().filter(isProductOnSale));
  const [campaigns, setCampaigns] = createSignal<FlashSaleCampaign[]>(seedCampaigns());
  const [promotions, setPromotions] = createSignal<Promotion[]>(buildMockPromotions());
  const [now, setNow] = createSignal(Date.now());
  const [ready, setReady] = createSignal(false);
  const products = createMemo(() => withProductDiscounts(withLiveFlashSale(baseProducts(), campaigns(), shopper(), now()), promotions(), shopper(), now()));

  onMount(() => {
    let boundaryTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      const list = readCampaigns();
      const promos = readStoredPromotions();
      setBaseProducts(readStoredProducts());
      setCampaigns(list);
      setPromotions(promos);
      setNow(Date.now());
      clearTimeout(boundaryTimer);
      const next = nextPriceBoundary(list, promos);
      if (next !== undefined) boundaryTimer = setTimeout(refresh, next - Date.now() + 500);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith(PRODUCTS_STORAGE_KEY) || e.key === HIDDEN_REVIEWS_STORAGE_KEY || e.key === FLASH_CAMPAIGNS_STORAGE_KEY || e.key.startsWith(PROMOTIONS_STORAGE_KEY)) refresh();
    };
    refresh();
    setReady(true);
    window.addEventListener("storage", onStorage);
    window.addEventListener(PRODUCTS_CHANGED_EVENT, refresh);
    window.addEventListener(HIDDEN_REVIEWS_CHANGED_EVENT, refresh);
    window.addEventListener(MARKETING_CHANGED_EVENT, refresh);
    onCleanup(() => {
      clearTimeout(boundaryTimer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PRODUCTS_CHANGED_EVENT, refresh);
      window.removeEventListener(HIDDEN_REVIEWS_CHANGED_EVENT, refresh);
      window.removeEventListener(MARKETING_CHANGED_EVENT, refresh);
    });
  });

  const getById = (id: string) => products().find((p) => p.id === id);
  const getBySlug = (slug: string) => products().find((p) => p.slug === slug);
  const getByCategory = (categoryId: string) => products().filter((p) => p.categoryId === categoryId);
  const getByIds = (ids: string[]) => ids.map(getById).filter((p): p is AdminProduct => p !== undefined);

  return (
    <ProductCatalogContext.Provider value={{ ready, products, getById, getBySlug, getByCategory, getByIds, shopper }}>
      {props.children}
    </ProductCatalogContext.Provider>
  );
}

export function useProductCatalog() {
  const ctx = useContext(ProductCatalogContext);
  if (!ctx) throw new Error("useProductCatalog must be used within ProductCatalogProvider");
  return ctx;
}
