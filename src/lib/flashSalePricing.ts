import type { Product } from "./types";
import type { AdminProduct, AdminVariant } from "./adminProductStore";
import { getDiscountPercent } from "./products";
import type { CombinableKind } from "./adminMarketing";

/**
 * Flash Sale pricing: each flash sale campaign (`flashSaleCampaigns.ts`) has
 * its OWN prices per product (a `FlashSaleConfig`), separate from the
 * product's normal price. The stored `price` / option prices are never
 * overwritten: the storefront catalog (`productCatalog.tsx`) applies
 * `applyFlashPricing` only while a campaign holding the product is live, so
 * outside it everything is back to the normal price automatically.
 *
 * Level "product" (ระดับสินค้า): one flash price for every option (baht, or
 * "ลด %" of each option's normal price) and one set of limits shared by all
 * options. Level "option" (ระดับตัวเลือกสินค้า): each option is switched in or
 * out and has its own price and limits.
 *
 * Limits: `totalLimit` (จำกัดการซื้อทั้งหมด) = units sold at the flash price
 * overall, which is also the stock bar's total; `customerLimit`
 * (จำกัดต่อลูกค้า) = units per order at the flash price. Units over either
 * limit in a cart are charged the normal price (`resolveCartLines`).
 */
export type FlashPriceMode = "baht" | "percent";
export type FlashSaleLevel = "product" | "option";

export type FlashSaleOption = {
  variantId: string;
  enabled: boolean;
  mode: FlashPriceMode;
  /** Baht (mode "baht") or percent off 1-99 (mode "percent"). */
  value: number;
  totalLimit?: number;
  customerLimit?: number;
};

export type FlashSaleConfig = {
  level: FlashSaleLevel;
  mode: FlashPriceMode;
  value: number;
  totalLimit?: number;
  customerLimit?: number;
  /** Level "option" only: one row per option (missing row = option not in the flash sale). */
  options: FlashSaleOption[];
};

/** What one cart line needs to price itself during a live flash sale. */
export type FlashDealPrice = {
  flashPrice: number;
  normalPrice: number;
  /** Units sharing one limit: the product (level "product") or the option (level "option"). */
  limitKey: string;
  customerLimit?: number;
  totalLimit?: number;
  /** The option's own normal price ("ราคาก่อนลด"), set once a ส่วนลดสินค้า lowered `normalPrice` / `flashPrice` (`productDiscountPricing.ts`). */
  regularPrice?: number;
};

export type FlashDeal = {
  /** A product without options. */
  base?: FlashDealPrice;
  variants: Record<string, FlashDealPrice>;
  /** The product's own ราคาก่อนลด before the flash sale (what an option outside the flash sale still shows). */
  regularCompareAtPrice?: number;
  /** The live campaign's "การใช้ร่วมกับโปรอื่น" (unset = stacks with all), see `promoStacking.ts`. */
  combinableWith?: CombinableKind[];
};

export type FlashPricedProduct = { flashDeal?: FlashDeal };

/** Flash price from a normal price: baht as entered, or "ลด %" rounded to whole baht. */
export function flashPriceFrom(normal: number, mode: FlashPriceMode, value: number): number {
  if (mode === "percent") return Math.max(0, Math.round((normal * (100 - value)) / 100));
  return value;
}

export const optionNormalPrice = (product: Pick<Product, "price">, v: Pick<AdminVariant, "price"> | undefined) => v?.price ?? product.price;

/**
 * Before campaigns, a product carried its own flash sale: `flashSaleDaily`,
 * `flashSaleStartsAt` / `flashSaleEndsAt` and `flashSale`. Only read now to
 * migrate them into campaigns (`migrateFlashCampaigns`); stripped on read.
 */
export type LegacyFlashFields = { flashSaleDaily?: boolean; flashSale?: FlashSaleConfig; flashSaleEndsAt?: number; flashSaleStartsAt?: number };
export type LegacyFlashProduct = AdminProduct & LegacyFlashFields;

export const isInFlashSale = (p: LegacyFlashFields) => p.flashSaleEndsAt !== undefined || !!p.flashSaleDaily;

/** The product without the old per-product flash fields. */
export function stripLegacyFlashFields<T extends LegacyFlashFields>(p: T): Omit<T, keyof LegacyFlashFields> {
  const { flashSaleDaily: _d, flashSale: _f, flashSaleEndsAt: _e, flashSaleStartsAt: _s, ...rest } = p;
  return rest;
}

/** Default config for a product just added to the flash sale: level product, ลด 10%. */
export function defaultFlashSaleConfig(percent = 10): FlashSaleConfig {
  return { level: "product", mode: "percent", value: percent, options: [] };
}

/**
 * Products that joined the flash sale before it had its own prices sold at
 * `price` with `compareAtPrice` struck through. Their config takes the old
 * `price` as the flash price (baht) and the product's normal price becomes the
 * old `compareAtPrice`, so the storefront looks the same during the sale.
 * Idempotent: a product that already has `flashSale` is returned as is.
 */
export function migrateLegacyFlashSale<T extends LegacyFlashProduct>(p: T): T {
  if (!isInFlashSale(p) || p.flashSale) return p;
  const flash = p.price;
  const normal = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice : p.price;
  return {
    ...p,
    price: normal,
    compareAtPrice: undefined,
    discountPercent: undefined,
    adminVariants: p.adminVariants.map((v) => (v.price === undefined || v.price === flash ? { ...v, price: normal } : v)),
    flashSale: { level: "product", mode: "baht", value: flash, options: [] },
  };
}

/** Level "option" can only be used by a product that has options. */
export function effectiveLevel(p: Pick<AdminProduct, "adminVariants">, cfg: FlashSaleConfig | undefined): FlashSaleLevel {
  return cfg?.level === "option" && p.adminVariants.length > 0 ? "option" : "product";
}

export type FlashPriceRow = { variantId?: string; flash: number; normal: number; totalLimit?: number; customerLimit?: number };

/** Flash price per option id (only options in the flash sale, below their normal price). */
export function flashPricesOf(p: AdminProduct, cfg: FlashSaleConfig | undefined): FlashPriceRow[] {
  if (!cfg) return [];
  const out: FlashPriceRow[] = [];
  if (effectiveLevel(p, cfg) === "product") {
    if (p.adminVariants.length === 0) {
      const flash = flashPriceFrom(p.price, cfg.mode, cfg.value);
      if (flash > 0 && flash < p.price) out.push({ flash, normal: p.price, totalLimit: cfg.totalLimit, customerLimit: cfg.customerLimit });
      return out;
    }
    for (const v of p.adminVariants) {
      const normal = optionNormalPrice(p, v);
      const flash = flashPriceFrom(normal, cfg.mode, cfg.value);
      if (flash > 0 && flash < normal) out.push({ variantId: v.id, flash, normal, totalLimit: cfg.totalLimit, customerLimit: cfg.customerLimit });
    }
    return out;
  }
  for (const o of cfg.options) {
    if (!o.enabled) continue;
    const v = p.adminVariants.find((x) => x.id === o.variantId);
    if (!v) continue;
    const normal = optionNormalPrice(p, v);
    const flash = flashPriceFrom(normal, o.mode, o.value);
    if (flash > 0 && flash < normal) out.push({ variantId: v.id, flash, normal, totalLimit: o.totalLimit, customerLimit: o.customerLimit });
  }
  return out;
}

/** The flash sale's own stock bar total: the total limit(s), when every priced row has one. */
function flashTotalOf(p: AdminProduct, cfg: FlashSaleConfig, rows: FlashPriceRow[]): number | undefined {
  if (rows.length === 0) return undefined;
  if (effectiveLevel(p, cfg) === "product") return cfg.totalLimit;
  return rows.every((r) => r.totalLimit !== undefined) ? rows.reduce((n, r) => n + (r.totalLimit ?? 0), 0) : undefined;
}

/**
 * The storefront view of a product inside its live flash window: `price` is
 * the (lowest) flash price, `compareAtPrice` that option's normal price
 * ("ราคาก่อนลด"), each option's price is its flash price (or its normal price
 * when it isn't in the flash sale), and `flashDeal` carries what the cart
 * needs for the limits. With no valid flash price it returns the product as is.
 */
export function applyFlashPricing<T extends AdminProduct>(p: T, cfg: FlashSaleConfig): T & FlashPricedProduct {
  const rows = flashPricesOf(p, cfg);
  if (rows.length === 0) return p;
  const level = effectiveLevel(p, cfg);
  const keyOf = (variantId?: string) => (level === "product" || !variantId ? p.id : `${p.id}:${variantId}`);
  const deal: FlashDeal = { variants: {}, regularCompareAtPrice: p.compareAtPrice };
  for (const r of rows) {
    const price: FlashDealPrice = { flashPrice: r.flash, normalPrice: r.normal, limitKey: keyOf(r.variantId), customerLimit: r.customerLimit, totalLimit: r.totalLimit };
    if (r.variantId) deal.variants[r.variantId] = price;
    else deal.base = price;
  }
  const cheapest = rows.reduce((a, b) => (b.flash < a.flash ? b : a));
  const flashTotal = flashTotalOf(p, cfg, rows);
  const stockLeft = p.stockLeft;
  const next = {
    ...p,
    price: cheapest.flash,
    compareAtPrice: cheapest.normal,
    discountPercent: getDiscountPercent({ price: cheapest.flash, compareAtPrice: cheapest.normal }),
    // Every option gets an explicit price so one outside the flash sale never falls back to the flash `price`.
    adminVariants: p.adminVariants.map((v) => ({ ...v, price: deal.variants[v.id]?.flashPrice ?? optionNormalPrice(p, v) })),
    flashDeal: deal,
  };
  if (flashTotal !== undefined) {
    next.stockTotal = flashTotal;
    next.flashStockLeft = Math.min(stockLeft ?? flashTotal, flashTotal);
  }
  return next;
}

/** The deal a cart line (product + option) gets, if any. */
export function flashDealFor(product: Product, variantId?: string): FlashDealPrice | undefined {
  const deal = (product as Product & FlashPricedProduct).flashDeal;
  if (!deal) return undefined;
  return variantId ? deal.variants[variantId] : deal.base;
}

/** Flash price / limit validation messages for one price row (shared by the Flash Sale editor). */
export function flashValueError(mode: FlashPriceMode, raw: string, normal: number): string | undefined {
  const n = Number(raw);
  if (raw.trim() === "" || Number.isNaN(n)) return mode === "percent" ? "กรุณากรอกส่วนลดเป็น %" : "กรุณากรอกราคาแฟลชเซล";
  if (mode === "percent") return Number.isInteger(n) && n >= 1 && n <= 99 ? undefined : "ส่วนลดต้องเป็นจำนวนเต็ม 1-99%";
  if (n <= 0) return "ราคาแฟลชเซลต้องมากกว่า 0";
  if (n >= normal) return "ราคาแฟลชเซลต้องต่ำกว่าราคาปกติ";
  return undefined;
}

export function flashLimitError(raw: string): string | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? undefined : "จำนวนต้องเป็นจำนวนเต็มมากกว่า 0";
}

const posInt = (n: unknown) => (typeof n === "number" && Number.isInteger(n) && n > 0 ? n : undefined);
const mode = (m: unknown): FlashPriceMode => (m === "percent" ? "percent" : "baht");
const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : 0);

/** Guards a stored config (shape may predate a field). */
export function normalizeFlashSaleConfig(raw: unknown): FlashSaleConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw as Partial<FlashSaleConfig>;
  return {
    level: c.level === "option" ? "option" : "product",
    mode: mode(c.mode),
    value: num(c.value),
    totalLimit: posInt(c.totalLimit),
    customerLimit: posInt(c.customerLimit),
    options: Array.isArray(c.options)
      ? c.options
          .filter((o): o is FlashSaleOption => !!o && typeof o.variantId === "string")
          .map((o) => ({ variantId: o.variantId, enabled: o.enabled !== false, mode: mode(o.mode), value: num(o.value), totalLimit: posInt(o.totalLimit), customerLimit: posInt(o.customerLimit) }))
      : [],
  };
}

const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;

/** Price part of a flash config: "ลด 10%" / "฿199" / "ราคาตามตัวเลือก 3 ตัวเลือก". */
export function flashPriceLabel(p: AdminProduct, cfg: FlashSaleConfig | undefined): string {
  if (!cfg) return "-";
  if (effectiveLevel(p, cfg) === "option") {
    const n = cfg.options.filter((o) => o.enabled && p.adminVariants.some((v) => v.id === o.variantId)).length;
    return `ราคาตามตัวเลือก ${n} ตัวเลือก`;
  }
  return cfg.mode === "percent" ? `ลด ${cfg.value}%` : baht(cfg.value);
}
