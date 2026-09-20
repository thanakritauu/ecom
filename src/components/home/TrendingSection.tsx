import { Container } from "../shared/Container";
import { SectionHeader } from "../shared/SectionHeader";
import { ProductRail } from "../shared/ProductRail";
import { isTrending } from "~/lib/products";
import { useProductCatalog } from "~/lib/productCatalog";

export function TrendingSection() {
  const catalog = useProductCatalog();
  const trendingProducts = () => catalog.products().filter(isTrending);

  return (
    <section aria-labelledby="trending-heading" class="py-10 lg:py-16">
      <Container width="wide" class="flex flex-col gap-6">
        <SectionHeader title="กำลังฮิตสัปดาห์นี้" href="/trending" headingId="trending-heading" />
        <ProductRail products={trendingProducts()} columns={5} />
      </Container>
    </section>
  );
}
