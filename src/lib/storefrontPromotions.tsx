import { createContext, createMemo, createSignal, onCleanup, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import {
  buildMockCoupons,
  buildMockPromotions,
  couponUsageCount,
  isMarketingLive,
  isStorefrontPromotion,
  MARKETING_SEED_VERSION,
  normalizeCoupons,
  normalizePromotions,
  type Coupon as AdminCoupon,
  type Promotion,
} from "./adminMarketing";
import { buildCoupon, type Coupon, type ResolvedCartLine } from "./cartSelectors";
import { useProductCatalog } from "./productCatalog";
import { useCart } from "./cart";
import { MOCK_ORDERS as ADMIN_MOCK_ORDERS } from "./adminOrders";
import { giftLinesOf, resolveFreeShipping, resolveGiftPromotions, shippingFeeFor } from "./promotionEngine";
import { couponAudienceBlock, matchesAudience, type Shopper } from "./marketingAudience";

/** Same keys (+ `:seed-version`) `adminMarketingStore` persists to. Read-only here; the customer side never writes them. */
export const PROMOTIONS_STORAGE_KEY = "charmiss:admin:marketing:promotions";
export const COUPONS_STORAGE_KEY = "charmiss:admin:marketing:coupons";
import { MARKETING_CHANGED_EVENT } from "./marketingEvents";
export { MARKETING_CHANGED_EVENT };

const idNumber = (id: string) => Number(id.match(/-(\d+)$/)?.[1] ?? 0);

/** The stored Admin copy, upgraded the same way Admin would if it hasn't been opened since a seed bump (in memory only). */
function readStored<T extends { id: string }>(key: string, seeds: () => T[], normalize: (list: T[]) => T[]): T[] {
  if (isServer) return seeds();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return seeds();
    const stored = normalize(JSON.parse(raw) as T[]);
    if (Number(localStorage.getItem(`${key}:seed-version`) ?? 1) < MARKETING_SEED_VERSION) {
      return [...stored.filter((p) => idNumber(p.id) >= 1000), ...seeds()];
    }
    return stored;
  } catch {
    return seeds();
  }
}

/** Where `adminOrderStore` keeps the order list (`{ version, orders }`). Read-only here. */
const ADMIN_ORDERS_STORAGE_KEY = "charmiss:admin:orders";

type UsageOrder = { orderStatus: string; customerId?: string; totals: { couponCode?: string } };

/** Every customer's orders, for counting coupon uses: Admin's saved copy when there is one, else the seed orders. */
function readOrdersForUsage(): UsageOrder[] {
  if (!isServer) {
    try {
      const parsed = JSON.parse(localStorage.getItem(ADMIN_ORDERS_STORAGE_KEY) ?? "null") as { orders?: UsageOrder[] } | null;
      if (parsed && Array.isArray(parsed.orders)) return parsed.orders;
    } catch {}
  }
  return ADMIN_MOCK_ORDERS;
}

/** A switched-on Admin coupon as the storefront's coupon (its window is checked again where it's offered or used). */
function toStorefrontCoupon(c: AdminCoupon, orders: UsageOrder[], shopper: Shopper): Coupon {
  const coupon = buildCoupon({
    code: c.code,
    discountType: c.discountType,
    discount: c.discount,
    maxDiscount: c.maxDiscount,
    minSpend: c.minSpend,
    usageLimit: c.usageLimit,
    perCustomerLimit: c.perCustomerLimit,
    usedCount: couponUsageCount(c.code, orders),
    image: c.image,
    startDate: c.startDate,
    startTime: c.startTime,
    endDate: c.endDate,
    endTime: c.endTime,
    extraConditions: c.extraConditions,
    productScope: c.productScope,
  });
  return { ...coupon, audienceBlock: couponAudienceBlock(c.audience, shopper) };
}

type StorefrontPromotionsValue = {
  /** Promotions running right now (switched on and inside their date-time window). */
  promotions: Accessor<Promotion[]>;
  /** Live coupons shown as tickets on Home. */
  homeCoupons: Accessor<Coupon[]>;
  /** Live coupons listed in Checkout's picker. */
  checkoutCoupons: Accessor<Coupon[]>;
  /** Every switched-on coupon, for typed codes (the picker tells "not started" / "expired" apart from "not found"). */
  codeCoupons: Accessor<Coupon[]>;
  /** Who is shopping (guest / new / returning, member tier): decides which promotions and coupons apply (`matchesAudience`). */
  shopper: Accessor<Shopper>;
};

const StorefrontPromotionsContext = createContext<StorefrontPromotionsValue>();

/**
 * The promotions and coupons Admin manages, as the storefront sees them. SSR
 * and the first client paint use the seeds (no hydration mismatch); the
 * stored Admin copy is read on mount and again whenever Admin saves, so a
 * change in Admin shows up without a reload. Start/end date-times are real:
 * `now` ticks every minute so a promo or coupon starts and ends on time.
 */
export function StorefrontPromotionsProvider(props: { children: JSX.Element }) {
  const [allPromotions, setAllPromotions] = createSignal<Promotion[]>(buildMockPromotions());
  const [allCoupons, setAllCoupons] = createSignal<AdminCoupon[]>(buildMockCoupons());
  const [now, setNow] = createSignal(Date.now());
  const [usageOrders, setUsageOrders] = createSignal<UsageOrder[]>(ADMIN_MOCK_ORDERS);

  // กลุ่มลูกค้า: the same shopper the catalog prices flash sales for.
  const { shopper } = useProductCatalog();

  onMount(() => {
    const refresh = () => {
      setAllPromotions(readStored(PROMOTIONS_STORAGE_KEY, buildMockPromotions, normalizePromotions));
      setAllCoupons(readStored(COUPONS_STORAGE_KEY, buildMockCoupons, normalizeCoupons));
      setUsageOrders(readOrdersForUsage());
      setNow(Date.now());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith(PROMOTIONS_STORAGE_KEY) || e.key.startsWith(COUPONS_STORAGE_KEY) || e.key === ADMIN_ORDERS_STORAGE_KEY) refresh();
    };
    refresh();
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    window.addEventListener("storage", onStorage);
    window.addEventListener(MARKETING_CHANGED_EVENT, refresh);
    onCleanup(() => {
      clearInterval(tick);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MARKETING_CHANGED_EVENT, refresh);
    });
  });

  // Only the types the cart runs; the others (bundle, % / baht off, buy X get Y) are Admin-only for now.
  // Promotions and listed coupons outside the shopper's กลุ่มลูกค้า don't apply and aren't shown (no badge, no cart banner, no ticket).
  const promotions = createMemo(() => allPromotions().filter((p) => isStorefrontPromotion(p) && isMarketingLive(p, now()) && matchesAudience(p.audience, shopper())));
  const liveCoupons = createMemo(() => allCoupons().filter((c) => isMarketingLive(c, now()) && matchesAudience(c.audience, shopper())));
  const homeCoupons = createMemo(() => liveCoupons().filter((c) => c.showOnHome).map((c) => toStorefrontCoupon(c, usageOrders(), shopper())));
  const checkoutCoupons = createMemo(() => liveCoupons().filter((c) => c.showAtCheckout).map((c) => toStorefrontCoupon(c, usageOrders(), shopper())));
  // Typed codes: every switched-on coupon, so one outside the shopper's group is refused with its reason (`audienceBlock`) instead of "not found".
  const codeCoupons = createMemo(() => allCoupons().filter((c) => c.status === "active").map((c) => toStorefrontCoupon(c, usageOrders(), shopper())));

  return (
    <StorefrontPromotionsContext.Provider value={{ promotions, homeCoupons, checkoutCoupons, codeCoupons, shopper }}>{props.children}</StorefrontPromotionsContext.Provider>
  );
}

export function useStorefrontPromotions() {
  const ctx = useContext(StorefrontPromotionsContext);
  if (!ctx) throw new Error("useStorefrontPromotions must be used within StorefrontPromotionsProvider");
  return ctx;
}

/** The cart's promo state for one set of resolved lines: the Drawer, Cart Page and Checkout each call this with their own lines. */
export function useCartPromotions(lines: Accessor<ResolvedCartLine[]>) {
  const { promotions } = useStorefrontPromotions();
  const catalog = useProductCatalog();
  const freeShipping = createMemo(() => resolveFreeShipping(promotions(), lines()));
  const gifts = createMemo(() => resolveGiftPromotions(promotions(), lines(), catalog.products()));
  const cart = useCart();
  const giftLines = createMemo(() => giftLinesOf(gifts(), cart.giftChoices()));
  const shippingFee = createMemo(() => shippingFeeFor(freeShipping()));
  return { freeShipping, gifts, giftLines, shippingFee };
}
