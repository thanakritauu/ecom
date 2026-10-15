import { Dialog } from "@kobalte/core/dialog";
import { For, Show, createMemo } from "solid-js";
import { useCart } from "~/lib/cart";
import { resolveCartLines } from "~/lib/cartSelectors";
import { useCartPromotions } from "~/lib/storefrontPromotions";
import { rearmPromoCelebrations } from "~/lib/promoCelebration";
import { useProductCatalog } from "~/lib/productCatalog";
import { Button } from "./Button";
import { formatTHB } from "./PriceDisplay";
import { CartItemRow } from "./CartItemRow";
import { CartPromoBanners, promoCelebrationTargets } from "./CartPromoBanners";
import { GiftItemRow } from "./GiftItemRow";
import { CartIcon, CloseMark } from "./icons";
import { EmptyState } from "./EmptyState";
import { PromoDiscountRows } from "./PromoDiscountRows";

/**
 * Figma node 153:19197. Global — opened from the Header cart icon, from
 * Product Card's Add to Cart, and from Product Detail's Add to Cart, all via
 * the one shared `cart.drawerOpen()` in cart.tsx (see the note there). Do
 * not add a second drawer instance anywhere; render this once (Header
 * already does) and let `cart.openDrawer()` control it from anywhere else.
 */
export function CartDrawer() {
  const cart = useCart();
  const catalog = useProductCatalog();
  const resolvedLines = createMemo(() => resolveCartLines(cart.lines(), catalog.products()));
  const promos = useCartPromotions(resolvedLines);
  // Same `priceCart` total as the cart page and checkout (before coupon, coins and shipping).
  const total = () => promos.pricing().total;
  // Always mounted (Header renders the drawer on every page), so it sees every unlocked to locked drop.
  rearmPromoCelebrations(() => promoCelebrationTargets(promos.freeShipping(), promos.gifts(), promos.tiered()));

  return (
    <Dialog open={cart.drawerOpen()} onOpenChange={(open) => (open ? cart.openDrawer() : cart.closeDrawer())}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-black/50 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-y-0 right-0 z-50 flex w-full sm:w-[480px] lg:w-[600px]">
          <Dialog.Content class="flex size-full flex-col overflow-hidden bg-white shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-drawer-in data-[closed]:animate-drawer-out">
            <div class="flex shrink-0 items-center justify-between border-b border-surface-gray px-6 py-4">
              <Dialog.Title class="text-2xl font-semibold text-ink">ตะกร้าสินค้า ({cart.count()})</Dialog.Title>
              <Dialog.CloseButton
                aria-label="ปิดตะกร้า"
                class="group -mr-1.5 flex size-11 items-center justify-center"
              >
                <CloseMark />
              </Dialog.CloseButton>
            </div>

            <Show when={resolvedLines().length > 0} fallback={<EmptyCart />}>
              <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
                <CartPromoBanners freeShipping={promos.freeShipping()} gifts={promos.gifts()} tiered={promos.tiered()} />

                <ul class="flex flex-col gap-4">
                  <For each={resolvedLines()}>
                    {(entry, i) => (
                      <>
                        <CartItemRow entry={entry} variant="drawer" />
                        <Show when={i() < resolvedLines().length - 1}>
                          <li class="h-px shrink-0 list-none bg-surface-gray" aria-hidden="true" />
                        </Show>
                      </>
                    )}
                  </For>
                  <For each={promos.giftLines()}>
                    {(g) => (
                      <>
                        <li class="h-px shrink-0 list-none bg-surface-gray" aria-hidden="true" />
                        <GiftItemRow gift={g} variant="drawer" />
                      </>
                    )}
                  </For>
                </ul>
              </div>

              <div class="flex shrink-0 flex-col gap-4 rounded-t-card bg-brand-pink p-6">
                <Show when={promos.pricing().rows.length > 0}>
                  <div class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between gap-3 text-sm text-white/90">
                      <span>ยอดรวมสินค้า</span>
                      <span class="font-bold text-white">{formatTHB(promos.pricing().subtotal)}</span>
                    </div>
                    <PromoDiscountRows rows={promos.pricing().rows} onPink />
                  </div>
                </Show>
                {/* Label and amount the same size. */}
                <div class="flex items-center justify-between text-xl font-semibold text-white sm:text-[22px]">
                  <span>ยอดรวม</span>
                  <span class="font-bold">{formatTHB(total())}</span>
                </div>
                <div class="flex gap-3">
                  {/* `drawerOpen` lives in cart.tsx and is only ever reset by an explicit open/close call; a client-side
                      route change alone doesn't touch it, so closing here keeps the Portal-rendered drawer from staying
                      on top of the next page. Shared `Button` (DSL): size lg, white / ghost on the pink box. */}
                  <Button href="/checkout" variant="white" size="lg" class="flex-1" onClick={() => cart.closeDrawer()}>
                    ชำระเงิน
                  </Button>
                  {/* Keeps the shopper where they are, just closes the mini cart. */}
                  <Button type="button" variant="ghost" size="lg" class="shrink-0" onClick={() => cart.closeDrawer()}>
                    เลือกสินค้าต่อ
                  </Button>
                </div>
              </div>
            </Show>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

function EmptyCart() {
  const cart = useCart();
  return (
    <div class="flex flex-1 flex-col items-center justify-center p-6">
      <EmptyState
        icon={CartIcon}
        title="ตะกร้าของคุณยังว่างอยู่"
        description="เลือกสินค้าที่ชอบแล้วเพิ่มลงตะกร้าได้เลย"
        action={{ label: "เลือกซื้อสินค้า", onClick: () => cart.closeDrawer() }}
      />
    </div>
  );
}
