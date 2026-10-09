import { Show } from "solid-js";
import { Container } from "../shared/Container";
import { SectionHeader } from "../shared/SectionHeader";
import { ProductRail } from "../shared/ProductRail";
import { isTrending } from "~/lib/products";
import { useProductCatalog } from "~/lib/productCatalog";

export function TrendingSection() {
  const catalog = useProductCatalog();
  const trendingProducts = () => catalog.products().filter(isTrending);

  // A merchandising rail: with nothing in it the whole section hides.
  return (
    <Show when={trendingProducts().length > 0}>
      <section aria-labelledby="trending-heading" class="py-6 sm:py-8 lg:py-10">
        <Container width="wide" class="flex flex-col gap-2">
          <SectionHeader title="กำลังฮิตสัปดาห์นี้" href="/promotion/trending" headingId="trending-heading" />
          <ProductRail products={trendingProducts()} rows={2} swipe />
        </Container>
      </section>
    </Show>
  );
}
