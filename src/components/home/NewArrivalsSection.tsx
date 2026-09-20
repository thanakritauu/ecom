import { Container } from "../shared/Container";
import { SectionHeader } from "../shared/SectionHeader";
import { ProductRail } from "../shared/ProductRail";
import { isNewArrival } from "~/lib/products";
import { useProductCatalog } from "~/lib/productCatalog";

export function NewArrivalsSection() {
  const catalog = useProductCatalog();
  const newArrivalProducts = () => catalog.products().filter(isNewArrival);

  return (
    <section aria-labelledby="new-arrivals-heading" class="py-10 lg:py-16">
      <Container width="wide" class="flex flex-col gap-6">
        <SectionHeader title="มาใหม่" href="/new" headingId="new-arrivals-heading" />
        <ProductRail products={newArrivalProducts()} columns={5} />
      </Container>
    </section>
  );
}
