import { For, Show } from "solid-js";
import type { Product } from "~/lib/types";
import { productGallery, withProductVideos } from "~/lib/productVariants";
import { MediaView } from "~/components/shared/MediaView";
import { RichTextContent } from "~/components/shared/RichTextContent";
import { isRichTextEmpty } from "~/lib/richText";

/**
 * PDP's last section — the product description followed by every product
 * photo stacked full-width, one long scroll (no tabs: how-to-use /
 * ingredients / shipping were removed from the PDP).
 */
export function ProductDetails(props: { product: Product }) {
  const images = () => withProductVideos(props.product, productGallery(props.product));

  return (
    <section aria-labelledby="product-details-heading" class="flex flex-col gap-5 sm:gap-6">
      <h2 id="product-details-heading" class="text-center text-2xl font-bold text-ink lg:text-3xl">
        รายละเอียดสินค้า
      </h2>
      <Show when={!isRichTextEmpty(props.product.description)} fallback={<p class="text-ink-gray">ยังไม่มีรายละเอียดสินค้าเพิ่มเติมสำหรับสินค้านี้</p>}>
        <RichTextContent value={props.product.description} class="mx-auto w-full max-w-[800px]" />
      </Show>
      <div class="mx-auto flex w-full max-w-[800px] flex-col gap-3 sm:gap-4">
        <For each={images()}>
          {(item, i) => <MediaView media={item} alt={`${props.product.name} รูปที่ ${i() + 1}`} loading="lazy" objectFit="cover" class="w-full rounded-card" />}
        </For>
      </div>
    </section>
  );
}
