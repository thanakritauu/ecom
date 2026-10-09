import type { StatusTone } from "~/components/admin/StatusBadge";

/**
 * Stock lives on the product (`AdminProduct.stockLeft` + each option's
 * `stock`, edited on the Inventory page through `adminProductStore`). The
 * separate inventory dataset is gone; only the per-order-line stock label
 * the order detail page still shows is left here.
 */
export type MockLineItemStockStatus = "reserved" | "preparing" | "deducted" | "released";

export const LINE_ITEM_STOCK_STATUS_META: Record<MockLineItemStockStatus, { label: string; tone: StatusTone }> = {
  reserved: { label: "จองสต๊อกไว้", tone: "info" },
  preparing: { label: "กำลังเตรียมสินค้า", tone: "warning" },
  deducted: { label: "ตัดสต๊อกแล้ว", tone: "success" },
  released: { label: "คืนสต๊อกแล้ว", tone: "neutral" },
};

export function getMockLineItemStockStatus(orderStatus: string): MockLineItemStockStatus {
  switch (orderStatus) {
    case "pending_payment":
      return "reserved";
    case "preparing":
      return "preparing";
    case "handed_over":
    case "shipping":
    case "completed":
      return "deducted";
    case "cancelled":
    case "refunded":
      return "released";
    default:
      return "reserved";
  }
}
