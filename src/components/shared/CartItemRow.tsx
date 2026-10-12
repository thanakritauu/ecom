import { Show } from "solid-js";
import { useCart } from "~/lib/cart";
import { flashLimitNote, type ResolvedCartLine } from "~/lib/cartSelectors";
import { PriceDisplay } from "./PriceDisplay";
import { getDiscountPercent } from "~/lib/products";
import { QuantityStepper } from "./QuantityStepper";
import { storefrontLowStockThreshold } from "~/lib/productCatalog";

/**
 * One line item — shared by the Cart Drawer (node 153:19197) and the Cart
 * Page (node 153:16170), which show the same fields with two different
 * wrappers (a plain list row in the Drawer vs. a bordered card on the Page).
 * Both read/write the same shared cart state, so editing quantity or
 * removing here updates the Drawer, the Page, and the Header count
 * wherever else this line is being looked at — there's only one line of
 * truth in `cart.tsx`/`cartSelectors.ts` and no cart math is duplicated here.
 */
export function CartItemRow(props: { entry: ResolvedCartLine; variant?: "drawer" | "page" }) {
  const cart = useCart();
  const layout = () => props.variant ?? "drawer";
  const { line, product, variant } = props.entry;
  const outOfStock = () => product.stockLeft !== undefined && product.stockLeft <= 0;
  const lowStock = () => !outOfStock() && product.stockLeft !== undefined && product.stockLeft <= storefrontLowStockThreshold(product);
  const image = () => variant?.image ?? product.image;
  // Same derived % as ProductCard/PDP, against the price this line is actually charged at.
  const discountPercent = () => (product.showDiscountBadge === false ? undefined : getDiscountPercent({ price: props.entry.unitPrice, compareAtPrice: props.entry.compareAtPrice }));

  const remove = () => {
    cart.removeLine(product.id, line.variantId);
  };

  return (
    <li
      class="flex list-none gap-4"
      classList={{
        "opacity-70": outOfStock(),
        "rounded-card border border-surface-gray p-4": layout() === "page",
      }}
    >
      <div
        class="relative shrink-0 overflow-hidden rounded-media border border-surface-gray"
        classList={{ "size-20": layout() === "drawer", "size-24": layout() === "page" }}
      >
        <img src={image()} alt={product.name} class="size-full object-cover" />
        <Show when={outOfStock()}>
          <div class="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center text-xs font-semibold text-white">สินค้าหมด</div>
        </Show>
      </div>

      <div class="flex min-w-0 flex-1 flex-col justify-between gap-1">
        <p class="line-clamp-2 font-medium leading-[1.75] text-ink" classList={{ "text-sm": layout() === "drawer", "text-base": layout() === "page" }}>
          {product.name}
        </p>

        <Show when={variant}>
          <span class="inline-flex w-fit items-center gap-1 rounded-pill bg-surface-gray px-2 py-0.5 text-xs text-ink-gray">
            ตัวเลือกสินค้า: {variant!.label}
          </span>
        </Show>

        <div class="flex flex-wrap items-center gap-2">
          <PriceDisplay price={props.entry.unitPrice} compareAtPrice={props.entry.compareAtPrice} size="sm" />
          <Show
            when={lowStock()}
            fallback={
              <Show when={discountPercent()}>
                <span class="rounded-pill bg-danger-soft px-1.5 py-0.5 text-xs font-bold text-danger-strong">
                  ลด {discountPercent()}%
                </span>
              </Show>
            }
          >
            <span class="rounded-pill bg-gradient-to-r from-[#f42c58] to-brand-yellow px-2 py-0.5 text-xs font-semibold text-white">
              เหลือ {product.stockLeft} ชิ้นสุดท้าย
            </span>
          </Show>
        </div>

        <Show when={flashLimitNote(props.entry)}>
          {(note) => <p class="text-xs leading-[1.75] text-system-red">{note()}</p>}
        </Show>

        <div class="flex items-center justify-between gap-2">
          <QuantityStepper
            tone="outline"
            value={line.qty}
            max={product.stockLeft}
            disabled={outOfStock()}
            onChange={(qty) => cart.updateQty(product.id, line.variantId, qty)}
          />
          <button
            type="button"
            onClick={remove}
            class="flex min-h-11 items-center px-1 text-xs text-ink-gray underline decoration-from-font transition-colors duration-150 hover:text-system-red"
          >
            ลบ
          </button>
        </div>
      </div>
    </li>
  );
}
