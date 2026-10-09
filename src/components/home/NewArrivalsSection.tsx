import { Show } from "solid-js";
import { Container } from "../shared/Container";
import { SectionHeader } from "../shared/SectionHeader";
import { ProductRail } from "../shared/ProductRail";
import { isNewArrival } from "~/lib/products";
import { useProductCatalog } from "~/lib/productCatalog";

export function NewArrivalsSection() {
  const catalog = useProductCatalog();
  const newArrivalProducts = () => catalog.products().filter(isNewArrival);

  // A merchandising rail: with nothing in it the whole section hides.
  return (
    <Show when={newArrivalProducts().length > 0}>
      <section aria-labelledby="new-arrivals-heading" class="pb-0 pt-6 sm:pt-8 lg:pt-10">
        <Container width="wide" class="flex flex-col gap-2">
          <SectionHeader title="มาใหม่" href="/promotion/new-arrivals" headingId="new-arrivals-heading" />
          <ProductRail products={newArrivalProducts()} rows={1} swipe />
        </Container>
      </section>
    </Show>
  );
}
