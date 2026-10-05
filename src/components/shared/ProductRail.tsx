import { For, Show } from "solid-js";
import type { Product } from "~/lib/types";
import { ProductCard } from "./ProductCard";

/**
 * The "grid on desktop -> horizontal scroll on mobile" reflow used by every
 * product section (Featured Collection, Flash Sale, Best Sellers, New
 * Arrivals, Trending) per STEP 3 of the audit, plus Cart's and Product
 * Detail's "recommended/related products" rails. One implementation shared
 * by all callers instead of each improvising its own breakpoint logic.
 *
 * User-test feedback (Global Responsive pass) — the scroll-rail now runs
 * through Tablet too (`lg:hidden`/`lg:grid`, not `md:`), so Tablet shows the
 * same "2 full cards + a peek of the 3rd" swipeable rail Mobile already had,
 * instead of a 3-column grid. The old `md:grid-cols-3` step is dropped
 * outright rather than shifted — it only ever covered the Tablet band the
 * rail now owns — so every column count from `lg:` up (Desktop) is
 * byte-for-byte what it was before.
 *
 * Swiping is a Home-only pattern: only Home's sections pass `swipe`. Every
 * other page (PDP related products, Cart recommendations, Promotion pages)
 * gets a plain grid at every size — 2 columns on mobile, 3 on tablet, then
 * the same desktop columns as below — never a sideways rail.
 *
 * `columns` only changes the `xl` (desktop-large) column count — the rail
 * and the `lg:` step stay identical either way. Omit it (the default, `6`)
 * to keep a caller's exact existing layout; Home's five sections plus
 * Cart's and Product Detail's recommended-products rails all opt into
 * `columns={5}` so their cards match Home's sizing exactly.
 */
export function ProductRail(props: {
  products: Product[];
  columns?: 5 | 6;
  /**
   * Caps the rail at exactly this many full desktop rows of 5 cards
   * (Homepage: Glow in motion / New Arrivals = 1 row, Flash Sale = 2) — the
   * list is trimmed to `rows × 5` and the desktop grid is 5 columns from
   * `lg:` up so the rows stay whole. The mobile/tablet rail shows the same
   * trimmed set.
   */
  rows?: number;
  /** Home only — mobile/tablet show a horizontal swipe rail instead of the 2-column grid. */
  swipe?: boolean;
  /** Flash Sale cards (countdown + stock bar) — only Flash Sale sections pass this; see `ProductCard`. */
  flashSale?: boolean;
}) {
  const products = () => (props.rows ? props.products.slice(0, props.rows * 5) : props.products);
  const desktopGridClass = props.rows
    ? "lg:grid-cols-5 lg:gap-4"
    : props.columns === 5
      ? "lg:grid-cols-4 lg:gap-5 xl:grid-cols-5 xl:gap-6"
      : "lg:grid-cols-4 lg:gap-5 xl:grid-cols-6 xl:gap-6";
  // Below lg: hidden behind the swipe rail on Home, a 2 / 3-column grid everywhere else.
  const gridClass = () =>
    props.swipe ? `hidden lg:grid ${desktopGridClass}` : `grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 ${desktopGridClass}`;

  return (
    <>
      {/* `.scroll-rail`'s overflow-x-auto forces overflow-y to auto too (a
          axis can't be visible while the other isn't, per the CSS Overflow
          spec) — with no vertical padding, ProductCard's shadow-card bleed
          gets clipped flush at this container's top/bottom edge. pt-2/pb-3
          give the card's 0 2px 6px shadow room to paint inside this box, and
          the matching negative margins keep that room out of the layout so
          section spacing is the same as the desktop grid's. Scoped to this one
          usage (not the shared .scroll-rail class in app.css) so Header's
          category-nav rail, which reuses that same class, is unaffected.
          Card width is a flat 44% (not a breakpoint-specific value) so
          "2 full + a peek of the 3rd" holds at both Mobile and Tablet
          widths without a third tuned step. */}
      <Show when={props.swipe}>
        <div class="scroll-rail lg:hidden -mb-3 -mt-2 pb-3 pt-2">
          <For each={products()}>
            {(product) => (
              <div class="w-[44%] min-w-[150px] max-w-[260px]">
                <ProductCard product={product} flashSale={props.flashSale} />
              </div>
            )}
          </For>
        </div>
      </Show>
      <div class={gridClass()}>
        <For each={products()}>{(product) => <ProductCard product={product} flashSale={props.flashSale} />}</For>
      </div>
    </>
  );
}
