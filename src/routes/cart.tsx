import { createMemo, For, Show } from "solid-js";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { Button } from "~/components/shared/Button";
import { ProductRail } from "~/components/shared/ProductRail";
import { CartItemRow } from "~/components/shared/CartItemRow";
import { FreeShippingBanner } from "~/components/shared/FreeShippingBanner";
import { FloatingOrderSummary } from "~/components/shared/FloatingOrderSummary";
import { formatTHB } from "~/components/shared/PriceDisplay";
import { useCart } from "~/lib/cart";
import { resolveCartLines, computeCartTotal } from "~/lib/cartSelectors";
import { useProductCatalog } from "~/lib/productCatalog";

/**
 * Figma node 153:16170. Reuses the exact same shared cart state as the
 * Drawer (cart.tsx / cartSelectors.ts) — no second cart store, no separate
 * total-calculation logic. Editing quantity or removing a line here updates
 * `cart.lines()` directly, so the Drawer and the Header count reflect it the
 * next time either is opened/read, with nothing to keep in sync manually.
 *
 * Figma's own Order Summary card has no coupon field and no separate
 * shipping/discount line — just one "ยอดรวมสินค้า" total (discount is
 * already reflected in each line's struck-through price) — so neither is
 * invented here. There's also no breadcrumb on this node (unlike Product
 * Detail's), so this page doesn't have one either.
 */
export default function CartPage() {
  const cart = useCart();
  const catalog = useProductCatalog();
  const resolvedLines = createMemo(() => resolveCartLines(cart.lines(), catalog.products()));
  const total = createMemo(() => computeCartTotal(resolvedLines()));
  const hasUnavailableItem = createMemo(() =>
    resolvedLines().some(({ product }) => product.stockLeft !== undefined && product.stockLeft <= 0),
  );

  const recommended = createMemo(() => {
    const inCart = new Set(resolvedLines().map((l) => l.product.id));
    return catalog.products().filter((p) => !inCart.has(p.id)).slice(0, 5);
  });

  return (
    <>
      <Header />
      {/* `fixed` positioning (the floating bar below) isn't affected by
          `overflow-x-hidden` the way `position: sticky` elements can be, so
          no `overflow-x-clip` swap is needed here just for the bar itself.
          Bottom padding reserved only while it actually renders (cart has
          items), matching Checkout's `showFloatingBar()` gating. */}
      <main
        class="flex flex-col overflow-x-hidden"
        // +64px (BottomNav's own height) folded into the Tablet/Mobile steps
        // only — `stackAboveBottomNav` shifts the floating bar up by exactly
        // that much below `lg:`; `lg:pb-24` restores the original Desktop
        // reservation, where the bar still sits flush at `bottom-0`.
        classList={{ "pb-52 md:pb-40 lg:pb-24": resolvedLines().length > 0 }}
      >
        <div class="bg-surface-gray/60 py-6 sm:py-8">
          <Container width="wide" class="flex flex-col gap-4 sm:gap-5 lg:gap-6">
            <h1 class="text-2xl font-bold text-ink lg:text-[31px]">ตะกร้าสินค้า</h1>

            <Show when={resolvedLines().length > 0} fallback={<EmptyCartPage />}>
              <FreeShippingBanner total={total()} showAmounts />

              <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
                <ul class="flex flex-1 flex-col gap-4 rounded-card bg-white p-4 lg:p-6">
                  <For each={resolvedLines()}>{(entry) => <CartItemRow entry={entry} variant="page" />}</For>
                </ul>

                <div class="flex flex-col gap-0 rounded-card border border-surface-gray bg-white lg:sticky lg:top-6 lg:w-[390px] lg:shrink-0">
                  <div class="flex items-center justify-between p-4">
                    <p class="text-lg font-semibold text-ink">สรุปคำสั่งซื้อ</p>
                    <p class="text-sm text-ink-gray">สินค้าทั้งหมด {cart.count()} ชิ้น</p>
                  </div>
                  <div class="h-px bg-surface-gray" />
                  <div class="flex items-center justify-between p-4 text-sm">
                    <span class="text-ink-gray">ยอดรวมสินค้า</span>
                    <span class="font-bold text-ink">{formatTHB(total())}</span>
                  </div>
                  <div class="mx-4 h-px bg-surface-gray" />
                  <div class="flex flex-col gap-2 p-4">
                    <div class="flex items-center justify-between">
                      <span class="text-lg font-semibold text-ink">ยอดรวมสินค้า</span>
                      <span class="text-2xl font-bold text-brand-pink">{formatTHB(total())}</span>
                    </div>

                    <Show when={hasUnavailableItem()}>
                      <p class="text-sm text-system-red" role="alert">
                        มีสินค้าหมดในตะกร้า กรุณาลบหรือรอสินค้ากลับมาก่อนชำระเงิน
                      </p>
                    </Show>

                    <Show
                      when={!hasUnavailableItem()}
                      fallback={
                        <Button type="button" variant="primary" size="lg" class="w-full" disabled>
                          ชำระเงิน
                        </Button>
                      }
                    >
                      <Button href="/checkout" variant="primary" size="lg" class="w-full">
                        ชำระเงิน
                      </Button>
                    </Show>
                    <p class="flex items-center justify-center gap-1.5 text-xs text-ink-gray">
                      <InfoIcon /> ราคาสินค้าอาจมีการเปลี่ยนแปลง
                    </p>
                  </div>
                </div>
              </div>
            </Show>
          </Container>
        </div>

        <Show when={recommended().length > 0}>
          <section aria-labelledby="cart-recommended-heading" class="bg-gradient-to-b from-surface-pink to-white py-6 sm:py-8 lg:py-10">
            <Container width="wide" class="flex flex-col gap-4 sm:gap-5 lg:gap-6">
              <h2 id="cart-recommended-heading" class="text-xl font-bold text-ink lg:text-2xl">
                ช็อปเพิ่มอีกนิด...ให้ครบดีล
              </h2>
              <ProductRail products={recommended()} columns={5} />
            </Container>
          </section>
        </Show>
      </main>

      {/* Quick-access companion to the Cart Summary card above — same
          component Checkout uses, same container/spacing/button treatment.
          `discount`/`shippingFee` are left unset (not fabricated): Cart has
          no coupon feature and shipping is only chosen later at Checkout, so
          the shared component simply omits those segments rather than this
          page inventing a fake "ฟรี"/discount value it doesn't compute. */}
      <Show when={resolvedLines().length > 0}>
        <FloatingOrderSummary
          itemCount={cart.count()}
          total={total()}
          ctaLabel="ชำระเงิน"
          ctaHref="/checkout"
          ctaDisabled={hasUnavailableItem()}
          stackAboveBottomNav
        />
      </Show>

      <Footer />
      {/* `position: fixed` bars don't reserve their own space in document
          flow — the padding reserved on `<main>` above only protects content
          *before* the Footer. Since the Footer is the last thing on the
          page, at max scroll the fixed bar still covers whatever renders
          last unless something reserves room *after* it too. Same
          `bg-brand-pink` as Footer's own root so it reads as part of the
          Footer, not a stray gap. (This same gap exists on Checkout today
          too — pre-existing, out of scope here — fixed only for this page.) */}
      <Show when={resolvedLines().length > 0}>
        <div class="h-36 bg-brand-pink md:h-24" aria-hidden="true" />
      </Show>
    </>
  );
}

function EmptyCartPage() {
  return (
    <div class="flex flex-col items-center justify-center gap-4 rounded-card bg-white py-20 text-center">
      <p class="text-lg text-ink-gray">ตะกร้าของคุณยังว่างอยู่</p>
      <Button href="/" variant="primary">
        เลือกซื้อสินค้า
      </Button>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" stroke-linecap="round" />
    </svg>
  );
}
