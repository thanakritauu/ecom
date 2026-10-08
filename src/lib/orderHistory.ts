import { createRoot, createSignal, onMount } from "solid-js";
import { isServer } from "solid-js/web";
import { applyPaymentDeadline, MOCK_ORDERS } from "./accountData";
import type { Order, OrderItem } from "./types";

/**
 * Phase 05 — the shopper's purchase history. UI reads orders only through
 * `OrderRepository`, so replacing the mock with the real order API (and
 * shipment events with DHL tracking data, mapped to `TrackingEvent`) means
 * writing one new repository — no UI rewrite.
 *
 * Mock repository: `MOCK_ORDERS` plus this browser's own late payments,
 * persisted as a small overlay keyed by order id (no backend). Unpaid orders
 * past `PAYMENT_WINDOW_HOURS` are read as auto-cancelled (`applyPaymentDeadline`). Cancelling
 * and returns aren't self-serve — the shopper contacts LINE @Charmiss.
 * `?orders=empty` shows the no-orders state for QA/user testing.
 */
export interface OrderRepository {
  list(): Promise<Order[]>;
  /** A pending-payment order paid later from the account ("ชำระเงิน" → `/account/orders/:id/pay`). */
  markPaid(orderId: string, paymentMethod: string): Promise<Order>;
}

type OrderOverlay = Record<
  string,
  Pick<Order, "status" | "cancelledAt" | "returnRequest"> & {
    /** ISO — set when a pending order is paid from the account. */
    paidAt?: string;
    paymentMethod?: string;
  }
>;

/** Applies this browser's overlay: status/cancel/return as-is; a late payment also records the method and the "ordered" step. */
function applyOverlay(order: Order, change: OrderOverlay[string] | undefined): Order {
  if (!change) return order;
  const { paidAt, paymentMethod, ...rest } = change;
  const merged: Order = { ...order, ...rest };
  if (paidAt) {
    merged.payment = { ...order.payment, method: paymentMethod ?? order.payment.method };
    merged.shipment = { ...order.shipment, events: [{ status: "ordered", timestamp: paidAt, description: "ได้รับการชำระเงินเรียบร้อย" }, ...order.shipment.events] };
  }
  return merged;
}
const OVERLAY_KEY = "charmiss:orders:overlay";

function readOverlay(): OrderOverlay {
  if (isServer) return {};
  try {
    return JSON.parse(localStorage.getItem(OVERLAY_KEY) ?? "{}") as OrderOverlay;
  } catch {
    return {};
  }
}

function writeOverlay(overlay: OrderOverlay) {
  try {
    localStorage.setItem(OVERLAY_KEY, JSON.stringify(overlay));
  } catch {}
}

export function createMockOrderRepository(opts: { empty?: boolean } = {}): OrderRepository {
  const all = (): Order[] => {
    if (opts.empty) return [];
    const overlay = readOverlay();
    return MOCK_ORDERS.map((o) => applyPaymentDeadline(applyOverlay(o, overlay[o.id]))).sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  };
  const patch = (orderId: string, change: Partial<OrderOverlay[string]>) => {
    const order = all().find((o) => o.id === orderId);
    if (!order) throw new Error("ORDER_NOT_FOUND");
    const overlay = readOverlay();
    overlay[orderId] = { ...overlay[orderId], status: order.status, cancelledAt: order.cancelledAt, returnRequest: order.returnRequest, ...change };
    writeOverlay(overlay);
    return all().find((o) => o.id === orderId)!;
  };

  return {
    async list() {
      return all();
    },
    async markPaid(orderId, paymentMethod) {
      return patch(orderId, { status: "preparing", paidAt: new Date().toISOString(), paymentMethod });
    },
  };
}

/** Reactive wrapper for the account pages — loads on mount (client), keeps the list in sync after a late payment. */
export function createOrderHistory(resolveRepo: () => OrderRepository) {
  const [orders, setOrders] = createSignal<Order[]>([]);
  const [ready, setReady] = createSignal(false);
  let repo: OrderRepository | undefined;
  const getRepo = () => (repo ??= resolveRepo());

  const replace = (updated: Order) => setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));

  onMount(async () => {
    setOrders(await getRepo().list());
    setReady(true);
  });

  return {
    orders,
    ready,
    getById: (id: string) => orders().find((o) => o.id === id),
    markPaid: async (id: string, paymentMethod: string): Promise<void> => {
      replace(await getRepo().markPaid(id, paymentMethod));
    },
  };
}

/**
 * Shopper's own product reviews on delivered orders ("รีวิว" on the order
 * card). Mock: kept in this browser's localStorage per order + item; a module
 * signal so the card flips to "รีวิวแล้ว" the moment the modal saves. The
 * real API would post these to the product's reviews instead.
 */
export type OrderItemReview = { rating: number; text: string; reviewedAt: string; media?: ReviewMediaMeta[] };
/** A photo/video attached to a review. Only name + type are persisted (no blobs in localStorage); the preview URL lives in `reviewMediaPreviews` for this session. */
export type ReviewMediaMeta = { name: string; type: string };
export type ReviewMedia = ReviewMediaMeta & { url?: string };
type ReviewStore = Record<string, Record<string, OrderItemReview>>;

const REVIEWS_KEY = "charmiss:orders:reviews";
const [reviewStore, setReviewStore] = createRoot(() => createSignal<ReviewStore>({}));
let reviewsLoaded = false;

function loadReviews() {
  if (isServer || reviewsLoaded) return;
  reviewsLoaded = true;
  try {
    setReviewStore(JSON.parse(localStorage.getItem(REVIEWS_KEY) ?? "{}") as ReviewStore);
  } catch {}
}

/** Order lines carry no product id — name + option is unique within an order. */
export const orderItemKey = (item: OrderItem) => `${item.name}|${item.variantLabel}`;

/** Lines a shopper can review — the free gift isn't something they chose, so it's skipped. */
export const reviewableItems = (order: Order) => order.items.filter((item) => !item.isGift);

export const canReviewOrder = (order: Order) => order.status === "completed" && !order.returnRequest && reviewableItems(order).length > 0;

export function getOrderReviews(orderId: string): Record<string, OrderItemReview> {
  loadReviews();
  return reviewStore()[orderId] ?? {};
}

export function isOrderReviewed(order: Order) {
  const saved = getOrderReviews(order.id);
  return reviewableItems(order).every((item) => saved[orderItemKey(item)]);
}

export async function saveOrderReviews(orderId: string, reviews: Record<string, Omit<OrderItemReview, "reviewedAt">>) {
  await new Promise<void>((resolve) => setTimeout(resolve, 600));
  loadReviews();
  const reviewedAt = new Date().toISOString();
  const next: ReviewStore = { ...reviewStore() };
  next[orderId] = { ...next[orderId] };
  for (const [key, r] of Object.entries(reviews)) next[orderId][key] = { ...r, reviewedAt };
  setReviewStore(next);
  try {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(next));
  } catch {}
}

/** Average of the stars the shopper gave this order's items (undefined until reviewed). */
export function getOrderRating(order: Order): number | undefined {
  const saved = getOrderReviews(order.id);
  const ratings = reviewableItems(order).map((item) => saved[orderItemKey(item)]?.rating).filter((r): r is number => !!r);
  return ratings.length ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : undefined;
}

/**
 * This session's object URLs for review photos/videos, keyed `orderId` →
 * item key — reopening the review shows the real thumbnails until reload;
 * after that only the saved names remain (mock — the real API uploads the files).
 */
export const reviewMediaPreviews = new Map<string, Record<string, ReviewMedia[]>>();
