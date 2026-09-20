import { createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { clientOnly } from "@solidjs/start";
import type { Product } from "~/lib/types";
import { useAuth } from "~/lib/auth";
import { useCart } from "~/lib/cart";
import { useWishlist } from "~/lib/wishlist";
import { pushToast } from "~/lib/toast";
import { createDialogOpenState } from "~/lib/focusRestore";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { PriceDisplay } from "./PriceDisplay";
import { ProductMeta } from "./ProductMeta";
import { StockProgressBar } from "./StockProgressBar";
import { CountdownTimer } from "./CountdownTimer";
import { HeartIcon, DetailArrowIcon } from "./icons";

// Same Kobalte Dialog SSR/hydration issue as Header's overlays — see the note there.
const QuickAddSheet = clientOnly(() =>
  import("./QuickAddSheet").then((m) => ({ default: m.QuickAddSheet })),
);
import flashSaleWordmarkMini from "~/assets/icons/flash-sale-wordmark-mini.svg";
import flashSaleBoltMini from "~/assets/icons/flash-sale-bolt-mini.svg";

const MAX_SHADES_SHOWN = 5;

/**
 * Shared everywhere a product grid appears (Featured Collection, Flash Sale,
 * Best Sellers, New Arrivals, Trending) — see STEP 8 of the direction doc.
 * Do not fork a per-section copy; add a prop instead.
 *
 * Shade selection, Wishlist and the "view detail" hover affordance are all
 * additions on top of the source Figma frame (which only shows the card at
 * rest) — see the implementation report for the full rationale. Add to Cart
 * is the card's one primary action; wishlist/detail are secondary and stay
 * visually quiet until hovered on pointer devices (mobile has no hover, so
 * wishlist stays subtly visible there and the whole image/name is always the
 * "view detail" tap target).
 */
export function ProductCard(props: { product: Product; variant?: "grid" | "list" }) {
  const variant = () => props.variant ?? "grid";
  const cart = useCart();
  const wishlist = useWishlist();
  const auth = useAuth();
  const [sheetOpen, setSheetOpen] = createDialogOpenState();
  const [addStatus, setAddStatus] = createSignal<"idle" | "loading" | "error">("idle");
  const [wishStatus, setWishStatus] = createSignal<"idle" | "loading">("idle");
  const [selectedVariantId, setSelectedVariantId] = createSignal<string | null>(null);
  const [shadeRequired, setShadeRequired] = createSignal(false);

  const hasVariants = () => (props.product.variants?.length ?? 0) > 1;
  const outOfStock = () => props.product.stockLeft !== undefined && props.product.stockLeft <= 0;
  // Single source of truth for every "go to Product Detail" link on this
  // card (image, name, the desktop-only detail-arrow affordance) — reuses
  // the same `outOfStock()` this card already computes for its own Badge/CTA,
  // so the route decision and the visual Out of Stock state can never drift
  // apart. Routes to the dedicated Out of Stock PDP (`/product/:slug/out-of-stock`)
  // instead of the normal one only when this product itself has no stock.
  const productDetailHref = () => `/product/${props.product.slug}${outOfStock() ? "/out-of-stock" : ""}`;
  const selectedVariant = () => props.product.variants?.find((v) => v.id === selectedVariantId());
  // Falls back to the default photo whenever the selected shade has no photo
  // of its own — today that's every SKU (see products.ts), so this is wired
  // up and ready for the moment real per-shade photography lands.
  const displayImage = () => selectedVariant()?.image ?? props.product.image;
  const visibleShades = () => (props.product.variants ?? []).slice(0, MAX_SHADES_SHOWN);
  const shadeOverflowCount = () => Math.max(0, (props.product.variants?.length ?? 0) - MAX_SHADES_SHOWN);

  const selectShade = (id: string) => {
    setSelectedVariantId(id);
    setShadeRequired(false);
  };

  const addToCart = async (variantId?: string) => {
    setAddStatus("loading");
    try {
      await cart.addLine(props.product.id, variantId);
      setAddStatus("idle");
      pushToast(`เพิ่ม "${props.product.name}" ลงตะกร้าแล้ว`);
    } catch {
      setAddStatus("error");
      pushToast("เพิ่มลงตะกร้าไม่สำเร็จ ลองอีกครั้ง", "error");
    }
  };

  // Inline shade circles are the fast path; if the shopper skips them on a
  // multi-shade product we fall back to QuickAddSheet instead of ever adding
  // a "mystery" variant (Rule 5 — complex variants must open a picker).
  const handleAddToCart = async () => {
    if (outOfStock() || addStatus() === "loading") return;
    if (!hasVariants()) {
      await addToCart(props.product.variants?.[0]?.id);
      return;
    }
    const id = selectedVariantId();
    if (id) {
      await addToCart(id);
    } else {
      setShadeRequired(true);
      setSheetOpen(true);
    }
  };

  const toggleWishlist = async () => {
    if (!wishlist.isLoggedIn()) {
      auth.openAuthModal();
      return;
    }
    setWishStatus("loading");
    try {
      await wishlist.toggle(props.product.id);
    } catch {
      pushToast("บันทึกรายการโปรดไม่สำเร็จ", "error");
    } finally {
      setWishStatus("idle");
    }
  };

  // Image block (badges, wishlist, detail-arrow, flash-sale ribbon) is
  // pixel-identical content between variants — only its container's size
  // changes (full-width square vs a fixed-size thumbnail), so it's one
  // function shared by both layouts below rather than copy-pasted twice.
  const ImageBlock = (imgProps: { class: string }) => (
    <div class={imgProps.class}>
      <A href={productDetailHref()} class="block size-full">
        <img
          src={displayImage()}
          alt={props.product.name}
          loading="lazy"
          class="size-full object-cover transition-transform duration-200 ease-out lg:group-hover:scale-105"
          classList={{ "opacity-70 grayscale": outOfStock() }}
        />
      </A>

      {/* Hover-only contrast layer — desktop only (mobile has no hover; its
          Wishlist icon already stays subtly visible without this, per the
          "don't darken the photo at rest" requirement). Sits between the
          image and the Wishlist/Detail icons so it boosts their contrast
          without ever covering the name/price/Add-to-Cart below the image. */}
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 ease-out lg:group-hover:bg-black/25 lg:group-focus-within:bg-black/25"
      />

      <Show when={outOfStock()}>
        <div class="absolute inset-0 flex items-center justify-center bg-ink/10" aria-hidden="true">
          <span class="rounded-pill bg-ink/85 px-2.5 py-1 text-xs font-medium text-white sm:px-4 sm:py-1.5 sm:text-sm">สินค้าหมด</span>
        </div>
      </Show>

      <Show when={props.product.discountPercent && !outOfStock()}>
        <Badge tone="red" class="absolute left-[7px] top-[7px]">
          -{props.product.discountPercent}%
        </Badge>
      </Show>

      {/* Secondary action — quiet by default, revealed on card hover (desktop); always subtly visible on mobile since there's no hover there */}
      <button
        type="button"
        onClick={toggleWishlist}
        disabled={wishStatus() === "loading"}
        aria-pressed={wishlist.has(props.product.id)}
        aria-label={wishlist.has(props.product.id) ? "นำออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
        class="absolute right-2 top-2 flex size-11 items-center justify-center rounded-pill bg-white/90 shadow-card transition-all duration-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-60 lg:scale-90 lg:opacity-0 lg:group-hover:scale-100 lg:group-hover:opacity-100 lg:focus-visible:scale-100 lg:focus-visible:opacity-100"
        classList={{
          "text-brand-pink": wishlist.has(props.product.id),
          "text-ink": !wishlist.has(props.product.id),
        }}
      >
        <Show when={wishStatus() === "loading"} fallback={<HeartIcon filled={wishlist.has(props.product.id)} class="size-5" />}>
          <span class="loading loading-spinner loading-xs" aria-hidden="true" />
        </Show>
      </button>

      {/* Secondary action — desktop-only: on mobile the image/name are already the "go to detail" tap target, so a second affordance would just be clutter */}
      <A
        href={productDetailHref()}
        aria-label={`ดูรายละเอียด ${props.product.name}`}
        class="absolute bottom-2 right-2 hidden size-11 items-center justify-center rounded-pill bg-white/90 text-ink shadow-card transition-all duration-200 hover:bg-white active:scale-90 lg:flex lg:scale-90 lg:opacity-0 lg:group-hover:scale-100 lg:group-hover:opacity-100 lg:focus-visible:scale-100 lg:focus-visible:opacity-100"
        classList={{ "lg:bottom-12": !!props.product.flashSaleEndsAt }}
      >
        <DetailArrowIcon class="size-4" />
      </A>

      {/* Sized to survive the narrowest real card (~134px at the 6-column
          desktop grid) without overflowing/clipping against this image
          container's `overflow-hidden` — see ProductCard sizing notes.
          The wordmark image already reads "Flash Sale" visually, so the
          countdown's label stays screen-reader-only here instead of
          duplicating it as visible text (which is what didn't fit). */}
      <Show when={props.product.flashSaleEndsAt && !outOfStock()}>
        <div class="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-r from-[#f42b59] to-brand-yellow px-1.5 py-1">
          <img src={flashSaleBoltMini} alt="" class="h-2 w-auto shrink-0" />
          <img src={flashSaleWordmarkMini} alt="Flash Sale" class="h-[5px] w-auto shrink-0" />
          <div class="ml-auto min-w-0">
            <CountdownTimer endsAt={props.product.flashSaleEndsAt!} size="mini" label="สิ้นสุดภายใน" />
          </div>
        </div>
      </Show>
    </div>
  );

  // Shade selector + Add to Cart CTA — identical content in both variants,
  // only surrounding spacing differs, so this is shared the same way.
  const ShadeSelector = () => (
    <Show when={hasVariants()}>
      <div class="flex flex-col gap-1.5">
        <div role="radiogroup" aria-label="เฉดสี" class="flex flex-wrap items-center gap-1.5">
          <For each={visibleShades()}>
            {(shade) => (
              <button
                type="button"
                role="radio"
                aria-checked={selectedVariantId() === shade.id}
                aria-label={`เฉดสี ${shade.label}`}
                onClick={() => selectShade(shade.id)}
                class="group/shade relative flex size-7 shrink-0 items-center justify-center rounded-full transition-transform duration-150 ease-out hover:scale-110 focus-visible:scale-110"
              >
                <span class="size-full rounded-full border border-surface-gray" style={{ "background-color": shade.color }} aria-hidden="true" />
                <Show when={selectedVariantId() === shade.id}>
                  <span class="absolute inset-[-3px] rounded-full border-2 border-brand-pink transition-all duration-150" aria-hidden="true" />
                </Show>
                {/* Hover/focus tooltip — shade names aren't otherwise visible once the row is just colored dots */}
                <span
                  class="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover/shade:opacity-100 group-focus-visible/shade:opacity-100"
                  aria-hidden="true"
                >
                  {shade.label}
                </span>
              </button>
            )}
          </For>
          <Show when={shadeOverflowCount() > 0}>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label={`ดูเฉดสีเพิ่มเติมอีก ${shadeOverflowCount()} สี`}
              class="flex h-7 shrink-0 items-center rounded-full px-1.5 text-xs font-medium text-ink-gray transition-colors duration-150 hover:text-brand-pink"
            >
              +{shadeOverflowCount()}
            </button>
          </Show>
        </div>
        <Show when={shadeRequired()}>
          <p class="text-xs text-system-red" role="alert">
            กรุณาเลือกเฉดสีก่อนเพิ่มลงตะกร้า
          </p>
        </Show>
      </div>
    </Show>
  );

  const AddToCartButton = (btnProps: { class?: string }) => (
    <Button
      type="button"
      variant="outline"
      class={btnProps.class ?? "w-full"}
      disabled={outOfStock()}
      loading={addStatus() === "loading"}
      onClick={handleAddToCart}
      aria-label={outOfStock() ? `${props.product.name} สินค้าหมด` : `เพิ่ม ${props.product.name} ลงตะกร้า`}
    >
      {outOfStock() ? "สินค้าหมด" : "เพิ่มลงตะกร้า"}
    </Button>
  );

  const quickAddSheet = (
    <Show when={hasVariants()}>
      <QuickAddSheet
        product={props.product}
        open={sheetOpen()}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setShadeRequired(false);
        }}
        onConfirm={async (variantId) => {
          await cart.addLine(props.product.id, variantId);
          setSelectedVariantId(variantId);
          setShadeRequired(false);
          pushToast(`เพิ่ม "${props.product.name}" ลงตะกร้าแล้ว`);
        }}
      />
    </Show>
  );

  return (
    <Show
      when={variant() === "list"}
      fallback={
        <div class="group flex h-full w-full flex-col gap-4 rounded-card bg-white p-4 shadow-card transition-all duration-200 ease-out hover:shadow-[0_6px_20px_rgba(90,106,133,0.18)] lg:hover:-translate-y-1">
          <ImageBlock class="relative aspect-square w-full overflow-hidden rounded-media border border-surface-gray" />

          <div class="flex flex-1 flex-col gap-3">
            <A href={productDetailHref()} class="flex flex-col gap-2">
              <p class="line-clamp-2 min-h-[3rem] text-base font-medium text-ink">{props.product.name}</p>
              <PriceDisplay price={props.product.price} compareAtPrice={props.product.compareAtPrice} />
            </A>

            <ShadeSelector />

            <ProductMeta rating={props.product.rating} soldCount={props.product.soldCount} />

            <Show when={props.product.stockLeft && props.product.stockTotal}>
              <StockProgressBar stockLeft={props.product.stockLeft!} stockTotal={props.product.stockTotal!} />
            </Show>

            <AddToCartButton class="mt-auto w-full" />
          </div>

          {quickAddSheet}
        </div>
      }
    >
      {/* List view — Product Detail image left, everything else right; same
          data/state/handlers as the grid card above, only the arrangement
          changes. No Figma exists for this layout (grid view is what the
          audited node shows) — built to the explicit written spec instead. */}
      <div class="group flex w-full gap-3 rounded-card bg-white p-3 shadow-card transition-all duration-200 ease-out hover:shadow-[0_6px_20px_rgba(90,106,133,0.18)] sm:gap-4 sm:p-4">
        <ImageBlock class="relative size-[96px] shrink-0 overflow-hidden rounded-media border border-surface-gray sm:size-[128px] lg:size-[150px]" />

        <div class="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
          <A href={productDetailHref()} class="flex flex-col gap-1.5">
            <p class="line-clamp-2 text-sm font-medium text-ink sm:text-base">{props.product.name}</p>
            <PriceDisplay price={props.product.price} compareAtPrice={props.product.compareAtPrice} />
          </A>

          <ProductMeta rating={props.product.rating} soldCount={props.product.soldCount} />

          <ShadeSelector />

          <Show when={props.product.stockLeft && props.product.stockTotal}>
            <StockProgressBar stockLeft={props.product.stockLeft!} stockTotal={props.product.stockTotal!} />
          </Show>

          <AddToCartButton class="mt-auto w-full sm:w-auto sm:self-start sm:px-8" />
        </div>

        {quickAddSheet}
      </div>
    </Show>
  );
}
