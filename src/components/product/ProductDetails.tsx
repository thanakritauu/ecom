import { For, Show } from "solid-js";
import type { Product } from "~/lib/types";
import { productGallery } from "~/lib/productVariants";

/**
 * PDP's last section — the product description followed by every product
 * photo stacked full-width, one long scroll (no tabs: how-to-use /
 * ingredients / shipping were removed from the PDP).
 */
export function ProductDetails(props: { product: Product }) {
  const images = () => productGallery(props.product);

  return (
    <section aria-labelledby="product-details-heading" class="flex flex-col gap-5 sm:gap-6">
      <h2 id="product-details-heading" class="text-center text-2xl font-bold text-ink lg:text-3xl">
        รายละเอียดสินค้า
      </h2>
      <Show when={props.product.description} fallback={<p class="text-ink-gray">ยังไม่มีรายละเอียดสินค้าเพิ่มเติมสำหรับสินค้านี้</p>}>
        <p class="whitespace-pre-line text-base leading-relaxed text-ink">{props.product.description}</p>
      </Show>
      <div class="mx-auto flex w-full max-w-[800px] flex-col gap-3 sm:gap-4">
        <For each={images()}>
          {(src, i) => <img src={src} alt={`${props.product.name} รูปที่ ${i() + 1}`} loading="lazy" class="w-full rounded-card object-cover" />}
        </For>
      </div>
    </section>
  );
}
