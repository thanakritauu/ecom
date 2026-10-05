import { For, Show } from "solid-js";
import { AccountShell, AccountPanel } from "~/components/account/AccountShell";
import { ProductCard } from "~/components/shared/ProductCard";
import { Button } from "~/components/shared/Button";
import { useWishlist } from "~/lib/wishlist";
import { useProductCatalog } from "~/lib/productCatalog";

/** รายการโปรด — products hearted anywhere on the site (same wishlist state), newest first, as the shared ProductCard. */
export default function AccountWishlistPage() {
  const wishlist = useWishlist();
  const catalog = useProductCatalog();
  const products = () => catalog.getByIds([...wishlist.ids()].reverse());

  return (
    <AccountShell>
      <AccountPanel title="รายการโปรด" headingId="account-wishlist-heading">
        <Show
          when={products().length > 0}
          fallback={
            <div class="flex flex-col items-center gap-3 py-16 text-center">
              <p class="text-lg font-semibold text-ink">ยังไม่มีรายการโปรด</p>
              <p class="max-w-xs text-sm text-ink-gray">กดรูปหัวใจที่สินค้าที่ชอบ แล้วกลับมาดูหรือสั่งซื้อได้ที่นี่</p>
              <Button href="/products" variant="primary">
                เลือกช้อปสินค้า
              </Button>
            </div>
          }
        >
          <p class="-mt-2 text-sm text-ink-gray">{products().length} รายการ</p>
          <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-4">
            <For each={products()}>{(product) => <ProductCard product={product} />}</For>
          </div>
        </Show>
      </AccountPanel>
    </AccountShell>
  );
}
