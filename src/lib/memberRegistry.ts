import { isServer } from "solid-js/web";
import { buildMockCustomers, normalizeCustomer, type Customer, type SignupMethod } from "./adminCustomers";
import { todayThaiLabel, type CrmMember, type SignInIdentity } from "./crm";

/**
 * Storefront → Admin bridge for the prototype (no backend): a website sign-in
 * creates or updates the member's Customer record in the same storage Admin's
 * Customer list reads, tagged with where they came from — moved over from the
 * Charmiss Club CRM (with the coins carried over) or a brand-new sign-up.
 * A real backend does this server-side on the auth callback instead.
 */
const STORAGE_KEY = "charmiss:admin:customers"; // same key adminCustomerStore.tsx persists to

function readCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Customer[]).map(normalizeCustomer) : buildMockCustomers();
  } catch {
    return buildMockCustomers();
  }
}

const digits = (s: string) => s.replace(/\D/g, "");
const formatPhone = (s: string) => {
  const d = digits(s);
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : s;
};

export function recordMemberSignIn(identity: SignInIdentity, crm: CrmMember | undefined, profile: { name: string; phone: string; email: string }): Customer | undefined {
  if (isServer) return undefined;
  const list = readCustomers();
  const phone = digits(profile.phone);
  const email = profile.email.trim().toLowerCase();
  const existing = list.find(
    (c) => (crm && c.crmMemberId === crm.crmMemberId) || (phone && digits(c.phone) === phone) || (email && c.email.trim().toLowerCase() === email),
  );
  const today = todayThaiLabel();
  const [firstName, ...rest] = profile.name.trim().split(/\s+/);

  const record: Customer = existing
    ? { ...existing, birthDate: existing.birthDate ?? crm?.birthDate, gender: existing.gender ?? crm?.gender, updatedAt: today }
    : normalizeCustomer({
        id: `cust-web-${Date.now()}`,
        firstName: firstName ?? "",
        lastName: rest.join(" "),
        email: profile.email,
        phone: profile.phone ? formatPhone(profile.phone) : "",
        status: "active",
        memberSince: today,
        source: crm ? "crm_migrated" : "new_signup",
        signupMethod: identity.method as SignupMethod,
        crmMemberId: crm?.crmMemberId,
        crmCoinsTransferred: crm?.coins,
        loyaltyPoints: crm?.coins ?? 0,
        birthDate: crm?.birthDate,
        gender: crm?.gender,
        createdAt: today,
        updatedAt: today,
      });

  const next = existing ? list.map((c) => (c.id === existing.id ? record : c)) : [record, ...list];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return record;
}

/**
 * The member saved birth date / gender (Auth Modal's "ข้อมูลเพิ่มเติม" step or
 * `/account/profile`) — mirrored onto their Admin Customer record so the
 * customer list shows the same values. Matched the same way as sign-in.
 */
export function recordMemberProfile(member: { crmMemberId?: string; phone: string; email: string }, patch: Pick<Customer, "birthDate" | "gender">) {
  if (isServer) return;
  const list = readCustomers();
  const phone = digits(member.phone);
  const email = member.email.trim().toLowerCase();
  const existing = list.find(
    (c) => (member.crmMemberId && c.crmMemberId === member.crmMemberId) || (phone && digits(c.phone) === phone) || (email && c.email.trim().toLowerCase() === email),
  );
  if (!existing) return;
  const record: Customer = {
    ...existing,
    ...(patch.birthDate !== undefined && { birthDate: patch.birthDate || undefined }),
    ...(patch.gender !== undefined && { gender: patch.gender }),
    updatedAt: todayThaiLabel(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.map((c) => (c.id === existing.id ? record : c))));
  } catch {}
}
