import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { type Customer, type CustomerFormValues, assignCustomerNumbers, buildMockCustomers, normalizeCustomer } from "./adminCustomers";

/**
 * Phase 05 §02 — Customer Source of Truth. Same "Admin Store + LocalStorage"
 * shape as `adminCategoryStore.tsx`/`adminBrandStore.tsx`: pure baseline on
 * server + first client render (no hydration mismatch), real `localStorage`
 * read deferred to `onMount`, every write path re-normalized before it can
 * ever persist a malformed `Customer` back out. Every page that needs
 * Customer data reads through `useAdminCustomers()` — never a second,
 * per-page copy of the dataset.
 */
/** Also written by `memberRegistry.ts` — storefront sign-ins add/update the member's record here. */
const STORAGE_KEY = "charmiss:admin:customers";
/**
 * Seed-data version of what's persisted under `STORAGE_KEY` — a separate key
 * (same idea as `adminProductStore.tsx`'s), because `memberRegistry.ts` writes
 * the bare `Customer[]` array to `STORAGE_KEY` and must keep doing so.
 * v2 = storefront tiers (Glow/Radiance/Icon), address book, birth date/gender,
 * wishlist/saved cards, CRM-000182 seed. v3 = Nutcha's (cust-2) address
 * book/card in her own name, CRM-000182 with her own, coins derived from orders.
 * v4 = account status and admin-created customers cut (the storefront has
 * neither).
 */
const SEED_VERSION_KEY = "charmiss:admin:customers:seed-version";
const SEED_VERSION = 4;
const TODAY_LABEL = "18 ก.ย. 2569";

function baseline(): Customer[] {
  return buildMockCustomers();
}

/**
 * An older stored copy: seed records are replaced by today's seeds (their
 * mock values changed), everything else — storefront sign-ups written by
 * `memberRegistry.ts` — is kept and normalized.
 * A new seed is only added when no kept record is already that person
 * (e.g. CRM-000182 who signed in on the storefront before this migration).
 */
function migrateStored(stored: Customer[]): Customer[] {
  const seeds = baseline();
  const seedIds = new Set(seeds.map((s) => s.id));
  const kept = stored.filter((c) => !seedIds.has(c.id));
  const digits = (v: string) => v.replace(/\D/g, "");
  const isSamePerson = (seed: Customer, c: Customer) =>
    (seed.crmMemberId && c.crmMemberId === seed.crmMemberId) || (digits(seed.phone) !== "" && digits(c.phone) === digits(seed.phone)) || c.email.trim().toLowerCase() === seed.email.toLowerCase();
  const freshSeeds = seeds.filter((seed) => stored.some((c) => c.id === seed.id) || !kept.some((c) => isSamePerson(seed, c)));
  return [...kept, ...freshSeeds];
}

type AdminCustomerContextValue = {
  customers: Accessor<Customer[]>;
  getById: (id: string) => Customer | undefined;
  update: (id: string, input: CustomerFormValues) => Promise<Customer>;
  remove: (id: string) => Promise<void>;
};

const AdminCustomerContext = createContext<AdminCustomerContextValue>();

export function AdminCustomerProvider(props: { children: JSX.Element }) {
  const [customers, setCustomers] = createSignal<Customer[]>(baseline());

  const persist = (list: Customer[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // storage unavailable (private mode / quota) — state just stays in-memory for this tab.
    }
  };

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const version = Number(localStorage.getItem(SEED_VERSION_KEY) ?? 1);
      if (raw) {
        const stored = (JSON.parse(raw) as Customer[]).map(normalizeCustomer);
        if (version < SEED_VERSION) {
          const migrated = assignCustomerNumbers(migrateStored(stored));
          setCustomers(migrated);
          persist(migrated);
        } else {
          // Sign-ups saved before customer codes existed get their number once, then keep it.
          const numbered = assignCustomerNumbers(stored);
          setCustomers(numbered);
          if (numbered !== stored) persist(numbered);
        }
      }
      localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
    } catch {
      // storage unavailable (private mode / quota) — state just stays in-memory for this tab.
    }
  });

  const mutate = (fn: (list: Customer[]) => Customer[]) => {
    setCustomers((list) => {
      const next = assignCustomerNumbers(fn(list).map(normalizeCustomer));
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
  const getById = (id: string) => customers().find((c) => c.id === id);

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

  const remove: AdminCustomerContextValue["remove"] = async (id) => {
    await simulateDelay();
    mutate((list) => list.filter((c) => c.id !== id));
  };

  return (
    <AdminCustomerContext.Provider value={{ customers, getById, update, remove }}>
      {props.children}
    </AdminCustomerContext.Provider>
  );
}

export function useAdminCustomers() {
  const ctx = useContext(AdminCustomerContext);
  if (!ctx) throw new Error("useAdminCustomers must be used within AdminCustomerProvider");
  return ctx;
}
