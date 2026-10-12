import { createEffect, createMemo, createSignal, For, on, Show, type JSX } from "solid-js";
import type { Product } from "~/lib/types";
import { isVideoMedia, mediaImage, type MediaValue } from "~/lib/media";
import { getDiscountPercent } from "~/lib/products";
import { flashSaleSummary } from "~/lib/flashSalePricing";
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
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { DraftPublishActions } from "~/components/admin/DraftPublishActions";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { ChevronDownIcon } from "~/components/admin/icons";
import { Toggle } from "~/components/admin/Toggle";
import { ProductCard } from "~/components/shared/ProductCard";
import { ProductImageUploader } from "./ProductImageUploader";
import { ProductVariantsEditor } from "./ProductVariantsEditor";
import { ProductTiktokClips } from "./ProductTiktokClips";
import { RichTextEditor } from "~/components/admin/RichTextEditor";
import { RichTextContent } from "~/components/shared/RichTextContent";
import { FormErrorSummary } from "~/components/admin/FormErrorSummary";
import { clearFieldError, reportFormErrors, type FormErrors } from "~/lib/adminFormValidation";
import { isRichTextEmpty } from "~/lib/richText";
import { useAdminTiktokClips } from "~/lib/adminTiktokClips";

/** Optional number field → `undefined` when blank (so the card hides that row), otherwise the number. */
const optionalNumber = (raw: string) => (raw.trim() === "" || Number.isNaN(Number(raw)) ? undefined : Number(raw));

/** Once a product has gone on sale it's either on or off; "แบบร่าง" is only the state before its first publish. */
const STATUS_OPTIONS: { value: AdminProductStatus; label: string }[] = (["active", "disabled"] as const).map((value) => ({
  value,
  label: ADMIN_PRODUCT_STATUS_META[value].label,
}));

/** Field names for the "ยังกรอกข้อมูลไม่ครบ" toast and summary (`~/lib/adminFormValidation`). */
const LABELS: Record<string, string> = {
  name: "ชื่อสินค้า",
  sku: "SKU",
  category: "หมวดหมู่",
  images: "รูปสินค้า",
  description: "รายละเอียดสินค้า",
  price: "ราคาขาย",
  compareAtPrice: "ราคาก่อนลด",
  stock: "จำนวนสต๊อก",
  rating: "คะแนนรีวิว",
};

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
  const [rating, setRating] = createSignal(props.initial?.rating !== undefined ? String(props.initial.rating) : "");
  const [soldCount, setSoldCount] = createSignal(props.initial?.soldCount !== undefined ? String(props.initial.soldCount) : "");
  const [reviewCount, setReviewCount] = createSignal(props.initial?.reviewCount !== undefined ? String(props.initial.reviewCount) : "");
  const [status, setStatus] = createSignal<AdminProductStatus>(props.initial?.status ?? "active");
  /**
   * New products and products still in แบบร่าง get two actions: "บันทึกแบบร่าง"
   * (only the name is needed, never shown on the storefront) and "บันทึกและเผยแพร่"
   * (full checks, goes live). A product that has been on sale just saves, with
   * the เปิดขาย / ปิดขาย status picker.
   */
  const draftFlow = !props.initial || props.initial.status === "draft";
  // Gallery items (images and videos, `~/lib/media`); `images` is the still-image twin every card/list reads (a video counts as its poster).
  const [media, setMedia] = createSignal<MediaValue[]>(
    props.initial?.media?.length ? props.initial.media : props.initial?.images?.length ? props.initial.images : props.initial?.image ? [props.initial.image] : [],
  );
  const images = () => media().map(mediaImage).filter(Boolean);
  const [mainImage, setMainImage] = createSignal<string | undefined>(props.initial?.mainImage);
  // §8 — falls back to the Gallery's first photo whenever no explicit pin exists yet, or the pinned photo was since removed — never crashes, never silently keeps pointing at a URL that's no longer in the Gallery.
  const effectiveMainImage = () => (mainImage() && images().includes(mainImage()!) ? mainImage()! : images()[0]);
  const [variants, setVariants] = createSignal<AdminVariant[]>(props.initial?.adminVariants ?? []);
  // Flash sale (prices, limits, timing) is managed on the Flash Sale page; this form only shows a summary.
  const inFlashSale = () => !!props.initial && (props.initial.flashSaleEndsAt !== undefined || !!props.initial.flashSaleDaily);
  const [showDiscountBadge, setShowDiscountBadge] = createSignal(props.initial?.showDiscountBadge !== false);
  // Clips this product's PDP shows first; written to the clips on save (`setProductTiktokClips`, see the routes).
  const clipStore = useAdminTiktokClips();
  const [tiktokClipIds, setTiktokClipIds] = createSignal<string[]>(props.initial ? clipStore.clipsForProduct(props.initial.id).map((c) => c.id) : []);
  // The clip store reads localStorage on mount; pick up the stored links once it has (until the admin edits the list).
  let clipsTouched = false;
  createEffect(
    on(clipStore.clips, () => {
      if (!clipsTouched && props.initial) setTiktokClipIds(clipStore.clipsForProduct(props.initial.id).map((c) => c.id));
    }),
  );

  const [errors, setErrors] = createSignal<FormErrors>({});
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();
  /** Setter that also drops that field's error once the admin edits it. */
  const fix = (...keys: string[]) => setErrors((e) => keys.reduce(clearFieldError, e));

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อสินค้า";
    if (!sku().trim()) next.sku = "กรุณากรอกรหัส SKU";
    if (!categoryId()) next.category = "กรุณาเลือกหมวดหมู่";
    if (images().length === 0) next.images = "กรุณาอัปโหลดรูปสินค้าอย่างน้อย 1 รูป";
    else if (media().some((m) => isVideoMedia(m) && !m.poster)) next.images = "วิดีโอทุกตัวในแกลเลอรีต้องมีภาพปก";
    if (isRichTextEmpty(description())) next.description = "กรุณากรอกรายละเอียดสินค้า";
    const priceNum = Number(price());
    if (!price().trim() || Number.isNaN(priceNum) || priceNum <= 0) next.price = "กรุณากรอกราคาที่ถูกต้อง";
    const compareNum = optionalNumber(compareAtPrice());
    if (compareAtPrice().trim() && (compareNum === undefined || compareNum < 0)) next.compareAtPrice = "กรุณากรอกราคาก่อนลดที่ถูกต้อง";
    const stockNum = Number(stockLeft());
    if (stockLeft().trim() === "" || Number.isNaN(stockNum) || stockNum < 0) next.stock = "จำนวนสต๊อกต้องเป็นตัวเลขและไม่ติดลบ";
    const ratingNum = optionalNumber(rating());
    if (ratingNum !== undefined && (ratingNum < 0 || ratingNum > 5)) next.rating = "คะแนนต้องอยู่ระหว่าง 0-5";
    return next;
  };

  /** "บันทึกแบบร่าง": just a name, plus anything typed in must still be valid (e.g. no text in a number field). */
  const validateDraft = (): FormErrors => {
    const full = validate();
    const next: FormErrors = {};
    if (full.name) next.name = full.name;
    if (price().trim() && full.price) next.price = full.price;
    if (stockLeft().trim() && full.stock) next.stock = full.stock;
    for (const key of ["compareAtPrice", "rating"]) if (full[key]) next[key] = full[key];
    if (full.images && images().length > 0) next.images = full.images;
    return next;
  };

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    // Draft flow's primary action puts it on sale; otherwise keep the picked เปิดขาย / ปิดขาย.
    void save(draftFlow ? "active" : status());
  };

  const save = async (nextStatus: AdminProductStatus) => {
    const validationErrors = nextStatus === "draft" ? validateDraft() : validate();
    setErrors(validationErrors);
    if (reportFormErrors(validationErrors, LABELS)) return;

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
        description: description() || undefined,
        price: Number(price()),
        compareAtPrice: compareAtPrice().trim() ? Number(compareAtPrice()) : undefined,
        showDiscountBadge: showDiscountBadge(),
        stockLeft: Number(stockLeft()),
        lowStockThreshold: optionalNumber(lowStockThreshold()) ?? LOW_STOCK_THRESHOLD,
        status: nextStatus,
        images: images(),
        mainImage: effectiveMainImage(),
        media: media().some(isVideoMedia) ? media() : undefined,
        adminVariants: variants(),
        rating: optionalNumber(rating()),
        soldCount: optionalNumber(soldCount()),
        reviewCount: optionalNumber(reviewCount()),
        tiktokClipIds: tiktokClipIds(),
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
      showDiscountBadge: showDiscountBadge() ? undefined : false,
      // CMS + Frontend Final Refinement §6 — Live Preview must always read as
      // "in stock" (never the out-of-stock hover/badge/disabled state), no
      // matter what the real Stock field currently holds. This clamp only
      // ever touches the synthetic object handed to the preview's
      // `ProductCard` below — the real `stockLeft` signal, and the
      // `ProductFormValues.stockLeft` this form actually submits, are both
      // completely untouched (see `handleSubmit`'s own `stockLeft: Number(stockLeft())`).
      stockLeft: Math.max(stockLeftNum, 1),
      stockTotal: Math.max(props.initial?.stockTotal ?? 0, stockLeftNum, 1),
      flashSaleEndsAt: inFlashSale() ? props.initial?.flashSaleEndsAt : undefined,
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

  const inputClass = (error?: string) =>
    `h-11 w-full rounded-card border bg-surface-card px-4 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray ${error ? "border-system-red" : "border-border"}`;

  const productForm = (
    <>
      <FormErrorSummary errors={errors()} labels={LABELS} />

      <Section title="ข้อมูลพื้นฐาน">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <TextField
              label="ชื่อสินค้า"
              required
              data-field="name"
              class="w-full"
              value={name()}
              onInput={(e) => {
                setName(e.currentTarget.value);
                fix("name");
              }}
              error={errors().name}
              disabled={saving()}
            />
          </div>
          <TextField
            label="SKU"
            required
            data-field="sku"
            value={sku()}
            onInput={(e) => {
              setSku(e.currentTarget.value);
              fix("sku");
            }}
            error={errors().sku}
            disabled={saving()}
          />
          <div class="flex flex-col gap-1.5" data-field="category">
            <label for="product-category" class="text-sm font-medium text-ink">
              หมวดหมู่ <span class="text-system-red" aria-hidden="true">*</span>
            </label>
            <div class="relative">
              <select
                id="product-category"
                value={categoryId()}
                disabled={saving()}
                aria-required="true"
                aria-invalid={!!errors().category}
                onChange={(e) => {
                  setCategoryId(e.currentTarget.value);
                  fix("category");
                }}
                class={`${inputClass(errors().category)} appearance-none pr-9`}
              >
                <option value="">เลือกหมวดหมู่</option>
                <For each={categoryStore.categories()}>{(c) => <option value={c.id}>{c.name}</option>}</For>
              </select>
              <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
            </div>
            <Show when={errors().category}>
              <p class="text-sm text-system-red">{errors().category}</p>
            </Show>
          </div>
          <Show
            when={!draftFlow}
            fallback={
              <p class="text-xs text-ink-gray sm:col-span-2">
                {props.initial ? "สินค้านี้ยังเป็นแบบร่าง ไม่แสดงบนหน้าร้าน" : "บันทึกแบบร่างไว้ก่อนได้ แล้วกด บันทึกและเผยแพร่ เมื่อข้อมูลครบ"}
              </p>
            }
          >
          <div class="flex flex-col gap-1.5 sm:col-span-2">
              <label for="product-status" class="text-sm font-medium text-ink">
                สถานะ
              </label>
              <div class="relative">
                <select
                  id="product-status"
                  value={status()}
                  disabled={saving()}
                  onChange={(e) => setStatus(e.currentTarget.value as AdminProductStatus)}
                  class={`${inputClass()} appearance-none pr-9`}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
              </div>
              <p class="text-xs text-ink-gray">{STATUS_HINT[status()]}</p>
            </div>
          </Show>
        </div>
      </Section>

      <Section title="รูปภาพและวิดีโอสินค้า" required>
        <div data-field="images" class="flex flex-col gap-2">
          <ProductImageUploader
            allowVideo
            images={media()}
            onChange={(next) => {
              setMedia(next);
              fix("images");
            }}
            maxImages={10}
            mainImage={effectiveMainImage()}
            onSetMain={setMainImage}
          />
          <Show when={errors().images}>
            <p role="alert" class="text-sm text-system-red">
              {errors().images}
            </p>
          </Show>
        </div>
      </Section>

      <Section title="รายละเอียดสินค้า" required>
        <RichTextEditor
          field="description"
          value={description()}
          onChange={(html) => {
            setDescription(html);
            if (!isRichTextEmpty(html)) fix("description");
          }}
          error={errors().description}
          disabled={saving()}
          placeholder="เล่าจุดเด่น วิธีใช้ ส่วนผสม แทรกรูปประกอบระหว่างข้อความได้"
          hint="แสดงในส่วน รายละเอียดสินค้า ของหน้าสินค้า ข้อความช่วงต้นใช้เป็นคำโปรยใต้ชื่อสินค้าด้วย"
          minHeightClass="min-h-[240px]"
        />
      </Section>

      <Section title="ราคา">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="ราคาขาย"
            required
            type="number"
            min="0"
            data-field="price"
            value={price()}
            onInput={(e) => {
              setPrice(e.currentTarget.value);
              fix("price");
            }}
            error={errors().price}
            disabled={saving()}
          />
          <TextField
            label="ราคาก่อนลด"
            type="number"
            min="0"
            data-field="compareAtPrice"
            value={compareAtPrice()}
            onInput={(e) => {
              setCompareAtPrice(e.currentTarget.value);
              fix("compareAtPrice");
            }}
            error={errors().compareAtPrice}
            disabled={saving()}
          />
        </div>
        <ToggleRow
          title="แสดงป้ายลดราคา"
          hint={
            previewProduct().discountPercent
              ? `ป้าย "ลด ${previewProduct().discountPercent}%" บนการ์ดและหน้าสินค้า คำนวณจากราคาก่อนลดและราคาขาย ถ้าปิด ราคาก่อนลดแบบขีดฆ่ายังแสดงอยู่`
              : "ป้ายจะขึ้นเมื่อราคาก่อนลดสูงกว่าราคาขาย ถ้าปิด ราคาก่อนลดแบบขีดฆ่ายังแสดงอยู่"
          }
        >
          <Toggle checked={showDiscountBadge()} onChange={setShowDiscountBadge} onLabel="แสดง" offLabel="ไม่แสดง" disabled={saving()} />
        </ToggleRow>
      </Section>

      <Section title="ตัวเลือกสินค้า">
        <ProductVariantsEditor variants={variants()} onChange={setVariants} />
      </Section>

      <Section title="สต๊อกสินค้า">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="จำนวนสต๊อก"
            required
            type="number"
            min="0"
            data-field="stock"
            value={stockLeft()}
            onInput={(e) => {
              setStockLeft(e.currentTarget.value);
              fix("stock");
            }}
            error={errors().stock}
            disabled={saving()}
          />
          <TextField label="ใกล้หมดเมื่อเหลือ" type="number" min="0" value={lowStockThreshold()} onInput={(e) => setLowStockThreshold(e.currentTarget.value)} disabled={saving()} />
        </div>
        <p class="text-xs text-ink-gray">เมื่อสต๊อกเหลือไม่เกิน {optionalNumber(lowStockThreshold()) ?? LOW_STOCK_THRESHOLD} ชิ้น ตะกร้าจะขึ้นป้าย "เหลือ X ชิ้นสุดท้าย"</p>
      </Section>

      <Show when={props.initial}>
        {(product) => (
          <Section title="แฟลชเซล">
            <p class="text-sm text-ink">{inFlashSale() ? flashSaleSummary(product()) : "ไม่ได้อยู่ในแฟลชเซล"}</p>
            <p class="text-xs text-ink-gray">ราคาแฟลชเซล จำนวนจำกัด และเวลา ตั้งแยกจากราคาขายปกติ ราคาขายด้านบนไม่เปลี่ยน</p>
            <a href="/admin/marketing/flash-sale" class="self-start text-sm font-medium text-brand-pink underline decoration-from-font">
              จัดการที่หน้าแฟลชเซล
            </a>
          </Section>
        )}
      </Show>

      <Section title="คลิปรีวิว TikTok">
        <ProductTiktokClips
          value={tiktokClipIds()}
          onChange={(ids) => {
            clipsTouched = true;
            setTiktokClipIds(ids);
          }}
          disabled={saving()}
        />
      </Section>

      <Section title="คะแนนและยอดขาย">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            label="คะแนนรีวิว"
            type="number"
            min="0"
            max="5"
            step="0.1"
            data-field="rating"
            value={rating()}
            onInput={(e) => {
              setRating(e.currentTarget.value);
              fix("rating");
            }}
            error={errors().rating}
            disabled={saving()}
          />
          <TextField label="ขายแล้ว (ชิ้น)" type="number" min="0" value={soldCount()} onInput={(e) => setSoldCount(e.currentTarget.value)} disabled={saving()} />
          <TextField label="จำนวนรีวิว" type="number" min="0" value={reviewCount()} onInput={(e) => setReviewCount(e.currentTarget.value)} disabled={saving()} />
        </div>
        <p class="text-xs text-ink-gray">แสดงบนการ์ดสินค้า ถ้าเว้นว่างจะไม่แสดงแถวคะแนนและยอดขาย</p>
      </Section>

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
      {/* Card at about its storefront size, centred in the (wider) preview column. */}
      <div class="mx-auto w-full max-w-[300px] p-4 sm:p-5">
        <ProductCard product={previewProduct()} flashSale={inFlashSale()} />
      </div>
      <Show when={!isRichTextEmpty(description())}>
        <div class="flex flex-col gap-3 border-t border-border p-4 sm:p-5">
          <p class="text-sm font-semibold text-ink">รายละเอียดสินค้า</p>
          <RichTextContent value={description()} class="text-sm" />
        </div>
      </Show>
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
        <DraftPublishActions
          draft={draftFlow}
          saving={saving()}
          onCancel={props.onCancel}
          onSaveDraft={() => void save("draft")}
          onPublish={() => void save("active")}
          onSave={() => void save(status())}
        />
      </AdminFloatingBar>
      {/* Reserves room so the floating bar above never covers the form's own last field. */}
      <div class="h-16" aria-hidden="true" />
    </form>
  );
}

function Section(props: { title: string; required?: boolean; children: JSX.Element }) {
  return (
    <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">
        {props.title}
        <Show when={props.required}>
          <span class="text-system-red" aria-hidden="true">
            {" "}
            *
          </span>
        </Show>
      </h2>
      {props.children}
    </div>
  );
}

function ToggleRow(props: { title: string; hint: string; children: JSX.Element }) {
  return (
    <div class="flex items-center justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm font-medium text-ink">{props.title}</p>
        <p class="text-xs leading-[1.75] text-ink-gray">{props.hint}</p>
      </div>
      <div class="shrink-0">{props.children}</div>
    </div>
  );
}
