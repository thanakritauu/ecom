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

/** Client-ticking HH:MM:SS countdown used by the Flash Sale banner and the mini ribbon on each card. */
export function CountdownTimer(props: { endsAt: number; size?: "full" | "mini"; label?: string }) {
  const [remaining, setRemaining] = createSignal(props.endsAt - Date.now());

  onMount(() => {
    if (isServer) return;
    const id = setInterval(() => setRemaining(props.endsAt - Date.now()), 1000);
    onCleanup(() => clearInterval(id));
  });

  const parts = () => splitDuration(remaining());
  const isFull = props.size !== "mini";

  return (
    <div class={`flex items-center ${isFull ? "gap-2" : "gap-[3px]"}`} role="timer" aria-live="off">
      {/* Mini (the card ribbon) keeps this for screen readers only — the
          ribbon's wordmark image already says "Flash Sale" visually, and
          there's no room for both that and this as visible text at the
          narrowest card widths. Full (the Flash Sale section banner) has no
          wordmark next to it, so its label stays visible. */}
      <Show when={props.label}>
        <span class={isFull ? "text-white text-sm" : "sr-only"}>{props.label}</span>
      </Show>
      <div class={`flex items-center ${isFull ? "gap-2" : "gap-[2px]"}`}>
        <TimeBox value={parts().h} mini={!isFull} />
        <Colon mini={!isFull} />
        <TimeBox value={parts().m} mini={!isFull} />
        <Colon mini={!isFull} />
        <TimeBox value={parts().s} mini={!isFull} />
      </div>
    </div>
  );
}

function TimeBox(props: { value: number; mini?: boolean }) {
  return (
    <div
      class={`flex items-center justify-center rounded-lg bg-gradient-to-b from-black to-ink font-bold text-white ${
        props.mini ? "size-4 text-[7px]" : "size-11 text-2xl"
      }`}
    >
      {pad(props.value)}
    </div>
  );
}

function Colon(props: { mini?: boolean }) {
  return <span class={`font-bold text-white ${props.mini ? "text-[7px]" : "text-2xl"}`}>:</span>;
}
