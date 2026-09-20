import { Show } from "solid-js";
import { Container } from "../shared/Container";
import { ProductRail } from "../shared/ProductRail";
import { CountdownTimer } from "../shared/CountdownTimer";
import { isFlashSale } from "~/lib/products";
import { useProductCatalog } from "~/lib/productCatalog";
import wordmark from "~/assets/icons/flash-sale-wordmark.svg";
import bolt from "~/assets/icons/flash-sale-bolt.svg";

export function FlashSaleSection() {
  const catalog = useProductCatalog();
  const flashSaleProducts = () => catalog.products().filter(isFlashSale);
  const endsAt = () => flashSaleProducts()[0]?.flashSaleEndsAt;

  return (
    <Show when={flashSaleProducts().length > 0}>
      <section aria-labelledby="flash-sale-heading" class="rounded-card bg-gradient-to-b from-brand-pink to-[#f42b59] py-10 lg:py-16">
        <Container width="wide" class="flex flex-col gap-6">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <img src={wordmark} alt="" class="h-6 lg:h-8" />
              <img src={bolt} alt="" class="h-8 lg:h-11" aria-hidden="true" />
            </div>
            <h2 id="flash-sale-heading" class="sr-only">
              Flash Sale
            </h2>
            <Show when={endsAt()}>{(ends) => <CountdownTimer endsAt={ends()} size="full" />}</Show>
          </div>
          <ProductRail products={flashSaleProducts()} columns={5} />
          <div class="flex justify-center">
            <a href="/promotions/flash-sale" class="min-h-[44px] rounded-pill bg-white px-8 py-2 font-medium text-brand-pink">
              ดูทั้งหมด
            </a>
          </div>
        </Container>
      </section>
    </Show>
  );
}
