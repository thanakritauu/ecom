import { For } from "solid-js";
import type { Product } from "~/lib/types";
import { ProductCard } from "./ProductCard";

/**
 * The "grid on desktop -> horizontal scroll on mobile" reflow used by every
 * product section (Featured Collection, Flash Sale, Best Sellers, New
 * Arrivals, Trending) per STEP 3 of the audit, plus Cart's and Product
 * Detail's "recommended/related products" rails. One implementation shared
 * by all callers instead of each improvising its own breakpoint logic.
 *
 * `columns` only changes the `xl` (desktop-large) column count — mobile's
 * scroll-rail and the `md`/`lg` steps stay identical either way. Omit it
 * (the default, `6`) to keep a caller's exact existing layout; Home's five
 * sections plus Cart's and Product Detail's recommended-products rails all
 * opt into `columns={5}` so their cards match Home's sizing exactly.
 */
export function ProductRail(props: { products: Product[]; columns?: 5 | 6 }) {
  const desktopGridClass =
    props.columns === 5
      ? "hidden md:grid md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5 xl:gap-6"
      : "hidden md:grid md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-6 xl:gap-6";

  return (
    <>
      {/* `.scroll-rail`'s overflow-x-auto forces overflow-y to auto too (a
          axis can't be visible while the other isn't, per the CSS Overflow
          spec) — with no vertical padding, ProductCard's shadow-card bleed
          gets clipped flush at this container's top/bottom edge. pt-4/pb-8
          give the shadow (and its larger hover state) room to paint inside
          this box before hitting that clip boundary. Scoped to this one
          usage (not the shared .scroll-rail class in app.css) so Header's
          category-nav rail, which reuses that same class, is unaffected. */}
      <div class="scroll-rail md:hidden pt-4 pb-8">
        <For each={props.products}>
          {(product) => (
            <div class="w-[78%] max-w-[300px]">
              <ProductCard product={product} />
            </div>
          )}
        </For>
      </div>
      <div class={desktopGridClass}>
        <For each={props.products}>{(product) => <ProductCard product={product} />}</For>
      </div>
    </>
  );
}
