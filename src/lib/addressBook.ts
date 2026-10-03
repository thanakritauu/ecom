import { createSignal, onMount } from "solid-js";
import { isServer } from "solid-js/web";
import { MOCK_ADDRESSES, type Address } from "./checkoutData";

/**
 * Phase 04 — the shopper's saved addresses (shipping and billing share the
 * one existing `Address` model from `checkoutData.ts`).
 *
 * The UI talks only to `AddressRepository`, never to mock data directly, so
 * moving to a real account/address API means writing one new repository —
 * Checkout doesn't change. Today's repository is `localStorage`-backed (no
 * address backend exists), seeded per mock state:
 *   - guest / new user → no addresses (State A: first-time checkout)
 *   - signed-in member → `MOCK_ADDRESSES` (State B: has a default address)
 */
export interface AddressRepository {
  list(): Promise<Address[]>;
  /** Adds or updates by `id`. `makeDefault` moves the default flag to this address. Returns the full updated list. */
  save(address: Address, opts?: { makeDefault?: boolean }): Promise<Address[]>;
  setDefault(id: string): Promise<Address[]>;
}

export type AddressMockState = "new" | "existing";

/** Applies the single-default invariant: exactly one default whenever there's at least one address. */
function withSingleDefault(list: Address[], defaultId?: string): Address[] {
  const target = defaultId ?? list.find((a) => a.isDefault)?.id ?? list[0]?.id;
  return list.map((a) => ({ ...a, isDefault: a.id === target }));
}

export function createLocalAddressRepository(mockState: AddressMockState): AddressRepository {
  const key = `charmiss:addresses:${mockState}`;
  const seed = () => (mockState === "existing" ? withSingleDefault(MOCK_ADDRESSES) : []);

  const read = (): Address[] => {
    if (isServer) return seed();
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Address[]) : seed();
    } catch {
      return seed();
    }
  };
  const write = (list: Address[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch {}
    return list;
  };
  const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 250));

  return {
    async list() {
      return read();
    },
    async save(address, opts) {
      await delay();
      const current = read();
      const exists = current.some((a) => a.id === address.id);
      const next = exists ? current.map((a) => (a.id === address.id ? address : a)) : [...current, address];
      return write(withSingleDefault(next, opts?.makeDefault ? address.id : undefined));
    },
    async setDefault(id) {
      await delay();
      return write(withSingleDefault(read(), id));
    },
  };
}

/**
 * Reactive wrapper Checkout uses. The repository is resolved on mount
 * (client only) because which one applies can depend on client-side state
 * such as the signed-in user.
 */
export function createAddressBook(resolveRepo: () => AddressRepository) {
  const [addresses, setAddresses] = createSignal<Address[]>([]);
  const [ready, setReady] = createSignal(false);
  let repo: AddressRepository | undefined;
  const getRepo = () => (repo ??= resolveRepo());

  onMount(async () => {
    setAddresses(await getRepo().list());
    setReady(true);
  });

  return {
    addresses,
    ready,
    defaultAddress: () => addresses().find((a) => a.isDefault) ?? addresses()[0],
    save: async (address: Address, opts?: { makeDefault?: boolean }) => {
      const list = await getRepo().save(address, opts);
      setAddresses(list);
      return list.find((a) => a.id === address.id)!;
    },
    setDefault: async (id: string) => {
      setAddresses(await getRepo().setDefault(id));
    },
  };
}

export type AddressBook = ReturnType<typeof createAddressBook>;
