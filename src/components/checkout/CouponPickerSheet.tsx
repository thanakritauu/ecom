import { createEffect, createSignal, For, on, Show } from "solid-js";
import type { Coupon } from "~/lib/cartSelectors";
import { SheetModal } from "../shared/SheetModal";
import { CouponCard, type CouponCardAction } from "../shared/CouponCard";
import { formatTHB } from "../shared/PriceDisplay";
import { Button } from "../shared/Button";
import { TextField } from "../shared/TextField";

/**
 * Checkout coupon picker — the shared modal frame (`SheetModal`, same as the
 * Product Option Modal) listing Home's coupon ticket (`CouponCard`). One
 * coupon per order: "ใช้เลย" applies it and closes; the applied one shows
 * "ยกเลิก". A coupon whose minimum spend isn't met yet stays visible but
 * can't be used, with how much more to buy. A code can also be typed in
 * (top of the modal) — same coupons, same rules, case-insensitive.
 */
export function CouponPickerSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupons: Coupon[];
  subtotal: number;
  applied: Coupon | undefined;
  onApply: (coupon: Coupon) => void;
  onRemove: () => void;
}) {
  // Typed code
  const [code, setCode] = createSignal("");
  const [codeError, setCodeError] = createSignal<string>();
  createEffect(on(() => props.open, (open) => open && (setCode(""), setCodeError(undefined))));
  const applyCode = (e: SubmitEvent) => {
    e.preventDefault();
    const typed = code().trim().toUpperCase();
    if (!typed) return setCodeError("กรุณากรอกโค้ดส่วนลด");
    const coupon = props.coupons.find((c) => c.code.toUpperCase() === typed);
    if (!coupon) return setCodeError("ไม่พบโค้ดส่วนลดนี้ กรุณาตรวจสอบอีกครั้ง");
    if (props.subtotal < coupon.minSpend)
      return setCodeError(`โค้ดนี้ใช้ได้เมื่อซื้อครบ ฿${coupon.minSpend.toLocaleString("th-TH")} (ซื้อเพิ่มอีก ${formatTHB(coupon.minSpend - props.subtotal)})`);
    props.onApply(coupon);
    props.onOpenChange(false);
  };

  const action = (coupon: Coupon): CouponCardAction => {
    if (props.applied?.code === coupon.code) return { label: "ยกเลิก", variant: "outline", onClick: props.onRemove };
    return {
      label: "ใช้เลย",
      variant: "primary",
      disabled: props.subtotal < coupon.minSpend,
      onClick: () => {
        props.onApply(coupon);
        props.onOpenChange(false);
      },
    };
  };

  return (
    <SheetModal
      open={props.open}
      onOpenChange={props.onOpenChange}
      height="auto"
      title="คูปองส่วนลด"
      description={`ใช้ได้ ${props.coupons.length} คูปอง · เลือกได้ 1 คูปองต่อคำสั่งซื้อ`}
    >
      <form onSubmit={applyCode} novalidate class="flex flex-col gap-1.5">
        <div class="flex items-end gap-2">
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
                setCodeError(undefined);
              }}
              aria-invalid={!!codeError()}
            />
          </div>
          <Button type="submit" variant="primary" class="h-11 shrink-0 !px-5">
            ใช้โค้ด
          </Button>
        </div>
        <Show when={codeError()}>
          <p class="text-sm text-system-red" role="alert">
            {codeError()}
          </p>
        </Show>
      </form>

      <div class="flex items-center gap-3 text-xs text-ink-gray" aria-hidden="true">
        <span class="h-px flex-1 bg-border" />
        หรือเลือกคูปองที่มี
        <span class="h-px flex-1 bg-border" />
      </div>

      {/* gap-6 between tickets / gap-4 to a note: each ticket's artwork (with its shadow) is drawn ~10px above and ~14px below its box. */}
      <ul class="flex flex-col gap-6 pt-1" aria-label="คูปองที่ใช้ได้">
        <For each={props.coupons}>
          {(coupon) => {
            const shortfall = () => coupon.minSpend - props.subtotal;
            const applied = () => props.applied?.code === coupon.code;
            return (
              <li class="flex list-none flex-col gap-4">
                <div classList={{ "opacity-50": shortfall() > 0 && !applied() }}>
                  <CouponCard
                    coupon={{
                      id: coupon.code,
                      amountLabel: `ลด ${formatTHB(coupon.discount)}`,
                      minSpendLabel: `ขั้นต่ำ ฿${coupon.minSpend.toLocaleString("th-TH")}`,
                      expiryLabel: coupon.expiresLabel,
                    }}
                    action={action(coupon)}
                  />
                </div>
                <Show when={applied()}>
                  <p class="px-1 text-xs font-medium text-brand-pink">กำลังใช้คูปองนี้</p>
                </Show>
                <Show when={!applied() && shortfall() > 0}>
                  <p class="px-1 text-xs text-ink-gray">ซื้อเพิ่มอีก {formatTHB(shortfall())} เพื่อใช้คูปองนี้</p>
                </Show>
              </li>
            );
          }}
        </For>
      </ul>
    </SheetModal>
  );
}
