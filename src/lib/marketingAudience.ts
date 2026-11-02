import { TIERS, type TierId } from "./membership";

/**
 * กลุ่มลูกค้า of a promotion or coupon. Unset = everyone.
 * - `new`: no paid order yet (guests count as new).
 * - `returning`: at least one paid order (guests never match).
 * - `tiers`: signed-in Charmiss Club members of these tiers (guests never match).
 */
export type AudienceKind = "all" | "new" | "returning" | "tiers";
export type Audience = { kind: AudienceKind; tiers?: TierId[] };

/** Who is shopping right now, as the storefront knows it. */
export type Shopper = { signedIn: boolean; tier?: TierId; hasPaidOrder: boolean };

export const GUEST_SHOPPER: Shopper = { signedIn: false, hasPaidOrder: false };

export const AUDIENCE_KIND_META: Record<AudienceKind, { label: string; hint: string }> = {
  all: { label: "ทั้งหมด", hint: "ลูกค้าทุกคน" },
  new: { label: "ลูกค้าใหม่", hint: "ยังไม่เคยมีคำสั่งซื้อที่ชำระแล้ว รวมผู้ที่ยังไม่เป็นสมาชิก" },
  returning: { label: "ลูกค้าเก่า", hint: "เคยซื้อแล้ว" },
  tiers: { label: "เฉพาะระดับ Charmiss Club", hint: "สมาชิกที่เข้าสู่ระบบและอยู่ในระดับที่เลือก" },
};

export const AUDIENCE_KINDS: AudienceKind[] = ["all", "new", "returning", "tiers"];

const tierName = (id: TierId) => TIERS.find((t) => t.id === id)?.shortName ?? id;

/** Picked tiers in ladder order (Glow, Radiance, Icon). */
const orderedTiers = (tiers: TierId[] | undefined) => TIERS.map((t) => t.id).filter((id) => tiers?.includes(id));

/** Reads any stored value as a valid audience, or undefined for everyone. */
export function normalizeAudience(a: Audience | undefined): Audience | undefined {
  if (!a || !AUDIENCE_KINDS.includes(a.kind) || a.kind === "all") return undefined;
  if (a.kind === "tiers") return { kind: "tiers", tiers: orderedTiers(a.tiers) };
  return { kind: a.kind };
}

export function matchesAudience(audience: Audience | undefined, shopper: Shopper): boolean {
  if (!audience || audience.kind === "all") return true;
  if (audience.kind === "new") return !shopper.hasPaidOrder;
  if (audience.kind === "returning") return shopper.signedIn && shopper.hasPaidOrder;
  return shopper.signedIn && !!shopper.tier && !!audience.tiers?.includes(shopper.tier);
}

/** "ทุกคน" / "ลูกค้าใหม่" / "ลูกค้าเก่า" / "สมาชิก Radiance, Icon": the list column and summaries. */
export function formatAudience(audience: Audience | undefined): string {
  if (!audience || audience.kind === "all") return "ทุกคน";
  if (audience.kind === "new") return "ลูกค้าใหม่";
  if (audience.kind === "returning") return "ลูกค้าเก่า";
  const tiers = orderedTiers(audience.tiers);
  return tiers.length > 0 ? `สมาชิก ${tiers.map(tierName).join(", ")}` : "ยังไม่ได้เลือกระดับ";
}

/** The badge of a coupon anyone can use. */
export const EVERYONE_COUPON_BADGE = "สำหรับทุกคน";

/**
 * Every coupon ticket's กลุ่มลูกค้า badge: "สำหรับทุกคน" / "สำหรับลูกค้าใหม่" /
 * "สำหรับลูกค้าเก่า" / "สำหรับสมาชิก Radiance, Icon" ("สมาชิก Charmiss Club"
 * when every tier is picked).
 */
export function couponAudienceBadge(audience: Audience | undefined): string {
  if (!audience || audience.kind === "all") return EVERYONE_COUPON_BADGE;
  if (audience.kind === "new") return "สำหรับลูกค้าใหม่";
  if (audience.kind === "returning") return "สำหรับลูกค้าเก่า";
  const tiers = orderedTiers(audience.tiers);
  if (tiers.length === 0) return EVERYONE_COUPON_BADGE;
  return tiers.length === TIERS.length ? "สำหรับสมาชิก Charmiss Club" : `สำหรับสมาชิก ${tiers.map(tierName).join(", ")}`;
}

/** Why a typed coupon code is refused for this shopper, or undefined when they're in its audience. */
export function couponAudienceBlock(audience: Audience | undefined, shopper: Shopper): string | undefined {
  if (matchesAudience(audience, shopper) || !audience) return undefined;
  const signIn = shopper.signedIn ? "" : " กรุณาเข้าสู่ระบบ";
  if (audience.kind === "new") return "คูปองนี้สำหรับลูกค้าใหม่เท่านั้น";
  if (audience.kind === "returning") return `คูปองนี้สำหรับลูกค้าที่เคยสั่งซื้อแล้วเท่านั้น${signIn}`;
  const names = orderedTiers(audience.tiers).map(tierName);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} และ ${names[names.length - 1]}` : names[0] ?? "";
  return `คูปองนี้สำหรับสมาชิกระดับ ${list} เท่านั้น${signIn}`;
}
