import type { StatusTone } from "~/components/admin/StatusBadge";

/**
 * Inventory (Phase 06 — คลังสินค้า / Inventory Integration). An external
 * Inventory System is the Source of Truth for Stock (On Hand/Available/
 * Reserved/Warehouse/Movement) — Charmiss only displays the last synced
 * snapshot and never adjusts a quantity directly (no restock/transfer/
 * cut-stock UI anywhere). Charmiss stays the owner of Product/Image/
 * Category/Brand/Price, which is why this record only *references* a
 * Product by `productId` (name/SKU/image are looked up live, never
 * duplicated) instead of folding into `AdminProduct` itself.
 */
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export const STOCK_STATUS_META: Record<StockStatus, { label: string; tone: StatusTone }> = {
  in_stock: { label: "มีสินค้า", tone: "success" },
  low_stock: { label: "ใกล้หมด", tone: "warning" },
  out_of_stock: { label: "สินค้าหมด", tone: "danger" },
};

export type AdminInventoryStock = {
  id: string;
  productId: string;
  variantLabel?: string;
  onHand: number;
  reserved: number;
  warehouse: string;
  status: StockStatus;
  source: "Inventory System";
  syncedAt: string;
};

/** "Available" is always derived as On Hand minus Reserved — never a third stored number that could drift out of sync (same rule as Loyalty's `getLoyaltyCoinsUsed`). */
export function getAvailableStock(s: Pick<AdminInventoryStock, "onHand" | "reserved">): number {
  return Math.max(0, s.onHand - s.reserved);
}

export function normalizeInventoryStock(s: Partial<AdminInventoryStock> & { id: string }): AdminInventoryStock {
  return {
    id: s.id,
    productId: s.productId ?? "",
    variantLabel: s.variantLabel,
    onHand: typeof s.onHand === "number" ? s.onHand : 0,
    reserved: typeof s.reserved === "number" ? s.reserved : 0,
    warehouse: s.warehouse ?? "",
    status: s.status ?? "in_stock",
    source: "Inventory System",
    syncedAt: s.syncedAt ?? "",
  };
}

const WAREHOUSES = ["คลังกรุงเทพ", "คลังเชียงใหม่", "คลังชลบุรี"];
const SYNCED_AT_ROTATION = ["18 ก.ย. 2569 08:00 น.", "17 ก.ย. 2569 21:45 น."];
/** Only for products whose mock catalog entry never set `stockLeft`/`stockTotal` at all — a plausible, varied mix so the Overview isn't dominated by "out of stock" purely because most of the catalog never bothered to mock a stock number. */
const FALLBACK_STOCK_ROTATION = [25, 40, 15, 60, 8, 32, 50, 18, 0, 22];

/**
 * One Inventory record per existing Product, seeded from that Product's own
 * `stockLeft`/`stockTotal` when present (a one-time mock stand-in for
 * "whatever the Inventory System already computed and synced over"),
 * falling back to a varied mock rotation when neither field was ever set —
 * after this initial seed, the two datasets are fully independent; only a
 * mock re-Sync ever touches an Inventory record again, never a live read of
 * the Product.
 */
export function buildMockInventoryStock(products: { id: string; stockLeft?: number; stockTotal?: number; variants?: { label: string }[] }[]): AdminInventoryStock[] {
  return products.map((p, i) => {
    const hasMockStock = p.stockLeft !== undefined || p.stockTotal !== undefined;
    const left = hasMockStock ? (p.stockLeft ?? 0) : FALLBACK_STOCK_ROTATION[i % FALLBACK_STOCK_ROTATION.length];
    const onHand = Math.max(p.stockTotal ?? 0, left);
    const reserved = Math.max(0, onHand - left);
    const status: StockStatus = left <= 0 ? "out_of_stock" : left <= 10 ? "low_stock" : "in_stock";
    return {
      id: `inv-${p.id}`,
      productId: p.id,
      variantLabel: p.variants?.[0]?.label,
      onHand,
      reserved,
      warehouse: WAREHOUSES[i % WAREHOUSES.length],
      status,
      source: "Inventory System" as const,
      syncedAt: SYNCED_AT_ROTATION[i % SYNCED_AT_ROTATION.length],
    };
  });
}

/** "Order Integration" (§5) — a per-line-item Stock Status, deterministically mapped from the Order's own status. Mock only: no real Stock Movement/Reservation logic backs this, it just reflects what a real integration's webhook would plausibly report at each stage. */
export type MockLineItemStockStatus = "reserved" | "preparing" | "deducted" | "released";

export const LINE_ITEM_STOCK_STATUS_META: Record<MockLineItemStockStatus, { label: string; tone: StatusTone }> = {
  reserved: { label: "จองสต็อกไว้ (Reserved)", tone: "info" },
  preparing: { label: "กำลังเตรียมสินค้า (Preparing)", tone: "warning" },
  deducted: { label: "ตัดสต็อกแล้ว (Deducted)", tone: "success" },
  released: { label: "คืนสต็อกแล้ว (Released)", tone: "neutral" },
};

export function getMockLineItemStockStatus(orderStatus: string): MockLineItemStockStatus {
  switch (orderStatus) {
    case "pending_payment":
    case "confirmed":
      return "reserved";
    case "processing":
    case "packed":
      return "preparing";
    case "shipped":
    case "delivered":
      return "deducted";
    case "cancelled":
    case "refunded":
      return "released";
    default:
      return "reserved";
  }
}
