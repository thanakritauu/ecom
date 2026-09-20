import { createContext, createSignal, onMount, useContext, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import {
  MOCK_ORDERS,
  VALID_NEXT_ORDER_STATUS,
  normalizeOrder,
  type AdminOrder,
  type OrderStatus,
  type PaymentStatus,
  type FulfillmentStatus,
} from "./adminOrders";

const STORAGE_KEY = "charmiss:admin:orders";

/** What actually changes alongside an order's status — mirrors the default pairing each status implies in adminOrders.ts, applied live instead of only at data-seed time. */
const PAYMENT_ON_STATUS: Partial<Record<OrderStatus, PaymentStatus>> = {
  confirmed: "paid",
  cancelled: undefined, // leave payment as-is — a cancelled order might have been pending or already paid
  refunded: "refunded",
};
const FULFILLMENT_ON_STATUS: Partial<Record<OrderStatus, FulfillmentStatus>> = {
  processing: "preparing",
  packed: "packed",
  shipped: "shipped",
  delivered: "delivered",
};

function persist(orders: AdminOrder[]) {
  if (isServer) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // storage can be unavailable (private mode / quota) — state just stays in-memory for this tab.
  }
}

function readPersisted(): AdminOrder[] | null {
  if (isServer) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminOrder[]).map(normalizeOrder) : null;
  } catch {
    return null;
  }
}

const TODAY_LABEL = "17 ก.ย. 2569";

type AdminOrderContextValue = {
  orders: () => AdminOrder[];
  getById: (id: string) => AdminOrder | undefined;
  updateOrderStatus: (id: string, nextStatus: OrderStatus) => Promise<AdminOrder>;
};

const AdminOrderContext = createContext<AdminOrderContextValue>();

/**
 * PART 17 — one live order list Dashboard, Order List, and Order Detail all
 * read from, so a status change on Detail is immediately visible everywhere
 * else (same Context+signal+localStorage shape as adminProductStore.tsx).
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

  const updateOrderStatus: AdminOrderContextValue["updateOrderStatus"] = async (id, nextStatus) => {
    await new Promise((resolve) => setTimeout(resolve, 450 + Math.random() * 250));
    if (Math.random() < 0.06) throw new Error("STATUS_UPDATE_FAILED");

    const current = getById(id);
    if (!current) throw new Error("NOT_FOUND");
    if (!VALID_NEXT_ORDER_STATUS[current.orderStatus].includes(nextStatus)) {
      throw new Error("INVALID_TRANSITION");
    }

    let updated: AdminOrder | undefined;
    setOrders((list) => {
      const next = list.map((order) => {
        if (order.id !== id) return order;
        updated = {
          ...order,
          orderStatus: nextStatus,
          paymentStatus: PAYMENT_ON_STATUS[nextStatus] ?? order.paymentStatus,
          fulfillmentStatus: FULFILLMENT_ON_STATUS[nextStatus] ?? order.fulfillmentStatus,
          statusHistory: [...order.statusHistory, { status: nextStatus, date: TODAY_LABEL }],
        };
        return updated;
      });
      persist(next);
      return next;
    });
    return updated!;
  };

  return (
    <AdminOrderContext.Provider value={{ orders, getById, updateOrderStatus }}>{props.children}</AdminOrderContext.Provider>
  );
}

export function useAdminOrders() {
  const ctx = useContext(AdminOrderContext);
  if (!ctx) throw new Error("useAdminOrders must be used within AdminOrderProvider");
  return ctx;
}
