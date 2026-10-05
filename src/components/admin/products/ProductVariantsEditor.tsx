import { createUniqueId, For, Show } from "solid-js";
import type { AdminVariant } from "~/lib/adminProductStore";
import { ArrowDownIcon, ArrowUpIcon, TrashIcon, PlusIcon } from "~/components/admin/icons";
import { ProductImageUploader } from "./ProductImageUploader";
import { SingleImageUploader } from "~/components/admin/SingleImageUploader";

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
 *
 * Each variant has two independent visuals, uploaded separately:
 * 1. "วงสีบน Product Card" — the card's small shade circle: a flat color
 *    or its own small swatch image (`mode` picks which; switching keeps the
 *    other value so flipping back loses nothing).
 * 2. "รูปสินค้าใน Modal ตัวเลือกสินค้า" — the variant's real product photos
 *    (`images`), shown as the option tile in the Product Option Modal.
 *
 * Row order is the storefront's order (card shade row, Option Modal) — the
 * card has 5 circle slots, so with more than 5 options it shows the first 4
 * plus "+N" (ProductCard's MAX_SHADE_SLOTS).
 */
const CARD_SHADE_SLOTS = 5;
export function ProductVariantsEditor(props: { variants: AdminVariant[]; onChange: (variants: AdminVariant[]) => void }) {
  const update = (id: string, patch: Partial<AdminVariant>) => {
    props.onChange(props.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const remove = (id: string) => {
    props.onChange(props.variants.filter((v) => v.id !== id));
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= props.variants.length) return;
    const next = [...props.variants];
    [next[index], next[target]] = [next[target], next[index]];
    props.onChange(next);
  };

  /** How many leading rows the card shows as circles — 5 when they all fit, otherwise 4 + "+N". */
  const cardVisibleCount = () => (props.variants.length > CARD_SHADE_SLOTS ? CARD_SHADE_SLOTS - 1 : props.variants.length);

  const add = () => {
    props.onChange([...props.variants, { id: createUniqueId(), label: "", sku: "", stock: 0, images: [], color: "#CCCCCC", mode: "color" }]);
  };

  /** Only decides what the Product Card circle shows — the modal photos (`images`) are untouched either way. */
  const setMode = (id: string, mode: "color" | "image") => update(id, { mode });

  return (
    <div class="flex flex-col gap-4">
      <Show when={props.variants.length > 1}>
        <p class="text-xs text-ink-gray">
          ลำดับนี้คือลำดับที่แสดงบนหน้าร้าน — การ์ดสินค้าแสดงวงสีได้ {CARD_SHADE_SLOTS} วง ถ้ามีมากกว่า {CARD_SHADE_SLOTS} ตัวเลือกจะแสดง {CARD_SHADE_SLOTS - 1} วงแรก + "+N"
        </p>
      </Show>
      <For each={props.variants}>
        {(variant, i) => (
          <div class="flex flex-col gap-3 rounded-card border border-border p-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-2">
                <p class="truncate text-sm font-semibold text-ink">{variant.label || `ตัวเลือกที่ ${i() + 1}`}</p>
                <Show when={props.variants.length > CARD_SHADE_SLOTS && i() >= cardVisibleCount()}>
                  <span class="shrink-0 rounded-pill bg-surface-gray px-2 py-0.5 text-[11px] text-ink-gray">รวมใน "+N" บนการ์ด</span>
                </Show>
              </div>
              <div class="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => move(i(), -1)}
                disabled={i() === 0}
                aria-label="เลื่อนขึ้น"
                title="เลื่อนขึ้น"
                class="flex size-9 items-center justify-center rounded-card border border-border text-ink-gray hover:bg-surface-pink disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUpIcon class="size-4" />
              </button>
              <button
                type="button"
                onClick={() => move(i(), 1)}
                disabled={i() === props.variants.length - 1}
                aria-label="เลื่อนลง"
                title="เลื่อนลง"
                class="flex size-9 items-center justify-center rounded-card border border-border text-ink-gray hover:bg-surface-pink disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowDownIcon class="size-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(variant.id)}
                aria-label="ลบตัวเลือกนี้"
                class="flex min-h-9 items-center justify-center gap-1.5 rounded-card border border-border px-3 text-sm text-system-red hover:bg-danger-soft"
              >
                <TrashIcon class="size-4" />
                ลบ
              </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label class="flex flex-col gap-1 text-xs font-medium text-ink-gray">
                ชื่อตัวเลือก
                <input
                  value={variant.label}
                  onInput={(e) => update(variant.id, { label: e.currentTarget.value })}
                  placeholder="เช่น Coral Bloom"
                  class="h-10 rounded-card border border-border px-2.5 text-sm text-ink outline-none focus:border-brand-pink"
                />
              </label>
              <label class="flex flex-col gap-1 text-xs font-medium text-ink-gray">
                SKU
                <input
                  value={variant.sku}
                  onInput={(e) => update(variant.id, { sku: e.currentTarget.value })}
                  class="h-10 rounded-card border border-border px-2.5 text-sm text-ink outline-none focus:border-brand-pink"
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
                  class="h-10 rounded-card border border-border px-2.5 text-sm text-ink outline-none focus:border-brand-pink"
                />
              </label>
              <label class="flex flex-col gap-1 text-xs font-medium text-ink-gray">
                สต๊อก
                <input
                  type="number"
                  min="0"
                  value={variant.stock}
                  onInput={(e) => update(variant.id, { stock: Math.max(0, Number(e.currentTarget.value)) })}
                  class="h-10 rounded-card border border-border px-2.5 text-sm text-ink outline-none focus:border-brand-pink"
                />
              </label>
            </div>

            <label class="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={!!variant.soldOut}
                onChange={(e) => update(variant.id, { soldOut: e.currentTarget.checked || undefined })}
                class="size-4 accent-brand-pink"
              />
              ตัวเลือกนี้สินค้าหมด
              <span class="text-xs text-ink-gray">(หน้าร้านแสดงแต่เลือกไม่ได้ — สต๊อก 0 ก็นับว่าหมด)</span>
            </label>

            {/* 1 — Product Card shade circle: color or its own small swatch image. */}
            <div class="border-t border-dashed border-border pt-3">
              <p class="text-xs font-medium text-ink">วงสีบน Product Card</p>
              <p class="mb-2 text-[11px] text-ink-gray">วงกลมเล็กใต้ชื่อสินค้าบนการ์ด — แยกจากรูปสินค้าใน Modal</p>
              <div role="radiogroup" aria-label="รูปแบบวงสีบน Product Card" class="mb-3 inline-flex rounded-card border border-border p-1">
                <button
                  type="button"
                  role="radio"
                  aria-checked={(variant.mode ?? "color") === "color"}
                  onClick={() => setMode(variant.id, "color")}
                  class={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                    (variant.mode ?? "color") === "color" ? "bg-brand-pink text-white" : "text-ink-gray hover:text-ink"
                  }`}
                >
                  สี (Color)
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={variant.mode === "image"}
                  onClick={() => setMode(variant.id, "image")}
                  class={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                    variant.mode === "image" ? "bg-brand-pink text-white" : "text-ink-gray hover:text-ink"
                  }`}
                >
                  รูปภาพ (Image)
                </button>
              </div>

              <Show
                when={variant.mode === "image"}
                fallback={
                  <label class="flex w-40 flex-col gap-1 text-xs font-medium text-ink-gray">
                    รหัสสี (Hex Color Code)
                    <div class="flex items-center gap-2">
                      <input
                        type="color"
                        value={variant.color || "#CCCCCC"}
                        onInput={(e) => update(variant.id, { color: e.currentTarget.value })}
                        class="h-10 w-12 shrink-0 cursor-pointer rounded-card border border-border"
                      />
                      <input
                        value={variant.color || "#CCCCCC"}
                        onInput={(e) => update(variant.id, { color: e.currentTarget.value })}
                        placeholder="#FF0000"
                        class="h-10 min-w-0 flex-1 rounded-card border border-border px-2.5 text-sm text-ink outline-none focus:border-brand-pink"
                      />
                    </div>
                  </label>
                }
              >
                <div class="max-w-xs">
                  <SingleImageUploader
                    label="รูปวงสี"
                    hint="แสดงเป็นวงกลมขนาดเล็ก — แนะนำรูปสี่เหลี่ยมจัตุรัส"
                    value={variant.swatchImage ?? ""}
                    onChange={(url) => update(variant.id, { swatchImage: url || undefined })}
                  />
                </div>
              </Show>
            </div>

            {/* 2 — Product Option Modal photos: the option tile, independent of the swatch above. */}
            <div class="border-t border-dashed border-border pt-3">
              <p class="text-xs font-medium text-ink">รูปสินค้าใน Modal ตัวเลือกสินค้า</p>
              <p class="mb-2 text-[11px] text-ink-gray">รูปแรกแสดงเป็นช่องตัวเลือกสี่เหลี่ยมใน Modal และในตะกร้า</p>
              <ProductImageUploader images={variant.images ?? []} onChange={(images) => update(variant.id, { images })} />
            </div>
          </div>
        )}
      </For>
      <button
        type="button"
        onClick={add}
        class="flex min-h-11 items-center justify-center gap-2 rounded-card border border-dashed border-border text-sm font-medium text-ink-gray transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink"
      >
        <PlusIcon class="size-4" />
        เพิ่มตัวเลือกสินค้า
      </button>
    </div>
  );
}
