export type ProductVariant = {
  id: string;
  label: string;
  /** Hex swatch color shown in the shade selector, e.g. "#FBDBC4". */
  color: string;
  /** Shade-specific product photo. Falls back to the product's default `image` when unset (most SKUs only have one photo today — see products.ts). */
  image?: string;
  /** This specific shade is sold out — selectable in neither Home's shade row nor the PDP's, but still shown (per Figma) rather than removed outright. */
  soldOut?: boolean;
};

export type Review = {
  id: string;
  name: string;
  rating: number; // 1-5
  date: string; // pre-formatted display string, e.g. "12 ส.ค. 2569"
  variantLabel?: string;
  text: string;
  photos?: string[];
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
  flashSaleEndsAt?: number; // epoch ms, only set when the card should show the countdown ribbon
  variants?: ProductVariant[];
  category?: "eye" | "cheek" | "lip";
  /** 0-5. Omit to hide the rating row entirely (e.g. a SKU with no reviews yet). */
  rating?: number;
  soldCount?: number;
  /** Product Detail Page only, all optional — most catalog items don't have
   * this depth of content yet (see products.ts), so the PDP renders each
   * section conditionally rather than every product needing every field. */
  images?: string[];
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
};

export type OrderStatus = "pending" | "shipping" | "success" | "cancelled";

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
  price: number;
  image: string;
};

export type Order = {
  id: string;
  status: OrderStatus;
  date: string; // pre-formatted display string, e.g. "28 ส.ค. 2569"
  items: OrderItem[];
  total: number;
};
