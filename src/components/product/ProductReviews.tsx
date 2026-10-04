import { createMemo, createSignal, For, Show } from "solid-js";
import type { Product } from "~/lib/types";
import { reviewsOfProduct } from "~/lib/productReviews";
import { ReviewList, ReviewMediaViewer, type ReviewMediaViewerState } from "~/components/shared/ReviewList";
import { Button } from "~/components/shared/Button";

/**
 * Renders only when the product has curated review data — see products.ts
 * for why not every catalog item does. The list is the same `ReviewList`
 * and the same combined reviews (`reviewsOfProduct`, never filtered by the
 * picked shade) as the Product Option Modal, so the two never show
 * different reviews or a different review layout.
 */
const REVIEW_PAGE_SIZE = 5;

export function ProductReviews(props: { product: Product }) {
  const reviews = createMemo(() => reviewsOfProduct(props.product));
  const [viewer, setViewer] = createSignal<ReviewMediaViewerState | null>(null);
  // 5 at a time: "ดูรีวิวเพิ่มเติม" reveals 5 more, "ย่อรีวิว" folds back to the first 5.
  const [shown, setShown] = createSignal(REVIEW_PAGE_SIZE);
  const visibleReviews = () => reviews().slice(0, shown());
  const remaining = () => Math.max(0, reviews().length - shown());
  let listRef: HTMLDivElement | undefined;
  const collapse = () => {
    setShown(REVIEW_PAGE_SIZE);
    listRef?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const breakdown = () => props.product.ratingBreakdown;
  const total = () => breakdown()?.reduce((sum, n) => sum + n, 0) ?? 0;

  return (
    <Show when={props.product.rating && breakdown() && props.product.reviews?.length}>
      <section aria-labelledby="reviews-heading" class="flex flex-col items-center gap-5 sm:gap-6 lg:gap-8">
        <div class="grid w-full max-w-[600px] gap-6 rounded-card bg-surface-pink p-6">
          {/* The rating is the section's heading (same 24 / 30px as the PDP's other headings); the
              id stays so the "N รีวิว" link at the top of the PDP still jumps here. */}
          <h2 id="reviews-heading" class="flex scroll-mt-32 items-baseline justify-center gap-2 text-2xl font-bold text-brand-pink lg:text-3xl">
            <span class="sr-only">คะแนนรีวิว</span>
            <span aria-hidden="true">★</span>
            <span>{props.product.rating!.toFixed(1)}</span>
            <span class="text-base font-normal text-ink-gray lg:text-lg">/ 5.0</span>
          </h2>
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

        <div ref={listRef} class="flex w-full max-w-[600px] scroll-mt-32 flex-col gap-4">
          <ReviewList reviews={visibleReviews()} onOpenMedia={(items, index, author) => setViewer({ items, index, author })} />
          <div class="flex flex-wrap justify-center gap-3">
            <Show when={remaining() > 0}>
              <Button type="button" variant="outline" onClick={() => setShown((n) => n + REVIEW_PAGE_SIZE)}>
                ดูรีวิวเพิ่มเติม ({remaining().toLocaleString("th-TH")})
              </Button>
            </Show>
            <Show when={shown() > REVIEW_PAGE_SIZE && reviews().length > REVIEW_PAGE_SIZE}>
              <button type="button" onClick={collapse} class="h-11 px-4 text-base font-medium text-ink-gray transition-colors hover:text-brand-pink">
                ย่อรีวิว
              </button>
            </Show>
          </div>
        </div>
        <Show when={viewer()}>{(v) => <ReviewMediaViewer fixed state={v()} onChange={(index) => setViewer({ ...v(), index })} onClose={() => setViewer(null)} />}</Show>
      </section>
    </Show>
  );
}
