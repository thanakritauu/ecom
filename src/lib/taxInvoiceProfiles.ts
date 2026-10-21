import { isServer } from "solid-js/web";
import type { AddressMockState } from "./addressBook";
import type { TaxInvoiceBuyer } from "./taxInvoice";

/**
 * ข้อมูลใบกำกับภาษีที่เคยใช้: details added or edited in Checkout's tax
 * invoice popup are saved here, so next time they're one tap instead of
 * retyping (signed-in members; a guest's live only for the visit). Same per-mock-state localStorage shape as the
 * address book (a real account API replaces this file only).
 * `addressId` = the saved address used as ที่อยู่ออกใบกำกับภาษี; unset = same as shipping.
 * Listed default first, then most recently used.
 */
export type TaxInvoiceProfile = TaxInvoiceBuyer & {
  id: string;
  addressId?: string;
  lastUsedAt: string;
  /** ค่าเริ่มต้น: the one Checkout picks when "ขอใบกำกับภาษี" is ticked. Exactly one whenever there's any (like the default shipping address). */
  isDefault?: boolean;
};

const keyFor = (state: AddressMockState) => `charmiss:tax-invoice-profiles:v1:${state}`;

/** The signed-in mock member already has a personal and a company invoice on file (addresses from `MOCK_ADDRESSES`). */
const seed = (state: AddressMockState): TaxInvoiceProfile[] =>
  state === "existing"
    ? [
        { id: "tax-1", type: "individual", name: "Nutcha S.", taxId: "3109900123453", email: "nutcha.s@example.com", lastUsedAt: "2026-09-20T10:00:00+07:00", isDefault: true },
        {
          id: "tax-2",
          type: "company",
          name: "บริษัท นัชชา สตูดิโอ จำกัด",
          taxId: "0105558123451",
          email: "account@nutcha-studio.example.com",
          addressId: "addr-2",
          lastUsedAt: "2026-10-01T15:30:00+07:00",
        },
      ]
    : [];

/** Most recently used first. */
export function readTaxInvoiceProfiles(state: AddressMockState): TaxInvoiceProfile[] {
  if (isServer) return seed(state);
  let list: TaxInvoiceProfile[];
  try {
    const raw = localStorage.getItem(keyFor(state));
    list = raw ? (JSON.parse(raw) as TaxInvoiceProfile[]) : seed(state);
  } catch {
    list = seed(state);
  }
  return ordered(withSingleDefault(list));
}

/** Exactly one default whenever the list isn't empty: `defaultId` if given, else the current one, else the first. */
function withSingleDefault(list: TaxInvoiceProfile[], defaultId?: string): TaxInvoiceProfile[] {
  const target = (defaultId && list.some((p) => p.id === defaultId) ? defaultId : undefined) ?? list.find((p) => p.isDefault)?.id ?? list[0]?.id;
  return list.map((p) => ({ ...p, isDefault: p.id === target }));
}

const ordered = (list: TaxInvoiceProfile[]) => [...list].sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault) || b.lastUsedAt.localeCompare(a.lastUsedAt));

const sameBuyer = (a: TaxInvoiceBuyer, b: TaxInvoiceBuyer) => a.type === b.type && a.taxId === b.taxId && (a.branchNo ?? "") === (b.branchNo ?? "");

export const newTaxInvoiceProfileId = () => `tax-${Date.now().toString(36)}`;

/**
 * Adds or updates `profile` (by id) and puts it first. Another saved entry for
 * the same buyer (type + number + สาขา) is replaced, so the list never shows
 * one company twice. Returns the new list, most recent first.
 */
export function mergeTaxInvoiceProfile(list: TaxInvoiceProfile[], profile: TaxInvoiceProfile, makeDefault = false): TaxInvoiceProfile[] {
  const next = { ...profile, lastUsedAt: new Date().toISOString() };
  // The entry it replaces may have been the default: keep the flag on the replacement.
  const replacedDefault = list.some((p) => p.isDefault && (p.id === profile.id || sameBuyer(p, profile)));
  const merged = [next, ...list.filter((p) => p.id !== profile.id && !sameBuyer(p, profile))];
  return ordered(withSingleDefault(merged, makeDefault || replacedDefault ? next.id : undefined));
}

/** Moves the default to `id`. */
export const withDefaultTaxInvoiceProfile = (list: TaxInvoiceProfile[], id: string) => ordered(withSingleDefault(list, id));

/** Saves for a signed-in member (`existing` / `new` mock state); returns the list as stored. */
export function upsertTaxInvoiceProfile(state: AddressMockState, profile: TaxInvoiceProfile, makeDefault = false): TaxInvoiceProfile[] {
  return write(state, mergeTaxInvoiceProfile(readTaxInvoiceProfiles(state), profile, makeDefault));
}

export const setDefaultTaxInvoiceProfile = (state: AddressMockState, id: string) => write(state, withDefaultTaxInvoiceProfile(readTaxInvoiceProfiles(state), id));

function write(state: AddressMockState, list: TaxInvoiceProfile[]): TaxInvoiceProfile[] {
  try {
    localStorage.setItem(keyFor(state), JSON.stringify(list));
  } catch {
    // storage unavailable: kept for this visit only.
  }
  return list;
}
