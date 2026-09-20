/**
 * Two visual tones, both from Figma: "pink" is the Product Detail control
 * (node 132:5164, a solid pink pill with translucent-white buttons); "outline"
 * is the Cart Drawer's (node 153:19197, a white pill with a gray border and
 * gray/pink circular buttons). Shared here — rather than forked per screen —
 * since both are the same increment/decrement/clamp behavior with different
 * skins, and a future screen needing a quantity control should reach for
 * this with a new `tone` rather than writing another stepper.
 */
export function QuantityStepper(props: {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  disabled?: boolean;
  tone?: "pink" | "outline";
}) {
  const tone = () => props.tone ?? "pink";
  const clamp = (n: number) => Math.max(1, props.max !== undefined ? Math.min(n, props.max) : n);
  // Guards against rapid clicking racing itself — always derive the next
  // value from the current prop, never from a locally-cached number.
  const dec = () => !props.disabled && props.onChange(clamp(props.value - 1));
  const inc = () => !props.disabled && props.onChange(clamp(props.value + 1));

  const atMax = () => props.max !== undefined && props.value >= props.max;

  if (tone() === "outline") {
    return (
      <div
        class="flex h-9 shrink-0 items-center gap-0.5 rounded-pill border-[1.5px] border-surface-gray bg-white p-1"
        classList={{ "opacity-50": props.disabled }}
      >
        <button
          type="button"
          onClick={dec}
          disabled={props.disabled || props.value <= 1}
          aria-label="ลดจำนวน"
          class="flex size-7 items-center justify-center rounded-pill bg-surface-gray text-ink transition-colors duration-150 hover:bg-surface-gray/70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MinusIcon class="size-2.5" />
        </button>
        <span class="min-w-7 text-center text-sm font-semibold text-ink" aria-live="polite" aria-atomic="true">
          {props.value}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={props.disabled || atMax()}
          aria-label="เพิ่มจำนวน"
          class="flex size-7 items-center justify-center rounded-pill bg-surface-pink text-brand-pink transition-colors duration-150 hover:bg-surface-pink/70 disabled:cursor-not-allowed disabled:bg-surface-gray disabled:text-ink-gray disabled:opacity-40"
        >
          <PlusIcon class="size-2.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      class="flex h-[52px] shrink-0 items-center gap-1 rounded-pill bg-brand-pink p-2 text-white"
      classList={{ "opacity-50": props.disabled }}
    >
      {/* The +/- buttons are 36px, under the usual 44px touch-target guidance
          — a documented exception, the same as the shade-swatch selector on
          Home: a dense, single-purpose control on an already-tall (52px)
          tap-friendly pill, where enlarging just the inner buttons would
          break the Figma-matched proportions without meaningfully improving
          reachability. */}
      <button
        type="button"
        onClick={dec}
        disabled={props.disabled || props.value <= 1}
        aria-label="ลดจำนวน"
        class="flex size-9 items-center justify-center rounded-pill bg-white/30 transition-colors duration-150 hover:bg-white/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <MinusIcon class="size-3.5" />
      </button>
      <span class="min-w-9 text-center text-lg font-semibold" aria-live="polite" aria-atomic="true">
        {props.value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={props.disabled || atMax()}
        aria-label="เพิ่มจำนวน"
        class="flex size-9 items-center justify-center rounded-pill bg-white/30 transition-colors duration-150 hover:bg-white/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PlusIcon class="size-3.5" />
      </button>
    </div>
  );
}

function MinusIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <path d="M5 12h14" stroke-linecap="round" />
    </svg>
  );
}

function PlusIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke-linecap="round" />
    </svg>
  );
}
