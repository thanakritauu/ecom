import { createMemo, createSignal, Show, For } from "solid-js";
import { A } from "@solidjs/router";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { Button } from "~/components/shared/Button";
import { PriceDisplay } from "~/components/shared/PriceDisplay";
import { ProductRail } from "~/components/shared/ProductRail";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { ProductGallery } from "~/components/product/ProductGallery";
import { QuantityStepper } from "~/components/shared/QuantityStepper";
import { ProductDetails } from "~/components/product/ProductDetails";
import { ProductReviews } from "~/components/product/ProductReviews";
import { ProductTikTokReviews } from "~/components/product/ProductTikTokReviews";
import { StickyAddToCartBar } from "~/components/product/StickyAddToCartBar";
import { useProductCatalog } from "~/lib/productCatalog";
import { useCategoryContent } from "~/lib/categoryContent";
import { categoryListHref } from "~/lib/pageSections";
import type { Product } from "~/lib/types";
import { getDiscountPercent } from "~/lib/products";
import { useCart } from "~/lib/cart";
import { pushToast } from "~/lib/toast";
import starGold from "~/assets/icons/star-gold-4.svg";
import { AddToCartButton } from "~/components/shared/AddToCartButton";

/**
 * Shared by both `/product/:slug` (normal PDP) and `/product/:slug/out-of-stock`
 * (the dedicated Out of Stock PDP) so the two routes render the exact same
 * structure/behavior off one implementation instead of two divergent copies.
 * `forceOutOfStock` lets the out-of-stock route present ANY product (even one
 * that's actually in stock) in the Out of Stock state without touching this
 * product's real `stockLeft` — the normal route never passes it, so its
 * `outOfStock()` is unaffected and still comes from the product data alone.
 */
export function ProductDetailView(props: { product: Product; forceOutOfStock?: boolean }) {
  const cart = useCart();
  const catalog = useProductCatalog();
  const categories = useCategoryContent();
  let addToCartRef: HTMLDivElement | undefined;

  /** Product / Category / Brand / Collection Source-of-Truth Cleanup (§4/§8) — the breadcrumb's category crumb resolves through the real Category store by `categoryId`, not the legacy `.category` enum + a hardcoded `/category/:slug` link (a route this app has never had — Navigation/Promotion Page architecture deliberately routes category listings through `/products?category=<slug>` instead, see `categoryListHref`). */
  const productCategory = () => (props.product.categoryId ? categories.getById(props.product.categoryId) : undefined);

  const outOfStock = () => props.forceOutOfStock || (props.product.stockLeft !== undefined && props.product.stockLeft <= 0);
  const hasVariants = () => (props.product.variants?.length ?? 0) > 0;
  // Figma shows a shade pre-selected on load (unlike Home's card grid, where
  // nothing is selected until tapped) — default to the first non-sold-out
  // variant so the page opens ready to buy.
  const [selectedVariantId, setSelectedVariantId] = createSignal<string | undefined>(
    props.product.variants?.find((v) => !v.soldOut)?.id,
  );
  const selectedVariant = createMemo(() => props.product.variants?.find((v) => v.id === selectedVariantId()));
  const [shadeRequired, setShadeRequired] = createSignal(false);
  const [quantity, setQuantity] = createSignal(1);
  const [addStatus, setAddStatus] = createSignal<"idle" | "loading" | "error">("idle");

  const relatedProducts = createMemo(() =>
    catalog
      .products()
      .filter((p) => p.id !== props.product.id && (!props.product.categoryId || p.categoryId === props.product.categoryId))
      .slice(0, 5),
  );

  const addToCart = async () => {
    if (outOfStock() || addStatus() === "loading") return;
    if (hasVariants() && !selectedVariantId()) {
      setShadeRequired(true);
      return;
    }
    setAddStatus("loading");
    try {
      await cart.addLine(props.product.id, selectedVariantId(), quantity());
      setAddStatus("idle");
    } catch {
      setAddStatus("error");
      pushToast("เพิ่มลงตะกร้าไม่สำเร็จ ลองอีกครั้ง", "error");
    }
  };

  const buyNow = async () => {
    if (outOfStock()) return;
    if (hasVariants() && !selectedVariantId()) {
      setShadeRequired(true);
      return;
    }
    // Buy Now skips the Drawer entirely — it's not "add and keep browsing"
    // (what the Drawer is for), it's "go straight to checkout".
    await cart.addLine(props.product.id, selectedVariantId(), quantity(), { openDrawer: false });
    window.location.href = "/checkout";
  };

  return (
    <>
      <Header />
      <main class="flex flex-col overflow-x-hidden pb-6 sm:pb-8 lg:pb-10">
        <Container width="wide" class="pt-4 sm:pt-6">
          <Breadcrumb
            items={[
              { label: "หน้าแรก", href: "/" },
              ...(productCategory() ? [{ label: productCategory()!.name, href: categoryListHref(productCategory()!.slug) }] : []),
              { label: props.product.name },
            ]}
          />
        </Container>

        {/* Section rhythm — 24 / 32 / 40px (mobile / tablet / desktop), same scale as Home. */}
        <Container width="wide" class="flex flex-col gap-6 pt-4 sm:gap-8 sm:pt-6 lg:gap-10">
          <div class="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-start lg:gap-10">
            <div class="lg:w-1/2 lg:shrink-0">
              <ProductGallery product={props.product} forceOutOfStock={props.forceOutOfStock} />
            </div>

            <div class="flex flex-col gap-6 lg:w-1/2">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span class="flex items-center gap-1 text-sm text-ink-gray">
                  <img src={starGold} alt="" class="size-5" />
                  {props.product.rating?.toFixed(1) ?? "—"}/5
                </span>
                <Show when={props.product.reviewCount}>
                  <a href="#reviews-heading" class="text-sm text-ink-gray underline-offset-2 hover:underline">
                    {props.product.reviewCount!.toLocaleString("th-TH")} รีวิว
                  </a>
                </Show>
                <Show when={props.product.soldCount}>
                  <span class="text-sm text-ink-gray">· ขายแล้ว {props.product.soldCount!.toLocaleString("th-TH")} ชิ้น</span>
                </Show>
                <span
                  class="rounded-pill px-2 py-0.5 text-xs font-semibold"
                  classList={{
                    "bg-success-soft text-success": !outOfStock(),
                    "bg-danger-soft text-danger-strong": outOfStock(),
                  }}
                >
                  {outOfStock() ? "สินค้าหมด" : "พร้อมส่ง"}
                </span>
              </div>

              <h1 class="text-2xl font-bold text-ink lg:text-[28px] lg:leading-[1.4]">{props.product.name}</h1>

              <Show when={props.product.description}>
                <p class="text-base text-ink">{props.product.description}</p>
              </Show>

              <div class="flex flex-col gap-2 rounded-card bg-surface-pink px-6 py-5">
                <div class="flex flex-wrap items-center gap-2">
                  <PriceDisplay price={props.product.price} compareAtPrice={props.product.compareAtPrice} />
                  <Show when={getDiscountPercent(props.product)}>
                    <span class="rounded-pill bg-danger-strong/90 px-1.5 py-0.5 text-xs font-semibold text-danger-soft">
                      ลด {getDiscountPercent(props.product)}%
                    </span>
                  </Show>
                </div>
              </div>

              <Show when={hasVariants()}>
                <div class="flex flex-col gap-3">
                  <div class="flex flex-wrap items-center gap-2 text-base">
                    <span class="font-semibold text-ink">ตัวเลือก</span>
                    <span class="text-ink-gray">{selectedVariant()?.label ?? "กรุณาเลือกตัวเลือกสินค้า"}</span>
                  </div>
                  <div role="radiogroup" aria-label="ตัวเลือกสินค้า" class="flex flex-wrap gap-4">
                    <For each={props.product.variants}>
                      {(variant) => (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={selectedVariantId() === variant.id}
                          aria-label={`ตัวเลือกสินค้า ${variant.label}${variant.soldOut ? " (สินค้าหมด)" : ""}`}
                          disabled={variant.soldOut}
                          onClick={() => {
                            setSelectedVariantId(variant.id);
                            setShadeRequired(false);
                          }}
                          class="relative flex size-[42px] items-center justify-center rounded-pill border p-1 transition-transform duration-150 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-10 disabled:hover:scale-100"
                          classList={{
                            "border-brand-pink": selectedVariantId() === variant.id,
                            "border-surface-gray": selectedVariantId() !== variant.id,
                          }}
                        >
                          <span class="size-full rounded-pill" style={{ "background-color": variant.color }} aria-hidden="true" />
                        </button>
                      )}
                    </For>
                  </div>
                  <Show when={shadeRequired()}>
                    <p class="text-sm text-system-red" role="alert">
                      กรุณาเลือกตัวเลือกสินค้าก่อนเพิ่มลงตะกร้า
                    </p>
                  </Show>
                </div>
              </Show>

              <div ref={addToCartRef} class="flex items-center gap-3">
                <QuantityStepper value={quantity()} onChange={setQuantity} max={props.product.stockLeft} disabled={outOfStock()} />
                <AddToCartButton size="lg" class="flex-1" outOfStock={outOfStock()} loading={addStatus() === "loading"} onClick={addToCart} />
              </div>

              <Button type="button" variant="outline" size="lg" class="w-full" disabled={outOfStock()} onClick={buyNow}>
                ซื้อเลย
              </Button>
            </div>
          </div>

          {/* PDP order: TikTok clips (on every PDP, this product's own first) → #CharmissReviews → description + photos. */}
          <ProductTikTokReviews product={props.product} />
          <ProductReviews product={props.product} />
          <ProductDetails product={props.product} />

          <Show when={relatedProducts().length > 0}>
            <section aria-labelledby="related-heading" class="flex flex-col gap-6">
              <h2 id="related-heading" class="text-2xl font-bold text-ink lg:text-3xl">
                สินค้าที่คุณอาจชอบ
              </h2>
              <ProductRail products={relatedProducts()} columns={5} />
            </section>
          </Show>
        </Container>
      </main>
      <Footer />

      <StickyAddToCartBar
        product={props.product}
        selectedVariant={selectedVariant()}
        quantity={quantity()}
        onQuantityChange={setQuantity}
        maxQuantity={props.product.stockLeft}
        watchRef={addToCartRef}
        onAddToCart={addToCart}
        addStatus={addStatus()}
        outOfStock={outOfStock()}
      />
    </>
  );
}

export function NotFoundState(props: { slug: string }) {
  return (
    <>
      <Header />
      <Container width="wide" class="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-20 text-center">
        <h1 class="text-2xl font-bold text-ink">ไม่พบสินค้านี้</h1>
        <p class="text-ink-gray">({props.slug}) ไม่มีอยู่ในแคตตาล็อก หรืออาจถูกนำออกไปแล้ว</p>
        <A href="/" class="text-brand-pink underline">
          กลับหน้าหลัก
        </A>
      </Container>
      <Footer />
    </>
  );
}
