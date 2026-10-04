import { Show } from "solid-js";
import type { Product } from "~/lib/types";
import { isClipOfProduct, tiktokClipsForProduct } from "~/lib/tiktokReviews";
import { TikTokReviewRail } from "~/components/shared/TikTokReviewRail";

/**
 * PDP — TikTok review clips on every product page, in the compact rail:
 * this product's own clips (`productIds` in lib/tiktokReviews.ts) first,
 * then the rest of the brand's clips. The subtitle only names the product
 * when at least one clip really reviews it.
 */
export function ProductTikTokReviews(props: { product: Product }) {
  const clips = () => tiktokClipsForProduct(props.product.id);
  const hasOwnClips = () => clips().some((clip) => isClipOfProduct(clip, props.product.id));

  return (
    <Show when={clips().length > 0}>
      <section aria-labelledby="tiktok-reviews-heading" class="flex flex-col gap-4">
        <div class="flex flex-col items-center gap-1 text-center">
          <h2 id="tiktok-reviews-heading" class="text-center text-2xl font-bold text-ink lg:text-3xl">
            คลิปรีวิวจาก TikTok
          </h2>
          <p class="text-sm text-ink-gray">
            {hasOwnClips() ? `รีวิว ${props.product.name} และสินค้า Charmiss อื่นๆ จากผู้ใช้จริง` : "รีวิวสินค้า Charmiss จากผู้ใช้จริง"}
          </p>
        </div>
        <TikTokReviewRail clips={clips()} size="compact" label={`คลิปรีวิวสินค้า Charmiss จาก TikTok`} />
      </section>
    </Show>
  );
}
