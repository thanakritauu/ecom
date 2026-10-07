import { For, Show, createEffect, createMemo, createSignal, on } from "solid-js";
import type { Product } from "~/lib/types";
import { resolveVariantOptions, type VariantOption } from "~/lib/productVariants";
import { reviewsOfProduct } from "~/lib/productReviews";
import { PurchaseFooter } from "./PurchaseFooter";
import { SheetModal } from "./SheetModal";
import { ReviewList, ReviewMediaViewer, type ReviewMediaViewerState } from "./ReviewList";
import { CheckIcon } from "./icons";

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
  // Option photos enlarge in the same viewer (`viewerKind` only swaps its label).
  const [viewer, setViewer] = createSignal<ReviewMediaViewerState | null>(null);
  const [viewerKind, setViewerKind] = createSignal<"review" | "option">("review");
  createEffect(on(() => props.open, () => setViewer(null)));

  const optionPhotos = () => options().filter((o) => o.image);
  const zoomOption = (id: string) => {
    const photos = optionPhotos();
    setViewerKind("option");
    setViewer({
      items: photos.map((o) => ({ type: "image" as const, src: o.image! })),
      index: Math.max(0, photos.findIndex((o) => o.id === id)),
      author: props.product.name,
    });
  };

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
    <SheetModal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.product.name}
      description={hasOptions() ? "เลือกตัวเลือกสินค้า" : "รายละเอียดสินค้า"}
      // Esc closes the review media viewer first, not the whole modal.
      onEscapeKeyDown={(e) => {
        if (viewer()) {
          e.preventDefault();
          setViewer(null);
        }
      }}
      footer={
        // Pinned buy row — shared with the PDP sticky bar.
        <>
          <PurchaseFooter
            optionLabel={selectedOption()?.label}
            price={selectedOption()?.price ?? props.product.price}
            compareAtPrice={props.product.compareAtPrice}
            quantity={quantity()}
            onQuantityChange={setQuantity}
            maxQuantity={maxQuantity()}
            disabled={hasOptions() && (!selectedOption() || selectedOption()!.soldOut)}
            loading={status() === "loading"}
            ctaLabel={status() === "error" ? "ลองอีกครั้ง" : undefined}
            onAdd={confirm}
          />
          <Show when={status() === "error"}>
            <p class="text-sm text-system-red" role="alert">
              เพิ่มลงตะกร้าไม่สำเร็จ กรุณาลองอีกครั้ง
            </p>
          </Show>
        </>
      }
      layer={
        <Show when={viewer()}>
          {(v) => (
            <ReviewMediaViewer
              state={v()}
              ariaLabel={viewerKind() === "option" ? `รูปตัวเลือกสินค้า ${props.product.name}` : undefined}
              onChange={(index) => setViewer({ ...v(), index })}
              onClose={() => setViewer(null)}
            />
          )}
        </Show>
      }
    >
      {/* Body — options, then reviews; only this area scrolls. */}
      <Show when={hasOptions()}>
        <div class="flex flex-col gap-3">
          <p class="flex min-h-[24px] flex-wrap items-center gap-x-2 text-sm font-medium">
            <span class="text-black">ตัวเลือก:</span>
            <span class="text-ink-gray">{selectedOption()?.label ?? "—"}</span>
          </p>
          {/* Mobile: 3 tiles per row, each filling its column; from `sm` the fixed 100px tiles. */}
          <div role="radiogroup" aria-label="ตัวเลือกสินค้า" class="grid grid-cols-3 gap-3 sm:flex sm:flex-wrap">
            <For each={options()}>
              {(option) => (
                <OptionTile
                  option={option}
                  selected={selected() === option.id}
                  onSelect={() => pick(option.id)}
                  onZoom={option.image ? () => zoomOption(option.id) : undefined}
                />
              )}
            </For>
          </div>
        </div>
      </Show>

      <section aria-labelledby="qa-reviews-heading" class="flex flex-col gap-2">
        {/* `-top-4` cancels SheetModal's body `pt-4`: a sticky box stops at the scroll container's padding edge, so
            `top-0` left a 16px strip of scrolling reviews visible between the modal header and this bar. */}
        <h3
          id="qa-reviews-heading"
          class="sticky -top-4 z-10 -mx-6 border-b border-border bg-white px-6 pt-2"
        >
          <span class="-mb-px flex h-8 w-fit items-center border-b border-brand-pink text-sm font-medium text-ink">
            รีวิว
            <span class="ml-1 text-xs text-ink-gray">({reviewCountLabel().toLocaleString("th-TH")})</span>
          </span>
        </h3>
        <ReviewList
          reviews={reviews()}
          onOpenMedia={(items, index, author) => {
            setViewerKind("review");
            setViewer({ items, index, author });
          }}
        />
      </section>
    </SheetModal>
  );
}

/**
 * One option: a rounded square showing the variant's real product photo
 * (fills its column on mobile — 3 per row — and is a fixed 100px from `sm`),
 * its name (14px) under it. Selected = pink border + a pink check badge; a
 * sold-out option is faded and can't be picked. The magnifier in the photo's
 * bottom-right corner enlarges it (a sibling of the radio, never nested in it).
 */
function OptionTile(props: { option: VariantOption; selected: boolean; onSelect: () => void; onZoom?: () => void }) {
  return (
    <div class="relative w-full min-w-0 sm:w-[100px] sm:shrink-0">
      <button
        type="button"
        role="radio"
        aria-checked={props.selected}
        aria-label={`${props.option.label}${props.option.soldOut ? " (สินค้าหมด)" : ""}`}
        disabled={props.option.soldOut}
        onClick={props.onSelect}
        class="group/tile flex w-full flex-col items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span
          class="relative block aspect-square w-full overflow-hidden rounded-xl border-2 bg-surface-gray transition-colors duration-150"
          classList={{
            "border-brand-pink": props.selected,
            "border-transparent ring-1 ring-inset ring-border group-hover/tile:ring-brand-pink/50 group-disabled/tile:ring-border": !props.selected,
          }}
        >
          <img src={props.option.image} alt="" loading="lazy" class="size-full object-cover" />
          <Show when={props.selected}>
            <span class="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-brand-pink text-white shadow-sm" aria-hidden="true">
              <CheckIcon class="size-3" />
            </span>
          </Show>
        </span>
        {/* Real option names can be longer than a short sample label — wrap to 2 lines under the tile instead of colliding. */}
        <span class="line-clamp-2 w-full break-words text-center text-sm leading-[1.75]" classList={{ "font-medium text-ink": props.selected, "text-ink-gray": !props.selected }}>
          {props.option.label}
        </span>
      </button>
      <Show when={props.onZoom}>
        {/* Square overlay matching the photo, so the button sits on the photo's corner at any tile width. */}
        <span class="pointer-events-none absolute inset-x-0 top-0 aspect-square">
          <button
            type="button"
            onClick={() => props.onZoom!()}
            aria-label={`ขยายรูป ${props.option.label}`}
            class="pointer-events-auto absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-pill bg-white/80 text-ink shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="size-4" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M20 20l-4.2-4.2M11 8.5v5M8.5 11h5" />
            </svg>
          </button>
        </span>
      </Show>
    </div>
  );
}
