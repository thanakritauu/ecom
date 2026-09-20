import { For, Show } from "solid-js";
import type { Product, Review } from "~/lib/types";
import starGold from "~/assets/icons/star-gold-4.svg";

/** Renders only when the product has curated review data — see products.ts for why not every catalog item does. */
export function ProductReviews(props: { product: Product }) {
  const breakdown = () => props.product.ratingBreakdown;
  const total = () => breakdown()?.reduce((sum, n) => sum + n, 0) ?? 0;

  return (
    <Show when={props.product.rating && breakdown() && props.product.reviews?.length}>
      <section aria-labelledby="reviews-heading" class="flex flex-col items-center gap-8">
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

        <div class="grid w-full max-w-[600px] gap-4">
          <For each={props.product.reviews}>{(review) => <ReviewCard review={review} />}</For>
        </div>
      </section>
    </Show>
  );
}

function ReviewCard(props: { review: Review }) {
  const initial = () => props.review.name.trim().charAt(0);
  return (
    <article class="flex flex-col gap-3 rounded-card bg-surface-pink p-6">
      <div class="flex items-center gap-3">
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-pill bg-brand-pink/20 text-sm font-semibold text-brand-pink"
          aria-hidden="true"
        >
          {initial()}
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-base text-ink">{props.review.name}</p>
          <p class="truncate text-sm text-ink-gray">
            {props.review.variantLabel ? `เฉด ${props.review.variantLabel} · ` : ""}ซื้อจริงเมื่อ {props.review.date}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-0.5" aria-label={`ให้คะแนน ${props.review.rating} จาก 5`}>
          <For each={[0, 1, 2, 3, 4]}>
            {(i) => <img src={starGold} alt="" class="size-4" classList={{ "opacity-25": i >= props.review.rating }} />}
          </For>
        </div>
      </div>
      <p class="text-base leading-relaxed text-ink">{props.review.text}</p>
    </article>
  );
}
