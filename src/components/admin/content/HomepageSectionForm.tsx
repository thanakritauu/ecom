import { For, Show } from "solid-js";
import { ChevronDownIcon } from "~/components/admin/icons";
import { TextField } from "~/components/shared/TextField";
import { BannerUploader } from "./BannerUploader";
import { HeroAssetsEditor } from "./HeroAssetsEditor";
import { DestinationSelector, destinationError } from "./DestinationSelector";
import { ProductSkuPicker } from "~/components/admin/ProductSkuPicker";
import { HOMEPAGE_PRODUCT_SOURCE_META, type HomepageContentLayout, type HomepageProductSource, type HomepageSection } from "~/lib/adminHomepage";
import { BUILTIN_SECTION_META, isBuiltinSectionType, validateHeroAssets, type BuiltinSectionType } from "~/lib/pageSections";
import { Toggle } from "~/components/admin/Toggle";
import { mediaErrors } from "~/lib/media";
import type { FormErrors } from "~/lib/adminFormValidation";
import { useAdminCollections } from "~/lib/adminCollectionStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";

/**
 * Product Section — Product Source Rule (§4/§22) — "เลือกสินค้าเอง" (manual)
 * is deliberately left out of this list: a Product Section may only ever
 * source from a Collection, a Category, or a Dynamic rule. `"manual"` still
 * exists as a value (`HomepageProductSource`, `HOMEPAGE_PRODUCT_SOURCE_META`)
 * purely so a section saved before this rule existed still renders and can
 * be *migrated away from* — see the hint shown below when one is open in the
 * editor — never as something a new/other section can be switched into.
 */
const PRODUCT_SOURCE_OPTIONS: { value: HomepageProductSource; label: string }[] = Object.entries(HOMEPAGE_PRODUCT_SOURCE_META)
  .filter(([value]) => value !== "manual")
  .map(([value, meta]) => ({ value: value as HomepageProductSource, label: meta.label }));

const CONTENT_LAYOUT_OPTIONS: { value: HomepageContentLayout; label: string }[] = [
  { value: "image-text", label: "รูปซ้าย ข้อความขวา" },
  { value: "text-image", label: "ข้อความซ้าย รูปขวา" },
  { value: "full-width", label: "เต็มความกว้าง" },
];

/**
 * What one section still needs before it can show on the storefront, keyed
 * by field (`name`, `slides`, `banner`, `collectionId`, `categoryId`,
 * `products`, `ctaLabel`, `ctaDestination`). The Landing Page form runs this
 * for every enabled section when the page goes live.
 */
export function sectionFieldErrors(section: HomepageSection): FormErrors {
  const e: FormErrors = {};
  // Built-in blocks pull their own data; the heading override is optional, so there is nothing to fill in.
  if (isBuiltinSectionType(section.type)) return e;
  if (!section.name.trim()) e.name = "กรุณากรอกชื่อส่วน";
  if (section.type === "hero") {
    const slideErrors = validateHeroAssets(section.assets);
    if (slideErrors.length > 0) e.slides = slideErrors.join(", ");
    else if (section.assets.length === 0 && !section.banners.desktop) e.slides = "กรุณาเพิ่มสไลด์แบนเนอร์ หรืออัปโหลดแบนเนอร์เดสก์ท็อป";
  }
  if (section.type === "promotion_banner" || section.type === "content") {
    if (!section.banners.desktop) e.banner = "กรุณาอัปโหลดแบนเนอร์เดสก์ท็อป";
  }
  if (section.type === "hero" || section.type === "promotion_banner" || section.type === "content") {
    const media = [
      ...mediaErrors(section.banners.desktop, "แบนเนอร์เดสก์ท็อป"),
      ...mediaErrors(section.banners.tablet, "แบนเนอร์แท็บเล็ต"),
      ...mediaErrors(section.banners.mobile, "แบนเนอร์มือถือ"),
    ];
    if (media.length > 0) e.banner = media.join(", ");
  }
  if (section.type === "product") {
    if (section.productSource === "collection" && !section.collectionId) e.collectionId = "กรุณาเลือกกลุ่มสินค้าพิเศษ";
    if (section.productSource === "category" && !section.categoryId) e.categoryId = "กรุณาเลือกหมวดหมู่";
    if (section.productSource === "manual" && section.products.length === 0) e.products = "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ";
  }
  // A CTA section is only a button; other sections may skip it, but a half-filled button breaks on the storefront.
  const ctaRequired = section.type === "cta";
  const hasLabel = !!section.cta.label.trim();
  const hasDestination = section.cta.destination.type !== "none";
  if ((ctaRequired || hasDestination) && !hasLabel) e.ctaLabel = "กรุณากรอกข้อความบนปุ่ม";
  const destError = destinationError(section.cta.destination, ctaRequired || hasLabel);
  if (destError) e.ctaDestination = destError;
  return e;
}

/**
 * §8-19 — one type-conditional form for all five section types, mounted
 * fresh (via the caller's `<Show when={expandedId() === section.id}>`)
 * whenever a *different* section is opened for editing, so each field's
 * `value=` always starts from that section's own current data with no
 * separate "reset on reopen" effect to get wrong. Every edit calls
 * `onChange` immediately — the Editor page's own working copy is the single
 * live buffer; "บันทึกแบบร่าง"/"เผยแพร่" commit the whole array at once, same
 * shape as `PromotionPageForm`.
 *
 * §10.6 add-on — "product" sections can source from an existing Product
 * Collection instead of manual picks, resolved live at render time (never
 * copied in), so editing the Collection later is reflected here and on the
 * storefront automatically.
 */
export function HomepageSectionForm(props: { section: HomepageSection; onChange: (next: HomepageSection) => void; errors?: FormErrors }) {
  const err = (key: string) => props.errors?.[key];
  const s = () => props.section;
  const patch = (next: Partial<HomepageSection>) => props.onChange({ ...s(), ...next });
  const collectionsStore = useAdminCollections();
  const categoriesStore = useAdminCategories();

  const hasBanners = () => s().type === "hero" || s().type === "promotion_banner" || s().type === "content";
  const hasEyebrow = () => s().type === "hero" || s().type === "content" || s().type === "cta";

  return (
    <div class="flex flex-col gap-4 border-t border-border p-4 sm:p-5">
      <TextField label="ชื่อส่วน (เห็นเฉพาะทีมงาน)" required value={s().name} onInput={(e) => patch({ name: e.currentTarget.value })} error={err("name")} class="sm:max-w-md" />

      <Show when={hasEyebrow()}>
        <TextField label="ข้อความเล็กเหนือหัวข้อ" placeholder="เช่น NEW" value={s().eyebrow} onInput={(e) => patch({ eyebrow: e.currentTarget.value })} class="sm:max-w-xs" />
      </Show>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="หัวข้อ" value={s().title} onInput={(e) => patch({ title: e.currentTarget.value })} />
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-ink">คำอธิบาย</span>
          <textarea
            value={s().description}
            onInput={(e) => patch({ description: e.currentTarget.value })}
            rows={3}
            class="rounded-card border border-border bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink"
          />
        </label>
      </div>

      <Show when={s().type === "content"}>
        <label class="flex flex-col gap-1.5 sm:max-w-md">
          <span class="text-sm font-medium text-ink">รูปแบบการจัดวาง</span>
          <div class="relative">
            <select
              value={s().contentLayout}
              onChange={(e) => patch({ contentLayout: e.currentTarget.value as HomepageContentLayout })}
              class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink"
            >
              {CONTENT_LAYOUT_OPTIONS.map((opt) => (
                <option value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
          </div>
        </label>
      </Show>

      <Show when={s().type === "hero"}>
        <div class="flex flex-col gap-2">
          <p class="text-sm font-semibold text-ink">
            สไลด์แบนเนอร์ (รูปภาพ, วิดีโอ, YouTube) <span class="text-system-red" aria-hidden="true">*</span>
          </p>
          <HeroAssetsEditor assets={s().assets} onChange={(assets) => patch({ assets })} />
          <FieldMessage message={err("slides")} />
        </div>
      </Show>

      <Show when={hasBanners()}>
        <div class="flex flex-col gap-2">
          <Show when={s().type === "hero"}>
            <p class="text-sm font-semibold text-ink">แบนเนอร์รูปเดียว (ใช้เมื่อไม่มีสไลด์ด้านบน)</p>
          </Show>
          <Show when={s().type !== "hero"}>
            <p class="text-sm font-semibold text-ink">
              แบนเนอร์ <span class="text-system-red" aria-hidden="true">*</span>
            </p>
          </Show>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <BannerUploader allowVideo label="แบนเนอร์เดสก์ท็อป" device="desktop" value={s().banners.desktop} onChange={(v) => patch({ banners: { ...s().banners, desktop: v } })} />
            <BannerUploader allowVideo label="แบนเนอร์แท็บเล็ต" device="tablet" value={s().banners.tablet} onChange={(v) => patch({ banners: { ...s().banners, tablet: v } })} />
            <BannerUploader allowVideo label="แบนเนอร์มือถือ" device="mobile" value={s().banners.mobile} onChange={(v) => patch({ banners: { ...s().banners, mobile: v } })} />
          </div>
          <FieldMessage message={err("banner")} />
        </div>
      </Show>

      <Show when={s().type === "product"}>
        <Show when={s().productSource === "manual"}>
          <p class="rounded-card bg-warning-soft px-3 py-2 text-sm text-ink">
            ส่วนนี้ยังเลือกสินค้าเองแบบเดิม แนะนำให้เปลี่ยนแหล่งสินค้าเป็นกลุ่มสินค้าพิเศษ
          </p>
        </Show>
        <label class="flex flex-col gap-1.5 sm:max-w-md">
          <span class="text-sm font-medium text-ink">แหล่งสินค้า</span>
          <div class="relative">
            <select
              value={s().productSource}
              onChange={(e) => patch({ productSource: e.currentTarget.value as HomepageProductSource })}
              class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink"
            >
              <Show when={s().productSource === "manual"}>
                <option value="manual">{HOMEPAGE_PRODUCT_SOURCE_META.manual.label}</option>
              </Show>
              {PRODUCT_SOURCE_OPTIONS.map((opt) => (
                <option value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
          </div>
        </label>
        <Show when={s().productSource === "collection"}>
          <label class="flex flex-col gap-1.5 sm:max-w-md">
            <span class="text-sm font-medium text-ink">
              กลุ่มสินค้าพิเศษ <span class="text-system-red" aria-hidden="true">*</span>
            </span>
            <div class="relative">
              <select
                value={s().collectionId}
                aria-invalid={err("collectionId") ? true : undefined}
                onChange={(e) => patch({ collectionId: e.currentTarget.value })}
                class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink"
              >
                <option value="">เลือกกลุ่มสินค้าพิเศษ</option>
                <For each={collectionsStore.collections()}>{(c) => <option value={c.id}>{c.name} ({c.products.length} สินค้า)</option>}</For>
              </select>
              <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
            </div>
            <FieldMessage message={err("collectionId")} />
          </label>
        </Show>
        <Show when={s().productSource === "category"}>
          <label class="flex flex-col gap-1.5 sm:max-w-md">
            <span class="text-sm font-medium text-ink">
              หมวดหมู่สินค้า <span class="text-system-red" aria-hidden="true">*</span>
            </span>
            <div class="relative">
              <select
                value={s().categoryId}
                aria-invalid={err("categoryId") ? true : undefined}
                onChange={(e) => patch({ categoryId: e.currentTarget.value })}
                class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink"
              >
                <option value="">เลือกหมวดหมู่</option>
                <For each={categoriesStore.categories()}>{(c) => <option value={c.id}>{c.name}</option>}</For>
              </select>
              <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
            </div>
            <FieldMessage message={err("categoryId")} />
          </label>
        </Show>
        <Show when={s().productSource !== "manual" && s().productSource !== "collection" && s().productSource !== "category"}>
          <p class="text-sm text-ink-gray">ระบบเลือกสินค้าให้อัตโนมัติจาก "{HOMEPAGE_PRODUCT_SOURCE_META[s().productSource].label}"</p>
        </Show>
      </Show>

      <Show when={s().type === "product" && s().productSource === "manual"}>
        <div class="flex flex-col gap-2">
          <p class="text-sm font-semibold text-ink">
            สินค้าในส่วนนี้ <span class="text-system-red" aria-hidden="true">*</span>
          </p>
          <ProductSkuPicker reorderable value={s().products} onChange={(products) => patch({ products })} />
          <FieldMessage message={err("products")} />
        </div>
      </Show>

      {/* Landing Page Frontend Polish §10 — "product" sections get a CTA too, used as the section's "View All" link (e.g. to the Collection's own listing). */}
      <div class="flex flex-col gap-3 rounded-card bg-surface-gray/60 p-3">
        <p class="text-sm font-semibold text-ink">ปุ่ม</p>
        <TextField
          label="ข้อความบนปุ่ม"
          required={s().type === "cta"}
          placeholder="เช่น ช้อปเลย"
          value={s().cta.label}
          onInput={(e) => patch({ cta: { ...s().cta, label: e.currentTarget.value } })}
          error={err("ctaLabel")}
          class="sm:max-w-xs"
        />
        <DestinationSelector
          required={s().type === "cta"}
          value={s().cta.destination}
          onChange={(destination) => patch({ cta: { ...s().cta, destination } })}
          error={err("ctaDestination")}
        />
      </div>
    </div>
  );
}

function FieldMessage(props: { message?: string }) {
  return (
    <Show when={props.message}>
      <p role="alert" class="text-sm text-system-red">{props.message}</p>
    </Show>
  );
}

/**
 * Built-in block (Flash Sale ... FAQ): it renders the storefront's own
 * component with its own data, so the only settings are an optional heading
 * override (empty = the component's usual heading) and on/off.
 */
export function BuiltinSectionForm(props: { section: HomepageSection; onChange: (next: HomepageSection) => void }) {
  const s = () => props.section;
  const meta = () => BUILTIN_SECTION_META[s().type as BuiltinSectionType];
  return (
    <div class="flex flex-col gap-4 border-t border-border p-4 sm:p-5">
      <p class="rounded-card bg-surface-gray/60 px-3 py-2 text-sm text-ink-gray">{meta().note}</p>
      <Show
        when={meta().defaultTitle}
        fallback={<p class="text-sm text-ink-gray">หัวข้อของส่วนนี้เป็นโลโก้ Flash Sale จึงเปลี่ยนข้อความไม่ได้</p>}
      >
        {(defaultTitle) => (
          <div class="flex flex-col gap-1.5 sm:max-w-md">
            <TextField label="หัวข้อ" placeholder={defaultTitle()} value={s().title} onInput={(e) => props.onChange({ ...s(), title: e.currentTarget.value })} />
            <p class="text-xs text-ink-gray">เว้นว่างไว้เพื่อใช้หัวข้อเดิม "{defaultTitle()}"</p>
          </div>
        )}
      </Show>
      <div class="flex items-center gap-3">
        <span class="text-sm font-medium text-ink">แสดงบนหน้าร้าน</span>
        <Toggle checked={s().enabled} onChange={() => props.onChange({ ...s(), enabled: !s().enabled })} onLabel="แสดง" offLabel="ไม่แสดง" />
      </div>
    </div>
  );
}
