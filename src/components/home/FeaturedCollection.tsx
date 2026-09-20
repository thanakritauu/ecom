import { Container } from "../shared/Container";
import { ProductRail } from "../shared/ProductRail";
import { featuredCollectionProducts } from "~/lib/products";

export function FeaturedCollection() {
  return (
    <section aria-labelledby="featured-collection-heading" class="py-10 lg:py-16">
      <Container width="wide" class="flex flex-col gap-6">
        <h2 id="featured-collection-heading" class="text-[22px] font-bold text-ink sm:text-2xl lg:text-[28px]">
          คอลเลคชั่น Glow in motion
        </h2>
        <ProductRail products={featuredCollectionProducts} columns={5} />
      </Container>
    </section>
  );
}
