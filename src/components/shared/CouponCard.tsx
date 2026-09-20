import { createSignal, Show } from "solid-js";
import { Button } from "./Button";
import ticketShape from "~/assets/icons/coupon-ticket-shape.svg";
import dashedLine from "~/assets/icons/coupon-dashed-line.svg";
import percentIcon from "~/assets/icons/coupon-percent.svg";

export type Coupon = {
  id: string;
  amountLabel: string;
  minSpendLabel: string;
  expiryLabel: string;
};

export function CouponCard(props: { coupon: Coupon; collected: boolean; onCollect: () => Promise<void> }) {
  const [status, setStatus] = createSignal<"idle" | "loading" | "error">("idle");

  const collect = async () => {
    setStatus("loading");
    try {
      await props.onCollect();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div class="relative flex h-[104px] w-full overflow-hidden">
      <img src={ticketShape} alt="" class="absolute inset-0 size-full" aria-hidden="true" />
      <div class="relative flex w-[100px] shrink-0 items-center justify-center">
        <img src={percentIcon} alt="" class="h-[63px] w-[43px]" aria-hidden="true" />
      </div>
      <img src={dashedLine} alt="" class="relative h-[88px] w-px self-center" aria-hidden="true" />
      <div class="relative flex flex-1 items-center justify-between gap-3 p-4">
        <div class="flex flex-col">
          <p class="text-xl font-bold leading-7 text-system-red">{props.coupon.amountLabel}</p>
          <p class="text-sm font-medium text-ink">{props.coupon.minSpendLabel}</p>
          <p class="text-xs text-ink-gray">{props.coupon.expiryLabel}</p>
        </div>
        <Button
          size="sm"
          variant={props.collected ? "outline" : "primary"}
          loading={status() === "loading"}
          disabled={props.collected}
          onClick={collect}
        >
          <Show when={!props.collected} fallback="เก็บแล้ว">
            {status() === "error" ? "ลองอีกครั้ง" : "เก็บเลย"}
          </Show>
        </Button>
      </div>
    </div>
  );
}
