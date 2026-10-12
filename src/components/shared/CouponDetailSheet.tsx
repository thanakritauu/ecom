import { createSignal, createUniqueId, For, onCleanup, Show, type JSX } from "solid-js";
import { SheetModal } from "./SheetModal";
import { CheckIcon } from "./icons";
import { pushToast } from "~/lib/toast";
import { isCouponScoped, type Coupon } from "~/lib/cartSelectors";
import { useProductCatalog } from "~/lib/productCatalog";
import type { Product } from "~/lib/types";
import type { ProductSkuRef } from "~/lib/productSkuRef";
import { isRichTextEmpty } from "~/lib/richText";
import { RichTextContent } from "./RichTextContent";

const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;

/** Most products named in the "ใช้ได้กับ" line before it says "และอีก N รายการ". */
const SCOPE_NAMES_SHOWN = 5;

/** "ใช้ได้กับ: ลิปทินท์ (01 Melody Pink, 02 Kuromi Purple), ลิปกลอส และอีก 2 รายการ": products the catalog no longer has are left out. */
function scopeText(scope: ProductSkuRef[], products: Product[]): string {
  const names = scope.flatMap((ref) => {
    const product = products.find((p) => p.id === ref.productId);
    if (!product) return [];
    const options = ref.variantIds.map((id) => product.variants?.find((v) => v.id === id)?.label).filter((l): l is string => !!l);
    return [options.length > 0 ? `${product.name} (${options.join(", ")})` : product.name];
  });
  if (names.length === 0) return "ใช้ได้กับสินค้าที่ร่วมรายการเท่านั้น";
  const more = names.length - SCOPE_NAMES_SHOWN;
  return `ใช้ได้กับ: ${names.slice(0, SCOPE_NAMES_SHOWN).join(", ")}${more > 0 ? ` และอีก ${more.toLocaleString("th-TH")} รายการ` : ""}`;
}

/** "31 ตุลาคม 2569 เวลา 23:59 น." — the coupon's real `expiresAt`, read in Bangkok time. */
function expiryText(expiresAt: string) {
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return "-";
  const date = d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });
  return `${date} เวลา ${time} น.`;
}

/**
 * Coupon details + usage conditions, opened by tapping a `CouponCard`. The
 * conditions mirror how Checkout actually prices an order (`computeCheckoutTotals`;
 * a coupon limited to some products counts only those lines):
 * one coupon per order, discount taken off the product subtotal (shipping
 * untouched, a % coupon capped by its max), min spend checked against that subtotal, and Charmiss Coin
 * redemption stacks on top. `ticket` is the same coupon ticket the shopper
 * tapped (picture only) shown as the header; `action` is the card's own
 * collect/use button.
 */
export function CouponDetailSheet(props: { open: boolean; onOpenChange: (open: boolean) => void; coupon: Coupon; ticket: JSX.Element; action: JSX.Element }) {
  return (
    <SheetModal nested open={props.open} onOpenChange={props.onOpenChange} height="auto" title="รายละเอียดคูปอง" footer={props.action}>
      <CouponDetailBody coupon={props.coupon} ticket={props.ticket} />
    </SheetModal>
  );
}

/**
 * The sheet's content (ticket, code + copy, ใช้ได้ถึง, conditions and the
 * Admin's extra conditions). Exported so Admin's coupon form previews
 * exactly what the shopper will see. Returns sibling blocks: the parent
 * stacks them (SheetModal's body is a gap column).
 */
export function CouponDetailBody(props: { coupon: Coupon; ticket?: JSX.Element }) {
  const [copied, setCopied] = createSignal(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(resetTimer));
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(props.coupon.code);
      setCopied(true);
      pushToast("คัดลอกโค้ดแล้ว");
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => setCopied(false), 2000);
    } catch {
      pushToast("คัดลอกไม่สำเร็จ ลองกดค้างที่โค้ดเพื่อคัดลอก", "error");
    }
  };

  const catalog = useProductCatalog();
  const conditions = () => {
    const c = props.coupon;
    const scoped = isCouponScoped(c);
    const base = scoped ? "ยอดสินค้าที่ร่วมรายการ" : "ยอดสินค้า";
    const what = c.discountType === "percent" ? `ส่วนลด ${c.discount}% ของ${base}${c.maxDiscount ? ` สูงสุด ${baht(c.maxDiscount)}` : ""}` : `ส่วนลด ${baht(c.discount)}`;
    const list = [
      c.minSpend > 0 ? `${what} เมื่อ${base}ครบ ${baht(c.minSpend)} ขึ้นไป` : `${what} ไม่มียอดซื้อขั้นต่ำ`,
      `คำนวณจาก${base} ไม่รวมค่าจัดส่งและของแถม`,
      scoped ? scopeText(c.productScope!, catalog.products()) : "ใช้ได้กับสินค้าทุกรายการ",
      "ใช้ได้ 1 คูปองต่อคำสั่งซื้อ ใช้ร่วมกับคูปองอื่นไม่ได้",
    ];
    if (c.perCustomerLimit) list.push(`ใช้ได้ ${c.perCustomerLimit.toLocaleString("th-TH")} ครั้งต่อบัญชี`);
    if (c.usageLimit) list.push(`จำนวนจำกัด ${c.usageLimit.toLocaleString("th-TH")} สิทธิ์ เมื่อครบแล้วจะใช้ไม่ได้`);
    list.push("ใช้ร่วมกับส่วนลดจาก Charmiss Coin ได้", "เลือกคูปองหรือกรอกโค้ดได้ที่หน้าชำระเงิน");
    return list;
  };

  const headingId = `coupon-conditions-heading-${createUniqueId()}`;
  const extraHeadingId = `coupon-extra-heading-${createUniqueId()}`;

  return (
    <>
      <Show when={props.ticket}>
        {/* Inset so the ticket's own drawn shadow/notches aren't clipped by the scroll area. */}
        <div class="px-1 pt-1">{props.ticket}</div>
      </Show>

      <dl class="flex flex-col gap-3 text-sm">
        <Row label="โค้ดส่วนลด">
          <span class="flex items-center justify-end gap-1">
            <span class="select-all rounded-pill border border-dashed border-brand-pink px-3 py-0.5 font-semibold tracking-wide text-brand-pink">{props.coupon.code || "-"}</span>
            {/* Icon-only copy — 44px tap area; the tick (DSL CheckIcon) shows for 2s after copying. */}
            <button
              type="button"
              onClick={copyCode}
              aria-label={copied() ? `คัดลอกโค้ด ${props.coupon.code} แล้ว` : `คัดลอกโค้ด ${props.coupon.code}`}
              title="คัดลอกโค้ด"
              class="-my-1 flex size-11 shrink-0 items-center justify-center rounded-pill text-brand-pink transition-colors lg:hover:bg-surface-pink"
            >
              <Show
                when={copied()}
                fallback={
                  <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V6a2 2 0 0 1 2-2h9" stroke-linecap="round" />
                  </svg>
                }
              >
                <CheckIcon class="size-5" />
              </Show>
            </button>
          </span>
        </Row>
        <Show when={props.coupon.discountType === "percent" && props.coupon.maxDiscount}>
          {(cap) => <Row label="ลดสูงสุด">{baht(cap())}</Row>}
        </Show>
        <Row label="ยอดซื้อขั้นต่ำ">{props.coupon.minSpend > 0 ? baht(props.coupon.minSpend) : "ไม่มีขั้นต่ำ"}</Row>
        <Show when={props.coupon.usageLimit}>
          {(limit) => <Row label="สิทธิ์คงเหลือ">{`${Math.max(0, limit() - props.coupon.usedCount).toLocaleString("th-TH")} สิทธิ์`}</Row>}
        </Show>
        <Row label="ใช้ได้ถึง">{expiryText(props.coupon.expiresAt)}</Row>
      </dl>

      <section aria-labelledby={headingId} class="flex flex-col gap-2">
        <h3 id={headingId} class="text-base font-semibold text-ink">
          เงื่อนไขการใช้งาน
        </h3>
        <ul class="flex flex-col gap-1.5 text-sm leading-[1.75] text-ink-gray">
          <For each={conditions()}>
            {(text) => (
              <li class="flex gap-2">
                <span class="mt-[0.7em] size-1.5 shrink-0 rounded-pill bg-brand-pink" aria-hidden="true" />
                <span>{text}</span>
              </li>
            )}
          </For>
        </ul>
      </section>

      <Show when={!isRichTextEmpty(props.coupon.extraConditions)}>
        <section aria-labelledby={extraHeadingId} class="flex flex-col gap-2">
          <h3 id={extraHeadingId} class="text-base font-semibold text-ink">
            เงื่อนไขเพิ่มเติม
          </h3>
          <RichTextContent value={props.coupon.extraConditions} class="text-sm text-ink-gray" />
        </section>
      </Show>
    </>
  );
}

function Row(props: { label: string; children: JSX.Element }) {
  return (
    <div class="flex items-center justify-between gap-4 border-b border-border pb-3">
      <dt class="shrink-0 text-ink-gray">{props.label}</dt>
      <dd class="text-right font-medium text-ink">{props.children}</dd>
    </div>
  );
}
