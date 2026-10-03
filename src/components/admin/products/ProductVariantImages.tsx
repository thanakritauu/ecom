import { For, Show } from "solid-js";
import type { AdminVariant } from "~/lib/adminProductStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { ImageIcon } from "~/components/admin/icons";

/**
 * Variant selector — Global UI Correction — Final Overrides #2-4: variants
 * are shown as **images only**, not color swatches/circles. The real
 * Charmiss system uploads a real photo per variant, so the prototype's UI
 * should already look like that instead of a color-picker stand-in that a
 * real backend couldn't populate the same way. Visual language mirrors the
 * customer PDP's own image-thumbnail selector (ProductGallery.tsx: `size-
 * [98px] rounded-media border-2`, `border-brand-pink` active / `border-
 * surface-gray` inactive) — same border/radius/active-state convention,
 * just smaller for Admin's denser layout. Reused by both Product Quick View
 * and Product Detail (was `ProductVariantSwatches`, renamed since "swatch"
 * no longer describes what this renders).
 *
 * Variant Image Upload — Final Override: a variant with no photos of its
 * own shows a plain placeholder icon here, never the Product Gallery's
 * image — Gallery and Variant Images are a strictly separate collection,
 * with no fallback relationship between them in either direction.
 *
 * A variant with no photos yet shows its card swatch color instead of the
 * generic placeholder icon (the icon is left for the rare no-color case).
 */
export function ProductVariantImages(props: {
  variants: AdminVariant[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <div class="flex flex-col gap-2">
      <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">ตัวเลือกสินค้า</p>
      <div role="radiogroup" aria-label="ตัวเลือกสินค้า" class="flex flex-wrap gap-3">
        <For each={props.variants}>
          {(variant) => (
            <button
              type="button"
              role="radio"
              aria-checked={props.selectedId === variant.id}
              aria-label={`${variant.label}${variant.stock <= 0 ? " (หมด)" : ""}`}
              onClick={() => props.onSelect(variant.id)}
              disabled={variant.stock <= 0}
              class="flex flex-col items-center gap-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span
                class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-media border-2 bg-surface-gray/60 transition-colors duration-150"
                classList={{
                  "border-brand-pink": props.selectedId === variant.id,
                  "border-border": props.selectedId !== variant.id,
                }}
              >
                <Show
                  when={variant.images?.[0]}
                  fallback={
                    <Show when={variant.color} fallback={<ImageIcon class="size-5 text-ink-placeholder" />}>
                      {(color) => <span class="size-full" style={{ "background-color": color() }} aria-hidden="true" />}
                    </Show>
                  }
                >
                  {(src) => <img src={src()} alt="" class="size-full object-cover" />}
                </Show>
              </span>
              <span class="max-w-[4.5rem] truncate text-[11px] text-ink-gray">{variant.label}</span>
            </button>
          )}
        </For>
      </div>
      <Show when={props.variants.find((v) => v.id === props.selectedId)}>
        {(selected) => (
          <p class="text-xs text-ink-gray">
            SKU {selected().sku}
            {selected().price !== undefined ? ` · ${formatAdminCurrency(selected().price!)}` : ""} · สต๊อก {selected().stock}
          </p>
        )}
      </Show>
    </div>
  );
}
