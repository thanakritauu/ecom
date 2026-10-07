import { createMemo, createSignal, For, Show } from "solid-js";
import type { Product } from "~/lib/types";
import { reviewsOfProduct } from "~/lib/productReviews";
import { ReviewList, ReviewMediaViewer, type ReviewMediaViewerState } from "~/components/shared/ReviewList";
import { Button } from "~/components/shared/Button";
import starGold from "~/assets/icons/star-gold-4.svg";

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
        {/* Rating summary — average on the left (always one line: the number at the page's heading size, 24 / 30px, + smaller gray "/ 5.0" on its
            baseline, stars and review count under it), distribution bars on the right, vertically centered.
            Side by side at every width — on a 375px phone the left column narrows (smaller number, 16px stars). */}
        <div class="flex w-full max-w-[600px] flex-row items-center gap-4 rounded-card bg-surface-pink p-4 sm:gap-8 sm:p-6">
          <div class="flex shrink-0 flex-col items-center gap-1 sm:w-40 sm:gap-1.5">
            {/* The rating is the section's heading; the id stays so the "N รีวิว" link at the top of the PDP still jumps here. */}
            <h2 id="reviews-heading" class="flex scroll-mt-32 items-baseline gap-1.5 whitespace-nowrap leading-none">
              <span class="sr-only">คะแนนรีวิว</span>
              <span class="text-2xl font-bold leading-none text-ink lg:text-3xl">{props.product.rating!.toFixed(1)}</span>
              <span class="text-sm font-medium text-ink-gray lg:text-base">/ 5.0</span>
            </h2>
            <div class="flex items-center gap-0.5" aria-hidden="true">
              <For each={[0, 1, 2, 3, 4]}>
                {(i) => <img src={starGold} alt="" class="size-4 sm:size-5" classList={{ "opacity-25 grayscale": i >= Math.round(props.product.rating!) }} />}
              </For>
            </div>
            <p class="whitespace-nowrap text-xs text-ink-gray sm:text-sm">จาก {(props.product.reviewCount ?? total()).toLocaleString("th-TH")} รีวิว</p>
          </div>

          <div class="flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-2">
            <For each={[5, 4, 3, 2, 1]}>
              {(star, i) => (
                <div class="flex items-center gap-1.5 text-xs text-ink sm:gap-2 sm:text-sm">
                  <span class="flex w-8 shrink-0 items-center gap-0.5">
                    {star}
                    <img src={starGold} alt="" class="size-3.5" aria-hidden="true" />
                  </span>
                  <div class="h-2 flex-1 overflow-hidden rounded-pill bg-white">
                    <div
                      class="h-full rounded-pill bg-brand-yellow"
                      style={{ width: `${total() ? (breakdown()![i()] / total()) * 100 : 0}%` }}
                    />
                  </div>
                  <span class="w-9 shrink-0 text-right text-ink-gray sm:w-10">{breakdown()![i()].toLocaleString("th-TH")}</span>
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
