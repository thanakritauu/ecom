import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { isServer } from "solid-js/web";

function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The one client-ticking countdown implementation — every Flash Sale timer
 * (section banner, Product Card overlay, PDP gallery overlay) reads from
 * this. Clamps at 00:00:00 once `endsAt` passes (the existing expired
 * behavior); callers decide whether to keep showing it.
 */
export function createCountdown(endsAt: () => number) {
  const [now, setNow] = createSignal(Date.now());
  onMount(() => {
    if (isServer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    onCleanup(() => clearInterval(id));
  });
  return () => splitDuration(endsAt() - now());
}

/**
 * HH:MM:SS boxed-digit countdown. `full` is the Flash Sale section banner;
 * `bar` / `bar-lg` are the black-box digits inside `FlashSaleBar` (Figma
 * 546:2711 — Product Card and PDP respectively). `bar` scales with the
 * FlashSaleBar's container width (Figma size from 200px up).
 */
export function CountdownTimer(props: { endsAt: number; size?: "full" | "bar" | "bar-lg"; label?: string }) {
  const parts = createCountdown(() => props.endsAt);
  const size = props.size ?? "full";

  if (size !== "full") {
    const lg = size === "bar-lg";
    return (
      <div
        class={`flex shrink-0 items-center ${lg ? "gap-1" : "gap-0.5 [@container(min-width:200px)]:gap-1"}`}
        role="timer"
        aria-live="off"
      >
        <Show when={props.label}>
          <span class="sr-only">{props.label}</span>
        </Show>
        <BarBox value={parts().h} lg={lg} />
        <BarColon lg={lg} />
        <BarBox value={parts().m} lg={lg} />
        <BarColon lg={lg} />
        <BarBox value={parts().s} lg={lg} />
      </div>
    );
  }

  return (
    <div class="flex items-center gap-2" role="timer" aria-live="off">
      <Show when={props.label}>
        <span class="text-sm text-white">{props.label}</span>
      </Show>
      <div class="flex items-center gap-1 sm:gap-1.5 lg:gap-[7px]">
        <TimeBox value={parts().h} />
        <Colon />
        <TimeBox value={parts().m} />
        <Colon />
        <TimeBox value={parts().s} />
      </div>
    </div>
  );
}

/** Figma 124:6410 — black box, 43px tall, 12px × 6px padding, 8.7px radius, 23.6px Bold digits. */
function TimeBox(props: { value: number }) {
  return (
    <div class="flex h-8 items-center justify-center rounded-md bg-black px-2 text-base font-bold tabular-nums leading-[normal] text-white sm:h-9 sm:rounded-lg sm:px-2.5 sm:text-xl lg:h-[43px] lg:rounded-[8.7px] lg:px-3 lg:text-[23.6px]">
      {pad(props.value)}
    </div>
  );
}

function Colon() {
  return <span class="text-base font-bold leading-[normal] text-white sm:text-xl lg:text-[23.6px]">:</span>;
}

function BarBox(props: { value: number; lg?: boolean }) {
  return (
    <span
      class={`flex items-center justify-center rounded bg-black font-bold tabular-nums text-white ${props.lg ? "leading-[17px]" : ""} ${
        props.lg
          ? "min-w-[34px] px-2 py-1 text-base"
          : "min-w-[16px] px-0.5 py-px text-[9px] leading-[13px] [@container(min-width:170px)]:min-w-[21px] [@container(min-width:170px)]:px-1 [@container(min-width:170px)]:text-[10px] [@container(min-width:170px)]:leading-[15px] [@container(min-width:200px)]:min-w-[27px] [@container(min-width:200px)]:px-1.5 [@container(min-width:200px)]:py-0.5 [@container(min-width:200px)]:text-xs [@container(min-width:200px)]:leading-[17px]"
      }`}
    >
      {pad(props.value)}
    </span>
  );
}

function BarColon(props: { lg?: boolean }) {
  return (
    <span
      class={`font-bold text-white ${props.lg ? "text-base" : "text-[9px] [@container(min-width:170px)]:text-[10px] [@container(min-width:200px)]:text-xs"}`}
      aria-hidden="true"
    >
      :
    </span>
  );
}
