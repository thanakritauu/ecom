import { createEffect, createSignal, For, Show, onMount, onCleanup } from "solid-js";
import { isServer } from "solid-js/web";
import type { Product } from "~/lib/types";
import { useAuth } from "~/lib/auth";
import { useWishlist } from "~/lib/wishlist";
import { pushToast } from "~/lib/toast";
import { Badge } from "../shared/Badge";
import { HeartIcon } from "../shared/icons";
import flashSaleBolt from "~/assets/icons/flash-sale-bolt-mini.svg";
import flashSaleWordmark from "~/assets/icons/flash-sale-wordmark-mini.svg";

/**
 * Figma (node 132:5139) shows a 5-photo gallery; this catalog product only
 * ships with however many real photos `product.images` actually has (1–10,
 * capped here — never padded with placeholders to reach a round number).
 * Below 2 images the thumbnail rail and prev/next arrows simply don't
 * render, the same rule already applied to Home's Hero carousel.
 *
 * Prev/next arrows reuse Carousel.tsx's exact visual pattern (`‹`/`›` glyphs
 * inside a `size-11 rounded-pill bg-white/80` button, not a drawn icon) —
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

        <Show when={props.product.discountPercent && !outOfStock()}>
          <Badge tone="red" class="absolute left-4 top-4">
            -{props.product.discountPercent}%
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
          <div class="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-r from-[#f42b59] to-brand-yellow p-4">
            <img src={flashSaleBolt} alt="" class="h-4 w-auto shrink-0" />
            <img src={flashSaleWordmark} alt="Flash Sale" class="h-3 w-auto shrink-0" />
            <GalleryCountdown endsAt={props.product.flashSaleEndsAt!} />
          </div>
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
              class="pointer-events-auto flex size-11 items-center justify-center rounded-pill bg-white/80 text-ink shadow-card transition-colors duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              onClick={() => goTo(active() + 1)}
              disabled={active() === images().length - 1}
              aria-label="ดูรูปถัดไป"
              class="pointer-events-auto flex size-11 items-center justify-center rounded-pill bg-white/80 text-ink shadow-card transition-colors duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true">›</span>
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

/** Plain-text "X วัน HH:MM:SS" countdown per Figma — distinct enough from the
 * boxed-digit CountdownTimer (used elsewhere) that adapting that component
 * would need almost as many size/format overrides as writing this directly. */
function GalleryCountdown(props: { endsAt: number }) {
  const [remaining, setRemaining] = createSignal(props.endsAt - Date.now());
  onMount(() => {
    if (isServer) return;
    const id = setInterval(() => setRemaining(props.endsAt - Date.now()), 1000);
    onCleanup(() => clearInterval(id));
  });

  const parts = () => {
    const total = Math.max(0, Math.floor(remaining() / 1000));
    const days = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return { days, hms: `${pad(h)}:${pad(m)}:${pad(s)}` };
  };

  return (
    <p class="min-w-0 truncate text-sm text-white">
      สิ้นสุดภายใน{" "}
      <span class="font-semibold">
        {parts().days > 0 ? `${parts().days} วัน ` : ""}
        {parts().hms}
      </span>
    </p>
  );
}
