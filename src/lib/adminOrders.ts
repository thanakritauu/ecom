import type { StatusTone } from "~/components/admin/StatusBadge";
import type { Order, ShipmentStatus, TrackingEvent, TrackingStatus } from "./types";
import type { PaymentFailureReason } from "./payment";
import { FAILURE_MESSAGES } from "./payment";
import { allProducts } from "./products";
import { formatAdminCurrency } from "./adminDashboard";
import { MOCK_ORDERS as ACCOUNT_ORDERS, getPaymentStatus as getAccountPaymentStatus } from "./accountData";
import { AVAILABLE_COUPONS, COIN_TO_BAHT_RATE, computeCoinsEarned, computeShippingFee, DELIVERY, GIFT_PROMOTION, PAYMENT_METHODS, type PaymentMethodId } from "./cartSelectors";
import type { TierId } from "./membership";
import { getShipmentStatus, RETURN_REASONS, SHIPMENT_STATUS_META } from "./orderTracking";
import { formatAddress } from "./checkoutData";

/**
 * Order Status Model — SOURCE OF TRUTH is the storefront (`types.ts`
 * `OrderStatus` + `accountData.ts`'s labels). Admin uses the exact same 6
 * codes and Thai labels the shopper sees in บัญชีของฉัน → คำสั่งซื้อ, so a
 * status never reads one way to the customer and another way to staff.
 * Three independent dimensions, same as before: the order lifecycle
 * (`OrderStatus`), payment (`PaymentStatus`), and where the parcel is
 * (`FulfillmentStatus` = the storefront's DHL `ShipmentStatus`).
 */
export type OrderStatus = "pending_payment" | "preparing" | "handed_over" | "shipping" | "completed" | "cancelled";

/** Storefront's `paid`/`pending`/`cancelled` (accountData.ts) + `refunded`, which only an approved return produces. */
export type PaymentStatus = "paid" | "pending" | "cancelled" | "refunded";

/** = storefront `ShipmentStatus`, always derived from the DHL tracking events (`getShipmentStatus`), never set by hand. */
export type FulfillmentStatus = ShipmentStatus;

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  pending_payment: { label: "รอชำระเงิน", tone: "warning" },
  preparing: { label: "กำลังเตรียมการจัดส่ง", tone: "info" },
  handed_over: { label: "ส่งให้บริษัทขนส่ง", tone: "info" },
  shipping: { label: "กำลังจัดส่ง", tone: "info" },
  completed: { label: "ส่งสำเร็จ", tone: "success" },
  cancelled: { label: "ยกเลิกแล้ว", tone: "neutral" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  paid: { label: "ชำระเงินสำเร็จ", tone: "success" },
  pending: { label: "รอชำระเงิน", tone: "warning" },
  cancelled: { label: "ยกเลิกการชำระเงิน", tone: "neutral" },
  refunded: { label: "คืนเงินแล้ว", tone: "neutral" },
};

/** Labels straight from the storefront's `SHIPMENT_STATUS_META`; only the tone is Admin's own. */
export const FULFILLMENT_STATUS_META: Record<FulfillmentStatus, { label: string; tone: StatusTone }> = {
  awaiting_shipment: { label: SHIPMENT_STATUS_META.awaiting_shipment.label, tone: "neutral" },
  shipped: { label: SHIPMENT_STATUS_META.shipped.label, tone: "info" },
  in_transit: { label: SHIPMENT_STATUS_META.in_transit.label, tone: "info" },
  out_for_delivery: { label: SHIPMENT_STATUS_META.out_for_delivery.label, tone: "info" },
  delivered: { label: SHIPMENT_STATUS_META.delivered.label, tone: "success" },
};

/**
 * The only transitions Change Status may offer — one step at a time, same
 * flow as the storefront. Cancel follows the storefront rule
 * (`orderTracking.ts` `canCancelOrder`): only until the parcel is handed to
 * DHL. Returns/refunds aren't a status here — they're a `returnRequest` on a
 * completed order, decided separately.
 */
export const VALID_NEXT_ORDER_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["preparing", "cancelled"],
  preparing: ["handed_over", "cancelled"],
  handed_over: ["shipping"],
  shipping: ["completed"],
  completed: [],
  cancelled: [],
};

const NEXT_STATUS_ACTION_LABEL: Record<OrderStatus, string> = {
  pending_payment: "-",
  preparing: "ยืนยันการชำระเงิน",
  handed_over: "ส่งมอบพัสดุให้ DHL",
  shipping: "อัปเดตเป็นกำลังจัดส่ง",
  completed: "ยืนยันส่งสำเร็จ",
  cancelled: "ยกเลิกคำสั่งซื้อ",
};

export function getNextStatusActions(current: OrderStatus): { status: OrderStatus; label: string }[] {
  return VALID_NEXT_ORDER_STATUS[current].map((status) => ({ status, label: NEXT_STATUS_ACTION_LABEL[status] }));
}

export type OrderCustomer = { id: string; name: string; email: string; phone: string };

/** Same structured Thai fields as the storefront's `Address` (checkoutData.ts), minus its address-book-only `id`/`label`. */
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
  /** The storefront's "ซื้อครบ ฿590 รับฟรี" gift (`GIFT_PROMOTION`) — always unitPrice 0, never counted toward the subtotal. */
  isFreeGift?: boolean;
};

/**
 * `discount` stays the combined coupon + coin amount (receiptResolver.ts
 * and the HTML download still read it); the split fields are what Admin
 * displays — same breakdown as the shopper's own order detail.
 */
export type OrderTotals = {
  subtotal: number;
  couponCode?: string;
  couponDiscount: number;
  coinsRedeemed: number;
  coinDiscount: number;
  discount: number;
  shippingFee: number;
  grandTotal: number;
};

export type OrderPaymentInfo = {
  methodId: PaymentMethodId;
  /** Display label — same 3 labels as Checkout's `PAYMENT_METHODS`. */
  method: string;
  /** What the gateway returned with the charge, e.g. "VISA •••• 4242" / "TrueMoney •••• 4567" (payment.ts `PaymentResult.detail`). */
  detail?: string;
  /** Gateway reference — `MOCK-…` for card/TrueMoney, the `pp_…` session id for PromptPay (same shapes the mock provider issues). */
  transactionId?: string;
  paidDate?: string;
  /** Last attempt failed (payment.ts `PaymentFailureReason`) — the order stays รอชำระเงิน. */
  failureReason?: PaymentFailureReason;
};

/** Field names line up with the storefront's `Shipment`, so its tracking helpers (`orderTracking.ts`) read this directly. */
export type OrderShippingInfo = {
  carrier: "dhl";
  method: string;
  courier: string;
  trackingNumber?: string;
  events: TrackingEvent[];
  address: OrderAddress;
};

/** One-line display with the storefront's own แขวง/เขต (or ตำบล/อำเภอ) prefixing rules. */
export const formatOrderAddress = (a: OrderAddress) => formatAddress({ id: "", label: "", ...a });

/** ที่อยู่ออกใบเสร็จรับเงิน — optional, like Checkout's billing form; `recipientName` may be a company name (`companyAllowed`). */
export type OrderBillingAddress = OrderAddress & { isCompany?: boolean };

export type OrderCancellation = {
  by: "customer" | "admin" | "system";
  /** ISO 8601. */
  at: string;
  reason?: string;
};

export type ReturnRequestStatus = "requested" | "approved" | "rejected";

/** Storefront `ReturnRequest` + the decision Admin makes on it. */
export type OrderReturnRequest = {
  itemIndexes: number[];
  reason: string;
  note?: string;
  /** ISO 8601. */
  requestedAt: string;
  status: ReturnRequestStatus;
  decidedAt?: string;
};

export const RETURN_STATUS_META: Record<ReturnRequestStatus, { label: string; tone: StatusTone }> = {
  requested: { label: "รอตรวจสอบคำขอคืน", tone: "warning" },
  approved: { label: "อนุมัติคืนสินค้า", tone: "success" },
  rejected: { label: "ปฏิเสธคำขอคืน", tone: "danger" },
};

export const CANCELLED_BY_LABEL: Record<OrderCancellation["by"], string> = {
  customer: "ลูกค้ายกเลิก",
  admin: "แอดมินยกเลิก",
  system: "ระบบยกเลิกอัตโนมัติ",
};

export const paymentFailureLabel = (reason: PaymentFailureReason) => FAILURE_MESSAGES[reason].title;

export type AdminOrder = {
  id: string;
  orderNumber: string;
  /** ISO 8601 — sortable; `createdAt` is its display label. */
  placedAt: string;
  createdAt: string;
  /**
   * Architecture Cleanup & Source of Truth §26/§27 — a real reference into
   * the Customer Master; `customer` below stays the historical snapshot
   * (Order = Historical Snapshot, §28).
   */
  customerId: string;
  customer: OrderCustomer;
  items: OrderLineItem[];
  totals: OrderTotals;
  payment: OrderPaymentInfo;
  shipping: OrderShippingInfo;
  billingAddress?: OrderBillingAddress;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  cancellation?: OrderCancellation;
  returnRequest?: OrderReturnRequest;
};

// ---------------------------------------------------------------------------
// Mock "today" + date helpers
// ---------------------------------------------------------------------------

/**
 * Order module's mock "today" — the day of the storefront's newest account
 * order (ORD-2026-1032, 2 ต.ค. 2569), so the shopper's orders and Admin's
 * read as one timeline. New events recorded from Admin are stamped with this
 * date (+ the real wall-clock time).
 */
export const ORDERS_TODAY_ISO_DATE = "2026-10-02";

const TZ = "Asia/Bangkok";

/** "2 ต.ค. 2569" — Admin's usual date-label style. */
export function formatOrderDateLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("th-TH", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
}

/** "2 ต.ค. 2569 09:32 น." */
export function formatOrderDateTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatOrderDateLabel(iso)} ${d.toLocaleTimeString("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })} น.`;
}

/** Whole days between an order's (Bangkok) date and the mock today. */
export function daysBeforeToday(iso: string): number {
  return Math.round((Date.parse(`${ORDERS_TODAY_ISO_DATE}T00:00:00+07:00`) - Date.parse(`${iso.slice(0, 10)}T00:00:00+07:00`)) / 86_400_000);
}

/** A timestamp on the mock today at the current wall-clock time, never earlier than `after` (keeps event order sane). */
export function mockNowIso(after?: string): string {
  const time = new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  const candidate = `${ORDERS_TODAY_ISO_DATE}T${time}:00+07:00`;
  if (after && Date.parse(candidate) <= Date.parse(after)) return new Date(Date.parse(after) + 5 * 60_000).toISOString();
  return candidate;
}

const addHours = (iso: string, hours: number) => {
  const d = new Date(Date.parse(iso) + hours * 3_600_000);
  // Keep the +07:00 form the storefront seeds use, so `slice(0, 10)` is the Bangkok date.
  const local = new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 19);
  return `${local}+07:00`;
};

// ---------------------------------------------------------------------------
// Derivations shared by seeds + store
// ---------------------------------------------------------------------------

/** DHL waybill style: 10 digits (same shape as the storefront's mock numbers, e.g. 5093847261). */
export const DHL_TRACKING_PATTERN = /^\d{10}$/;

export function mockDhlTrackingNumber(seed: number): string {
  return `5092${String((seed * 7919) % 1_000_000).padStart(6, "0")}`;
}

/** Gateway reference in the mock provider's own shapes (payment.ts). */
export function mockPaymentReference(methodId: PaymentMethodId, iso: string): string {
  const stamp = Date.parse(iso).toString(36);
  return methodId === "promptpay" ? `pp_${stamp}` : `MOCK-${stamp.toUpperCase()}`;
}

export const paymentMethodLabel = (id: PaymentMethodId) => PAYMENT_METHODS.find((m) => m.id === id)!.label;

/** Order status the tracking events imply (furthest step reached) — used to move an order forward when an event is recorded. */
export function statusImpliedByEvents(events: TrackingEvent[]): OrderStatus | undefined {
  const has = (s: TrackingStatus) => events.some((e) => e.status === s);
  if (has("delivered")) return "completed";
  if (has("in_transit") || has("out_for_delivery")) return "shipping";
  if (has("shipped")) return "handed_over";
  if (has("ordered") || has("preparing")) return "preparing";
  return undefined;
}

export const ORDER_STATUS_RANK: Record<OrderStatus, number> = {
  pending_payment: 0,
  preparing: 1,
  handed_over: 2,
  shipping: 3,
  completed: 4,
  cancelled: -1,
};

export function deriveFulfillmentStatus(shipping: OrderShippingInfo): FulfillmentStatus {
  return getShipmentStatus(shipping);
}

/** Storefront rule (`canCancelOrder`): cancellable until the parcel is handed to the carrier. */
export function canCancelOrder(order: Pick<AdminOrder, "orderStatus" | "shipping">): boolean {
  return VALID_NEXT_ORDER_STATUS[order.orderStatus].includes("cancelled") && getShipmentStatus(order.shipping) === "awaiting_shipment";
}

/** Refund amount of an approved return = the returned lines' paid total (gift lines are ฿0). */
export function returnRefundAmount(order: Pick<AdminOrder, "items" | "returnRequest">): number {
  return (order.returnRequest?.itemIndexes ?? []).reduce((sum, i) => sum + (order.items[i]?.lineTotal ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Seeds
// ---------------------------------------------------------------------------

/** Same SKU scheme Product Management (adminProductStore.tsx) derives, so an order's line items never disagree with the catalog's own admin-facing SKU. */
function skuForProductId(productId: string): string {
  const index = allProducts.findIndex((p) => p.id === productId);
  return index >= 0 ? `CHM${String(index + 1).padStart(3, "0")}` : productId.toUpperCase();
}

function lineItem(productId: string, qty: number): OrderLineItem {
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
    discount: 0,
    lineTotal: unitPrice * qty,
  };
}

/** GIFT_PROMOTION's product (feature-9), resolved like every other seed line — a ฿0 line, flagged as the gift. */
function giftLineItem(): OrderLineItem {
  return { ...lineItem(GIFT_PROMOTION.productId, GIFT_PROMOTION.qty), unitPrice: 0, lineTotal: 0, isFreeGift: true };
}

/** Adds the gift line when the paid subtotal reaches the promo threshold — same rule as Checkout's `resolveGiftPromotion`. */
function withGift(items: OrderLineItem[]): OrderLineItem[] {
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  return subtotal >= GIFT_PROMOTION.threshold ? [...items, giftLineItem()] : items;
}

function totalsFor(items: OrderLineItem[], opts: { couponCode?: string; coinsRedeemed?: number }): OrderTotals {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const coupon = opts.couponCode ? AVAILABLE_COUPONS.find((c) => c.code === opts.couponCode) : undefined;
  const couponDiscount = coupon && subtotal >= coupon.minSpend ? coupon.discount : 0;
  const coinsRedeemed = opts.coinsRedeemed ?? 0;
  const coinDiscount = Math.round(coinsRedeemed * COIN_TO_BAHT_RATE);
  // Storefront rule: DHL standard ฿60 below ฿990 of products, free from there.
  const shippingFee = computeShippingFee(subtotal);
  return {
    subtotal,
    couponCode: couponDiscount > 0 ? opts.couponCode : undefined,
    couponDiscount,
    coinsRedeemed,
    coinDiscount,
    discount: couponDiscount + coinDiscount,
    shippingFee,
    grandTotal: Math.max(0, subtotal - couponDiscount - coinDiscount + shippingFee),
  };
}

/**
 * Phase 05 — exported so `adminCustomers.ts`'s mock Customer seed can be
 * built from these exact same 6 records. cust-2 (Nutcha S.) is the
 * storefront's own signed-in persona (`accountData.ts` `MOCK_USER`).
 */
export const CUSTOMERS: OrderCustomer[] = [
  { id: "cust-1", name: "Thanakrit P.", email: "thanakrit.p@example.com", phone: "089-111-2222" },
  { id: "cust-2", name: "Nutcha S.", email: "nutcha.s@example.com", phone: "089-123-4567" },
  { id: "cust-3", name: "ปาล์มมี่ ก.", email: "palmmy.k@example.com", phone: "081-222-3333" },
  { id: "cust-4", name: "ฝ้าย ธ.", email: "fai.t@example.com", phone: "082-333-4444" },
  { id: "cust-5", name: "มะปราง ว.", email: "maprang.w@example.com", phone: "083-444-5555" },
  { id: "cust-6", name: "ก้อย อ.", email: "koi.a@example.com", phone: "084-555-6666" },
];

/**
 * Each admin-seed customer's own shipping address (same Thai shape/style as
 * the customer side's MOCK_ADDRESSES, lib/checkoutData.ts) — indexed like
 * `CUSTOMERS`, so an order never ships to someone else's name. Nutcha's
 * (cust-2) orders are all the storefront's own, built from `accountData.ts`.
 */
const ADDRESSES: OrderAddress[] = [
  { recipientName: "Thanakrit P.", phone: "089-111-2222", addressLine: "129/45 หมู่บ้านพฤกษาวิลล์ ซอยลาดพร้าว 101", subDistrict: "คลองจั่น", district: "เขตบางกะปิ", province: "กรุงเทพมหานคร", postalCode: "10240" },
  { recipientName: "Nutcha S.", phone: "089-123-4567", addressLine: "อาคารเอ็มไพร์ ชั้น 21 ถนนสาทรใต้", subDistrict: "ยานนาวา", district: "เขตสาทร", province: "กรุงเทพมหานคร", postalCode: "10120" },
  { recipientName: "ปาล์มมี่ ก.", phone: "081-222-3333", addressLine: "199 หมู่ 4 ถนนสุขุมวิท", subDistrict: "บางละมุง", district: "อำเภอบางละมุง", province: "ชลบุรี", postalCode: "20150" },
  { recipientName: "ฝ้าย ธ.", phone: "082-333-4444", addressLine: "45 ถนนนิมมานเหมินท์", subDistrict: "สุเทพ", district: "อำเภอเมืองเชียงใหม่", province: "เชียงใหม่", postalCode: "50200" },
  { recipientName: "มะปราง ว.", phone: "083-444-5555", addressLine: "212 ถนนมิตรภาพ", subDistrict: "ในเมือง", district: "อำเภอเมืองขอนแก่น", province: "ขอนแก่น", postalCode: "40000" },
  { recipientName: "ก้อย อ.", phone: "084-555-6666", addressLine: "17 ถนนถลาง", subDistrict: "ตลาดใหญ่", district: "อำเภอเมืองภูเก็ต", province: "ภูเก็ต", postalCode: "83000" },
];

const COMPANY_BILLING: OrderBillingAddress = {
  recipientName: "บริษัท ฟ้าใส บิวตี้ จำกัด (สำนักงานใหญ่)",
  phone: "02-123-4567",
  addressLine: "999/9 อาคารเดอะออฟฟิศ ชั้น 12 ถนนพระราม 4",
  subDistrict: "คลองเตย",
  district: "เขตคลองเตย",
  province: "กรุงเทพมหานคร",
  postalCode: "10110",
  isCompany: true,
};

const SHIPPING_METHOD = DELIVERY.method;

/** DHL hand-over → delivery scans, same wording/locations as the storefront's account orders. */
function standardEvents(placedAt: string, upTo: TrackingStatus, address: OrderAddress): TrackingEvent[] {
  const branch = `DHL สาขา${address.district.replace(/^(เขต|อำเภอ)/, "")}`;
  const all: TrackingEvent[] = [
    { status: "ordered", timestamp: placedAt, description: "ได้รับคำสั่งซื้อและชำระเงินเรียบร้อย" },
    { status: "preparing", timestamp: addHours(placedAt, 5), description: "Charmiss กำลังแพ็กสินค้าของคุณ" },
    { status: "shipped", timestamp: addHours(placedAt, 25), description: "ส่งมอบพัสดุให้ DHL แล้ว", location: "คลังสินค้า Charmiss บางนา" },
    { status: "in_transit", timestamp: addHours(placedAt, 35), description: "พัสดุถึงศูนย์คัดแยก", location: "DHL Hub บางพลี" },
    { status: "out_for_delivery", timestamp: addHours(placedAt, 47), description: "พนักงานกำลังนำส่งพัสดุ", location: branch },
    { status: "delivered", timestamp: addHours(placedAt, 52), description: `จัดส่งสำเร็จ ผู้รับ: ${address.recipientName}`, location: address.province },
  ];
  const stop = all.findIndex((e) => e.status === upTo);
  return all.slice(0, stop + 1);
}

type CardDetail = { brand: "VISA" | "MASTERCARD" | "JCB"; last4: string };

type OrderSeed = {
  seq: number;
  placedAt: string;
  customer: OrderCustomer;
  address: OrderAddress;
  billing?: OrderBillingAddress;
  items: [string, number][]; // [productId, qty]
  orderStatus: OrderStatus;
  methodId: PaymentMethodId;
  card?: CardDetail;
  couponCode?: string;
  coinsRedeemed?: number;
  failureReason?: PaymentFailureReason;
  cancellation?: Omit<OrderCancellation, "at"> & { afterHours: number };
  returnRequest?: Omit<OrderReturnRequest, "requestedAt" | "decidedAt"> & { afterHours: number };
};

/**
 * Admin-only seeds (the other customers — Nutcha's orders are exactly the
 * ones her storefront account shows, below). Numbered
 * 1007–1024 (before the storefront's account orders 1025–1032) and
 * 1033–1036 (after them, same day as the mock today), so the one
 * `ORD-2026-<seq>` sequence stays chronological.
 */
const ADMIN_ORDER_SEEDS: OrderSeed[] = [
  { seq: 1036, placedAt: "2026-10-02T11:50:00+07:00", customer: CUSTOMERS[3], address: ADDRESSES[3], billing: COMPANY_BILLING, items: [["feature-10", 1], ["new-3", 1], ["trend-8", 1]], orderStatus: "preparing", methodId: "truemoney", coinsRedeemed: 800 },
  { seq: 1035, placedAt: "2026-10-02T11:15:00+07:00", customer: CUSTOMERS[0], address: ADDRESSES[0], items: [["flash-4", 1], ["best-4", 1]], orderStatus: "pending_payment", methodId: "promptpay" },
  { seq: 1034, placedAt: "2026-10-02T10:40:00+07:00", customer: CUSTOMERS[4], address: ADDRESSES[4], items: [["trend-2", 1]], orderStatus: "pending_payment", methodId: "card", card: { brand: "VISA", last4: "0002" }, failureReason: "card_declined" },
  { seq: 1033, placedAt: "2026-10-02T10:05:00+07:00", customer: CUSTOMERS[2], address: ADDRESSES[2], items: [["best-2", 1], ["new-7", 1]], orderStatus: "preparing", methodId: "card", card: { brand: "VISA", last4: "4242" }, couponCode: "SAVE50" },
  { seq: 1024, placedAt: "2026-09-10T20:15:00+07:00", customer: CUSTOMERS[0], address: ADDRESSES[0], items: [["flash-1", 2], ["best-3", 1]], orderStatus: "completed", methodId: "card", card: { brand: "MASTERCARD", last4: "5100" } },
  { seq: 1023, placedAt: "2026-09-10T13:02:00+07:00", customer: CUSTOMERS[4], address: ADDRESSES[4], items: [["new-2", 1]], orderStatus: "cancelled", methodId: "promptpay", cancellation: { by: "system", reason: "ไม่ชำระเงินภายในเวลาที่กำหนด", afterHours: 24 } },
  { seq: 1022, placedAt: "2026-09-09T19:40:00+07:00", customer: CUSTOMERS[2], address: ADDRESSES[2], items: [["trend-1", 2]], orderStatus: "completed", methodId: "truemoney", couponCode: "SAVE20" },
  { seq: 1021, placedAt: "2026-09-09T13:25:00+07:00", customer: CUSTOMERS[3], address: ADDRESSES[3], items: [["feature-1", 1], ["flash-4", 2]], orderStatus: "completed", methodId: "card", card: { brand: "VISA", last4: "4242" }, returnRequest: { itemIndexes: [1], reason: RETURN_REASONS[1], note: "ฝาตลับแตกตั้งแต่เปิดกล่อง", status: "requested", afterHours: 120 } },
  { seq: 1020, placedAt: "2026-09-09T08:10:00+07:00", customer: CUSTOMERS[4], address: ADDRESSES[4], items: [["best-5", 1]], orderStatus: "cancelled", methodId: "card", card: { brand: "VISA", last4: "9995" }, failureReason: "insufficient_funds", cancellation: { by: "system", reason: "ไม่ชำระเงินภายในเวลาที่กำหนด", afterHours: 24 } },
  { seq: 1019, placedAt: "2026-09-08T18:12:00+07:00", customer: CUSTOMERS[0], address: ADDRESSES[0], items: [["new-4", 1], ["trend-6", 1]], orderStatus: "completed", methodId: "promptpay" },
  { seq: 1018, placedAt: "2026-09-08T10:48:00+07:00", customer: CUSTOMERS[5], address: ADDRESSES[5], items: [["flash-7", 1]], orderStatus: "cancelled", methodId: "card", card: { brand: "JCB", last4: "0505" }, cancellation: { by: "customer", reason: "สั่งซื้อซ้ำ", afterHours: 1 } },
  { seq: 1017, placedAt: "2026-09-07T21:30:00+07:00", customer: CUSTOMERS[0], address: ADDRESSES[0], items: [["feature-3", 1], ["best-1", 2], ["new-1", 2]], orderStatus: "completed", methodId: "card", card: { brand: "MASTERCARD", last4: "5100" }, couponCode: "SAVE50" },
  { seq: 1016, placedAt: "2026-09-07T15:05:00+07:00", customer: CUSTOMERS[2], address: ADDRESSES[2], items: [["trend-3", 1]], orderStatus: "completed", methodId: "promptpay" },
  { seq: 1015, placedAt: "2026-09-07T09:20:00+07:00", customer: CUSTOMERS[3], address: ADDRESSES[3], items: [["flash-2", 1]], orderStatus: "completed", methodId: "truemoney" },
  { seq: 1014, placedAt: "2026-09-06T20:55:00+07:00", customer: CUSTOMERS[4], address: ADDRESSES[4], items: [["best-8", 1], ["new-6", 1]], orderStatus: "completed", methodId: "card", card: { brand: "VISA", last4: "1881" }, returnRequest: { itemIndexes: [0], reason: RETURN_REASONS[4], note: undefined, status: "rejected", afterHours: 360 } },
  { seq: 1013, placedAt: "2026-09-06T12:35:00+07:00", customer: CUSTOMERS[5], address: ADDRESSES[5], items: [["trend-9", 3]], orderStatus: "completed", methodId: "card", card: { brand: "VISA", last4: "4242" }, returnRequest: { itemIndexes: [0], reason: RETURN_REASONS[0], note: "ได้รับเฉดสีไม่ตรงกับที่สั่ง", status: "approved", afterHours: 72 } },
  { seq: 1012, placedAt: "2026-09-05T19:10:00+07:00", customer: CUSTOMERS[2], address: ADDRESSES[2], items: [["feature-5", 1]], orderStatus: "cancelled", methodId: "card", card: { brand: "VISA", last4: "4242" }, cancellation: { by: "customer", reason: "ต้องการเปลี่ยนตัวเลือกสินค้า", afterHours: 2 } },
  { seq: 1011, placedAt: "2026-09-05T10:45:00+07:00", customer: CUSTOMERS[0], address: ADDRESSES[0], billing: COMPANY_BILLING, items: [["flash-9", 1], ["best-10", 1]], orderStatus: "completed", methodId: "card", card: { brand: "MASTERCARD", last4: "5100" }, couponCode: "SAVE20" },
  { seq: 1010, placedAt: "2026-09-04T20:30:00+07:00", customer: CUSTOMERS[2], address: ADDRESSES[2], items: [["new-8", 1]], orderStatus: "completed", methodId: "promptpay" },
  { seq: 1009, placedAt: "2026-09-04T11:00:00+07:00", customer: CUSTOMERS[3], address: ADDRESSES[3], items: [["trend-4", 1], ["flash-11", 1]], orderStatus: "completed", methodId: "truemoney", coinsRedeemed: 300 },
  { seq: 1008, placedAt: "2026-09-03T17:25:00+07:00", customer: CUSTOMERS[4], address: ADDRESSES[4], items: [["best-6", 2]], orderStatus: "cancelled", methodId: "promptpay", cancellation: { by: "system", reason: "ไม่ชำระเงินภายในเวลาที่กำหนด", afterHours: 24 } },
  { seq: 1007, placedAt: "2026-09-03T09:40:00+07:00", customer: CUSTOMERS[5], address: ADDRESSES[5], items: [["new-9", 1]], orderStatus: "completed", methodId: "promptpay" },
];

const TRACKING_STEP_FOR_STATUS: Partial<Record<OrderStatus, TrackingStatus>> = {
  preparing: "ordered",
  handed_over: "shipped",
  shipping: "in_transit",
  completed: "delivered",
};

function paymentDetail(methodId: PaymentMethodId, card: CardDetail | undefined, phone: string): string | undefined {
  if (methodId === "card") return card ? `${card.brand} •••• ${card.last4}` : undefined;
  if (methodId === "truemoney") return `TrueMoney •••• ${phone.replace(/\D/g, "").slice(-4)}`;
  return undefined;
}

function buildAdminSeedOrder(seed: OrderSeed): AdminOrder {
  const orderNumber = `ORD-2026-${seed.seq}`;
  const items = withGift(seed.items.map(([productId, qty]) => lineItem(productId, qty)));
  const isPaid = seed.orderStatus !== "pending_payment" && seed.orderStatus !== "cancelled";
  const step = TRACKING_STEP_FOR_STATUS[seed.orderStatus];
  const events = step ? standardEvents(seed.placedAt, step, seed.address) : [];
  const shipping: OrderShippingInfo = {
    carrier: "dhl",
    method: SHIPPING_METHOD,
    courier: "DHL",
    trackingNumber: events.some((e) => e.status === "shipped") ? mockDhlTrackingNumber(seed.seq) : undefined,
    events,
    address: seed.address,
  };
  const returnRequest: OrderReturnRequest | undefined = seed.returnRequest && {
    itemIndexes: seed.returnRequest.itemIndexes,
    reason: seed.returnRequest.reason,
    note: seed.returnRequest.note,
    status: seed.returnRequest.status,
    requestedAt: addHours(seed.placedAt, seed.returnRequest.afterHours),
    decidedAt: seed.returnRequest.status === "requested" ? undefined : addHours(seed.placedAt, seed.returnRequest.afterHours + 20),
  };
  const paymentStatus: PaymentStatus = returnRequest?.status === "approved" ? "refunded" : isPaid ? "paid" : seed.orderStatus === "cancelled" ? "cancelled" : "pending";
  return {
    id: orderNumber,
    orderNumber,
    placedAt: seed.placedAt,
    createdAt: formatOrderDateLabel(seed.placedAt),
    customerId: seed.customer.id,
    customer: seed.customer,
    items,
    totals: totalsFor(items, { couponCode: seed.couponCode, coinsRedeemed: seed.coinsRedeemed }),
    payment: {
      methodId: seed.methodId,
      method: paymentMethodLabel(seed.methodId),
      detail: paymentDetail(seed.methodId, seed.card, seed.customer.phone),
      transactionId: isPaid ? mockPaymentReference(seed.methodId, seed.placedAt) : undefined,
      paidDate: isPaid ? formatOrderDateLabel(seed.placedAt) : undefined,
      failureReason: seed.failureReason,
    },
    shipping,
    billingAddress: seed.billing,
    orderStatus: seed.orderStatus,
    paymentStatus,
    fulfillmentStatus: deriveFulfillmentStatus(shipping),
    cancellation: seed.cancellation && { by: seed.cancellation.by, reason: seed.cancellation.reason, at: addHours(seed.placedAt, seed.cancellation.afterHours) },
    returnRequest,
  };
}

/** Admin-facing SKUs for the account orders' snapshot items (they were never added to the PDP catalog — see accountData.ts). */
const ACCOUNT_ITEM_SKU: Record<string, string> = {
  "ลิปทินท์ Y2K Glow": "CHM-LIP-Y2K",
  "รองพื้น Soft Matte": "CHM-FDN-SMT",
  "บลัชออนแบบแท่ง": "CHM-BLS-STK",
};

/** Mock card per account order (Checkout's success test card is a VISA 4242). */
const ACCOUNT_CARD: CardDetail = { brand: "VISA", last4: "4242" };

/**
 * The storefront's own account orders (Nutcha S. = cust-2), read straight
 * from `accountData.ts` so items/statuses/tracking can't drift from what the
 * shopper sees. Its gift line (`isGift`) is the storefront's own — mapped to
 * the catalog gift line here, never added a second time — and coupon code,
 * coins and the DHL fee are re-derived with the same rules, so the totals
 * equal the account's.
 */
function buildFromAccountOrder(order: Order): AdminOrder {
  const methodId = (PAYMENT_METHODS.find((m) => m.label === order.payment.method)?.id ?? "card") as PaymentMethodId;
  const items: OrderLineItem[] = order.items.map((item) =>
    item.isGift
      ? giftLineItem()
      : {
          productId: `account:${ACCOUNT_ITEM_SKU[item.name] ?? item.name}`,
          name: item.name,
          sku: ACCOUNT_ITEM_SKU[item.name] ?? "-",
          variantLabel: item.variantLabel,
          image: item.image,
          qty: item.qty,
          unitPrice: item.price,
          discount: 0,
          lineTotal: item.price * item.qty,
        },
  );
  const accountPayment = getAccountPaymentStatus(order);
  const paidEvent = order.shipment.events.find((e) => e.status === "ordered");
  const isPaid = accountPayment === "paid";
  const address = order.shippingAddress;
  const shippingAddress: OrderAddress = {
    recipientName: address.recipientName,
    phone: address.phone,
    addressLine: address.addressLine,
    subDistrict: address.subDistrict,
    district: address.district,
    province: address.province,
    postalCode: address.postalCode,
  };
  const shipping: OrderShippingInfo = {
    carrier: "dhl",
    method: SHIPPING_METHOD,
    courier: "DHL",
    trackingNumber: order.shipment.trackingNumber,
    events: order.shipment.events,
    address: shippingAddress,
  };
  return {
    id: order.id,
    orderNumber: order.id,
    placedAt: order.placedAt,
    createdAt: formatOrderDateLabel(order.placedAt),
    customerId: CUSTOMERS[1].id,
    customer: CUSTOMERS[1],
    items,
    totals: totalsFor(items, { couponCode: order.payment.couponCode, coinsRedeemed: Math.round(order.payment.coinDiscount / COIN_TO_BAHT_RATE) }),
    payment: {
      methodId,
      method: paymentMethodLabel(methodId),
      detail: paymentDetail(methodId, ACCOUNT_CARD, CUSTOMERS[1].phone),
      transactionId: isPaid ? mockPaymentReference(methodId, paidEvent?.timestamp ?? order.placedAt) : undefined,
      paidDate: isPaid ? formatOrderDateLabel(paidEvent?.timestamp ?? order.placedAt) : undefined,
    },
    shipping,
    orderStatus: order.status,
    paymentStatus: accountPayment,
    fulfillmentStatus: deriveFulfillmentStatus(shipping),
    cancellation: order.cancelledAt ? { by: "customer", at: order.cancelledAt } : undefined,
    returnRequest: order.returnRequest && { ...order.returnRequest, status: "requested" },
  };
}

/** Newest first — `customerResolvers.ts`'s `getCustomerLastOrder` relies on this order. */
export const MOCK_ORDERS: AdminOrder[] = [...ADMIN_ORDER_SEEDS.map(buildAdminSeedOrder), ...ACCOUNT_ORDERS.map(buildFromAccountOrder)].sort((a, b) =>
  b.placedAt.localeCompare(a.placedAt),
);

/**
 * One order's Charmiss Coin movements, with the storefront's own rules
 * (`/account/points`): redeemed coins unless the order was cancelled; earned
 * on the amount paid excl. shipping × the customer's tier multiplier —
 * credited once delivered ("earned"), until then "pending"; nothing on an
 * unpaid, cancelled or refunded order.
 */
export function orderCoinMovements(order: AdminOrder, tier: TierId): { used: number; earned: number; state?: "earned" | "pending" } {
  const used = order.orderStatus === "cancelled" ? 0 : order.totals.coinsRedeemed;
  const earns = order.orderStatus !== "cancelled" && order.orderStatus !== "pending_payment" && order.paymentStatus !== "refunded";
  if (!earns) return { used, earned: 0 };
  return { used, earned: computeCoinsEarned(order.totals.grandTotal - order.totals.shippingFee, tier), state: order.orderStatus === "completed" ? "earned" : "pending" };
}

/** Coins a customer's seed orders add to their balance: delivered earnings minus redemptions (pending earnings aren't credited yet). */
export function customerOrderCoinNet(customerId: string, tier: TierId, orders: AdminOrder[] = MOCK_ORDERS): number {
  return orders
    .filter((o) => o.customerId === customerId)
    .reduce((sum, o) => {
      const m = orderCoinMovements(o, tier);
      return sum - m.used + (m.state === "earned" ? m.earned : 0);
    }, 0);
}

/**
 * Same convention as every other Admin store's `normalize*`: backfills
 * `customerId` from `customer.id` and re-derives `fulfillmentStatus` from
 * the tracking events (it's never independently edited).
 */
export function normalizeOrder(o: AdminOrder): AdminOrder {
  return {
    ...o,
    customerId: o.customerId || o.customer.id,
    fulfillmentStatus: deriveFulfillmentStatus(o.shipping),
  };
}

/**
 * Full System Regression — Price Format audit: bucket labels are built from
 * `formatAdminCurrency`, never hardcoded "฿500" strings.
 */
export const ORDER_VALUE_BUCKETS = [
  { value: "all", label: "ทุกช่วงราคา", min: 0, max: Infinity },
  { value: "under-500", label: `ต่ำกว่า ${formatAdminCurrency(500)}`, min: 0, max: 500 },
  { value: "500-1000", label: `${formatAdminCurrency(500)} - ${formatAdminCurrency(1000)}`, min: 500, max: 1000 },
  { value: "1000-2000", label: `${formatAdminCurrency(1000)} - ${formatAdminCurrency(2000)}`, min: 1000, max: 2000 },
  { value: "over-2000", label: `มากกว่า ${formatAdminCurrency(2000)}`, min: 2000, max: Infinity },
] as const;
