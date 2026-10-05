import { createSignal, onMount } from "solid-js";
import { isServer } from "solid-js/web";
import { MOCK_ORDERS } from "./accountData";
import type { Order, ReturnRequest } from "./types";

/**
 * Phase 05 — the shopper's purchase history. UI reads orders only through
 * `OrderRepository`, so replacing the mock with the real order API (and
 * shipment events with DHL tracking data, mapped to `TrackingEvent`) means
 * writing one new repository — no UI rewrite.
 *
 * Mock repository: `MOCK_ORDERS` plus this browser's own cancel/return
 * actions, persisted as a small overlay keyed by order id (no backend).
 * `?orders=empty` shows the no-orders state for QA/user testing.
 */
export interface OrderRepository {
  list(): Promise<Order[]>;
  cancel(orderId: string): Promise<Order>;
  requestReturn(orderId: string, request: Omit<ReturnRequest, "requestedAt">): Promise<Order>;
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
  const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 500));
  const all = (): Order[] => {
    if (opts.empty) return [];
    const overlay = readOverlay();
    return MOCK_ORDERS.map((o) => applyOverlay(o, overlay[o.id])).sort((a, b) => b.placedAt.localeCompare(a.placedAt));
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
    async cancel(orderId) {
      await delay();
      return patch(orderId, { status: "cancelled", cancelledAt: new Date().toISOString() });
    },
    async requestReturn(orderId, request) {
      await delay();
      return patch(orderId, { returnRequest: { ...request, requestedAt: new Date().toISOString() } });
    },
    async markPaid(orderId, paymentMethod) {
      return patch(orderId, { status: "preparing", paidAt: new Date().toISOString(), paymentMethod });
    },
  };
}

/** Reactive wrapper for the account pages — loads on mount (client), keeps the list in sync after cancel/return. */
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
    cancel: async (id: string): Promise<void> => {
      replace(await getRepo().cancel(id));
    },
    requestReturn: async (id: string, request: Omit<ReturnRequest, "requestedAt">): Promise<void> => {
      replace(await getRepo().requestReturn(id, request));
    },
    markPaid: async (id: string, paymentMethod: string): Promise<void> => {
      replace(await getRepo().markPaid(id, paymentMethod));
    },
  };
}
