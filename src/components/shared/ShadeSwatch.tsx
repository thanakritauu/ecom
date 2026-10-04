import { Show } from "solid-js";

/**
 * One Product Card shade circle (28px): the variant's flat color, or its
 * separately uploaded swatch image when Admin set one (`swatchImage` — never
 * the modal's option photos), with the pink selection ring and a hover
 * tooltip carrying the shade name. The Product Option Modal uses its own
 * photo tiles instead (see QuickAddSheet's `OptionTile`).
 */
export function ShadeSwatch(props: {
  shade: { label: string; color: string; swatchImage?: string };
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  /** Size override — defaults to the 28px circle (`size-7`). */
  class?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.selected}
      aria-label={props.ariaLabel ?? `ตัวเลือกสินค้า ${props.shade.label}`}
      disabled={props.disabled}
      onClick={props.onSelect}
      class={`group/shade relative flex ${props.class ?? "size-7 shrink-0"} items-center justify-center rounded-full transition-transform duration-150 ease-out hover:scale-110 focus-visible:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100`}
    >
      <Show
        when={props.shade.swatchImage}
        fallback={<span class="size-full rounded-full border border-border" style={{ "background-color": props.shade.color || "#CCCCCC" }} aria-hidden="true" />}
      >
        {(img) => <img src={img()} alt="" class="size-full rounded-full border border-border object-cover" aria-hidden="true" />}
      </Show>
      <Show when={props.selected}>
        <span class="absolute inset-[-3px] rounded-full border-2 border-brand-pink transition-all duration-150" aria-hidden="true" />
      </Show>
      {/* Hover/focus tooltip — shade names aren't otherwise visible once the row is just colored dots */}
      <span
        class="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover/shade:opacity-100 group-focus-visible/shade:opacity-100"
        aria-hidden="true"
      >
        {props.shade.label}
      </span>
    </button>
  );
}
