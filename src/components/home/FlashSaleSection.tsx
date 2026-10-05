import { Show } from "solid-js";
import { Container } from "../shared/Container";
import { ProductRail } from "../shared/ProductRail";
import { CountdownTimer } from "../shared/CountdownTimer";
import { isFlashSale } from "~/lib/products";
import { useProductCatalog } from "~/lib/productCatalog";
import wordmark from "~/assets/icons/flash-sale-wordmark.svg";
import bolt from "~/assets/icons/flash-sale-bolt.svg";
import rays from "~/assets/images/home/flash-sale-rays.png";

/**
 * Figma 124:6386 — 40px top corners, #f42b59 → transparent (at 95%) vertical
 * gradient, the yellow light-rays artwork centred across the top, a centred
 * wordmark + bolt + countdown row, 32px to the cards (16px between rows),
 * then a full-width pink → yellow "ดูทั้งหมด" pill 16px below them.
 */
export function FlashSaleSection() {
  const catalog = useProductCatalog();
  const flashSaleProducts = () => catalog.products().filter(isFlashSale);
  const endsAt = () => flashSaleProducts()[0]?.flashSaleEndsAt;

  return (
    <Show when={flashSaleProducts().length > 0}>
      <section
        aria-labelledby="flash-sale-heading"
        class="relative overflow-hidden rounded-t-3xl bg-gradient-to-b from-[#f42b59] to-[rgba(244,43,89,0)] to-95% pb-6 pt-8 sm:rounded-t-[32px] sm:pb-8 sm:pt-12 lg:rounded-t-[40px] lg:pb-10 lg:pt-[60px]"
      >
        {/* Rays artwork — Figma draws a 725×1268 box rotated 90°, i.e. 1268×725 on screen, top -265px. */}
        <div
          aria-hidden="true"
          class="pointer-events-none absolute left-1/2 top-[-265px] flex h-[725px] w-[1268px] -translate-x-1/2 items-center justify-center"
        >
          <div class="h-[1268px] w-[725px] shrink-0 rotate-90">
            <img src={rays} alt="" class="size-full max-w-none" />
          </div>
        </div>

        <Container width="wide" class="relative flex flex-col gap-5 sm:gap-6 lg:gap-8">
          {/* One centred row at every size (scaled down); wraps only on screens narrower than ~360px. */}
          <div class="flex flex-wrap items-center justify-center gap-2 sm:gap-3 lg:gap-4">
            <h2 id="flash-sale-heading" class="sr-only">
              Flash Sale
            </h2>
            <span class="flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-4">
              <img src={wordmark} alt="" width="260" height="32" class="h-[18px] w-auto sm:h-6 lg:h-8" />
              <img src={bolt} alt="" width="29" height="43" class="h-6 w-auto sm:h-8 lg:h-[43px]" />
            </span>
            <Show when={endsAt()}>{(ends) => <CountdownTimer endsAt={ends()} size="full" />}</Show>
          </div>

          <div class="flex flex-col gap-3 sm:gap-4">
            <ProductRail products={flashSaleProducts()} rows={2} swipe flashSale />
            <a
              href="/promotion/flash-sale"
              class="flex min-h-[44px] w-full items-center justify-center rounded-pill bg-gradient-to-r from-brand-pink to-[#ffb700] px-4 py-2 text-lg font-medium leading-[normal] text-white transition-opacity duration-200 hover:opacity-90 sm:text-xl sm:leading-[normal]"
            >
              ดูทั้งหมด
            </a>
          </div>
        </Container>
      </section>
    </Show>
  );
}
