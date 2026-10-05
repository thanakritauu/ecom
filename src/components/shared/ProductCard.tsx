import { createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { clientOnly } from "@solidjs/start";
import type { Product } from "~/lib/types";
import { getDiscountPercent } from "~/lib/products";
import { resolveVariantOptions } from "~/lib/productVariants";
import { useCart } from "~/lib/cart";
import { useWishlist } from "~/lib/wishlist";
import { pushToast } from "~/lib/toast";
import { createDialogOpenState } from "~/lib/focusRestore";
import { Badge } from "./Badge";
import { AddToCartButton } from "./AddToCartButton";
import { PriceDisplay } from "./PriceDisplay";
import { ProductMeta } from "./ProductMeta";
import { StockProgressBar } from "./StockProgressBar";
import { FlashSaleBar } from "./FlashSaleBar";
import { ShadeSwatch } from "./ShadeSwatch";
import { HeartIcon, DetailArrowIcon } from "./icons";

// Same Kobalte Dialog SSR/hydration issue as Header's overlays — see the note there.
const QuickAddSheet = clientOnly(() =>
  import("./QuickAddSheet").then((m) => ({ default: m.QuickAddSheet })),
);

/**
 * Card shade row: one row of 5 equal slots spanning the card's full width at
 * every screen size — each circle is 1/5 of the row (minus gaps), so it
 * scales with the card and 5 always fit. Past 5 shades the 5th slot becomes
 * "+N" (N = shades not shown). Fewer than 5 shades keep the same circle size,
 * left-aligned.
 */
const MAX_SHADE_SLOTS = 5;

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
/**
 * Two kinds of card: the normal card, and the Flash Sale card (countdown bar
 * over the photo + stock progress bar "เหลืออีก X ชิ้น"). `flashSale` opts a
 * card into the Flash Sale kind — only the Home Flash Sale section and the
 * Flash Sale menu page (sections sourced from `flash_sale`) pass it, so a
 * flash-sale product shows as a normal card everywhere else.
 */
export function ProductCard(props: { product: Product; variant?: "grid" | "list"; flashSale?: boolean }) {
  const variant = () => props.variant ?? "grid";
  const cart = useCart();
  const wishlist = useWishlist();
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
  const discountPercent = () => getDiscountPercent(props.product);
  // Same sale state as before: shown while `flashSaleEndsAt` is set and the
  // product is in stock; the countdown clamps at 00:00:00 on expiry.
  const flashSaleActive = () => !!props.flashSale && !!props.product.flashSaleEndsAt && !outOfStock();
  const showStockProgress = () => flashSaleActive() && !!props.product.stockLeft && !!props.product.stockTotal;
  const selectedVariant = () => props.product.variants?.find((v) => v.id === selectedVariantId());
  // Falls back to the default photo whenever the selected shade has no photo
  // of its own — today that's every SKU (see products.ts), so this is wired
  // up and ready for the moment real per-shade photography lands.
  const displayImage = () => selectedVariant()?.image ?? props.product.image;
  // Card circles read the Admin-managed swatch (color, or the separately uploaded swatch image) — never the modal's option photos.
  const shadeOptions = () => resolveVariantOptions(props.product);
  const visibleShades = () =>
    shadeOptions().length > MAX_SHADE_SLOTS ? shadeOptions().slice(0, MAX_SHADE_SLOTS - 1) : shadeOptions();
  const shadeOverflowCount = () => shadeOptions().length - visibleShades().length;

  const selectShade = (id: string) => {
    setSelectedVariantId(id);
    setShadeRequired(false);
  };

  const addToCart = async (variantId?: string) => {
    setAddStatus("loading");
    try {
      await cart.addLine(props.product.id, variantId);
      setAddStatus("idle");
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
      wishlist.saveAfterLogin(props.product.id);
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
  const ImageBlock = (imgProps: { class: string; flashSaleOverlay?: boolean; /** List-view thumbnail: smaller heart, smaller sold-out label, no detail arrow. */ compact?: boolean }) => (
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
          <span
            class="rounded-pill bg-ink/85 font-medium text-white"
            classList={{ "px-2.5 py-1 text-xs sm:px-4 sm:py-1.5 sm:text-sm": !imgProps.compact, "px-2 py-0.5 text-xs": !!imgProps.compact }}
          >
            สินค้าหมด
          </span>
        </div>
      </Show>

      <Show when={discountPercent() && !outOfStock()}>
        <Badge tone="red" class="absolute left-[7px] top-[7px]">
          -{discountPercent()}%
        </Badge>
      </Show>

      {/* Flash Sale bar overlays the photo's bottom edge (Figma 546:2698) —
          absolutely positioned, so a Flash Sale card is exactly as tall as a
          normal one and nothing below the image moves. */}
      <Show when={imgProps.flashSaleOverlay && flashSaleActive()}>
        <FlashSaleBar endsAt={props.product.flashSaleEndsAt!} class="absolute inset-x-0 bottom-0" />
      </Show>

      {/* Secondary action — quiet by default, revealed on card hover (desktop); always subtly visible on mobile since there's no hover there */}
      <button
        type="button"
        onClick={toggleWishlist}
        disabled={wishStatus() === "loading"}
        aria-pressed={wishlist.has(props.product.id)}
        aria-label={wishlist.has(props.product.id) ? "นำออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
        class="absolute flex items-center justify-center rounded-pill bg-white/90 shadow-card transition-all duration-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-60 lg:scale-90 lg:opacity-0 lg:group-hover:scale-100 lg:group-hover:opacity-100 lg:focus-visible:scale-100 lg:focus-visible:opacity-100"
        classList={{
          "right-2 top-2 size-11": !imgProps.compact,
          "right-1.5 top-1.5 size-8": !!imgProps.compact,
          "text-brand-pink": wishlist.has(props.product.id),
          "text-ink": !wishlist.has(props.product.id),
        }}
      >
        <Show when={wishStatus() === "loading"} fallback={<HeartIcon filled={wishlist.has(props.product.id)} class={imgProps.compact ? "size-4" : "size-5"} />}>
          <span class="loading loading-spinner loading-xs" aria-hidden="true" />
        </Show>
      </button>

      {/* Secondary action — desktop-only: on mobile the image/name are already the "go to detail" tap target, so a second affordance would just be clutter */}
      <Show when={!imgProps.compact}>
        <A
          href={productDetailHref()}
          aria-label={`ดูรายละเอียด ${props.product.name}`}
          class="absolute right-2 hidden size-11 items-center justify-center rounded-pill bg-white/90 text-ink shadow-card transition-all duration-200 hover:bg-white active:scale-90 lg:flex lg:scale-90 lg:opacity-0 lg:group-hover:scale-100 lg:group-hover:opacity-100 lg:focus-visible:scale-100 lg:focus-visible:opacity-100"
          classList={{ "bottom-2": !(imgProps.flashSaleOverlay && flashSaleActive()), "bottom-12": !!imgProps.flashSaleOverlay && flashSaleActive() }}
        >
          <DetailArrowIcon class="size-4" />
        </A>
      </Show>

    </div>
  );

  // List view only — its 96-150px thumbnail is too small to carry the bar
  // over the photo, so the same FlashSaleBar sits at the top of the text
  // column there instead. Grid cards overlay it on the image (see ImageBlock).
  const FlashSaleStrip = () => (
    <Show when={flashSaleActive()}>
      <FlashSaleBar endsAt={props.product.flashSaleEndsAt!} class="overflow-hidden rounded-lg" />
    </Show>
  );

  // Shade selector + Add to Cart CTA — identical content in both variants,
  // only surrounding spacing differs, so this is shared the same way.
  // `compact` (list view): fixed 28px circles in a row — the grid card's 5 stretch-to-fill slots would balloon in a wide text column.
  const ShadeSelector = (shadeProps: { compact?: boolean }) => (
    <Show when={hasVariants()}>
      <div class="flex flex-col gap-1.5">
        <div
          role="radiogroup"
          aria-label="ตัวเลือกสินค้า"
          classList={{ "grid grid-cols-5 items-center gap-1.5 sm:gap-2": !shadeProps.compact, "flex flex-wrap items-center gap-2": !!shadeProps.compact }}
        >
          <For each={visibleShades()}>
            {(shade) => (
              <ShadeSwatch
                shade={shade}
                selected={selectedVariantId() === shade.id}
                onSelect={() => selectShade(shade.id)}
                class={shadeProps.compact ? "size-7 shrink-0" : "aspect-square w-full"}
              />
            )}
          </For>
          <Show when={shadeOverflowCount() > 0}>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label={`ดูตัวเลือกสินค้าเพิ่มเติมอีก ${shadeOverflowCount()} ตัวเลือก`}
              class="flex items-center justify-center rounded-full border border-border bg-surface-gray text-xs font-medium leading-none text-ink-gray transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink"
              classList={{ "aspect-square w-full": !shadeProps.compact, "size-7 shrink-0": !!shadeProps.compact }}
            >
              +{shadeOverflowCount()}
            </button>
          </Show>
        </div>
        <Show when={shadeRequired()}>
          <p class="text-xs text-system-red" role="alert">
            กรุณาเลือกตัวเลือกสินค้าก่อนเพิ่มลงตะกร้า
          </p>
        </Show>
      </div>
    </Show>
  );

  const CardAddToCart = (btnProps: { class?: string }) => (
    <AddToCartButton
      size="card"
      class={btnProps.class ?? "w-full"}
      outOfStock={outOfStock()}
      loading={addStatus() === "loading"}
      onClick={handleAddToCart}
      aria-label={outOfStock() ? `${props.product.name} สินค้าหมด` : `เพิ่ม ${props.product.name} ลงตะกร้า`}
    />
  );

  const quickAddSheet = (
    <Show when={hasVariants()}>
      <QuickAddSheet
        product={props.product}
        open={sheetOpen()}
        initialVariantId={selectedVariantId()}
        onSelect={selectShade}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setShadeRequired(false);
        }}
        onConfirm={async (variantId, quantity) => {
          await cart.addLine(props.product.id, variantId, quantity);
          setSelectedVariantId(variantId ?? null);
          setShadeRequired(false);
        }}
      />
    </Show>
  );

  return (
    <Show
      when={variant() === "list"}
      fallback={
        // Figma 545:6582 / 545:7248 — 8px padding, 8px gap between every
        // block, 24px card radius, 16px image radius, 0 2px 6px shadow.
        // Hover lift/shadow is desktop-only (`lg:`): on touch screens a tap leaves :hover stuck, and the
        // big hover shadow (~26px deep) got cut flat by the mobile swipe rail's 12px bottom room.
        // pb-3 on phones: the CTA sat 8px off a 16px-radius corner and looked cramped.
        <div class="group flex h-full w-full flex-col gap-2 rounded-2xl bg-surface-card p-2 pb-3 sm:rounded-[20px] sm:pb-2 lg:rounded-card shadow-[0_2px_6px_rgba(90,106,133,0.10)] transition-all duration-200 ease-out lg:hover:-translate-y-1 lg:hover:shadow-[0_6px_20px_rgba(90,106,133,0.18)]">
          <ImageBlock class="relative aspect-square w-full overflow-hidden rounded-xl border border-border lg:rounded-media" flashSaleOverlay />

          <div class="flex flex-1 flex-col gap-2">
            <A href={productDetailHref()} class="flex flex-col gap-2">
              {/* leading-7 (28px), not 24px: with line-clamp the hidden 3rd line still paints, and Thai
                  stacked marks (e.g. "ฉ่ำ", "ทิ้น") rise past a 24px line box into line 2 as a stray dot. */}
              <p class="line-clamp-2 min-h-14 text-base font-medium leading-7 text-ink">{props.product.name}</p>
              <PriceDisplay price={props.product.price} compareAtPrice={props.product.compareAtPrice} size="card" />
            </A>

            <ShadeSelector />

            <ProductMeta rating={props.product.rating} soldCount={props.product.soldCount} />

            {/* Stock bar + CTA are pinned to the card's bottom together, so the bar sits at the same height on every
                card in a row whether or not that card has a shade row above it. */}
            <div class="mt-auto flex flex-col gap-2">
              <Show when={showStockProgress()}>
                <StockProgressBar stockLeft={props.product.stockLeft!} stockTotal={props.product.stockTotal!} />
              </Show>

              {/* Below sm the card is ~150px wide — the CTA scales with it (14px, tighter padding) instead of wrapping to two lines. */}
              <CardAddToCart class="w-full" />
            </div>
          </div>

          {quickAddSheet}
        </div>
      }
    >
      {/* List view — image left, details right; same data/state/handlers as the grid card, only the arrangement
          changes (no Figma for this layout). Compact pieces throughout so a 112–180px thumbnail and a wide text
          column both read cleanly: small heart, 28px shade circles, CTA sized to its label from `sm`. */}
      <div class="group flex w-full items-start gap-3 rounded-2xl bg-surface-card p-3 shadow-[0_2px_6px_rgba(90,106,133,0.10)] transition-shadow duration-200 ease-out sm:gap-4 lg:rounded-card lg:hover:shadow-[0_6px_20px_rgba(90,106,133,0.18)]">
        <ImageBlock compact class="relative size-28 shrink-0 overflow-hidden rounded-xl border border-border sm:size-36 lg:size-44 lg:rounded-media" />

        <div class="flex min-w-0 flex-1 flex-col gap-2 self-stretch">
          <FlashSaleStrip />

          <A href={productDetailHref()} class="flex flex-col gap-1">
            {/* leading-7: room for Thai stacked marks under line-clamp (same reason as the grid card). */}
            <p class="line-clamp-2 text-sm font-medium leading-7 text-ink sm:text-base">{props.product.name}</p>
            <PriceDisplay price={props.product.price} compareAtPrice={props.product.compareAtPrice} size="card" />
          </A>

          <ProductMeta rating={props.product.rating} soldCount={props.product.soldCount} />

          <ShadeSelector compact />

          <Show when={showStockProgress()}>
            <div class="sm:max-w-[280px]">
              <StockProgressBar compact stockLeft={props.product.stockLeft!} stockTotal={props.product.stockTotal!} />
            </div>
          </Show>

          <CardAddToCart class="mt-auto w-full sm:w-auto sm:self-start sm:!px-8" />
        </div>

        {quickAddSheet}
      </div>
    </Show>
  );
}
