import { createUniqueId, For } from "solid-js";
import type { AdminVariant } from "~/lib/adminProductStore";
import { TrashIcon, PlusIcon } from "~/components/admin/icons";
import { ProductImageUploader } from "./ProductImageUploader";

/**
 * PART 16 — deliberately simple: Name/SKU/Price/Stock per row, add/remove
 * only. Variant Image Upload — Final Override: each variant's own image set
 * is always shown inline (not tucked behind a collapse toggle), directly
 * under that variant's fields, so it's immediately obvious these photos
 * belong to this one variant — never the Product Gallery above (that lives
 * in ProductForm's separate "รูปภาพสินค้า" section, a different signal
 * entirely). Reuses `ProductImageUploader` per variant, each with its own
 * independent `images` array — adding/removing here can never touch the
 * Gallery or any other variant's images.
 */
export function ProductVariantsEditor(props: { variants: AdminVariant[]; onChange: (variants: AdminVariant[]) => void }) {
  const update = (id: string, patch: Partial<AdminVariant>) => {
    props.onChange(props.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const remove = (id: string) => {
    props.onChange(props.variants.filter((v) => v.id !== id));
  };

  const add = () => {
    props.onChange([...props.variants, { id: createUniqueId(), label: "", sku: "", stock: 0, images: [] }]);
  };

  return (
    <div class="flex flex-col gap-4">
      <For each={props.variants}>
        {(variant, i) => (
          <div class="flex flex-col gap-3 rounded-card border border-surface-gray p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-ink">{variant.label || `ตัวเลือกที่ ${i() + 1}`}</p>
              <button
                type="button"
                onClick={() => remove(variant.id)}
                aria-label="ลบตัวเลือกนี้"
                class="flex min-h-9 items-center justify-center gap-1.5 rounded-card border border-surface-gray px-3 text-sm text-system-red hover:bg-danger-soft"
              >
                <TrashIcon class="size-4" />
                ลบ
              </button>
            </div>

            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label class="flex flex-col gap-1 text-xs font-medium text-ink-gray">
                ชื่อตัวเลือก
                <input
                  value={variant.label}
                  onInput={(e) => update(variant.id, { label: e.currentTarget.value })}
                  placeholder="เช่น Coral Bloom"
                  class="h-10 rounded-card border border-surface-gray px-2.5 text-sm text-ink outline-none focus:border-brand-pink"
                />
              </label>
              <label class="flex flex-col gap-1 text-xs font-medium text-ink-gray">
                SKU
                <input
                  value={variant.sku}
                  onInput={(e) => update(variant.id, { sku: e.currentTarget.value })}
                  class="h-10 rounded-card border border-surface-gray px-2.5 text-sm text-ink outline-none focus:border-brand-pink"
                />
              </label>
              <label class="flex flex-col gap-1 text-xs font-medium text-ink-gray">
                ราคา
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={variant.price ?? ""}
                  onInput={(e) => update(variant.id, { price: e.currentTarget.value === "" ? undefined : Number(e.currentTarget.value) })}
                  class="h-10 rounded-card border border-surface-gray px-2.5 text-sm text-ink outline-none focus:border-brand-pink"
                />
              </label>
              <label class="flex flex-col gap-1 text-xs font-medium text-ink-gray">
                สต๊อก
                <input
                  type="number"
                  min="0"
                  value={variant.stock}
                  onInput={(e) => update(variant.id, { stock: Math.max(0, Number(e.currentTarget.value)) })}
                  class="h-10 rounded-card border border-surface-gray px-2.5 text-sm text-ink outline-none focus:border-brand-pink"
                />
              </label>
            </div>

            <div class="border-t border-dashed border-surface-gray pt-3">
              <p class="mb-2 text-xs font-medium text-ink-gray">รูปภาพของ{variant.label ? ` "${variant.label}"` : "ตัวเลือกนี้"}</p>
              <ProductImageUploader images={variant.images ?? []} onChange={(images) => update(variant.id, { images })} />
            </div>
          </div>
        )}
      </For>
      <button
        type="button"
        onClick={add}
        class="flex min-h-11 items-center justify-center gap-2 rounded-card border border-dashed border-surface-gray text-sm font-medium text-ink-gray transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink"
      >
        <PlusIcon class="size-4" />
        เพิ่มตัวเลือกสินค้า
      </button>
    </div>
  );
}
