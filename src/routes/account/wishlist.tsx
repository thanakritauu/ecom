import { For, Show } from "solid-js";
import { AccountShell, AccountPanel } from "~/components/account/AccountShell";
import { ProductCard } from "~/components/shared/ProductCard";
import { EmptyState } from "~/components/shared/EmptyState";
import { HeartIcon } from "~/components/shared/icons";
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
            <EmptyState
              icon={HeartIcon}
              title="ยังไม่มีรายการโปรด"
              description="กดรูปหัวใจที่สินค้าที่ชอบ แล้วกลับมาดูหรือสั่งซื้อได้ที่นี่"
              action={{ label: "เลือกซื้อสินค้า", href: "/products" }}
            />
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
