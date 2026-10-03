import { createMemo, createSignal, For, Show } from "solid-js";
import type { Product } from "~/lib/types";
import { reviewsOfProduct } from "~/lib/productReviews";
import { ReviewList, ReviewMediaViewer, type ReviewMediaViewerState } from "~/components/shared/ReviewList";

/**
 * Renders only when the product has curated review data — see products.ts
 * for why not every catalog item does. The list is the same `ReviewList`
 * and the same combined reviews (`reviewsOfProduct`, never filtered by the
 * picked shade) as the Product Option Modal, so the two never show
 * different reviews or a different review layout.
 */
export function ProductReviews(props: { product: Product }) {
  const reviews = createMemo(() => reviewsOfProduct(props.product));
  const [viewer, setViewer] = createSignal<ReviewMediaViewerState | null>(null);
  const breakdown = () => props.product.ratingBreakdown;
  const total = () => breakdown()?.reduce((sum, n) => sum + n, 0) ?? 0;

  return (
    <Show when={props.product.rating && breakdown() && props.product.reviews?.length}>
      <section aria-labelledby="reviews-heading" class="flex flex-col items-center gap-5 sm:gap-6 lg:gap-8">
        <div class="flex flex-col items-center gap-2 text-center">
          <h2 id="reviews-heading" class="text-3xl font-bold text-ink lg:text-[40px]">
            #CharmissReviews
          </h2>
          <p class="text-lg text-ink-gray">รีวิวจากผู้ใช้จริง {total().toLocaleString("th-TH")} รายการ</p>
        </div>

        <div class="grid w-full max-w-[600px] gap-6 rounded-card bg-surface-pink p-6">
          <div class="flex items-end justify-center gap-2">
            <span class="text-4xl font-bold text-brand-pink">★ {props.product.rating!.toFixed(1)}</span>
            <span class="pb-1 text-lg text-ink-gray">/ 5.0</span>
          </div>
          <div class="flex flex-col gap-2">
            <For each={[5, 4, 3, 2, 1]}>
              {(star, i) => (
                <div class="flex items-center gap-2 text-sm text-ink">
                  <span class="w-8 shrink-0">{star} ★</span>
                  <div class="h-1.5 flex-1 overflow-hidden rounded-pill bg-white">
                    <div
                      class="h-full rounded-pill bg-brand-yellow"
                      style={{ width: `${total() ? (breakdown()![i()] / total()) * 100 : 0}%` }}
                    />
                  </div>
                  <span class="w-10 shrink-0 text-right text-ink-gray">{breakdown()![i()].toLocaleString("th-TH")}</span>
                </div>
              )}
            </For>
          </div>
        </div>

        <div class="w-full max-w-[600px]">
          <ReviewList reviews={reviews()} onOpenMedia={(items, index, author) => setViewer({ items, index, author })} />
        </div>
        <Show when={viewer()}>{(v) => <ReviewMediaViewer fixed state={v()} onChange={(index) => setViewer({ ...v(), index })} onClose={() => setViewer(null)} />}</Show>
      </section>
    </Show>
  );
}
