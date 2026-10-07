import { createSignal, Show } from "solid-js";
import { Button } from "./Button";
import { CouponDetailSheet } from "./CouponDetailSheet";
import ticketShape from "~/assets/icons/coupon-ticket-shape.svg";
import dashedLine from "~/assets/icons/coupon-dashed-line.svg";
import percentIcon from "~/assets/icons/coupon-percent.svg";
import type { Coupon as StoreCoupon } from "~/lib/cartSelectors";

export type Coupon = {
  id: string;
  amountLabel: string;
  minSpendLabel: string;
  expiryLabel: string;
  /** The catalog coupon behind the ticket — when set, tapping the card opens its details & conditions. */
  source?: StoreCoupon;
};

/** The ticket for one of `AVAILABLE_COUPONS` — Home's section and Checkout's picker print the exact same three lines. */
export function couponTicket(c: StoreCoupon): Coupon {
  return { id: c.code, amountLabel: c.label, minSpendLabel: `ขั้นต่ำ ฿${c.minSpend.toLocaleString("th-TH")}`, expiryLabel: c.expiresLabel, source: c };
}

/**
 * Figma 124:6565 — 104px ticket. The ticket shape SVG carries its own notches
 * and drop shadow, so it's drawn past the card box by the shadow's extent
 * (-9.62% top, -13.46% bottom, -3.25% each side) and the card has no
 * background/clipping of its own. % icon at (31, 20), dashed divider at
 * x=100, content area from x=100 with 16px padding.
 */
/** Replaces the default "เก็บเลย" collect button — e.g. Checkout's "ใช้เลย" / "ยกเลิก". */
export type CouponCardAction = { label: string; variant: "primary" | "outline"; disabled?: boolean; onClick: () => void };

export function CouponCard(props: {
  coupon: Coupon;
  collected?: boolean;
  onCollect?: () => Promise<void>;
  action?: CouponCardAction;
  /** Picture-only ticket (no tap target, no button) — the coupon detail sheet's header. */
  display?: boolean;
}) {
  const [status, setStatus] = createSignal<"idle" | "loading" | "error">("idle");

  const collect = async () => {
    setStatus("loading");
    try {
      await props.onCollect?.();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const [detailOpen, setDetailOpen] = createSignal(false);

  // The one collect/use button — on the ticket and, full width, in the detail sheet's footer.
  const ActionButton = (p: { full?: boolean }) => {
    const cls = () => (p.full ? "w-full" : "!min-h-0 shrink-0 !px-4 !py-2 !text-base !leading-[normal]");
    return (
      <Show
        when={props.action}
        fallback={
          <Button
            variant={props.collected ? "outline" : "primary"}
            class={cls()}
            loading={status() === "loading"}
            disabled={props.collected}
            onClick={collect}
          >
            <Show when={!props.collected} fallback="เก็บแล้ว">
              {status() === "error" ? "ลองอีกครั้ง" : "เก็บเลย"}
            </Show>
          </Button>
        }
      >
        {(action) => (
          <Button
            variant={action().variant}
            class={cls()}
            disabled={action().disabled}
            onClick={() => {
              setDetailOpen(false);
              action().onClick();
            }}
          >
            {action().label}
          </Button>
        )}
      </Show>
    );
  };

  /*
   * Clickable card without nesting buttons: a full-size (transparent) button
   * sits under the ticket's content, which ignores pointer events except for
   * the collect/use button on top — so that button never opens the sheet.
   */
  return (
    <div class="relative h-[104px] w-full">
      <img
        src={ticketShape}
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute left-[-3.25%] top-[-9.62%] h-[123.08%] w-[106.5%] max-w-none"
      />
      <Show when={props.coupon.source && !props.display}>
        <button
          type="button"
          class="absolute inset-0 rounded-card font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
          aria-haspopup="dialog"
          aria-label={`ดูรายละเอียดคูปอง ${props.coupon.amountLabel} ${props.coupon.minSpendLabel}`}
          onClick={() => setDetailOpen(true)}
        />
      </Show>
      <img src={percentIcon} alt="" aria-hidden="true" class="pointer-events-none absolute left-[31px] top-[20px] h-[63px] w-[43px]" />
      <img src={dashedLine} alt="" aria-hidden="true" class="pointer-events-none absolute left-[99.5px] top-2 h-[88px] w-px" />
      <div class="pointer-events-none absolute inset-y-0 left-[100px] right-0 flex items-center justify-between gap-2 p-4">
        <div class="flex min-w-0 flex-col">
          <p class="whitespace-nowrap text-xl font-bold leading-7 text-system-red">{props.coupon.amountLabel}</p>
          <p class="text-sm font-medium leading-5 text-ink">{props.coupon.minSpendLabel}</p>
          <p class="whitespace-nowrap text-xs leading-[normal] text-ink-gray">{props.coupon.expiryLabel}</p>
        </div>
        <Show when={!props.display}>
          <div class="pointer-events-auto shrink-0">
            <ActionButton />
          </div>
        </Show>
      </div>
      <Show when={!props.display && props.coupon.source}>
        {(source) => (
          <CouponDetailSheet
            open={detailOpen()}
            onOpenChange={setDetailOpen}
            coupon={source()}
            ticket={<CouponCard coupon={props.coupon} display />}
            action={<ActionButton full />}
          />
        )}
      </Show>
    </div>
  );
}
