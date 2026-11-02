import { createEffect, createSignal, For, on, Show } from "solid-js";
import {
  couponCartBlock,
  couponDiscountAmount,
  couponEligibleSubtotal,
  couponStackBlocked,
  couponUsageBlock,
  canAddCoupon,
  isCouponActive,
  isCouponExpired,
  MAX_COUPONS_PER_ORDER,
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
 * Product Option Modal) listing Home's coupon ticket (`CouponCard`). Up to 2
 * coupons per order when both stack with coupons (else one): ticking a coupon's round check applies it, closes and confirms with a toast; the
 * applied one is ticked (tap again to stop using it) and always first in its tab. A coupon whose minimum spend isn't met yet stays visible but
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
  /** The paid cart lines after every promo (`CartPricing.pricedLines`; free gifts never count toward a coupon). */
  lines: ResolvedCartLine[];
  /** How many of this shopper's own (non-cancelled) orders used the code; 0 for a guest. */
  usedByShopper?: (code: string) => number;
  /** The coupons in use (up to 2 when they stack). */
  applied: Coupon[];
  onApply: (coupon: Coupon) => void;
  onRemove: (code: string) => void;
  /** Codes this shopper has collected (Home / /coupons); the "เก็บแล้ว" tab. */
  collectedCodes?: Set<string>;
  /** Collected coupons past their dates: listed last under "เก็บแล้ว" as หมดอายุแล้ว (never usable). */
  expiredCollected?: Coupon[];
  /** Using a coupon also collects it. */
  onCollect?: (code: string) => void;
}) {
  // Every listed coupon inside its dates (any กลุ่มลูกค้า: another group's is shown under "ทั้งหมด", not usable).
  const listed = () => props.coupons.filter((c) => isCouponActive(c));
  const blockOf = (coupon: Coupon) =>
    (isCouponExpired(coupon) ? `คูปองนี้${coupon.expiresLabel.replace("หมดอายุ", "หมดอายุเมื่อ")}` : undefined) ??
    coupon.audienceBlock ??
    couponUsageBlock(coupon, props.usedByShopper?.(coupon.code) ?? 0);
  /** Can go on this order right now: this shopper's group, uses left, and the cart meets its conditions. */
  const canUse = (coupon: Coupon) => !blockOf(coupon) && !couponCartBlock(coupon, props.lines);

  // Tabs: ใช้ได้ (usable now) / เก็บแล้ว (collected) / ทั้งหมด (every listed coupon). Opens on ใช้ได้, or ทั้งหมด when none is.
  type Tab = "usable" | "collected" | "all";
  // The coupon in use always leads its tab.
  const isApplied = (c: Coupon) => props.applied.some((a) => a.code === c.code);
  const appliedFirst = (list: Coupon[]) => [...list.filter(isApplied), ...list.filter((c) => !isApplied(c))];
  const tabLists: Record<Tab, () => Coupon[]> = {
    usable: () => appliedFirst(listed().filter((c) => canUse(c) || isApplied(c))),
    collected: () => appliedFirst([...listed().filter((c) => props.collectedCodes?.has(c.code) || isApplied(c)), ...(props.expiredCollected ?? [])]),
    all: () => appliedFirst(listed()),
  };
  const TABS: { key: Tab; label: string; empty: string }[] = [
    { key: "usable", label: "ใช้ได้", empty: "ยังไม่มีคูปองที่ใช้กับคำสั่งซื้อนี้ได้" },
    { key: "collected", label: "เก็บแล้ว", empty: "ยังไม่ได้เก็บคูปอง เก็บคูปองได้ที่หน้าแรกหรือหน้าคูปอง" },
    { key: "all", label: "ทั้งหมด", empty: "ยังไม่มีคูปองในตอนนี้" },
  ];
  const [tab, setTab] = createSignal<Tab>("usable");
  createEffect(on(() => props.open, (open) => open && setTab(tabLists.usable().length > 0 ? "usable" : "all")));
  // The popup stays open so a second coupon that stacks can be ticked too; "ตกลง" closes it.
  const apply = (coupon: Coupon, via: "code" | "pick") => {
    const replaces = props.applied.length > 0 && !canAddCoupon(props.applied, coupon);
    props.onApply(coupon);
    props.onCollect?.(coupon.code);
    if (via === "code") setCode("");
    pushToast(
      via === "code" ? `ใช้โค้ด ${coupon.code} แล้ว` : replaces ? "เปลี่ยนคูปองแล้ว" : "ใช้คูปองแล้ว",
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
    if (coupon.audienceBlock) return setCodeError(coupon.audienceBlock);
    const blocked = blockOf(coupon);
    if (blocked) return setCodeError(blocked);
    const cartBlocked = couponCartBlock(coupon, props.lines);
    if (cartBlocked && (isCouponScoped(coupon) || couponStackBlocked(coupon, props.lines))) return setCodeError(cartBlocked);
    const eligible = couponEligibleSubtotal(coupon, props.lines);
    if (eligible < coupon.minSpend)
      return setCodeError(`โค้ดนี้ใช้ได้เมื่อซื้อครบ ฿${coupon.minSpend.toLocaleString("th-TH")} (ซื้อเพิ่มอีก ${formatTHB(coupon.minSpend - eligible)})`);
    apply(coupon, "code");
  };

  // A round check on each ticket (ticked = in use): tap to use, tap the ticked one to stop using it.
  // One that can't be used has a grey ring; the reason is written under it.
  const action = (coupon: Coupon): CouponCardAction => {
    if (isApplied(coupon)) return { label: "ยกเลิกการใช้คูปอง", variant: "outline", onClick: () => props.onRemove(coupon.code), check: { checked: true } };
    return { label: "ใช้คูปองนี้", variant: "primary", disabled: !canUse(coupon), onClick: () => apply(coupon, "pick"), check: { checked: false } };
  };

  return (
    <SheetModal
      open={props.open}
      onOpenChange={props.onOpenChange}
      height="auto"
      title="คูปองส่วนลด"
      description={`ใช้ร่วมกันได้สูงสุด ${MAX_COUPONS_PER_ORDER} คูปอง สำหรับคูปองที่ใช้ร่วมกับคูปองอื่นได้`}
      footer={
        <Button type="button" variant="primary" size="lg" class="w-full" onClick={() => props.onOpenChange(false)}>
          ตกลง
        </Button>
      }
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
        when={listed().length > 0}
        fallback={<EmptyState size="compact" icon={TagIcon} title="ยังไม่มีคูปองในตอนนี้" description="ถ้ามีโค้ดส่วนลด กรอกได้ที่ช่องด้านบน" />}
      >
        {/* Same underline tabs as Purchase History, each with its count. */}
        <div role="tablist" aria-label="ประเภทคูปอง" class="-mx-6 flex h-11 shrink-0 items-start overflow-x-auto border-b border-surface-gray px-6">
          <For each={TABS}>
            {(t) => (
              <button
                type="button"
                role="tab"
                aria-selected={tab() === t.key}
                onClick={() => setTab(t.key)}
                class="flex h-full shrink-0 items-center justify-center whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors duration-150"
                classList={{
                  "border-brand-pink text-ink": tab() === t.key,
                  "border-transparent text-ink-placeholder lg:hover:text-ink-gray": tab() !== t.key,
                }}
              >
                {t.label} ({tabLists[t.key]().length})
              </button>
            )}
          </For>
        </div>

        <Show
          when={tabLists[tab()]().length > 0}
          fallback={<EmptyState size="compact" icon={TagIcon} title={TABS.find((t) => t.key === tab())!.empty} />}
        >
        {/* gap-6 between tickets / gap-4 to a note: each ticket's artwork (with its shadow) is drawn ~10px above and ~14px below its box. */}
        <ul class="flex flex-col gap-6 pt-1" aria-label={`คูปอง${TABS.find((t) => t.key === tab())!.label}`}>
          <For each={tabLists[tab()]()}>
            {(coupon) => {
              const cartBlocked = () => couponCartBlock(coupon, props.lines);
              const applied = () => isApplied(coupon);
              // Usable, but it can't go with what's ticked: ticking it swaps them out.
              const replaces = () => !applied() && canUse(coupon) && props.applied.length > 0 && !canAddCoupon(props.applied, coupon);
              const blocked = () => blockOf(coupon);
              return (
                <li class="flex list-none flex-col gap-4">
                  {/* Can't be used: faded; expired: black and white instead (`CouponCard`'s own look). */}
                  <div classList={{ "opacity-50": (!!cartBlocked() || !!blocked()) && !applied() && !isCouponExpired(coupon) }}>
                    <CouponCard coupon={couponTicket(coupon)} action={action(coupon)} expired={isCouponExpired(coupon)} />
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
                  <Show when={replaces()}>
                    <p class="px-1 text-xs text-ink-gray">ใช้ร่วมกับคูปองที่เลือกอยู่ไม่ได้ เลือกแล้วจะใช้แทน</p>
                  </Show>
                </li>
              );
            }}
          </For>
        </ul>
        </Show>
      </Show>
    </SheetModal>
  );
}
