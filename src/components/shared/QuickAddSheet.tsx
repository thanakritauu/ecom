import { Dialog } from "@kobalte/core/dialog";
import { For, Show, createEffect, createMemo, createSignal, on } from "solid-js";
import type { Product } from "~/lib/types";
import { resolveVariantOptions, type VariantOption } from "~/lib/productVariants";
import { reviewsOfProduct } from "~/lib/productReviews";
import { Button } from "./Button";
import { formatTHB } from "./PriceDisplay";
import { CartIcon } from "./icons";
import { QuantityStepper } from "./QuantityStepper";
import { ReviewList, ReviewMediaViewer, type ReviewMediaViewerState } from "./ReviewList";

/**
 * Product Option Modal — a shortcut of the Product Detail Page: the same
 * options, the same quantity control and the same reviews (`ReviewList`,
 * shared with the PDP; this modal's review layout is the reference). Based
 * on Figma 547:7726 / 547:7728, restacked into one column at every size:
 * 668px dialog max, full-bleed header / footer dividers, 24px side padding;
 * top to bottom the selected option name, the option photo tiles (~100px
 * rounded squares, name under each, pink border + check when selected),
 * then all of the product's reviews (their "รีวิว" heading sticks under the
 * header once scrolled to). The pinned footer carries the price, then the
 * quantity stepper right before the add-to-cart button, both 52px tall.
 *
 * Fixed height at every size (90dvh, capped at 680px on desktop) — header
 * and footer stay pinned and only the body scrolls. Nothing is hidden or
 * clamped on small screens: full product name, selected option, price +
 * compare-at price and the full CTA label all stay; below `sm` the price row
 * (centered) and the CTA stack instead of shrinking.
 *
 * Option tiles show the variant's real product photo (`VariantOption.image`
 * — Admin's per-variant photos, uploaded separately from the Product Card's
 * shade circle), and every pick is mirrored back to the card (`onSelect`).
 *
 * Global & data-driven: one implementation for every product. Options /
 * photo / price / stock come from `resolveVariantOptions` (the resolver the
 * cart also uses); reviews are the product's combined reviews
 * (`reviewsOfProduct` — never filtered by the picked option, same list as
 * the PDP); review photos/videos open the shared media viewer.
 */
export function QuickAddSheet(props: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `variantId` is `undefined` for a product without options. */
  onConfirm: (variantId: string | undefined, quantity: number) => Promise<void>;
  /** The shade already picked on the card, if any — the modal opens on it. */
  initialVariantId?: string | null;
  /** Mirrors a pick back to the card immediately, so card and modal always show the same shade. */
  onSelect?: (variantId: string) => void;
}) {
  const options = createMemo(() => resolveVariantOptions(props.product));
  const [selected, setSelected] = createSignal<string | null>(null);
  const [quantity, setQuantity] = createSignal(1);
  const [status, setStatus] = createSignal<"idle" | "loading" | "error">("idle");

  const selectedOption = () => options().find((o) => o.id === selected());
  const hasOptions = () => options().length > 0;
  /** Same cap the PDP stepper uses: the option's own stock when Admin tracks it, else the product's. */
  const maxQuantity = () => selectedOption()?.stock ?? props.product.stockLeft;

  // Opens on the card's shade (else the first in-stock one), quantity 1.
  createEffect(
    on(
      () => props.open,
      (open) => {
        if (!open) return;
        const initial = options().find((o) => o.id === props.initialVariantId && !o.soldOut);
        setSelected((initial ?? options().find((o) => !o.soldOut))?.id ?? null);
        setQuantity(1);
        setStatus("idle");
      },
    ),
  );
  // Switching to an option with less stock never leaves the quantity above it.
  createEffect(
    on(selected, () => {
      const max = maxQuantity();
      if (max !== undefined && quantity() > max) setQuantity(Math.max(1, max));
    }),
  );

  const pick = (id: string) => {
    setSelected(id);
    props.onSelect?.(id);
  };

  // All of the product's reviews — the same combined list as the PDP, not filtered by the picked option.
  const reviews = createMemo(() => reviewsOfProduct(props.product));
  const reviewCountLabel = () => props.product.reviewCount ?? reviews().length;

  // Review photo/video viewer — a layer inside the modal (no nested dialog).
  const [viewer, setViewer] = createSignal<ReviewMediaViewerState | null>(null);
  createEffect(on(() => props.open, () => setViewer(null)));

  const confirm = async () => {
    const option = selectedOption();
    if (hasOptions() && (!option || option.soldOut)) return;
    setStatus("loading");
    try {
      await props.onConfirm(option?.id, quantity());
      setStatus("idle");
      props.onOpenChange(false);
    } catch {
      setStatus("error");
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 data-[expanded]:animate-toast-in" />
        <div class="fixed inset-x-0 bottom-0 z-50 flex justify-center sm:inset-0 sm:items-center sm:p-4">
          <Dialog.Content
            // Esc closes the review media viewer first, not the whole modal.
            onEscapeKeyDown={(e) => {
              if (viewer()) {
                e.preventDefault();
                setViewer(null);
              }
            }}
            class="relative flex h-[90dvh] w-full max-w-[668px] flex-col overflow-hidden rounded-t-card bg-white py-4 shadow-card sm:rounded-card lg:h-[min(680px,90dvh)]">
            <div class="mx-auto mb-2 h-1 w-10 shrink-0 rounded-pill bg-surface-gray sm:hidden" aria-hidden="true" />

            {/* Header */}
            <div class="flex shrink-0 items-start gap-3 border-b border-border px-6 pb-2">
              <div class="min-w-0 flex-1">
                <Dialog.Title class="break-words text-lg font-semibold text-ink">{props.product.name}</Dialog.Title>
                <Dialog.Description class="text-[13.65px] leading-[19.792px] text-ink-gray">{hasOptions() ? "เลือกตัวเลือกสินค้า" : "รายละเอียดสินค้า"}</Dialog.Description>
              </div>
              <Dialog.CloseButton class="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-pill text-2xl text-ink-gray hover:bg-surface-pink">
                <span aria-hidden="true">×</span>
                <span class="sr-only">ปิด</span>
              </Dialog.CloseButton>
            </div>

            {/* Body — options, quantity, then reviews; only this area scrolls. */}
            <div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-6 pb-4 pt-4">
              <Show when={hasOptions()}>
                <div class="flex flex-col gap-3">
                  <p class="flex min-h-[24px] flex-wrap items-center gap-x-2 text-sm font-medium">
                    <span class="text-black">ตัวเลือก:</span>
                    <span class="text-ink-gray">{selectedOption()?.label ?? "—"}</span>
                  </p>
                  <div role="radiogroup" aria-label="ตัวเลือกสินค้า" class="flex flex-wrap gap-3">
                    <For each={options()}>
                      {(option) => <OptionTile option={option} selected={selected() === option.id} onSelect={() => pick(option.id)} />}
                    </For>
                  </div>
                </div>
              </Show>

              <section aria-labelledby="qa-reviews-heading" class="flex flex-col gap-2">
                <h3
                  id="qa-reviews-heading"
                  class="sticky top-0 z-10 -mx-6 border-b border-border bg-white px-6 pt-2"
                >
                  <span class="-mb-px flex h-8 w-fit items-center border-b border-brand-pink text-sm font-medium text-ink">
                    รีวิว
                    <span class="ml-1 text-xs text-ink-gray">({reviewCountLabel().toLocaleString("th-TH")})</span>
                  </span>
                </h3>
                <ReviewList reviews={reviews()} onOpenMedia={(items, index, author) => setViewer({ items, index, author })} />
              </section>
            </div>

            {/* Footer — pinned. Option + price (compare-at included), then the
                quantity + CTA pair, share one row from `sm`; below that they
                stack (price row on top, quantity + CTA under it). */}
            <div class="flex shrink-0 flex-col gap-2 border-t border-border px-6 pt-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div class="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center sm:justify-start sm:text-left">
                  <Show when={selectedOption()}>
                    <span class="break-words text-sm font-medium leading-6 text-ink-gray">{selectedOption()!.label}</span>
                  </Show>
                  <span class="flex flex-wrap items-baseline justify-center gap-x-2 sm:justify-start">
                    <span class="text-xl font-bold leading-tight text-system-red sm:text-2xl">{formatTHB(selectedOption()?.price ?? props.product.price)}</span>
                    <Show when={props.product.compareAtPrice && props.product.compareAtPrice > (selectedOption()?.price ?? props.product.price)}>
                      <span class="text-sm leading-5 text-ink-gray line-through sm:text-base sm:leading-6">{formatTHB(props.product.compareAtPrice!)}</span>
                    </Show>
                  </span>
                </div>
                {/* Same quantity control as the PDP (QuantityStepper, 52px), right before the CTA at the same height; capped by the option's stock. */}
                <div class="flex items-center gap-3 sm:shrink-0">
                  <QuantityStepper value={quantity()} onChange={setQuantity} max={maxQuantity()} disabled={hasOptions() && (!selectedOption() || selectedOption()!.soldOut)} />
                  <Button
                    variant="primary"
                    class="h-[52px] min-w-0 flex-1 !gap-2 !px-6 !text-sm sm:w-[220px] sm:flex-none lg:w-[260px]"
                    disabled={hasOptions() && (!selectedOption() || selectedOption()!.soldOut)}
                    loading={status() === "loading"}
                    onClick={confirm}
                  >
                    <CartIcon class="size-6 shrink-0" />
                    <span>{status() === "error" ? "ลองอีกครั้ง" : "เพิ่มลงตะกร้า"}</span>
                  </Button>
                </div>
              </div>
              <Show when={status() === "error"}>
                <p class="text-sm text-system-red" role="alert">
                  เพิ่มลงตะกร้าไม่สำเร็จ กรุณาลองอีกครั้ง
                </p>
              </Show>
            </div>
            <Show when={viewer()}>{(v) => <ReviewMediaViewer state={v()} onChange={(index) => setViewer({ ...v(), index })} onClose={() => setViewer(null)} />}</Show>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

/**
 * One option: a ~100px rounded square showing the variant's real product
 * photo, its name (14px) under it. Selected = pink border + a pink check
 * badge; a sold-out option is faded and can't be picked.
 */
function OptionTile(props: { option: VariantOption; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.selected}
      aria-label={`${props.option.label}${props.option.soldOut ? " (สินค้าหมด)" : ""}`}
      disabled={props.option.soldOut}
      onClick={props.onSelect}
      class="group/tile flex w-[100px] shrink-0 flex-col items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        class="relative block size-[100px] overflow-hidden rounded-xl border-2 bg-surface-gray transition-colors duration-150"
        classList={{
          "border-brand-pink": props.selected,
          "border-transparent ring-1 ring-inset ring-border group-hover/tile:ring-brand-pink/50 group-disabled/tile:ring-border": !props.selected,
        }}
      >
        <img src={props.option.image} alt="" loading="lazy" class="size-full object-cover" />
        <Show when={props.selected}>
          <span class="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-brand-pink text-white shadow-sm" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none" class="size-3">
              <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </Show>
      </span>
      {/* Real option names can be longer than a short sample label — wrap to 2 lines under the tile instead of colliding. */}
      <span class="line-clamp-2 w-full break-words text-center text-sm leading-[18px]" classList={{ "font-medium text-ink": props.selected, "text-ink-gray": !props.selected }}>
        {props.option.label}
      </span>
    </button>
  );
}
