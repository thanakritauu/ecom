import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { type Customer, type CustomerFormValues, type CustomerStatus, buildMockCustomers, normalizeCustomer } from "./adminCustomers";

/**
 * Phase 05 §02 — Customer Source of Truth. Same "Admin Store + LocalStorage"
 * shape as `adminCategoryStore.tsx`/`adminBrandStore.tsx`: pure baseline on
 * server + first client render (no hydration mismatch), real `localStorage`
 * read deferred to `onMount`, every write path re-normalized before it can
 * ever persist a malformed `Customer` back out. Every page that needs
 * Customer data reads through `useAdminCustomers()` — never a second,
 * per-page copy of the dataset.
 */
const STORAGE_KEY = "charmiss:admin:customers";
const TODAY_LABEL = "18 ก.ย. 2569";
let nextId = 100;

function baseline(): Customer[] {
  return buildMockCustomers();
}

type AdminCustomerContextValue = {
  customers: Accessor<Customer[]>;
  getById: (id: string) => Customer | undefined;
  add: (input: CustomerFormValues) => Promise<Customer>;
  update: (id: string, input: CustomerFormValues) => Promise<Customer>;
  setStatus: (id: string, status: CustomerStatus) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const AdminCustomerContext = createContext<AdminCustomerContextValue>();

export function AdminCustomerProvider(props: { children: JSX.Element }) {
  const [customers, setCustomers] = createSignal<Customer[]>(baseline());

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCustomers((JSON.parse(raw) as Customer[]).map(normalizeCustomer));
    } catch {
      // storage unavailable (private mode / quota) — state just stays in-memory for this tab.
    }
  });

  const persist = (list: Customer[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // same as above.
    }
  };

  const mutate = (fn: (list: Customer[]) => Customer[]) => {
    setCustomers((list) => {
      const next = fn(list).map(normalizeCustomer);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
  const getById = (id: string) => customers().find((c) => c.id === id);

  const add: AdminCustomerContextValue["add"] = async (input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    const created: Customer = { ...input, id: `cust-${nextId++}`, memberSince: TODAY_LABEL, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL };
    mutate((list) => [created, ...list]);
    return created;
  };

  const update: AdminCustomerContextValue["update"] = async (id, input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    let updated: Customer | undefined;
    mutate((list) =>
      list.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, ...input, updatedAt: TODAY_LABEL };
        return updated;
      }),
    );
    if (!updated) throw new Error("NOT_FOUND");
    return updated;
  };

  const setStatus: AdminCustomerContextValue["setStatus"] = async (id, status) => {
    await simulateDelay();
    mutate((list) => list.map((c) => (c.id === id ? { ...c, status, updatedAt: TODAY_LABEL } : c)));
  };

  const remove: AdminCustomerContextValue["remove"] = async (id) => {
    await simulateDelay();
    mutate((list) => list.filter((c) => c.id !== id));
  };

  return (
    <AdminCustomerContext.Provider value={{ customers, getById, add, update, setStatus, remove }}>
      {props.children}
    </AdminCustomerContext.Provider>
  );
}

export function useAdminCustomers() {
  const ctx = useContext(AdminCustomerContext);
  if (!ctx) throw new Error("useAdminCustomers must be used within AdminCustomerProvider");
  return ctx;
}
