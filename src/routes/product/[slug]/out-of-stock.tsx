import { createMemo, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { useProductCatalog } from "~/lib/productCatalog";
import { ProductDetailView, NotFoundState } from "~/components/product/ProductDetailView";

/**
 * Dedicated Out of Stock PDP — `/product/:slug/out-of-stock`. Same product
 * data and the same `ProductDetailView` as the normal `/product/:slug` route
 * (no duplicated markup, no separate data source), just forced into the Out
 * of Stock presentation via `forceOutOfStock` regardless of that product's
 * actual `stockLeft` — so this page can be opened directly for any slug to
 * preview/QA the Out of Stock state without depending on catalog data having
 * a genuinely sold-out product. The normal route never passes this prop, so
 * its own behavior is completely unaffected by this file's existence.
 */
export default function ProductDetailOutOfStock() {
  const params = useParams();
  const catalog = useProductCatalog();
  const product = createMemo(() => catalog.getBySlug(params.slug ?? ""));

  return (
    <Show when={product()} fallback={<NotFoundState slug={params.slug ?? ""} />}>
      {(p) => <ProductDetailView product={p()} forceOutOfStock={true} />}
    </Show>
  );
}
