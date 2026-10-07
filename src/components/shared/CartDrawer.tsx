import { Dialog } from "@kobalte/core/dialog";
import { For, Show, createMemo } from "solid-js";
import { A } from "@solidjs/router";
import { useCart } from "~/lib/cart";
import { resolveCartLines, computeCartTotal, resolveGiftPromotion } from "~/lib/cartSelectors";
import { useProductCatalog } from "~/lib/productCatalog";
import { Button } from "./Button";
import { formatTHB } from "./PriceDisplay";
import { CartItemRow } from "./CartItemRow";
import { GiftPromotionBanner, rearmGiftCelebration } from "./GiftPromotionBanner";
import { GiftItemRow } from "./GiftItemRow";
import { CloseMark } from "./icons";

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
  const total = createMemo(() => computeCartTotal(resolvedLines()));
  const gift = createMemo(() => resolveGiftPromotion(total(), catalog.products()));
  // Always mounted (Header renders the drawer on every page), so it sees every unlocked → locked drop.
  rearmGiftCelebration(() => gift()?.unlocked);

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
                <Show when={gift()}>{(g) => <GiftPromotionBanner gift={g()} total={total()} />}</Show>

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
                  <Show when={gift()?.unlocked && gift()}>
                    {(g) => (
                      <>
                        <li class="h-px shrink-0 list-none bg-surface-gray" aria-hidden="true" />
                        <GiftItemRow gift={g()} variant="drawer" />
                      </>
                    )}
                  </Show>
                </ul>
              </div>

              <div class="flex shrink-0 flex-col gap-4 rounded-t-card bg-brand-pink p-6">
                <div class="flex items-center justify-between text-white">
                  <span class="text-xl font-semibold sm:text-[22px]">ยอดรวม</span>
                  <span class="text-2xl font-bold sm:text-[32px]">{formatTHB(total())}</span>
                </div>
                <div class="flex gap-4">
                  {/* `drawerOpen` lives in cart.tsx and is only ever reset by an
                      explicit open/close call — a client-side route change alone
                      does not touch it, so without `closeDrawer()` here the Portal-
                      rendered Drawer stays mounted (and visible) on top of
                      whatever page loads next. */}
                  <A
                    href="/checkout"
                    onClick={() => cart.closeDrawer()}
                    class="flex h-12 flex-1 items-center justify-center rounded-pill bg-white px-2 text-sm font-medium text-brand-pink transition-colors duration-150 hover:bg-white/90"
                  >
                    ชำระเงิน
                  </A>
                  {/* Keeps the shopper where they are — just closes the mini cart. */}
                  <button
                    type="button"
                    onClick={() => cart.closeDrawer()}
                    class="flex h-12 shrink-0 items-center justify-center rounded-pill border border-white px-5 text-sm font-medium text-white transition-colors duration-150 lg:hover:bg-white/10"
                  >
                    เลือกสินค้าต่อ
                  </button>
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
    <div class="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p class="text-lg text-ink-gray">ตะกร้าของคุณยังว่างอยู่</p>
      <Button type="button" variant="primary" onClick={() => cart.closeDrawer()}>
        เลือกซื้อสินค้า
      </Button>
    </div>
  );
}
