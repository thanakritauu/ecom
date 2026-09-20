import type { StatusTone } from "~/components/admin/StatusBadge";
import { allProducts } from "./products";
import { formatAdminCurrency } from "./adminDashboard";

/**
 * Order Status Model — SOURCE OF TRUTH (Phase 04 spec, part 3). Three
 * independent dimensions, exactly the codes listed there — do not add more:
 * an order's lifecycle (`OrderStatus`), whether it's been paid
 * (`PaymentStatus`), and whether it's been packed/shipped (`FulfillmentStatus`).
 * Replaces the flatter 5-status model Phase 02's Dashboard widgets used —
 * those widgets (OrderOverview/RecentOrdersTable) are updated in this phase
 * to read the same model instead of keeping two competing ones.
 */
export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type FulfillmentStatus = "pending" | "preparing" | "packed" | "shipped" | "delivered" | "delivery_failed";

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  pending_payment: { label: "รอชำระเงิน", tone: "warning" },
  confirmed: { label: "ยืนยันแล้ว", tone: "info" },
  processing: { label: "กำลังเตรียมสินค้า", tone: "info" },
  packed: { label: "แพ็กแล้ว", tone: "info" },
  shipped: { label: "จัดส่งแล้ว", tone: "info" },
  delivered: { label: "ส่งสำเร็จ", tone: "success" },
  cancelled: { label: "ยกเลิกแล้ว", tone: "neutral" },
  refunded: { label: "คืนเงินแล้ว", tone: "neutral" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "รอชำระเงิน", tone: "warning" },
  paid: { label: "ชำระเงินแล้ว", tone: "success" },
  failed: { label: "ชำระเงินไม่สำเร็จ", tone: "danger" },
  refunded: { label: "คืนเงินแล้ว", tone: "neutral" },
};

export const FULFILLMENT_STATUS_META: Record<FulfillmentStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "รอดำเนินการ", tone: "neutral" },
  preparing: { label: "กำลังเตรียมสินค้า", tone: "info" },
  packed: { label: "แพ็กแล้ว", tone: "info" },
  shipped: { label: "จัดส่งแล้ว", tone: "info" },
  delivered: { label: "ส่งสำเร็จ", tone: "success" },
  delivery_failed: { label: "จัดส่งไม่สำเร็จ", tone: "danger" },
};

/**
 * PART 4/15 — the only transitions Change Status may offer. Admin can never
 * jump steps (e.g. processing → shipped directly); `packed`/`shipped` are
 * reached one at a time, and cancel is only reachable before packing starts.
 * Refund is only offered from the two natural end states.
 */
export const VALID_NEXT_ORDER_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

const NEXT_STATUS_ACTION_LABEL: Record<OrderStatus, string> = {
  pending_payment: "-",
  confirmed: "ยืนยันคำสั่งซื้อ",
  processing: "เริ่มเตรียมสินค้า",
  packed: "แพ็กสินค้าแล้ว",
  shipped: "จัดส่งสินค้า",
  delivered: "ยืนยันส่งสำเร็จ",
  cancelled: "ยกเลิกคำสั่งซื้อ",
  refunded: "คืนเงิน",
};

export function getNextStatusActions(current: OrderStatus): { status: OrderStatus; label: string }[] {
  return VALID_NEXT_ORDER_STATUS[current].map((status) => ({ status, label: NEXT_STATUS_ACTION_LABEL[status] }));
}

export type OrderCustomer = { id: string; name: string; email: string; phone: string };

export type OrderAddress = {
  recipientName: string;
  phone: string;
  addressLine: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
};

export type OrderLineItem = {
  productId: string;
  name: string;
  sku: string;
  variantLabel?: string;
  image: string;
  qty: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
};

export type OrderTotals = { subtotal: number; discount: number; shippingFee: number; grandTotal: number };

export type OrderPaymentInfo = { method: string; transactionId?: string; paidDate?: string };

export type OrderShippingInfo = { method: string; trackingNumber?: string; courier?: string; address: OrderAddress };

/** One entry per status the order has actually passed through, in order reached — drives the Timeline (PART 14) and updates live when Change Status runs. */
export type OrderStatusHistoryEntry = { status: OrderStatus; date: string };

export type AdminOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  /**
   * Architecture Cleanup & Source of Truth §26/§27 — a real, top-level
   * reference into a future Customer Master (`customer.id` today, since no
   * Customer store exists yet — see `normalizeOrder` for how this backfills
   * on data saved before this field existed). `customer` below stays exactly
   * what it always was: a historical snapshot (Order = Historical Snapshot,
   * §28) — this order's price/name/customer-name-at-purchase-time never
   * changes just because the Customer Master record later does. Phase 05
   * only needs to start writing real Customer ids here; nothing about this
   * order's own snapshot fields changes when that happens.
   */
  customerId: string;
  customer: OrderCustomer;
  items: OrderLineItem[];
  totals: OrderTotals;
  payment: OrderPaymentInfo;
  shipping: OrderShippingInfo;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  statusHistory: OrderStatusHistoryEntry[];
};

/** Same SKU scheme Product Management (adminProductStore.tsx) derives, so an order's line items never disagree with the catalog's own admin-facing SKU. */
function skuForProductId(productId: string): string {
  const index = allProducts.findIndex((p) => p.id === productId);
  return index >= 0 ? `CHM${String(index + 1).padStart(3, "0")}` : productId.toUpperCase();
}

function lineItem(productId: string, qty: number, discount = 0): OrderLineItem {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) throw new Error(`Unknown mock product id: ${productId}`);
  const unitPrice = product.price;
  return {
    productId,
    name: product.name,
    sku: skuForProductId(productId),
    variantLabel: product.variants?.[0]?.label,
    image: product.image,
    qty,
    unitPrice,
    discount,
    lineTotal: unitPrice * qty - discount,
  };
}

function totalsFor(items: OrderLineItem[], shippingFee: number): OrderTotals {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const discount = items.reduce((sum, item) => sum + item.discount, 0);
  return { subtotal, discount, shippingFee, grandTotal: subtotal - discount + shippingFee };
}

const CUSTOMERS: OrderCustomer[] = [
  { id: "cust-1", name: "Thanakrit P.", email: "thanakrit.p@example.com", phone: "089-111-2222" },
  { id: "cust-2", name: "Nutcha S.", email: "nutcha.s@example.com", phone: "089-123-4567" },
  { id: "cust-3", name: "ปาล์มมี่ ก.", email: "palmmy.k@example.com", phone: "081-222-3333" },
  { id: "cust-4", name: "ฝ้าย ธ.", email: "fai.t@example.com", phone: "082-333-4444" },
  { id: "cust-5", name: "มะปราง ว.", email: "maprang.w@example.com", phone: "083-444-5555" },
  { id: "cust-6", name: "ก้อย อ.", email: "koi.a@example.com", phone: "084-555-6666" },
];

/** Same Thai address shape/style as the customer side's own MOCK_ADDRESSES (lib/checkoutData.ts) — a few more, for variety across orders. */
const ADDRESSES: OrderAddress[] = [
  { recipientName: "Thanakrit P.", phone: "089-111-2222", addressLine: "88/12 ซอยสุขุมวิท 31", subDistrict: "คลองตันเหนือ", district: "เขตวัฒนา", province: "กรุงเทพมหานคร", postalCode: "10110" },
  { recipientName: "Nutcha S.", phone: "089-123-4567", addressLine: "อาคารเอ็มไพร์ ชั้น 21 ถนนสาทรใต้", subDistrict: "ยานนาวา", district: "เขตสาทร", province: "กรุงเทพมหานคร", postalCode: "10120" },
  { recipientName: "ปาล์มมี่ ก.", phone: "081-222-3333", addressLine: "199 หมู่ 4 ถนนสุขุมวิท", subDistrict: "บางละมุง", district: "อำเภอบางละมุง", province: "ชลบุรี", postalCode: "20150" },
  { recipientName: "ฝ้าย ธ.", phone: "082-333-4444", addressLine: "45 ถนนนิมมานเหมินท์", subDistrict: "สุเทพ", district: "อำเภอเมืองเชียงใหม่", province: "เชียงใหม่", postalCode: "50200" },
];

const SHIPPING_METHOD_NAMES = ["จัดส่งมาตรฐาน", "จัดส่งด่วน"];
const PAYMENT_METHOD_NAMES = ["บัตรเครดิต / เดบิต", "พร้อมเพย์ (PromptPay)", "เก็บเงินปลายทาง (COD)"];
const COURIERS = ["Kerry Express", "Flash Express", "Thailand Post"];

/** Default payment/fulfillment pairing for each order status — the pairing an order in that state would realistically have. A couple of orders below override this to also demo `failed` payment and `delivery_failed` fulfillment. */
const DEFAULT_PAYMENT_FOR_STATUS: Record<OrderStatus, PaymentStatus> = {
  pending_payment: "pending",
  confirmed: "paid",
  processing: "paid",
  packed: "paid",
  shipped: "paid",
  delivered: "paid",
  cancelled: "pending",
  refunded: "refunded",
};

const DEFAULT_FULFILLMENT_FOR_STATUS: Record<OrderStatus, FulfillmentStatus> = {
  pending_payment: "pending",
  confirmed: "pending",
  processing: "preparing",
  packed: "packed",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "pending",
  refunded: "delivered",
};

/** Canonical happy-path order (excluding the branch-only cancelled/refunded), used to both derive a plausible status history and render the Timeline. */
const HAPPY_PATH = ["confirmed", "processing", "packed", "shipped", "delivered"] as const satisfies readonly OrderStatus[];

function buildStatusHistory(orderStatus: OrderStatus, dates: string[]): OrderStatusHistoryEntry[] {
  const history: OrderStatusHistoryEntry[] = [];
  let dateIndex = 0;
  const nextDate = () => dates[Math.min(dateIndex++, dates.length - 1)];

  if (orderStatus === "cancelled") {
    history.push({ status: "cancelled", date: nextDate() });
    return history;
  }
  if (orderStatus === "refunded") {
    // Most refunds in this mock data happen after a full delivery — walk the whole happy path, then refund.
    for (const step of HAPPY_PATH) history.push({ status: step, date: nextDate() });
    history.push({ status: "refunded", date: nextDate() });
    return history;
  }
  for (const step of HAPPY_PATH) {
    history.push({ status: step, date: nextDate() });
    if (step === orderStatus) break;
  }
  return history;
}

type OrderSeed = {
  orderNumber: string;
  createdAt: string;
  customer: OrderCustomer;
  address: OrderAddress;
  items: [string, number, number?][]; // [productId, qty, discount?]
  orderStatus: OrderStatus;
  shippingFee: number;
  paymentOverride?: PaymentStatus;
  fulfillmentOverride?: FulfillmentStatus;
  historyDates: string[]; // oldest → newest, consumed in order by buildStatusHistory
  transactionId?: string;
  paidDate?: string;
  trackingNumber?: string;
};

const ORDER_SEEDS: OrderSeed[] = [
  { orderNumber: "ORD-2026-1024", createdAt: "17 ก.ย. 2569", customer: CUSTOMERS[0], address: ADDRESSES[0], items: [["flash-1", 2], ["best-3", 1]], orderStatus: "processing", shippingFee: 0, historyDates: ["16 ก.ย. 2569", "17 ก.ย. 2569"], transactionId: "TXN-88213", paidDate: "16 ก.ย. 2569" },
  { orderNumber: "ORD-2026-1023", createdAt: "17 ก.ย. 2569", customer: CUSTOMERS[1], address: ADDRESSES[1], items: [["new-2", 1]], orderStatus: "pending_payment", shippingFee: 60, historyDates: [] },
  { orderNumber: "ORD-2026-1022", createdAt: "16 ก.ย. 2569", customer: CUSTOMERS[2], address: ADDRESSES[2], items: [["trend-1", 2]], orderStatus: "shipped", shippingFee: 0, historyDates: ["13 ก.ย. 2569", "14 ก.ย. 2569", "15 ก.ย. 2569", "16 ก.ย. 2569"], transactionId: "TXN-88190", paidDate: "13 ก.ย. 2569", trackingNumber: "TH482013882KE" },
  { orderNumber: "ORD-2026-1021", createdAt: "16 ก.ย. 2569", customer: CUSTOMERS[3], address: ADDRESSES[3], items: [["feature-1", 1], ["flash-4", 2]], orderStatus: "delivered", shippingFee: 0, historyDates: ["11 ก.ย. 2569", "12 ก.ย. 2569", "13 ก.ย. 2569", "14 ก.ย. 2569", "16 ก.ย. 2569"], transactionId: "TXN-88101", paidDate: "11 ก.ย. 2569", trackingNumber: "TH482013801FL" },
  { orderNumber: "ORD-2026-1020", createdAt: "15 ก.ย. 2569", customer: CUSTOMERS[4], address: ADDRESSES[0], items: [["best-5", 1]], orderStatus: "pending_payment", shippingFee: 60, paymentOverride: "failed", historyDates: [] },
  { orderNumber: "ORD-2026-1019", createdAt: "15 ก.ย. 2569", customer: CUSTOMERS[1], address: ADDRESSES[1], items: [["new-4", 1], ["trend-6", 1]], orderStatus: "delivered", shippingFee: 0, historyDates: ["10 ก.ย. 2569", "11 ก.ย. 2569", "12 ก.ย. 2569", "13 ก.ย. 2569", "15 ก.ย. 2569"], transactionId: "TXN-88056", paidDate: "10 ก.ย. 2569", trackingNumber: "TH482013755TP" },
  { orderNumber: "ORD-2026-1018", createdAt: "14 ก.ย. 2569", customer: CUSTOMERS[5], address: ADDRESSES[2], items: [["flash-7", 1]], orderStatus: "cancelled", shippingFee: 60, historyDates: ["14 ก.ย. 2569"] },
  { orderNumber: "ORD-2026-1017", createdAt: "14 ก.ย. 2569", customer: CUSTOMERS[0], address: ADDRESSES[0], items: [["feature-3", 1], ["best-1", 2], ["new-1", 2]], orderStatus: "delivered", shippingFee: 0, historyDates: ["9 ก.ย. 2569", "10 ก.ย. 2569", "11 ก.ย. 2569", "12 ก.ย. 2569", "14 ก.ย. 2569"], transactionId: "TXN-88012", paidDate: "9 ก.ย. 2569", trackingNumber: "TH482013701KE" },
  { orderNumber: "ORD-2026-1016", createdAt: "13 ก.ย. 2569", customer: CUSTOMERS[2], address: ADDRESSES[2], items: [["trend-3", 1]], orderStatus: "packed", shippingFee: 60, historyDates: ["11 ก.ย. 2569", "12 ก.ย. 2569", "13 ก.ย. 2569"], transactionId: "TXN-87980", paidDate: "11 ก.ย. 2569" },
  { orderNumber: "ORD-2026-1015", createdAt: "13 ก.ย. 2569", customer: CUSTOMERS[3], address: ADDRESSES[3], items: [["flash-2", 1]], orderStatus: "confirmed", shippingFee: 60, historyDates: ["13 ก.ย. 2569"], transactionId: "TXN-87955", paidDate: "13 ก.ย. 2569" },
  { orderNumber: "ORD-2026-1014", createdAt: "12 ก.ย. 2569", customer: CUSTOMERS[4], address: ADDRESSES[0], items: [["best-8", 1], ["new-6", 1]], orderStatus: "shipped", shippingFee: 0, fulfillmentOverride: "delivery_failed", historyDates: ["9 ก.ย. 2569", "10 ก.ย. 2569", "11 ก.ย. 2569", "12 ก.ย. 2569"], transactionId: "TXN-87901", paidDate: "9 ก.ย. 2569", trackingNumber: "TH482013622FL" },
  { orderNumber: "ORD-2026-1013", createdAt: "12 ก.ย. 2569", customer: CUSTOMERS[5], address: ADDRESSES[1], items: [["trend-9", 2]], orderStatus: "refunded", shippingFee: 0, historyDates: ["6 ก.ย. 2569", "7 ก.ย. 2569", "8 ก.ย. 2569", "9 ก.ย. 2569", "11 ก.ย. 2569", "12 ก.ย. 2569"], transactionId: "TXN-87844", paidDate: "6 ก.ย. 2569", trackingNumber: "TH482013590TP" },
  { orderNumber: "ORD-2026-1012", createdAt: "11 ก.ย. 2569", customer: CUSTOMERS[1], address: ADDRESSES[1], items: [["feature-5", 1]], orderStatus: "cancelled", shippingFee: 0, historyDates: ["11 ก.ย. 2569"] },
  { orderNumber: "ORD-2026-1011", createdAt: "11 ก.ย. 2569", customer: CUSTOMERS[0], address: ADDRESSES[0], items: [["flash-9", 1], ["best-10", 1]], orderStatus: "delivered", shippingFee: 0, historyDates: ["6 ก.ย. 2569", "7 ก.ย. 2569", "8 ก.ย. 2569", "9 ก.ย. 2569", "11 ก.ย. 2569"], transactionId: "TXN-87790", paidDate: "6 ก.ย. 2569", trackingNumber: "TH482013544KE" },
  { orderNumber: "ORD-2026-1010", createdAt: "10 ก.ย. 2569", customer: CUSTOMERS[2], address: ADDRESSES[2], items: [["new-8", 1]], orderStatus: "processing", shippingFee: 60, historyDates: ["9 ก.ย. 2569", "10 ก.ย. 2569"], transactionId: "TXN-87755", paidDate: "9 ก.ย. 2569" },
  { orderNumber: "ORD-2026-1009", createdAt: "10 ก.ย. 2569", customer: CUSTOMERS[3], address: ADDRESSES[3], items: [["trend-4", 1], ["flash-11", 1]], orderStatus: "delivered", shippingFee: 0, historyDates: ["5 ก.ย. 2569", "6 ก.ย. 2569", "7 ก.ย. 2569", "8 ก.ย. 2569", "10 ก.ย. 2569"], transactionId: "TXN-87700", paidDate: "5 ก.ย. 2569", trackingNumber: "TH482013488FL" },
  { orderNumber: "ORD-2026-1008", createdAt: "9 ก.ย. 2569", customer: CUSTOMERS[4], address: ADDRESSES[0], items: [["best-6", 2]], orderStatus: "pending_payment", shippingFee: 60, historyDates: [] },
  { orderNumber: "ORD-2026-1007", createdAt: "9 ก.ย. 2569", customer: CUSTOMERS[5], address: ADDRESSES[1], items: [["new-9", 1]], orderStatus: "packed", shippingFee: 0, historyDates: ["7 ก.ย. 2569", "8 ก.ย. 2569", "9 ก.ย. 2569"], transactionId: "TXN-87650", paidDate: "7 ก.ย. 2569" },
];

function buildOrders(): AdminOrder[] {
  return ORDER_SEEDS.map((seed, i) => {
    const items = seed.items.map(([productId, qty, discount]) => lineItem(productId, qty, discount));
    const paymentStatus = seed.paymentOverride ?? DEFAULT_PAYMENT_FOR_STATUS[seed.orderStatus];
    const fulfillmentStatus = seed.fulfillmentOverride ?? DEFAULT_FULFILLMENT_FOR_STATUS[seed.orderStatus];
    return {
      id: seed.orderNumber,
      orderNumber: seed.orderNumber,
      createdAt: seed.createdAt,
      customerId: seed.customer.id,
      customer: seed.customer,
      items,
      totals: totalsFor(items, seed.shippingFee),
      payment: {
        method: PAYMENT_METHOD_NAMES[i % PAYMENT_METHOD_NAMES.length],
        transactionId: seed.transactionId,
        paidDate: seed.paidDate,
      },
      shipping: {
        method: SHIPPING_METHOD_NAMES[seed.shippingFee > 0 ? 1 : 0],
        trackingNumber: seed.trackingNumber,
        courier: seed.trackingNumber ? COURIERS[i % COURIERS.length] : undefined,
        address: seed.address,
      },
      orderStatus: seed.orderStatus,
      paymentStatus,
      fulfillmentStatus,
      statusHistory: buildStatusHistory(seed.orderStatus, seed.historyDates),
    };
  });
}

export const MOCK_ORDERS: AdminOrder[] = buildOrders();

/**
 * Architecture Cleanup & Source of Truth §27 — root-cause guard, same
 * convention as every other Admin store's `normalize*`: an `AdminOrder`
 * persisted to `localStorage` before `customerId` existed on this type
 * (every order saved in an earlier session/phase) comes back out with it
 * `undefined` unless backfilled here. Backfills from `customer.id` — the
 * exact same value `buildOrders()` now seeds it from — so existing orders
 * never lose their customer link; nothing about the `customer` snapshot
 * itself is touched.
 */
export function normalizeOrder(o: AdminOrder): AdminOrder {
  return {
    ...o,
    customerId: o.customerId || o.customer.id,
  };
}

export type OrderTimelineEvent = { key: string; label: string; date?: string; completed: boolean };

const TIMELINE_LABELS: Record<(typeof HAPPY_PATH)[number], string> = {
  confirmed: "ยืนยันการชำระเงิน",
  processing: "กำลังเตรียมสินค้า",
  packed: "แพ็กสินค้าแล้ว",
  shipped: "จัดส่งแล้ว",
  delivered: "จัดส่งสำเร็จ",
};

/** PART 14 — derived from `statusHistory`, not the current status alone, so a Change Status action immediately reflects here with its own date. */
export function buildOrderTimeline(order: Pick<AdminOrder, "createdAt" | "statusHistory">): OrderTimelineEvent[] {
  const events: OrderTimelineEvent[] = [{ key: "created", label: "สร้างคำสั่งซื้อ", date: order.createdAt, completed: true }];
  const findEntry = (status: OrderStatus) => order.statusHistory.find((h) => h.status === status);
  const isCancelled = !!findEntry("cancelled");

  if (isCancelled) {
    const entry = findEntry("cancelled")!;
    events.push({ key: "cancelled", label: "ยกเลิกคำสั่งซื้อ", date: entry.date, completed: true });
    return events;
  }

  for (const step of HAPPY_PATH) {
    const entry = findEntry(step);
    events.push({ key: step, label: TIMELINE_LABELS[step], date: entry?.date, completed: !!entry });
  }

  const refundEntry = findEntry("refunded");
  if (refundEntry) events.push({ key: "refunded", label: "คืนเงินแล้ว", date: refundEntry.date, completed: true });

  return events;
}

/**
 * Full System Regression — Price Format audit: labels used to hardcode
 * "฿500"/"฿1,000" as plain strings, bypassing `formatAdminCurrency` entirely
 * — the exact "formatted per-page instead of through the one utility"
 * mistake the 2-decimal rule exists to prevent. Built from `formatAdminCurrency`
 * instead, so these automatically show "฿500.00" etc. and stay correct if
 * that formatter ever changes again.
 */
export const ORDER_VALUE_BUCKETS = [
  { value: "all", label: "ทุกช่วงราคา", min: 0, max: Infinity },
  { value: "under-500", label: `ต่ำกว่า ${formatAdminCurrency(500)}`, min: 0, max: 500 },
  { value: "500-1000", label: `${formatAdminCurrency(500)} - ${formatAdminCurrency(1000)}`, min: 500, max: 1000 },
  { value: "1000-2000", label: `${formatAdminCurrency(1000)} - ${formatAdminCurrency(2000)}`, min: 1000, max: 2000 },
  { value: "over-2000", label: `มากกว่า ${formatAdminCurrency(2000)}`, min: 2000, max: Infinity },
] as const;
