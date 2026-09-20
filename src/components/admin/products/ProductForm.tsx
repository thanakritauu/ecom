import { createSignal, For, Show } from "solid-js";
import type { Product } from "~/lib/types";
import type { AdminProduct, AdminProductStatus, AdminVariant, ProductFormValues } from "~/lib/adminProductStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { useAdminBrands } from "~/lib/adminBrandStore";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { ProductImageUploader } from "./ProductImageUploader";
import { ProductVariantsEditor } from "./ProductVariantsEditor";

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
  const [variants, setVariants] = createSignal<AdminVariant[]>(props.initial?.adminVariants ?? []);

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
        adminVariants: variants(),
      });
    } catch {
      setSubmitError("บันทึกสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-6">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="flex flex-col gap-6 lg:col-span-2">
          <Section title="ข้อมูลพื้นฐาน">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="ชื่อสินค้า" required value={name()} onInput={(e) => setName(e.currentTarget.value)} error={errors().name} disabled={saving()} class="sm:col-span-2" />
              <TextField label="SKU" required value={sku()} onInput={(e) => setSku(e.currentTarget.value)} error={errors().sku} disabled={saving()} />
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">แบรนด์</span>
                <select
                  value={brandId()}
                  disabled={saving()}
                  onChange={(e) => setBrandId(e.currentTarget.value)}
                  class="h-11 rounded-card border border-surface-gray bg-white px-4 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                >
                  <option value="">ไม่ระบุ</option>
                  <For each={brandStore.brands()}>{(b) => <option value={b.id}>{b.name}</option>}</For>
                </select>
              </label>
              <label class="flex flex-col gap-1.5 sm:col-span-2">
                <span class="text-sm font-medium text-ink">
                  หมวดหมู่ <span class="text-system-red">*</span>
                </span>
                <select
                  value={categoryId()}
                  disabled={saving()}
                  onChange={(e) => setCategoryId(e.currentTarget.value)}
                  class={`h-11 rounded-card border bg-white px-4 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray ${errors().category ? "border-system-red" : "border-surface-gray"}`}
                >
                  <option value="">เลือกหมวดหมู่</option>
                  <For each={categoryStore.categories()}>{(c) => <option value={c.id}>{c.name}</option>}</For>
                </select>
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
                  class="rounded-card border border-surface-gray bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                />
              </label>
            </div>
          </Section>

          <Section title="รูปภาพสินค้า (Product Gallery)">
            <ProductImageUploader images={images()} onChange={setImages} />
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
          </Section>

          <Section title="สต๊อกสินค้า">
            <div class="grid grid-cols-2 gap-4">
              <TextField label="จำนวนสต๊อก" required type="number" min="0" value={stockLeft()} onInput={(e) => setStockLeft(e.currentTarget.value)} error={errors().stock} disabled={saving()} />
              <TextField label="แจ้งเตือนเมื่อต่ำกว่า" type="number" min="0" value={lowStockThreshold()} onInput={(e) => setLowStockThreshold(e.currentTarget.value)} disabled={saving()} />
            </div>
          </Section>

          <Section title="สถานะ">
            <select
              value={status()}
              disabled={saving()}
              onChange={(e) => setStatus(e.currentTarget.value as AdminProductStatus)}
              class="h-11 w-full rounded-card border border-surface-gray bg-white px-4 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Section>
        </div>
      </div>

      <Show when={submitError()}>
        <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {submitError()}
        </p>
      </Show>

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
    <div class="flex flex-col gap-4 rounded-card bg-white p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}
