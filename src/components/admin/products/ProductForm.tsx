import { createMemo, createSignal, For, Show } from "solid-js";
import type { Product } from "~/lib/types";
import type { AdminProduct, AdminProductStatus, AdminVariant, ProductFormValues } from "~/lib/adminProductStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { useAdminBrands } from "~/lib/adminBrandStore";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { ChevronDownIcon } from "~/components/admin/icons";
import { ProductCard } from "~/components/shared/ProductCard";
import { ProductImageUploader } from "./ProductImageUploader";
import { ProductVariantsEditor } from "./ProductVariantsEditor";

function toDatetimeLocal(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultFlashSaleDatetimeLocal(): string {
  return toDatetimeLocal(Date.now() + 24 * 60 * 60 * 1000);
}

/** The storefront's `/products?category=` facet filter (Global Frontend Navigation Architecture) only ever matches these three literal values — a Category whose slug isn't one of them still saves correctly, it just isn't filterable there yet. */
const FACET_CATEGORY_SLUGS: Product["category"][] = ["eye", "cheek", "lip"];

const STATUS_OPTIONS: { value: AdminProductStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "disabled", label: "Disabled" },
];

/**
 * PART 15/16 — one shared form for both `/admin/products/new` and
 * `/admin/products/:id/edit`; the two routes only differ in `initial` data
 * and what `onSubmit` does with the result (addProduct vs updateProduct +
 * where it navigates afterward — kept out of this component on purpose).
 */
export function ProductForm(props: {
  initial?: AdminProduct;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const categoryStore = useAdminCategories();
  const brandStore = useAdminBrands();

  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [sku, setSku] = createSignal(props.initial?.sku ?? "");
  const [brandId, setBrandId] = createSignal(props.initial?.brandId ?? "");
  const [categoryId, setCategoryId] = createSignal(props.initial?.categoryId ?? "");
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const [price, setPrice] = createSignal(props.initial ? String(props.initial.price) : "");
  const [compareAtPrice, setCompareAtPrice] = createSignal(props.initial?.compareAtPrice ? String(props.initial.compareAtPrice) : "");
  const [stockLeft, setStockLeft] = createSignal(props.initial ? String(props.initial.stockLeft ?? 0) : "0");
  const [lowStockThreshold, setLowStockThreshold] = createSignal(props.initial ? String(props.initial.lowStockThreshold) : "10");
  const [status, setStatus] = createSignal<AdminProductStatus>(props.initial?.status ?? "active");
  const [images, setImages] = createSignal<string[]>(
    props.initial?.images?.length ? props.initial.images : props.initial?.image ? [props.initial.image] : [],
  );
  const [mainImage, setMainImage] = createSignal<string | undefined>(props.initial?.mainImage);
  // §8 — falls back to the Gallery's first photo whenever no explicit pin exists yet, or the pinned photo was since removed — never crashes, never silently keeps pointing at a URL that's no longer in the Gallery.
  const effectiveMainImage = () => (mainImage() && images().includes(mainImage()!) ? mainImage()! : images()[0]);
  const [variants, setVariants] = createSignal<AdminVariant[]>(props.initial?.adminVariants ?? []);
  const [flashSaleEnabled, setFlashSaleEnabled] = createSignal(!!props.initial?.flashSaleEndsAt);
  const [flashSaleEndsAtLocal, setFlashSaleEndsAtLocal] = createSignal(
    props.initial?.flashSaleEndsAt ? toDatetimeLocal(props.initial.flashSaleEndsAt) : defaultFlashSaleDatetimeLocal(),
  );

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อสินค้า";
    if (!sku().trim()) next.sku = "กรุณากรอกรหัส SKU";
    if (!categoryId()) next.category = "กรุณาเลือกหมวดหมู่";
    const priceNum = Number(price());
    if (!price().trim() || Number.isNaN(priceNum) || priceNum <= 0) next.price = "กรุณากรอกราคาที่ถูกต้อง";
    const stockNum = Number(stockLeft());
    if (stockLeft().trim() === "" || Number.isNaN(stockNum) || stockNum < 0) next.stock = "จำนวนสต๊อกต้องเป็นตัวเลขและไม่ติดลบ";
    return next;
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    setSubmitError(undefined);
    try {
      const selectedCategory = categoryStore.getById(categoryId());
      const selectedBrand = brandStore.getById(brandId());
      await props.onSubmit({
        name: name().trim(),
        sku: sku().trim(),
        brand: selectedBrand?.name ?? "",
        brandId: brandId(),
        // Legacy 3-value enum the storefront's `/products?category=` facet
        // filter matches against — only set when the picked Category's slug
        // actually is one of those three; `categoryId` is the real reference.
        category: selectedCategory && FACET_CATEGORY_SLUGS.includes(selectedCategory.slug as Product["category"]) ? (selectedCategory.slug as Product["category"]) : undefined,
        categoryId: categoryId(),
        description: description().trim() || undefined,
        price: Number(price()),
        compareAtPrice: compareAtPrice().trim() ? Number(compareAtPrice()) : undefined,
        stockLeft: Number(stockLeft()),
        lowStockThreshold: Number(lowStockThreshold()) || 10,
        status: status(),
        images: images(),
        mainImage: effectiveMainImage(),
        adminVariants: variants(),
        flashSaleEndsAt: flashSaleEnabled() ? new Date(flashSaleEndsAtLocal()).getTime() : undefined,
      });
    } catch {
      setSubmitError("บันทึกสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  /**
   * REAL-TIME LIVE PREVIEW SYSTEM §12/§13 — Preview Adapter: turns this
   * form's raw (possibly unsaved, possibly invalid mid-typing) signals into
   * the exact `Product` shape the real `ProductCard` needs, computed fresh
   * on every keystroke. Never touches `ProductCard` itself. Discount% is
   * derived from ราคาก่อนลด/ราคาขาย here (the one calculation the real
   * catalog also expresses as a plain stored percent) rather than adding a
   * separate raw-percent field the admin could set inconsistently with the
   * actual prices.
   */
  const previewProduct = createMemo<Product>(() => {
    const priceNum = Number(price()) || 0;
    const compareAtPriceNum = compareAtPrice().trim() ? Number(compareAtPrice()) : undefined;
    const discountPercent =
      compareAtPriceNum && compareAtPriceNum > priceNum && priceNum > 0 ? Math.round((1 - priceNum / compareAtPriceNum) * 100) : undefined;
    const stockLeftNum = Number(stockLeft()) || 0;
    return {
      id: props.initial?.id ?? "preview-draft",
      slug: props.initial?.slug ?? "preview-draft",
      name: name(),
      image: effectiveMainImage() ?? "",
      images: images(),
      mainImage: effectiveMainImage(),
      price: priceNum,
      compareAtPrice: compareAtPriceNum,
      discountPercent,
      // CMS + Frontend Final Refinement §6 — Live Preview must always read as
      // "in stock" (never the out-of-stock hover/badge/disabled state), no
      // matter what the real Stock field currently holds. This clamp only
      // ever touches the synthetic object handed to the preview's
      // `ProductCard` below — the real `stockLeft` signal, and the
      // `ProductFormValues.stockLeft` this form actually submits, are both
      // completely untouched (see `handleSubmit`'s own `stockLeft: Number(stockLeft())`).
      stockLeft: Math.max(stockLeftNum, 1),
      stockTotal: Math.max(props.initial?.stockTotal ?? 0, stockLeftNum, 1),
      flashSaleEndsAt: flashSaleEnabled() ? new Date(flashSaleEndsAtLocal()).getTime() : undefined,
      // The card's shade circle follows the swatch settings (color, or the
      // separate swatch image in Image mode); the variant's photos stay its
      // modal/option photos — the two are uploaded independently.
      variants:
        variants().length > 0
          ? variants().map((v) => ({
              id: v.id,
              label: v.label || "ตัวเลือก",
              color: v.color || "#CCCCCC",
              swatchImage: v.mode === "image" ? v.swatchImage : undefined,
              image: v.images[0],
            }))
          : undefined,
      rating: props.initial?.rating,
      soldCount: props.initial?.soldCount,
    };
  });

  const productForm = (
    <>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="flex flex-col gap-6 lg:col-span-2">
          <Section title="ข้อมูลพื้นฐาน">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="ชื่อสินค้า" required value={name()} onInput={(e) => setName(e.currentTarget.value)} error={errors().name} disabled={saving()} class="sm:col-span-2" />
              <TextField label="SKU" required value={sku()} onInput={(e) => setSku(e.currentTarget.value)} error={errors().sku} disabled={saving()} />
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">แบรนด์</span>
                <div class="relative">
                  <select
                    value={brandId()}
                    disabled={saving()}
                    onChange={(e) => setBrandId(e.currentTarget.value)}
                    class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                  >
                    <option value="">ไม่ระบุ</option>
                    <For each={brandStore.brands()}>{(b) => <option value={b.id}>{b.name}</option>}</For>
                  </select>
                  <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
                </div>
              </label>
              <label class="flex flex-col gap-1.5 sm:col-span-2">
                <span class="text-sm font-medium text-ink">
                  หมวดหมู่ <span class="text-system-red">*</span>
                </span>
                <div class="relative">
                  <select
                    value={categoryId()}
                    disabled={saving()}
                    onChange={(e) => setCategoryId(e.currentTarget.value)}
                    class={`h-11 w-full appearance-none rounded-card border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray ${errors().category ? "border-system-red" : "border-border"}`}
                  >
                    <option value="">เลือกหมวดหมู่</option>
                    <For each={categoryStore.categories()}>{(c) => <option value={c.id}>{c.name}</option>}</For>
                  </select>
                  <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
                </div>
                <Show when={errors().category}>
                  <p class="text-sm text-system-red">{errors().category}</p>
                </Show>
              </label>
              <label class="flex flex-col gap-1.5 sm:col-span-2">
                <span class="text-sm font-medium text-ink">คำอธิบายสินค้า</span>
                <textarea
                  value={description()}
                  disabled={saving()}
                  onInput={(e) => setDescription(e.currentTarget.value)}
                  rows={4}
                  class="rounded-card border border-border bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                />
              </label>
            </div>
          </Section>

          <Section title="รูปภาพสินค้า (Product Gallery)">
            <ProductImageUploader images={images()} onChange={setImages} maxImages={10} mainImage={effectiveMainImage()} onSetMain={setMainImage} />
          </Section>

          <Section title="ตัวเลือกสินค้า (Variants)">
            <ProductVariantsEditor variants={variants()} onChange={setVariants} />
          </Section>
        </div>

        <div class="flex flex-col gap-6">
          <Section title="ราคา">
            <div class="grid grid-cols-2 gap-4">
              <TextField label="ราคาขาย" required type="number" min="0" value={price()} onInput={(e) => setPrice(e.currentTarget.value)} error={errors().price} disabled={saving()} />
              <TextField label="ราคาก่อนลด" type="number" min="0" value={compareAtPrice()} onInput={(e) => setCompareAtPrice(e.currentTarget.value)} disabled={saving()} />
            </div>
            <Show when={previewProduct().discountPercent}>
              <p class="text-xs text-ink-gray">
                ป้ายส่วนลดที่จะแสดง: <span class="font-semibold text-system-red">-{previewProduct().discountPercent}%</span> (คำนวณจากราคาก่อนลด/ราคาขาย)
              </p>
            </Show>
          </Section>

          <Section title="แฟลชเซล">
            <label class="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={flashSaleEnabled()}
                disabled={saving()}
                onChange={(e) => setFlashSaleEnabled(e.currentTarget.checked)}
                class="size-4 accent-brand-pink"
              />
              เปิดใช้งานแฟลชเซลสำหรับสินค้านี้
            </label>
            <Show when={flashSaleEnabled()}>
              <label class="mt-3 flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">สิ้นสุดเวลา</span>
                <input
                  type="datetime-local"
                  value={flashSaleEndsAtLocal()}
                  disabled={saving()}
                  onInput={(e) => setFlashSaleEndsAtLocal(e.currentTarget.value)}
                  class="h-11 w-full rounded-card border border-border bg-surface-card px-4 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                />
              </label>
            </Show>
          </Section>

          <Section title="สต๊อกสินค้า">
            <div class="grid grid-cols-2 gap-4">
              <TextField label="จำนวนสต๊อก" required type="number" min="0" value={stockLeft()} onInput={(e) => setStockLeft(e.currentTarget.value)} error={errors().stock} disabled={saving()} />
              <TextField label="แจ้งเตือนเมื่อต่ำกว่า" type="number" min="0" value={lowStockThreshold()} onInput={(e) => setLowStockThreshold(e.currentTarget.value)} disabled={saving()} />
            </div>
          </Section>

          <Section title="สถานะ">
            <div class="relative">
              <select
                value={status()}
                disabled={saving()}
                onChange={(e) => setStatus(e.currentTarget.value as AdminProductStatus)}
                class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
            </div>
          </Section>
        </div>
      </div>

      <Show when={submitError()}>
        <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {submitError()}
        </p>
      </Show>
    </>
  );

  const productPreview = (
    <Show
      when={images().length > 0}
      fallback={<p class="p-4 text-sm text-ink-gray sm:p-5">อัปโหลดรูปสินค้าอย่างน้อย 1 รูปเพื่อดูตัวอย่าง Product Card</p>}
    >
      <div class="p-4 sm:p-5">
        <ProductCard product={previewProduct()} />
      </div>
    </Show>
  );

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-6">
      <AdminFormPreviewLayout form={productForm} preview={productPreview} />

      {/* Save is exactly the kind of "should always be reachable" action
          Global Admin UX Rule #1 calls out by name — this form can run
          several screens long, so Save/Cancel float at the viewport bottom
          instead of requiring a scroll back down. */}
      <AdminFloatingBar>
        <div class="flex w-full justify-end gap-3">
          <Button type="button" variant="outline" onClick={props.onCancel} disabled={saving()}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" loading={saving()}>
            {saving() ? "กำลังบันทึก..." : props.submitLabel}
          </Button>
        </div>
      </AdminFloatingBar>
      {/* Reserves room so the floating bar above never covers the form's own last field. */}
      <div class="h-16" aria-hidden="true" />
    </form>
  );
}

function Section(props: { title: string; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}
