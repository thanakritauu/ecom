import { isServer } from "solid-js/web";
import { buildCoupon, type Coupon } from "./cartSelectors";

/**
 * โค้ดจากภายนอก: codes handed out as plain text (partners, influencers, chat) that live in another
 * system, not in Admin's coupons. Checkout asks that system when a typed code isn't one of ours.
 * Rules on our side: signed-in members only, and never together with any of our coupons
 * (`canAddCoupon`). The other system decides the amount, minimum, dates and whether this member
 * may still use it.
 *
 * Mock: no such API yet. `checkExternalCode` answers from the table below after a short delay, and
 * a member's uses are kept in this browser's localStorage (`recordExternalCodeUse` on a paid order).
 * Swap the body of `checkExternalCode` for the real request; the result shape stays the same.
 */

/** What the other system says about a code it knows. */
type ExternalCodeOffer = {
  code: string;
  discountType: "baht" | "percent";
  discount: number;
  maxDiscount?: number;
  minSpend?: number;
  startDate?: string;
  endDate: string;
  /** Uses per member; unset = unlimited. */
  perMemberLimit?: number;
};

const MOCK_OFFERS: ExternalCodeOffer[] = [
  { code: "FREE50", discountType: "baht", discount: 50, endDate: "2026-12-31", perMemberLimit: 1 },
  { code: "GLOWUP15", discountType: "percent", discount: 15, maxDiscount: 150, minSpend: 500, endDate: "2026-12-31", perMemberLimit: 1 },
  { code: "KOL200", discountType: "baht", discount: 200, minSpend: 1500, endDate: "2026-12-31" },
  { code: "SUMMER30", discountType: "baht", discount: 30, endDate: "2026-06-30" },
  { code: "XMAS100", discountType: "baht", discount: 100, minSpend: 800, startDate: "2026-12-20", endDate: "2026-12-26" },
];

const USES_KEY = "charmiss:external-code-uses:v1";

/** memberId → codes used (one entry per paid order). */
function readUses(): Record<string, string[]> {
  if (isServer) return {};
  try {
    return JSON.parse(localStorage.getItem(USES_KEY) ?? "{}") as Record<string, string[]>;
  } catch {
    return {};
  }
}

/** The checked code as a coupon, so tickets, totals and the summary treat it like any other. */
function toCoupon(o: ExternalCodeOffer): Coupon {
  return {
    ...buildCoupon({
      code: o.code,
      discountType: o.discountType,
      discount: o.discount,
      maxDiscount: o.maxDiscount,
      minSpend: o.minSpend,
      startDate: o.startDate,
      endDate: o.endDate,
    }),
    external: true,
  };
}

export type ExternalCodeResult = { ok: true; coupon: Coupon } | { ok: false; reason: string };

/**
 * Asks the other system about `code` (already trimmed + upper-case). `memberId` is unset for a
 * guest: a code it knows is then refused with "sign in", one it doesn't with "not found".
 */
export async function checkExternalCode(code: string, memberId: string | undefined, now = Date.now()): Promise<ExternalCodeResult> {
  await new Promise((r) => setTimeout(r, 600));
  const offer = MOCK_OFFERS.find((o) => o.code === code);
  if (!offer) return { ok: false, reason: "ไม่พบโค้ดส่วนลดนี้ กรุณาตรวจสอบอีกครั้ง" };
  const coupon = toCoupon(offer);
  if (coupon.startsAt && Date.parse(coupon.startsAt) > now) return { ok: false, reason: "โค้ดส่วนลดนี้ยังไม่เริ่มใช้งาน" };
  if (Date.parse(coupon.expiresAt) < now) return { ok: false, reason: "โค้ดส่วนลดนี้หมดอายุแล้ว" };
  if (!memberId) return { ok: false, reason: "โค้ดนี้ใช้ได้เฉพาะสมาชิก กรุณาเข้าสู่ระบบก่อนใช้โค้ด" };
  const used = (readUses()[memberId] ?? []).filter((c) => c === code).length;
  if (offer.perMemberLimit && used >= offer.perMemberLimit) return { ok: false, reason: "คุณใช้โค้ดนี้ครบสิทธิ์แล้ว" };
  return { ok: true, coupon };
}

/** A paid order used these external codes: the other system counts them against the member. */
export function recordExternalCodeUse(memberId: string, codes: string[]) {
  if (isServer || codes.length === 0) return;
  const uses = readUses();
  uses[memberId] = [...(uses[memberId] ?? []), ...codes];
  try {
    localStorage.setItem(USES_KEY, JSON.stringify(uses));
  } catch {}
}
