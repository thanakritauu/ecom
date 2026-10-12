import { createEffect, createSignal, For, on, Show } from "solid-js";
import {
  couponCartBlock,
  couponDiscountAmount,
  couponEligibleSubtotal,
  couponUsageBlock,
  isCouponActive,
  isCouponNotStarted,
  isCouponScoped,
  type Coupon,
  type ResolvedCartLine,
} from "~/lib/cartSelectors";
import { SheetModal } from "../shared/SheetModal";
import { CouponCard, couponTicket, type CouponCardAction } from "../shared/CouponCard";
import { formatTHB } from "../shared/PriceDisplay";
import { Button } from "../shared/Button";
import { EmptyState } from "../shared/EmptyState";
import { TagIcon } from "../shared/icons";
import { TextField } from "../shared/TextField";
import { pushToast } from "~/lib/toast";

/**
 * Checkout coupon picker — the shared modal frame (`SheetModal`, same as the
 * Product Option Modal) listing Home's coupon ticket (`CouponCard`). One
 * coupon per order: "ใช้เลย" applies it, closes and confirms with a toast; the applied one shows
 * "ยกเลิก". A coupon whose minimum spend isn't met yet stays visible but
 * can't be used, with how much more to buy. A code can also be typed in
 * (top of the modal), case-insensitive: any switched-on coupon in
 * `codeCoupons`, listed or not, same rules. A coupon outside its dates is
 * never listed, and its code is refused when typed. So is one whose usage
 * limit is used up (all customers, or this shopper's own share): listed but
 * not usable, with the reason under it. A coupon limited to some products
 * counts only those lines (`couponEligibleSubtotal`); with none of them in
 * the cart, or too little of them, it says so the same way.
 */
export function CouponPickerSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Listed coupons. */
  coupons: Coupon[];
  /** Codes accepted when typed (defaults to `coupons`). */
  codeCoupons?: Coupon[];
  /** The paid cart lines (free gifts never count toward a coupon). */
  lines: ResolvedCartLine[];
  /** How many of this shopper's own (non-cancelled) orders used the code; 0 for a guest. */
  usedByShopper?: (code: string) => number;
  applied: Coupon | undefined;
  onApply: (coupon: Coupon) => void;
  onRemove: () => void;
}) {
  const usable = () => props.coupons.filter((c) => isCouponActive(c));
  const blockOf = (coupon: Coupon) => couponUsageBlock(coupon, props.usedByShopper?.(coupon.code) ?? 0);
  const apply = (coupon: Coupon, via: "code" | "pick") => {
    props.onApply(coupon);
    props.onOpenChange(false);
    pushToast(
      via === "code" ? `ใช้โค้ด ${coupon.code} แล้ว` : "ใช้คูปองแล้ว",
      "success",
      `ลด ${formatTHB(couponDiscountAmount(coupon, couponEligibleSubtotal(coupon, props.lines)))} จากยอดสั่งซื้อนี้`,
    );
  };

  // Typed code
  const [code, setCode] = createSignal("");
  const [codeError, setCodeError] = createSignal<string>();
  const [codeTried, setCodeTried] = createSignal(false);
  createEffect(on(() => props.open, (open) => open && (setCode(""), setCodeError(undefined), setCodeTried(false))));
  const applyCode = (e: SubmitEvent) => {
    e.preventDefault();
    setCodeTried(true);
    const typed = code().trim().toUpperCase();
    if (!typed) return setCodeError("กรุณากรอกโค้ดส่วนลด");
    const coupon = (props.codeCoupons ?? props.coupons).find((c) => c.code.toUpperCase() === typed);
    if (!coupon) return setCodeError("ไม่พบโค้ดส่วนลดนี้ กรุณาตรวจสอบอีกครั้ง");
    if (isCouponNotStarted(coupon)) return setCodeError("โค้ดส่วนลดนี้ยังไม่เริ่มใช้งาน");
    if (!isCouponActive(coupon)) return setCodeError("โค้ดส่วนลดนี้หมดอายุแล้ว");
    const blocked = blockOf(coupon);
    if (blocked) return setCodeError(blocked);
    const cartBlocked = couponCartBlock(coupon, props.lines);
    if (cartBlocked && isCouponScoped(coupon)) return setCodeError(cartBlocked);
    const eligible = couponEligibleSubtotal(coupon, props.lines);
    if (eligible < coupon.minSpend)
      return setCodeError(`โค้ดนี้ใช้ได้เมื่อซื้อครบ ฿${coupon.minSpend.toLocaleString("th-TH")} (ซื้อเพิ่มอีก ${formatTHB(coupon.minSpend - eligible)})`);
    apply(coupon, "code");
  };

  const action = (coupon: Coupon): CouponCardAction => {
    if (props.applied?.code === coupon.code) return { label: "ยกเลิก", variant: "outline", onClick: props.onRemove };
    return {
      label: "ใช้เลย",
      variant: "primary",
      disabled: !!couponCartBlock(coupon, props.lines) || !!blockOf(coupon),
      onClick: () => apply(coupon, "pick"),
    };
  };

  return (
    <SheetModal
      open={props.open}
      onOpenChange={props.onOpenChange}
      height="auto"
      title="คูปองส่วนลด"
      description={usable().some((c) => !blockOf(c)) ? `มี ${usable().filter((c) => !blockOf(c)).length} คูปองที่ใช้ได้ เลือกได้ 1 คูปองต่อคำสั่งซื้อ` : "เลือกได้ 1 คูปองต่อคำสั่งซื้อ"}
    >
      <form onSubmit={applyCode} novalidate class="flex flex-col gap-1.5">
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <TextField
              label="กรอกโค้ดส่วนลด"
              placeholder="เช่น SAVE50"
              autocomplete="off"
              autocapitalize="characters"
              enterkeyhint="done"
              class="uppercase"
              value={code()}
              onInput={(e) => {
                setCode(e.currentTarget.value);
                // After a failed press: emptying the field says so right away; any typing clears a not-found/expired message until the next press.
                setCodeError(codeTried() && !e.currentTarget.value.trim() ? "กรุณากรอกโค้ดส่วนลด" : undefined);
              }}
              error={codeError()}
            />
          </div>
          {/* Lined up with the input (label 20px + 6px gap), so a message under the input doesn't drag the button down. */}
          <Button type="submit" variant="primary" class="mt-[26px] h-11 shrink-0 !px-5">
            ใช้โค้ด
          </Button>
        </div>
      </form>

      <Show
        when={usable().length > 0}
        fallback={<EmptyState size="compact" icon={TagIcon} title="ยังไม่มีคูปองที่ใช้ได้ตอนนี้" description="ถ้ามีโค้ดส่วนลด กรอกได้ที่ช่องด้านบน" />}
      >
        <div class="flex items-center gap-3 text-xs text-ink-gray" aria-hidden="true">
          <span class="h-px flex-1 bg-border" />
          หรือเลือกคูปองที่มี
          <span class="h-px flex-1 bg-border" />
        </div>

        {/* gap-6 between tickets / gap-4 to a note: each ticket's artwork (with its shadow) is drawn ~10px above and ~14px below its box. */}
        <ul class="flex flex-col gap-6 pt-1" aria-label="คูปองที่ใช้ได้">
          <For each={usable()}>
            {(coupon) => {
              const cartBlocked = () => couponCartBlock(coupon, props.lines);
              const applied = () => props.applied?.code === coupon.code;
              const blocked = () => blockOf(coupon);
              return (
                <li class="flex list-none flex-col gap-4">
                  <div classList={{ "opacity-50": (!!cartBlocked() || !!blocked()) && !applied() }}>
                    <CouponCard coupon={couponTicket(coupon)} action={action(coupon)} />
                  </div>
                  <Show when={applied()}>
                    <p class="px-1 text-xs font-medium text-brand-pink">กำลังใช้คูปองนี้</p>
                  </Show>
                  <Show when={!applied() && blocked()}>
                    <p class="px-1 text-xs text-ink-gray">{blocked()}</p>
                  </Show>
                  <Show when={!applied() && !blocked() && cartBlocked()}>
                    <p class="px-1 text-xs text-ink-gray">{cartBlocked()}</p>
                  </Show>
                </li>
              );
            }}
          </For>
        </ul>
      </Show>
    </SheetModal>
  );
}
