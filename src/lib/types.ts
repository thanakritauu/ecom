import type { Address } from "./checkoutData";
import type { MediaValue } from "./media";

export type ProductVariant = {
  id: string;
  label: string;
  /** Hex swatch color shown in the shade selector, e.g. "#FBDBC4". */
  color: string;
  /** Shade-specific product photo — what the Product Option Modal's square option tile shows. Falls back to the product's default `image` when unset (most SKUs only have one photo today — see products.ts). */
  image?: string;
  /** Small swatch image for the Product Card's shade circle, uploaded separately from `image` in Admin. Unset = the circle is the flat `color`. */
  swatchImage?: string;
  /** This specific shade is sold out — selectable in neither Home's shade row nor the PDP's, but still shown (per Figma) rather than removed outright. */
  soldOut?: boolean;
};

export type Review = {
  id: string;
  /** Product this review is for. Optional when the review lives inside `product.reviews`; required for a flat list from an API/CMS. */
  productId?: string;
  /** The product option (`ProductVariant.id`) the reviewer bought — the key the Option Modal filters by. Unset = product-level review. */
  variantId?: string;
  name: string;
  rating: number; // 1-5
  date: string; // pre-formatted display string, e.g. "12 ส.ค. 2569"
  /** Display snapshot of the option name at review time — shown only, never used for matching. */
  variantLabel?: string;
  text: string;
  photos?: string[];
  /** Review videos (Option Modal review tab). `poster` is the still shown before playback. */
  videos?: { src: string; poster?: string }[];
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  compareAtPrice?: number;
  discountPercent?: number;
  stockLeft?: number;
  stockTotal?: number;
  /** Live flash sale with a total limit only: units left at the flash price (the stock bar shows this of `stockTotal`). */
  flashStockLeft?: number;
  flashSaleEndsAt?: number; // epoch ms, only set when the card should show the countdown ribbon
  /** Epoch ms the one-off flash sale opens (Admin "เริ่มเวลา"). Unset = already open (daily rounds, older saves). Before it the product isn't in the flash sale. */
  flashSaleStartsAt?: number;
  /** Admin "แสดงป้ายลดราคา": `false` hides only the "ลด X%" badge (the struck-through price stays). Unset = shown. */
  showDiscountBadge?: boolean;
  variants?: ProductVariant[];
  /**
   * Product / Category / Collection Source-of-Truth Cleanup —
   * legacy 3-value classification, superseded by `categoryId` below. Kept on
   * the type (never actively read for classification anymore) only so
   * pre-existing records/order history/etc. that still carry it don't lose
   * data; every real category-matching code path now goes through
   * `categoryId` → `AdminCategory.id` instead. See `adminProductStore.tsx`'s
   * `AdminProduct` for the id-based fields this migrated to.
   */
  category?: "eye" | "cheek" | "lip" | "cushion" | "skincare" | "suncare-bodycare";
  /**
   * The one live Category relationship — an id into `~/lib/adminCategories`'s
   * `AdminCategory[]`, resolved through the Product Catalog wherever a
   * product needs to be matched/filtered/grouped by category. Optional here
   * (a plain `Product` literal, e.g. in `products.ts`'s seed arrays, may not
   * set it) but always populated on the real `AdminProduct` shape the Admin
   * Store/Product Catalog actually serve.
   */
  categoryId?: string;
  /** 0-5. Omit to hide the rating row entirely (e.g. a SKU with no reviews yet). */
  rating?: number;
  soldCount?: number;
  /** Product Detail Page only, all optional — most catalog items don't have
   * this depth of content yet (see products.ts), so the PDP renders each
   * section conditionally rather than every product needing every field. */
  images?: string[];
  /**
   * CMS + Frontend Final Refinement §8 — the Gallery photo an admin
   * explicitly pinned as "รูปหลัก" (Main Photo). Optional and additive: a
   * product with no explicit pin yet has no `mainImage`, and every reader
   * (`ProductCard`, `ProductQuickView`, this form's own Live Preview) falls
   * back to `images[0]`, then `.image`, exactly as before this field
   * existed — never a second, independently-drifting "which photo is first"
   * signal, just an explicit override on top of the same fallback chain.
   */
  mainImage?: string;
  /**
   * Gallery with videos: same order as `images`, each entry an image (string)
   * or a video `MediaItem` (`~/lib/media`). `images` stays the still-image
   * list (a video's entry there is its poster), so every card, cart line and
   * list keeps reading `images`/`image` and never gets a video. Only the PDP
   * gallery reads this. Absent = images only.
   */
  media?: MediaValue[];
  description?: string;
  reviewCount?: number;
  /** Counts for [5★, 4★, 3★, 2★, 1★], in that order. */
  ratingBreakdown?: [number, number, number, number, number];
  reviews?: Review[];
};

export type CartLine = {
  productId: string;
  variantId?: string;
  qty: number;
};

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  coinBalance: number;
  /** ISO date (YYYY-MM-DD). */
  birthDate?: string;
  gender?: "female" | "male" | "unspecified";
  /** "crm" = moved over from the Charmiss Club CRM (coins carried over); "new" = signed up on the website. */
  memberSource?: "crm" | "new";
  /** Member number on the Charmiss Club card: the formal customer code ("CM-000002") from the Admin Customer record. */
  memberCode?: string;
};

/**
 * Phase 05 — customer-facing Order Status (the order/payment lifecycle).
 * Kept separate from `ShipmentStatus` (where the parcel is) so the two are
 * never conflated: e.g. an order can be "กำลังจัดส่ง" while its shipment is
 * "กำลังนำส่ง". This replaces the earlier 4-value set — one status model,
 * not a second one alongside it.
 */
/** Flow after payment: กำลังเตรียมการจัดส่ง → ส่งให้บริษัทขนส่ง → กำลังจัดส่ง → ส่งสำเร็จ (payment itself is `PaymentStatus`, not a step here). */
export type OrderStatus = "pending_payment" | "preparing" | "handed_over" | "shipping" | "completed" | "cancelled";

/** Where the parcel is — derived from the latest carrier event (see `orderTracking.ts`). */
export type ShipmentStatus = "awaiting_shipment" | "shipped" | "in_transit" | "out_for_delivery" | "delivered";

/** Every step on the customer tracking timeline, in order. The first two are Charmiss-side, the rest come from the carrier. */
export type TrackingStatus = "ordered" | "preparing" | ShipmentStatus;

/** Raw event as recorded by Charmiss or reported by the carrier. Completed/current state is derived for display, never stored. */
export type TrackingEvent = {
  status: Exclude<TrackingStatus, "awaiting_shipment">;
  /** ISO 8601. */
  timestamp: string;
  description?: string;
  location?: string;
};

export type CarrierId = "dhl";

export type Shipment = {
  carrier: CarrierId;
  method: string;
  /** Assigned once the parcel is handed to the carrier. */
  trackingNumber?: string;
  events: TrackingEvent[];
};

/**
 * Order line items are a historical snapshot (name/variant/price as they
 * were at time of purchase), not a live reference into `allProducts` — real
 * order history never re-derives its price from the current catalog, and
 * several of these mock orders reference products that were never added to
 * the PDP-only catalog this prototype ships (see accountData.ts).
 */
export type OrderItem = {
  name: string;
  variantLabel: string;
  qty: number;
  /** Unit price at purchase time. */
  price: number;
  image: string;
  /** The "ซื้อครบ ฿590 รับฟรี" gift (`GIFT_PROMOTION`) — always ฿0, never counted toward the subtotal. */
  isGift?: boolean;
};

export type OrderPayment = {
  method: string;
  subtotal: number;
  shippingFee: number;
  /** Coupon discount (฿) — `couponCode` is the `AVAILABLE_COUPONS` code it came from. */
  discount: number;
  couponCode?: string;
  coinDiscount: number;
};

export type ReturnRequest = {
  /** Indexes into `Order.items`. */
  itemIndexes: number[];
  reason: string;
  note?: string;
  /** ISO 8601. */
  requestedAt: string;
};

export type Order = {
  id: string;
  status: OrderStatus;
  /** ISO 8601. */
  placedAt: string;
  items: OrderItem[];
  total: number;
  /** Shipping address snapshot at purchase time — same `Address` shape Checkout saves. */
  shippingAddress: Address;
  payment: OrderPayment;
  shipment: Shipment;
  /** ISO 8601 — set when the order is cancelled. */
  cancelledAt?: string;
  /** Why it was cancelled, when known — e.g. the payment-deadline auto-cancel (`applyPaymentDeadline`). */
  cancelReason?: string;
  returnRequest?: ReturnRequest;
};
