import { createMemo, createSignal, For, Show } from "solid-js";
import type { Product } from "~/lib/types";
import { isVideoMedia, mediaImage, type MediaValue } from "~/lib/media";
import { flashSaleRoundEndsAt, getDiscountPercent } from "~/lib/products";
import {
  ADMIN_PRODUCT_STATUS_META,
  LOW_STOCK_THRESHOLD,
  STOREFRONT_CATEGORY_SLUGS,
  type AdminProduct,
  type AdminProductStatus,
  type AdminVariant,
  type ProductFormValues,
} from "~/lib/adminProductStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { ChevronDownIcon } from "~/components/admin/icons";
import { Toggle } from "~/components/admin/Toggle";
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

/** Optional number field → `undefined` when blank (so the card hides that row), otherwise the number. */
const optionalNumber = (raw: string) => (raw.trim() === "" || Number.isNaN(Number(raw)) ? undefined : Number(raw));

const STATUS_OPTIONS: { value: AdminProductStatus; label: string }[] = (["active", "draft", "disabled"] as const).map((value) => ({
  value,
  label: ADMIN_PRODUCT_STATUS_META[value].label,
}));

const STATUS_HINT: Record<AdminProductStatus, string> = {
  active: "แสดงบนหน้าร้านและลูกค้าสั่งซื้อได้",
  draft: "ยังไม่แสดงบนหน้าร้าน",
  disabled: "ซ่อนจากหน้าร้านทุกหน้า รวมถึงตะกร้าของลูกค้า",
};

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

  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [sku, setSku] = createSignal(props.initial?.sku ?? "");
  const [categoryId, setCategoryId] = createSignal(props.initial?.categoryId ?? "");
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const [price, setPrice] = createSignal(props.initial ? String(props.initial.price) : "");
  const [compareAtPrice, setCompareAtPrice] = createSignal(props.initial?.compareAtPrice ? String(props.initial.compareAtPrice) : "");
  const [stockLeft, setStockLeft] = createSignal(props.initial ? String(props.initial.stockLeft ?? 0) : "0");
  const [lowStockThreshold, setLowStockThreshold] = createSignal(props.initial ? String(props.initial.lowStockThreshold) : String(LOW_STOCK_THRESHOLD));
  const [stockTotal, setStockTotal] = createSignal(props.initial?.stockTotal !== undefined ? String(props.initial.stockTotal) : "");
  const [rating, setRating] = createSignal(props.initial?.rating !== undefined ? String(props.initial.rating) : "");
  const [soldCount, setSoldCount] = createSignal(props.initial?.soldCount !== undefined ? String(props.initial.soldCount) : "");
  const [reviewCount, setReviewCount] = createSignal(props.initial?.reviewCount !== undefined ? String(props.initial.reviewCount) : "");
  const [status, setStatus] = createSignal<AdminProductStatus>(props.initial?.status ?? "active");
  // Gallery items (images and videos, `~/lib/media`); `images` is the still-image twin every card/list reads (a video counts as its poster).
  const [media, setMedia] = createSignal<MediaValue[]>(
    props.initial?.media?.length ? props.initial.media : props.initial?.images?.length ? props.initial.images : props.initial?.image ? [props.initial.image] : [],
  );
  const images = () => media().map(mediaImage).filter(Boolean);
  const [mainImage, setMainImage] = createSignal<string | undefined>(props.initial?.mainImage);
  // §8 — falls back to the Gallery's first photo whenever no explicit pin exists yet, or the pinned photo was since removed — never crashes, never silently keeps pointing at a URL that's no longer in the Gallery.
  const effectiveMainImage = () => (mainImage() && images().includes(mainImage()!) ? mainImage()! : images()[0]);
  const [variants, setVariants] = createSignal<AdminVariant[]>(props.initial?.adminVariants ?? []);
  const [flashSaleEnabled, setFlashSaleEnabled] = createSignal(!!props.initial?.flashSaleEndsAt);
  // New Flash Sale products default to the storefront's daily round; a product with a saved one-off end time keeps it.
  const [flashSaleDaily, setFlashSaleDaily] = createSignal(props.initial?.flashSaleEndsAt ? !!props.initial.flashSaleDaily : true);
  const flashSaleEndsAtValue = () =>
    !flashSaleEnabled() ? undefined : flashSaleDaily() ? flashSaleRoundEndsAt() : new Date(flashSaleEndsAtLocal()).getTime();
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
    const ratingNum = optionalNumber(rating());
    if (ratingNum !== undefined && (ratingNum < 0 || ratingNum > 5)) next.rating = "คะแนนต้องอยู่ระหว่าง 0-5";
    const totalNum = optionalNumber(stockTotal());
    if (flashSaleEnabled() && totalNum !== undefined && totalNum < stockNum) next.stockTotal = "จำนวนทั้งหมดต้องไม่น้อยกว่าสต๊อกคงเหลือ";
    if (media().some((m) => isVideoMedia(m) && !m.poster)) next.images = "วิดีโอทุกตัวในแกลเลอรีต้องมีภาพปก";
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
      await props.onSubmit({
        name: name().trim(),
        sku: sku().trim(),
        // The slug the storefront filters/menus by (cushion, lip, cheek, eye,
        // skincare, suncare-bodycare) — only set when the picked Category's
        // slug is one of those; `categoryId` is the real reference.
        category: STOREFRONT_CATEGORY_SLUGS.find((slug) => slug === selectedCategory?.slug),
        categoryId: categoryId(),
        description: description().trim() || undefined,
        price: Number(price()),
        compareAtPrice: compareAtPrice().trim() ? Number(compareAtPrice()) : undefined,
        stockLeft: Number(stockLeft()),
        lowStockThreshold: optionalNumber(lowStockThreshold()) ?? LOW_STOCK_THRESHOLD,
        status: status(),
        images: images(),
        mainImage: effectiveMainImage(),
        media: media().some(isVideoMedia) ? media() : undefined,
        adminVariants: variants(),
        flashSaleEndsAt: flashSaleEndsAtValue(),
        flashSaleDaily: flashSaleEnabled() && flashSaleDaily(),
        stockTotal: optionalNumber(stockTotal()),
        rating: optionalNumber(rating()),
        soldCount: optionalNumber(soldCount()),
        reviewCount: optionalNumber(reviewCount()),
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
    // Same rule the card itself uses (and what the store saves) — one discount formula.
    const discountPercent = getDiscountPercent({ price: priceNum, compareAtPrice: compareAtPriceNum });
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
      stockTotal: Math.max(optionalNumber(stockTotal()) ?? props.initial?.stockTotal ?? 0, stockLeftNum, 1),
      flashSaleEndsAt: flashSaleEndsAtValue(),
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
              soldOut: v.soldOut || v.stock <= 0 || undefined,
            }))
          : undefined,
      rating: optionalNumber(rating()),
      soldCount: optionalNumber(soldCount()),
      reviewCount: optionalNumber(reviewCount()),
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

          <Section title="รูปภาพและวิดีโอสินค้า">
            <ProductImageUploader allowVideo images={media()} onChange={setMedia} maxImages={10} mainImage={effectiveMainImage()} onSetMain={setMainImage} />
            <Show when={errors().images}>
              <p class="text-sm text-system-red">{errors().images}</p>
            </Show>
          </Section>

          <Section title="ตัวเลือกสินค้า">
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
                ป้ายส่วนลดบนการ์ดสินค้า <span class="font-semibold text-system-red">-{previewProduct().discountPercent}%</span> คำนวณจากราคาก่อนลดและราคาขาย
              </p>
            </Show>
          </Section>

          <Section title="แฟลชเซล">
            <label class="flex flex-col gap-1.5">
              <span class="text-sm font-medium text-ink">แสดงในแฟลชเซล</span>
              <Toggle checked={flashSaleEnabled()} onChange={setFlashSaleEnabled} onLabel="แสดง" offLabel="ไม่แสดง" disabled={saving()} />
              <span class="text-xs text-ink-gray">สินค้าจะขึ้นในส่วนแฟลชเซลหน้าแรกพร้อมเวลานับถอยหลัง ในราคาขายด้านบน</span>
            </label>
            <Show when={flashSaleEnabled()}>
              <TextField
                label="จำนวนทั้งหมดของแฟลชเซล"
                type="number"
                min="0"
                value={stockTotal()}
                placeholder={String(Math.max(props.initial?.stockTotal ?? 0, Number(stockLeft()) || 0))}
                onInput={(e) => setStockTotal(e.currentTarget.value)}
                error={errors().stockTotal}
                disabled={saving()}
              />
              <p class="-mt-2 text-xs text-ink-gray">แถบบนการ์ดแสดงสต๊อกคงเหลือเทียบกับจำนวนนี้</p>
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">รอบรายวัน</span>
                <Toggle checked={flashSaleDaily()} onChange={setFlashSaleDaily} disabled={saving()} />
                <span class="text-xs text-ink-gray">จบตอนเที่ยงคืนและเริ่มรอบใหม่ทุกวัน ถ้าปิดต้องกำหนดเวลาสิ้นสุดเอง</span>
              </label>
              <Show when={!flashSaleDaily()}>
                <label class="flex flex-col gap-1.5">
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
            </Show>
          </Section>

          <Section title="สต๊อกสินค้า">
            <div class="grid grid-cols-2 gap-4">
              <TextField label="จำนวนสต๊อก" required type="number" min="0" value={stockLeft()} onInput={(e) => setStockLeft(e.currentTarget.value)} error={errors().stock} disabled={saving()} />
              <TextField label="ใกล้หมดเมื่อเหลือ" type="number" min="0" value={lowStockThreshold()} onInput={(e) => setLowStockThreshold(e.currentTarget.value)} disabled={saving()} />
            </div>
            <p class="text-xs text-ink-gray">เมื่อสต๊อกเหลือไม่เกิน {optionalNumber(lowStockThreshold()) ?? LOW_STOCK_THRESHOLD} ชิ้น ตะกร้าจะขึ้นป้าย "เหลือ X ชิ้นสุดท้าย"</p>
          </Section>

          <Section title="คะแนนและยอดขาย">
            <div class="grid grid-cols-3 gap-4">
              <TextField label="คะแนนรีวิว" type="number" min="0" max="5" step="0.1" value={rating()} onInput={(e) => setRating(e.currentTarget.value)} error={errors().rating} disabled={saving()} />
              <TextField label="ขายแล้ว (ชิ้น)" type="number" min="0" value={soldCount()} onInput={(e) => setSoldCount(e.currentTarget.value)} disabled={saving()} />
              <TextField label="จำนวนรีวิว" type="number" min="0" value={reviewCount()} onInput={(e) => setReviewCount(e.currentTarget.value)} disabled={saving()} />
            </div>
            <p class="text-xs text-ink-gray">แสดงบนการ์ดสินค้า ถ้าเว้นว่างจะไม่แสดงแถวคะแนนและยอดขาย</p>
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
            <p class="text-xs text-ink-gray">{STATUS_HINT[status()]}</p>
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
      fallback={<p class="p-4 text-sm text-ink-gray sm:p-5">อัปโหลดรูปสินค้าอย่างน้อย 1 รูปเพื่อดูตัวอย่างการ์ดสินค้า</p>}
    >
      <div class="p-4 sm:p-5">
        <ProductCard product={previewProduct()} flashSale={flashSaleEnabled()} />
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
