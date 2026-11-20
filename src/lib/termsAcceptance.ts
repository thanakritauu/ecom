import { isServer } from "solid-js/web";
import { CHECKOUT_TERMS } from "./siteInfo";
import type { TermsAcceptance, User } from "./types";

/**
 * Which version of the shipping terms + return policy each member has accepted at Checkout, so a member who
 * already accepted the current version (`CHECKOUT_TERMS`) isn't asked again; a new version asks once more. Guests
 * are asked every order (no account to keep it on).
 *
 * Mock: kept in this browser's localStorage per member. With a real backend this is a field on the member
 * (last accepted version + time), sent back with the order.
 */
const STORAGE_KEY = "charmiss:terms-accepted:v1";

/** The member this record belongs to, whichever way they signed in. */
const memberKey = (user: Pick<User, "id" | "phone" | "email"> & { memberCode?: string }) => user.memberCode || user.phone || user.email || user.id;

function readAll(): Record<string, TermsAcceptance> {
  if (isServer) return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, TermsAcceptance>;
  } catch {
    return {};
  }
}

/** This member's acceptance of the current version, or undefined (never accepted, or an older version). */
export function readCurrentTermsAcceptance(user: Parameters<typeof memberKey>[0] | null | undefined): TermsAcceptance | undefined {
  if (!user) return undefined;
  const record = readAll()[memberKey(user)];
  return record?.version === CHECKOUT_TERMS.version ? record : undefined;
}

/** The member accepted the current version just now (Checkout, on paying). */
export function saveTermsAcceptance(user: Parameters<typeof memberKey>[0]): TermsAcceptance {
  const record: TermsAcceptance = { at: new Date().toISOString(), version: CHECKOUT_TERMS.version };
  if (isServer) return record;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [memberKey(user)]: record }));
  } catch {}
  return record;
}
