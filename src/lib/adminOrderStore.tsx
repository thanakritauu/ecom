import { createContext, createSignal, onMount, useContext, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import type { TrackingEvent } from "./types";
import {
  MOCK_ORDERS,
  ORDER_STATUS_RANK,
  VALID_NEXT_ORDER_STATUS,
  DHL_TRACKING_PATTERN,
  formatOrderDateLabel,
  mockNowIso,
  mockPaymentReference,
  normalizeOrder,
  statusImpliedByEvents,
  type AdminOrder,
  type OrderStatus,
  type ReturnRequestStatus,
} from "./adminOrders";

const STORAGE_KEY = "charmiss:admin:orders";
/**
 * v2 = storefront-aligned model (6 storefront statuses, DHL tracking
 * events, split totals, returns). Anything saved under the old shape (a
 * bare array, v1) is dropped in favour of the fresh seed — its statuses
 * ("processing", "shipped", ...) no longer exist, so there's nothing safe
 * to migrate field by field. v3 = DHL ฿60 below ฿990, coupon codes /
 * gift lines / coins from the storefront's account orders, each seed
 * customer's own address — older copies reseed the same way.
 */
const STORAGE_VERSION = 3;

function persist(orders: AdminOrder[]) {
  if (isServer) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, orders }));
  } catch {
    // storage can be unavailable (private mode / quota) — state just stays in-memory for this tab.
  }
}

function readPersisted(): AdminOrder[] | null {
  if (isServer) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; orders?: AdminOrder[] } | AdminOrder[];
    if (Array.isArray(parsed) || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.orders)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.orders.map(normalizeOrder);
  } catch {
    return null;
  }
}

/** The DHL scan each status change records — same wording/locations as the storefront's account orders. */
function eventForStatus(order: AdminOrder, next: OrderStatus, at: string): TrackingEvent | undefined {
  switch (next) {
    case "preparing":
      return { status: "ordered", timestamp: at, description: "ได้รับการชำระเงินเรียบร้อย" };
    case "handed_over":
      return { status: "shipped", timestamp: at, description: "ส่งมอบพัสดุให้ DHL แล้ว", location: "คลังสินค้า Charmiss บางนา" };
    case "shipping":
      return { status: "in_transit", timestamp: at, description: "พัสดุถึงศูนย์คัดแยก", location: "DHL Hub บางพลี" };
    case "completed":
      return { status: "delivered", timestamp: at, description: `จัดส่งสำเร็จ ผู้รับ: ${order.shipping.address.recipientName}`, location: order.shipping.address.province };
    default:
      return undefined;
  }
}

const latestEventAt = (order: AdminOrder) => order.shipping.events.reduce<string | undefined>((max, e) => (!max || e.timestamp > max ? e.timestamp : max), undefined);

type NewTrackingEvent = Pick<TrackingEvent, "status" | "description" | "location">;

type AdminOrderContextValue = {
  orders: () => AdminOrder[];
  getById: (id: string) => AdminOrder | undefined;
  updateOrderStatus: (id: string, nextStatus: OrderStatus) => Promise<AdminOrder>;
  setTrackingNumber: (id: string, trackingNumber: string) => Promise<AdminOrder>;
  /** Records a DHL scan; moves the order forward if the scan implies a later status (never backward, never out of cancelled). */
  addTrackingEvent: (id: string, event: NewTrackingEvent) => Promise<AdminOrder>;
  decideReturn: (id: string, decision: Exclude<ReturnRequestStatus, "requested">) => Promise<AdminOrder>;
};

const AdminOrderContext = createContext<AdminOrderContextValue>();

/**
 * PART 17 — one live order list Dashboard, Order List, and Order Detail all
 * read from, so a change on Detail is immediately visible everywhere else
 * (same Context+signal+localStorage shape as adminProductStore.tsx). Mock
 * only: nothing here talks to the storefront's own order repository.
 */
export function AdminOrderProvider(props: { children: JSX.Element }) {
  // SSR-safe like every other admin store here: `MOCK_ORDERS` is a pure,
  // deterministic baseline, so server and the client's first render agree —
  // only after hydration do we check localStorage for persisted changes.
  const [orders, setOrders] = createSignal<AdminOrder[]>(MOCK_ORDERS);

  onMount(() => {
    const persisted = readPersisted();
    if (persisted) setOrders(persisted);
  });

  const getById = (id: string) => orders().find((o) => o.id === id);

  const delay = () => new Promise((resolve) => setTimeout(resolve, 450 + Math.random() * 250));

  /** Applies `change` to one order, re-derives fulfillment from its events, persists. */
  const mutate = (id: string, change: (order: AdminOrder) => AdminOrder): AdminOrder => {
    const current = getById(id);
    if (!current) throw new Error("NOT_FOUND");
    const updated = normalizeOrder(change(current));
    setOrders((list) => {
      const next = list.map((o) => (o.id === id ? updated : o));
      persist(next);
      return next;
    });
    return updated;
  };

  const updateOrderStatus: AdminOrderContextValue["updateOrderStatus"] = async (id, nextStatus) => {
    await delay();
    if (Math.random() < 0.06) throw new Error("STATUS_UPDATE_FAILED");

    const current = getById(id);
    if (!current) throw new Error("NOT_FOUND");
    if (!VALID_NEXT_ORDER_STATUS[current.orderStatus].includes(nextStatus)) throw new Error("INVALID_TRANSITION");
    if (nextStatus === "handed_over" && !current.shipping.trackingNumber) throw new Error("TRACKING_REQUIRED");

    return mutate(id, (order) => {
      const at = mockNowIso(latestEventAt(order));
      const event = eventForStatus(order, nextStatus, at);
      const next: AdminOrder = {
        ...order,
        orderStatus: nextStatus,
        shipping: event ? { ...order.shipping, events: [...order.shipping.events, event] } : order.shipping,
      };
      if (nextStatus === "preparing") {
        // Admin confirming a pending payment — same outcome as the shopper paying from the account.
        next.paymentStatus = "paid";
        next.payment = { ...order.payment, paidDate: formatOrderDateLabel(at), transactionId: order.payment.transactionId ?? mockPaymentReference(order.payment.methodId, at), failureReason: undefined };
      }
      if (nextStatus === "cancelled") {
        // Storefront rule (accountData.ts `getPaymentStatus`): a cancelled order's payment reads "ยกเลิกการชำระเงิน".
        next.paymentStatus = "cancelled";
        next.cancellation = { by: "admin", at };
      }
      return next;
    });
  };

  const setTrackingNumber: AdminOrderContextValue["setTrackingNumber"] = async (id, trackingNumber) => {
    await delay();
    const value = trackingNumber.replace(/\s/g, "");
    if (!DHL_TRACKING_PATTERN.test(value)) throw new Error("INVALID_TRACKING_NUMBER");
    return mutate(id, (order) => ({ ...order, shipping: { ...order.shipping, trackingNumber: value } }));
  };

  const addTrackingEvent: AdminOrderContextValue["addTrackingEvent"] = async (id, input) => {
    await delay();
    const current = getById(id);
    if (!current) throw new Error("NOT_FOUND");
    if (current.orderStatus === "cancelled" || current.orderStatus === "pending_payment") throw new Error("INVALID_STATE");
    if (input.status !== "ordered" && input.status !== "preparing" && !current.shipping.trackingNumber) throw new Error("TRACKING_REQUIRED");

    return mutate(id, (order) => {
      const event: TrackingEvent = {
        status: input.status,
        timestamp: mockNowIso(latestEventAt(order)),
        description: input.description?.trim() || undefined,
        location: input.location?.trim() || undefined,
      };
      const events = [...order.shipping.events, event];
      const implied = statusImpliedByEvents(events);
      const orderStatus = implied && ORDER_STATUS_RANK[implied] > ORDER_STATUS_RANK[order.orderStatus] ? implied : order.orderStatus;
      return { ...order, orderStatus, shipping: { ...order.shipping, events } };
    });
  };

  const decideReturn: AdminOrderContextValue["decideReturn"] = async (id, decision) => {
    await delay();
    const current = getById(id);
    if (!current?.returnRequest || current.returnRequest.status !== "requested") throw new Error("INVALID_STATE");
    return mutate(id, (order) => ({
      ...order,
      returnRequest: { ...order.returnRequest!, status: decision, decidedAt: mockNowIso() },
      paymentStatus: decision === "approved" ? "refunded" : order.paymentStatus,
    }));
  };

  return (
    <AdminOrderContext.Provider value={{ orders, getById, updateOrderStatus, setTrackingNumber, addTrackingEvent, decideReturn }}>
      {props.children}
    </AdminOrderContext.Provider>
  );
}

export function useAdminOrders() {
  const ctx = useContext(AdminOrderContext);
  if (!ctx) throw new Error("useAdminOrders must be used within AdminOrderProvider");
  return ctx;
}
