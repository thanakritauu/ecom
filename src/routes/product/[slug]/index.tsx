import { createMemo, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { useProductCatalog } from "~/lib/productCatalog";
import { ProductDetailView, NotFoundState } from "~/components/product/ProductDetailView";

/**
 * Figma node 132:3677. Data-driven by `slug` against the same Product Store
 * (`useProductCatalog()`) this whole catalog shares with Home/PDP/Cart —
 * Architecture Cleanup & Source of Truth: no separate Product Detail data
 * set, and no hardcoded single product (PART 3/4).
 *
 * The actual page markup lives in `ProductDetailView` (shared with the
 * dedicated `/product/:slug/out-of-stock` route below) — this file stays a
 * thin route wrapper so the normal PDP's behavior can't drift from what that
 * shared component defines.
 */
export default function ProductDetail() {
  const params = useParams();
  const catalog = useProductCatalog();
  const product = createMemo(() => catalog.getBySlug(params.slug ?? ""));

  return (
    <Show when={product()} fallback={<NotFoundState slug={params.slug ?? ""} />}>
      {(p) => <ProductDetailView product={p()} />}
    </Show>
  );
}
