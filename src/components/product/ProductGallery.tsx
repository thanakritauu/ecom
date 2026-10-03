import { createEffect, createSignal, For, Show, onMount, onCleanup } from "solid-js";
import { ChevronIcon } from "~/components/shared/ChevronIcon";
import { isServer } from "solid-js/web";
import type { Product } from "~/lib/types";
import { useAuth } from "~/lib/auth";
import { useWishlist } from "~/lib/wishlist";
import { pushToast } from "~/lib/toast";
import { Badge } from "../shared/Badge";
import { HeartIcon } from "../shared/icons";
import { FlashSaleBar } from "~/components/shared/FlashSaleBar";
import { getDiscountPercent } from "~/lib/products";

/**
 * Figma (node 132:5139) shows a 5-photo gallery; this catalog product only
 * ships with however many real photos `product.images` actually has (1–10,
 * capped here — never padded with placeholders to reach a round number).
 * Below 2 images the thumbnail rail and prev/next arrows simply don't
 * render, the same rule already applied to Home's Hero carousel.
 *
 * Prev/next arrows reuse Carousel.tsx's exact visual pattern (the shared
 * `ChevronIcon` inside a `rounded-pill bg-white/50` button) —
 * the project's one existing carousel-arrow convention — but clamp at the
 * first/last image instead of Carousel's infinite wrap, per the boundary
 * behavior this gallery needs. Arrow clicks, thumbnail clicks, and
 * ArrowLeft/Right/Home/End all funnel through the same `goTo()`, so there's
 * one active-image source of truth regardless of input method.
 */
export function ProductGallery(props: { product: Product; forceOutOfStock?: boolean }) {
  const images = () => {
    const source = props.product.images?.length ? props.product.images : [props.product.image];
    return source.slice(0, 10);
  };
  const [active, setActive] = createSignal(0);
  const wishlist = useWishlist();
  const auth = useAuth();
  const [wishStatus, setWishStatus] = createSignal<"idle" | "loading">("idle");

  let thumbRefs: (HTMLButtonElement | undefined)[] = [];

  // Guards against showing an out-of-range image if this instance is ever
  // reused across two different products with different image counts.
  createEffect(() => {
    void props.product.id;
    setActive(0);
  });

  const outOfStock = () => props.forceOutOfStock || (props.product.stockLeft !== undefined && props.product.stockLeft <= 0);

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(images().length - 1, index));
    setActive(clamped);
    thumbRefs[clamped]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  };

  const onGalleryKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        goTo(active() - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        goTo(active() + 1);
        break;
      case "Home":
        e.preventDefault();
        goTo(0);
        break;
      case "End":
        e.preventDefault();
        goTo(images().length - 1);
        break;
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

  return (
    <div class="flex flex-col gap-4">
      <div
        class="relative aspect-square w-full overflow-hidden rounded-media border border-surface-gray"
        role="group"
        aria-label={`แกลเลอรีรูปภาพสินค้า ${props.product.name}`}
        tabindex="0"
        onKeyDown={onGalleryKeyDown}
      >
        <img
          src={images()[active()]}
          alt={props.product.name}
          class="size-full object-cover"
          classList={{ "opacity-70 grayscale": outOfStock() }}
          // The visible slide on first paint — every other image on this
          // page (thumbnails, Related Products) can lazy-load instead.
          loading="eager"
        />

        <Show when={getDiscountPercent(props.product) && !outOfStock()}>
          <Badge tone="red" class="absolute left-4 top-4">
            -{getDiscountPercent(props.product)}%
          </Badge>
        </Show>

        <button
          type="button"
          onClick={toggleWishlist}
          disabled={wishStatus() === "loading"}
          aria-pressed={wishlist.has(props.product.id)}
          aria-label={wishlist.has(props.product.id) ? "นำออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
          class="absolute right-4 top-4 flex size-11 items-center justify-center rounded-pill bg-white/90 shadow-card transition-transform duration-150 active:scale-90 disabled:cursor-not-allowed disabled:opacity-60"
          classList={{
            "text-brand-pink": wishlist.has(props.product.id),
            "text-ink": !wishlist.has(props.product.id),
          }}
        >
          <Show when={wishStatus() === "loading"} fallback={<HeartIcon filled={wishlist.has(props.product.id)} class="size-5" />}>
            <span class="loading loading-spinner loading-xs" aria-hidden="true" />
          </Show>
        </button>

        <Show when={props.product.flashSaleEndsAt && !outOfStock()}>
          {/* Same FlashSaleBar + countdown as ProductCard's image overlay. */}
          <FlashSaleBar endsAt={props.product.flashSaleEndsAt!} size="lg" class="absolute inset-x-0 bottom-0" />
        </Show>

        <Show when={outOfStock()}>
          <div class="absolute inset-0 flex items-center justify-center bg-ink/10" aria-hidden="true">
            <span class="rounded-pill bg-ink/85 px-4 py-1.5 text-sm font-medium text-white">สินค้าหมด</span>
          </div>
        </Show>

        <Show when={images().length > 1}>
          <div class="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 items-center justify-between">
            <button
              type="button"
              onClick={() => goTo(active() - 1)}
              disabled={active() === 0}
              aria-label="ดูรูปก่อนหน้า"
              class="pointer-events-auto flex size-10 items-center justify-center rounded-pill bg-white/50 text-ink shadow-card backdrop-blur-sm transition-colors duration-200 hover:bg-white/80 sm:size-11 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronIcon direction="left" class="size-5 sm:size-6" />
            </button>
            <button
              type="button"
              onClick={() => goTo(active() + 1)}
              disabled={active() === images().length - 1}
              aria-label="ดูรูปถัดไป"
              class="pointer-events-auto flex size-10 items-center justify-center rounded-pill bg-white/50 text-ink shadow-card backdrop-blur-sm transition-colors duration-200 hover:bg-white/80 sm:size-11 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronIcon direction="right" class="size-5 sm:size-6" />
            </button>
          </div>
        </Show>
      </div>

      <Show when={images().length > 1}>
        <div class="scroll-rail !mx-0 !px-0" role="tablist" aria-label="รูปภาพสินค้า">
          <For each={images()}>
            {(src, i) => (
              <button
                ref={(el) => (thumbRefs[i()] = el)}
                type="button"
                role="tab"
                aria-selected={active() === i()}
                aria-label={`รูปภาพที่ ${i() + 1}`}
                onClick={() => goTo(i())}
                class="size-[98px] shrink-0 overflow-hidden rounded-media border-2 transition-colors duration-150"
                classList={{
                  "border-brand-pink": active() === i(),
                  "border-surface-gray": active() !== i(),
                }}
              >
                <img src={src} alt="" class="size-full object-cover" loading="lazy" />
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
