import { createSignal, Show } from "solid-js";
import { Button } from "./Button";
import { CheckBadge, TruckIcon } from "./icons";
import { CouponDetailSheet } from "./CouponDetailSheet";
import { Badge } from "./Badge";
import dashedLine from "~/assets/icons/coupon-dashed-line.svg";
import percentIcon from "~/assets/icons/coupon-percent.svg";
import type { Coupon as StoreCoupon, CouponStamp } from "~/lib/cartSelectors";

/** Two half-height layers, each with one notch: top edge and bottom edge at the stub's edge (`--stub`: 100px on every ticket), 8px radius. */
const TICKET_MASK =
  "radial-gradient(circle at var(--stub) 0, transparent 8px, #000 8.5px) top / 100% 51% no-repeat, radial-gradient(circle at var(--stub) 100%, transparent 8px, #000 8.5px) bottom / 100% 51% no-repeat";

export type Coupon = {
  id: string;
  amountLabel: string;
  /** "ลดสูงสุด ฿200": a capped % coupon's extra line under the amount. */
  capLabel?: string;
  /** Admin's coupon thumbnail, shown in the stub instead of the % artwork. */
  image?: string;
  minSpendLabel: string;
  /** กลุ่มลูกค้า tag on the stub's top corner ("ทุกคน" / "ลูกค้าใหม่" / "เคยสั่งซื้อ" / "สมาชิก", `couponAudienceTag`). */
  audienceTag?: string;
  /** The last line: "ใช้ได้ถึง 31 ธ.ค.", or red when close ("เหลือ 2 วัน" / "หมดอายุวันนี้"), or "หมดอายุ 31 ต.ค." once past. */
  expiryNote?: { text: string; urgent?: boolean };
  /** "shipping" = คูปองส่งฟรี (teal stub with a truck); default = โค้ดส่วนลด. */
  kind?: "discount" | "shipping";
  /** The catalog coupon behind the ticket — when set, tapping the card opens its details & conditions. */
  source?: StoreCoupon;
};

/** Days left at which the expiry line turns red. */
const URGENT_DAYS = 3;

/** The expiry line from the coupon's last valid moment (`expiresLabel` = "หมดอายุ 31 ต.ค."). */
export function couponExpiryNote(c: Pick<StoreCoupon, "expiresAt" | "expiresLabel">, now = Date.now()): Coupon["expiryNote"] {
  const left = Date.parse(c.expiresAt) - now;
  if (Number.isNaN(left)) return undefined;
  if (left < 0) return { text: c.expiresLabel };
  const days = Math.ceil(left / 86_400_000);
  if (days <= 1) return { text: "หมดอายุวันนี้", urgent: true };
  if (days <= URGENT_DAYS) return { text: `เหลือ ${days} วัน`, urgent: true };
  return { text: c.expiresLabel.replace("หมดอายุ", "ใช้ได้ถึง") };
}

/** The ticket for one storefront coupon: every coupon surface (Home, /coupons, the account, Checkout's picker) prints the same lines. */
export function couponTicket(c: StoreCoupon): Coupon {
  const minSpendLabel = c.minSpend > 0 ? `ขั้นต่ำ ฿${c.minSpend.toLocaleString("th-TH")}` : "ไม่มีขั้นต่ำ";
  // โค้ดจากภายนอก: the ticket shows only its name ("โค้ด FREE50"), no tag, amount or minimum, and there's
  // no detail sheet (no `source`): the other system owns its conditions.
  if (c.external) return { id: c.code, amountLabel: `โค้ด ${c.code}`, minSpendLabel: "", kind: c.kind };
  return {
    id: c.code,
    amountLabel: c.amountLabel,
    capLabel: c.capLabel,
    image: c.image,
    minSpendLabel,
    audienceTag: c.audienceTag,
    expiryNote: couponExpiryNote(c),
    kind: c.kind,
    source: c,
  };
}

/**
 * Figma 124:6565 — 104px ticket. The ticket shape SVG carries its own notches
 * and drop shadow, so it's drawn past the card box by the shadow's extent
 * (-9.62% top, -13.46% bottom, -3.25% each side) and the card has no
 * background/clipping of its own. % icon at (31, 20), dashed divider at
 * x=100, content area from x=100 with 16px padding.
 */
/**
 * Replaces the default "เก็บเลย" collect button, e.g. Home's "ไม่ตรงเงื่อนไข".
 * `check`: Checkout's picker, a round check instead of a button (ticked = the coupon in use); `label` is its
 * accessible name and the detail sheet's full-width button text.
 */
export type CouponCardAction = {
  label: string;
  variant: "primary" | "outline";
  disabled?: boolean;
  onClick: () => void;
  check?: { checked: boolean };
  /** For another กลุ่มลูกค้า: a grey two-line pill "เฉพาะ" + this ("ลูกค้าใหม่"), not a button. */
  onlyFor?: string;
};

const STAMP_LABEL: Record<CouponStamp, string> = { expired: "หมดอายุ", soldout: "สิทธิ์หมดแล้ว", used: "ใช้แล้ว" };
/** The detail sheet's (disabled) button for a coupon with no use left. */
const STAMP_SHEET_LABEL: Record<CouponStamp, string> = { expired: "คูปองหมดอายุแล้ว", soldout: "สิทธิ์หมดแล้ว", used: "ใช้สิทธิ์ครบแล้ว" };

export function CouponCard(props: {
  coupon: Coupon;
  collected?: boolean;
  onCollect?: () => Promise<void>;
  action?: CouponCardAction;
  /** Picture-only ticket (no tap target, no button) — the coupon detail sheet's header. */
  display?: boolean;
  /** Past its dates: black and white, faded, like an out-of-stock product photo. */
  expired?: boolean;
  /** Can't be taken any more: a round stamp replaces the button ("หมดอายุ" also turns the ticket black and white). */
  stamp?: CouponStamp;
  /** Collected: the button becomes "ใช้คูปอง" (outline) and runs this, e.g. to go shopping. */
  onUse?: () => void;
  /** Desktop 2-across grids (Home, /coupons): from `xl` another group's "เฉพาะ ..." pill is one line, the size of "ใช้คูปอง". */
  wide?: boolean;
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
    // A disabled action ("ไม่ตรงเงื่อนไข") is a longer word: one size smaller on the ticket so the amount keeps its room.
    const cls = () =>
      p.full ? "w-full" : props.action?.disabled ? "!min-h-0 shrink-0 !px-2.5 !py-2 !text-sm !leading-[normal]" : "!min-h-0 shrink-0 !px-2.5 !py-2 !text-sm !leading-[normal] [@container_(min-width:410px)]:!px-4 [@container_(min-width:410px)]:!text-base";
    return (
      <Show
        when={props.action}
        fallback={
          <Show
            when={props.collected && props.onUse}
            fallback={
              <Button variant={props.collected ? "outline" : "primary"} class={cls()} loading={status() === "loading"} disabled={props.collected} onClick={collect}>
                <Show when={!props.collected} fallback="เก็บแล้ว">
                  {status() === "error" ? "ลองอีกครั้ง" : "เก็บ"}
                </Show>
              </Button>
            }
          >
            {/* Collected: one tap to go use it. */}
            <Button
              variant="outline"
              class={cls()}
              onClick={() => {
                setDetailOpen(false);
                props.onUse!();
              }}
            >
              ใช้คูปอง
            </Button>
          </Show>
        }
      >
        {(action) => (
          <Show
            when={!(action().onlyFor && !p.full)}
            fallback={
              // Narrow ticket: a small two-line pill (no room for 16px beside the amount). A ticket 520px+ wide: one line
              // "เฉพาะสมาชิก Icon", the same size, padding and 16px Medium text as the "ใช้คูปอง" button.
              <span
                class="flex max-w-[88px] shrink-0 flex-col items-center rounded-xl bg-surface-gray px-1.5 py-1.5 text-center text-[11px] font-medium leading-4 text-ink-gray [@container_(min-width:410px)]:px-2.5 [@container_(min-width:410px)]:text-xs [@container_(min-width:520px)]:max-w-none [@container_(min-width:520px)]:flex-row [@container_(min-width:520px)]:rounded-pill [@container_(min-width:520px)]:border [@container_(min-width:520px)]:border-surface-gray [@container_(min-width:520px)]:px-4 [@container_(min-width:520px)]:py-2 [@container_(min-width:520px)]:text-base [@container_(min-width:520px)]:leading-[normal] [@container_(min-width:520px)]:whitespace-nowrap"
              >
                <span>เฉพาะ</span>
                <span>{action().onlyFor}</span>
              </span>
            }
          >
          <Show
            when={action().check && !p.full}
            fallback={
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
            }
          >
            {/* 44px tap area; the shared pink CheckBadge when ticked, an empty ring otherwise (grey when it can't be used). */}
            <button
              type="button"
              role="checkbox"
              aria-checked={action().check!.checked}
              aria-label={action().label}
              disabled={action().disabled}
              onClick={() => action().onClick()}
              class="-mr-2 flex size-11 shrink-0 items-center justify-center disabled:cursor-not-allowed"
            >
              <Show
                when={action().check!.checked}
                fallback={
                  <span
                    class="size-6 rounded-pill border-2"
                    classList={{ "border-ink-placeholder bg-white": !action().disabled, "border-border bg-surface-gray": !!action().disabled }}
                    aria-hidden="true"
                  />
                }
              >
                <CheckBadge />
              </Show>
            </button>
          </Show>
          </Show>
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
    <div
      class="relative h-[104px] w-full [container-type:inline-size]"
      classList={{ "opacity-70 grayscale": props.expired || props.stamp === "expired", "opacity-60": props.stamp === "soldout" || props.stamp === "used" }}
    >
      {/* The stub (picture side) is 100px wide on every ticket, so the dashed line and the picture never move. Text sizes
          follow the ticket's own width (container queries), not the screen: compact below 410px, roomiest from 520px. */}
      <div class="absolute inset-0 [--stub:100px]">
      {/* Ticket outline drawn in CSS (was a 369px SVG stretched to fit, which bent the notches and corners at other
          widths): 16px corners, 8px notches centred on the dashed line at 100px, Figma's shadow (y 2, blur 12, 10%). */}
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 [filter:drop-shadow(0_2px_12px_rgba(90,106,133,0.1))]">
        <div class="size-full rounded-2xl bg-white" style={{ "-webkit-mask": TICKET_MASK, mask: TICKET_MASK }} />
      </div>
      <Show when={props.coupon.source && !props.display}>
        <button
          type="button"
          class="absolute inset-0 rounded-card font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
          aria-haspopup="dialog"
          aria-label={`ดูรายละเอียดคูปอง ${props.coupon.amountLabel}${props.coupon.capLabel ? ` ${props.coupon.capLabel}` : ""} ${props.coupon.minSpendLabel}`}
          onClick={() => setDetailOpen(true)}
        />
      </Show>
      {/* Stub picture, the same size and place on every ticket (the stub is 100px wide everywhere, the dashed line never
          moves): Admin's square thumbnail at 64x64, the % artwork at 43x63, or คูปองส่งฟรี's green truck at 56x56.
          A กลุ่มลูกค้า tag sits in the stub's top corner, so the picture moves 8px down. */}
      <Show
        when={props.coupon.kind === "shipping"}
        fallback={
          <Show
            when={props.coupon.image}
            fallback={<img src={percentIcon} alt="" aria-hidden="true" class="pointer-events-none absolute left-[31px] h-[63px] w-[43px]" classList={{ "top-[20px]": !props.coupon.audienceTag, "top-[28px]": !!props.coupon.audienceTag }} />}
          >
            {(src) => <img src={src()} alt="" aria-hidden="true" class="pointer-events-none absolute left-[18px] size-16 rounded-xl object-cover" classList={{ "top-[20px]": !props.coupon.audienceTag, "top-[28px]": !!props.coupon.audienceTag }} />}
          </Show>
        }
      >
        <span class="pointer-events-none absolute left-[22px] text-success" classList={{ "top-[24px]": !props.coupon.audienceTag, "top-[32px]": !!props.coupon.audienceTag }}>
          <TruckIcon class="size-14" />
        </span>
      </Show>
      {/* กลุ่มลูกค้า tag: the product card's "ลด %" badge (`Badge` red) on every ticket. */}
      <Show when={props.coupon.audienceTag}>
        {(tag) => (
          <Badge tone="red" class="pointer-events-none absolute left-1.5 top-1.5 max-w-[88px]">
            <span class="truncate">{tag()}</span>
          </Badge>
        )}
      </Show>
      <img src={dashedLine} alt="" aria-hidden="true" class="pointer-events-none absolute left-[calc(var(--stub)-0.5px)] top-2 h-[88px] w-px" />
      {/* Two lines: amount + the "สูงสุด" badge beside it, then minimum | expiry (one line, "..." if it runs out of room). */}
      <div data-ticket-content class="pointer-events-none absolute inset-y-0 left-[var(--stub)] right-0 flex items-center justify-between gap-1.5 px-2.5 [@container_(min-width:410px)]:gap-2 [@container_(min-width:410px)]:px-4">
        <div class="flex min-w-0 flex-col gap-1">
          <div class="flex items-center gap-1 [@container_(min-width:410px)]:gap-1.5 [@container_(min-width:520px)]:gap-2">
            <p
              class="whitespace-nowrap text-[17px] font-bold leading-7 [@container_(min-width:410px)]:text-lg [@container_(min-width:520px)]:text-2xl [@container_(min-width:520px)]:leading-8"
              classList={{ "text-system-red": props.coupon.kind !== "shipping", "text-success": props.coupon.kind === "shipping" }}
            >
              {props.coupon.amountLabel}
            </p>
            <Show when={props.coupon.capLabel}>
              <p
                class="shrink-0 whitespace-nowrap rounded-pill px-1.5 py-0.5 text-xs font-bold"
                classList={{
                  "bg-danger-soft text-danger-strong": props.coupon.kind !== "shipping",
                  "bg-success-soft text-success": props.coupon.kind === "shipping",
                }}
              >
                {props.coupon.capLabel}
              </p>
            </Show>
          </div>
          {/* Minimum | expiry on one line on every ticket: 14px from a 410px ticket, 12px below (never smaller). Too long
              for the room beside the button, it ends in "..." rather than wrap or touch it. Empty for a โค้ดจากภายนอก
              (name only): hidden so the name sits centred. */}
          <p class="truncate text-xs leading-4 empty:hidden [@container_(min-width:410px)]:text-sm [@container_(min-width:410px)]:leading-5">
            <Show when={props.coupon.minSpendLabel}>
              <span class="font-medium text-ink">{props.coupon.minSpendLabel}</span>
            </Show>
            <Show when={props.coupon.expiryNote}>
              {(note) => (
                <>
                  <Show when={props.coupon.minSpendLabel}>
                    <span class="mx-1 inline-block h-3 w-px bg-border align-middle [@container_(min-width:410px)]:mx-1.5" aria-hidden="true" />
                  </Show>
                  {/* "ใช้ได้ถึง 31 ธ.ค." in full (never shortened to "ถึง"). */}
                  <span classList={{ "text-system-red": !!note().urgent, "text-ink-gray": !note().urgent }}>{note().text}</span>
                </>
              )}
            </Show>
          </p>
        </div>
        <Show when={!props.display}>
          <Show
            when={props.stamp}
            fallback={
              <div class="pointer-events-auto shrink-0">
                <ActionButton />
              </div>
            }
          >
            {(stamp) => (
              <span class="flex size-16 shrink-0 -rotate-12 items-center justify-center rounded-pill border-2 border-ink-gray bg-white px-1 text-center text-xs font-semibold leading-4 text-ink-gray">
                {STAMP_LABEL[stamp()]}
              </span>
            )}
          </Show>
        </Show>
      </div>
      </div>
      <Show when={!props.display && props.coupon.source}>
        {(source) => (
          <CouponDetailSheet
            open={detailOpen()}
            onOpenChange={setDetailOpen}
            coupon={source()}
            ticket={<CouponCard coupon={props.coupon} display wide={props.wide} stamp={props.stamp} expired={props.expired} />}
            action={
              // No use left (expired / every use gone / this shopper's uses gone): the sheet's button can't be pressed either.
              <Show when={props.stamp ?? (props.expired ? "expired" : undefined)} fallback={<ActionButton full />}>
                {(stamp) => (
                  <Button variant="outline" class="w-full" disabled>
                    {STAMP_SHEET_LABEL[stamp()]}
                  </Button>
                )}
              </Show>
            }
          />
        )}
      </Show>
    </div>
  );
}
