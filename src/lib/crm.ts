/**
 * Mock Charmiss Club CRM (prototype — no real CRM connection). The old loyalty
 * program's members, looked up by phone, email or LINE when someone signs in on
 * the website. A match means "existing Charmiss Club member": their coins are
 * carried over to the web account automatically. A real integration replaces
 * `lookupCrmMember` with the CRM's member-lookup API; nothing else changes.
 *
 * QA: phone 081-234-5678, email kamolchanok@example.com or the mock LINE account
 * are existing members; so is the mock persona Nutcha S. (`accountData.ts`
 * `MOCK_USER`, 089-123-4567 / nutcha.s@example.com — Admin's cust-2), whose
 * 3,500 coins are the carry-over her `/account/points` history starts from.
 * Any other phone/email (and Google) signs up as new.
 */
export type CrmMember = {
  crmMemberId: string;
  name: string;
  phone: string;
  email: string;
  lineUserId?: string;
  coins: number;
};

const CRM_MEMBERS: CrmMember[] = [
  { crmMemberId: "CRM-000071", name: "Nutcha S.", phone: "0891234567", email: "nutcha.s@example.com", coins: 3500 },
  { crmMemberId: "CRM-000182", name: "กมลชนก ใจดี", phone: "0812345678", email: "kamolchanok@example.com", lineUserId: "U-line-kamolchanok", coins: 3500 },
  { crmMemberId: "CRM-000245", name: "พิมพ์ชนก ส.", phone: "0898765432", email: "pimchanok@example.com", coins: 1280 },
];

/** The profile our mock "Continue with LINE" returns — linked to a CRM member, so LINE demonstrates the carry-over. */
export const MOCK_LINE_PROFILE = { lineUserId: "U-line-kamolchanok", name: "กมลชนก ใจดี" };
/** The profile our mock "Continue with Google" returns — not in the CRM, so Google demonstrates a new sign-up. */
export const MOCK_GOOGLE_PROFILE = { email: "mint.p@gmail.com", name: "มิ้นท์ ป." };

export type SignInMethod = "phone" | "email" | "line" | "google";
export type SignInIdentity = { method: SignInMethod; value: string; name?: string };

const digits = (s: string) => s.replace(/\D/g, "");

export async function lookupCrmMember(identity: SignInIdentity): Promise<CrmMember | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 900)); // stands in for the CRM API round-trip
  const v = identity.value.trim().toLowerCase();
  return CRM_MEMBERS.find((m) => {
    if (identity.method === "phone") return digits(m.phone) === digits(v);
    if (identity.method === "line") return m.lineUserId === identity.value;
    return m.email.toLowerCase() === v; // email + Google both match on email
  });
}

/** "5 ต.ค. 2569" — the Thai date-label format every Admin date already uses. */
export function todayThaiLabel(date = new Date()): string {
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
}
