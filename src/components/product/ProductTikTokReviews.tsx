import { Show } from "solid-js";
import type { Product } from "~/lib/types";
import { isClipOfProduct, tiktokClipsForProduct } from "~/lib/tiktokReviews";
import { useStorefrontTiktokClips } from "~/lib/storefrontTiktokClips";
import { TikTokReviewRail } from "~/components/shared/TikTokReviewRail";
import { EmptyState } from "~/components/shared/EmptyState";
import { PlayIcon } from "~/components/shared/icons";

/**
 * PDP — TikTok review clips on every product page, in the compact rail:
 * this product's own clips (set in Admin) first: the picked option's, then
 * the whole product's, then ones for its other options,
 * then the rest of the brand's clips. The subtitle only names the product
 * when at least one clip really reviews it. No clips at all: the heading
 * stays, over the shared empty state.
 */
export function ProductTikTokReviews(props: { product: Product; /** The option picked on the PDP: its own clips go first. */ variantId?: string }) {
  const allClips = useStorefrontTiktokClips();
  const clips = () => tiktokClipsForProduct(props.product.id, allClips(), props.variantId);
  const hasOwnClips = () => clips().some((clip) => isClipOfProduct(clip, props.product.id));

  return (
    <section aria-labelledby="tiktok-reviews-heading" class="flex flex-col gap-4">
      <div class="flex flex-col items-center gap-1 text-center">
        <h2 id="tiktok-reviews-heading" class="text-center text-2xl font-bold text-ink lg:text-3xl">
          คลิปรีวิวจาก TikTok
        </h2>
        <Show when={clips().length > 0}>
          <p class="text-sm text-ink-gray">
            {hasOwnClips() ? `รีวิว ${props.product.name} และสินค้า Charmiss อื่นๆ จากผู้ใช้จริง` : "รีวิวสินค้า Charmiss จากผู้ใช้จริง"}
          </p>
        </Show>
      </div>
      <Show
        when={clips().length > 0}
        fallback={<EmptyState size="compact" icon={PlayIcon} title="ยังไม่มีคลิปรีวิว" description="คลิปรีวิวจากผู้ใช้จริงบน TikTok จะแสดงที่นี่" />}
      >
        <TikTokReviewRail clips={clips()} size="compact" label={`คลิปรีวิวสินค้า Charmiss จาก TikTok`} />
      </Show>
    </section>
  );
}
