import { For, Show } from "solid-js";
import { ChevronDownIcon } from "~/components/admin/icons";
import { TextField } from "~/components/shared/TextField";
import { BannerUploader } from "./BannerUploader";
import { BannerLibraryPicker } from "./BannerLibraryPicker";
import { HeroAssetsEditor } from "./HeroAssetsEditor";
import { DestinationSelector } from "./DestinationSelector";
import { PromotionPageProductPicker } from "./PromotionPageProductPicker";
import { HOMEPAGE_PRODUCT_SOURCE_META, type HomepageContentLayout, type HomepageProductSource, type HomepageSection } from "~/lib/adminHomepage";
import { useAdminCollections } from "~/lib/adminCollectionStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { useAdminCampaigns } from "~/lib/adminCampaignStore";

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
  { value: "image-text", label: "Image + Text (รูปซ้าย)" },
  { value: "text-image", label: "Text + Image (รูปขวา)" },
  { value: "full-width", label: "Full Width Content" },
];

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
 * Collection instead of manual picks, and a "campaign" section can link to
 * an existing standalone Campaign instead of filling in its own inline
 * Banner/Title/Description/CTA/Products — both resolved live at render time
 * (never copied in), so editing the Collection/Campaign later is reflected
 * here and on the storefront automatically.
 */
export function HomepageSectionForm(props: { section: HomepageSection; onChange: (next: HomepageSection) => void }) {
  const s = () => props.section;
  const patch = (next: Partial<HomepageSection>) => props.onChange({ ...s(), ...next });
  const collectionsStore = useAdminCollections();
  const categoriesStore = useAdminCategories();
  const campaignsStore = useAdminCampaigns();

  const isLinkedCampaign = () => s().type === "campaign" && s().campaignId !== "";
  const hasBanners = () => (s().type === "hero" || s().type === "promotion_banner" || s().type === "campaign" || s().type === "content") && !isLinkedCampaign();
  /** Landing Page Frontend Polish §10 — "product" sections now get a CTA too, used as the section's "View All" link (e.g. to the Collection's own listing). */
  const hasCta = () => !isLinkedCampaign();
  const hasProducts = () => (s().type === "product" || s().type === "campaign") && !isLinkedCampaign();
  const showManualContent = () => !isLinkedCampaign();
  const hasEyebrow = () => (s().type === "hero" || s().type === "content" || s().type === "cta") && !isLinkedCampaign();

  return (
    <div class="flex flex-col gap-4 border-t border-border p-4 sm:p-5">
      <TextField label="Section Name" required value={s().name} onInput={(e) => patch({ name: e.currentTarget.value })} class="sm:max-w-md" />

      <Show when={s().type === "campaign"}>
        <label class="flex flex-col gap-1.5 sm:max-w-md">
          <span class="text-sm font-medium text-ink">เชื่อมกับ Campaign ที่มีอยู่ (ไม่บังคับ)</span>
          <div class="relative">
            <select
              value={s().campaignId}
              onChange={(e) => patch({ campaignId: e.currentTarget.value })}
              class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink"
            >
              <option value="">-- กำหนดเนื้อหาเอง --</option>
              <For each={campaignsStore.campaigns()}>{(c) => <option value={c.id}>{c.name}</option>}</For>
            </select>
            <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
          </div>
        </label>
        <Show when={isLinkedCampaign()}>
          <p class="rounded-card bg-info-soft px-3 py-2 text-sm text-ink">
            เนื้อหาของ Section นี้ (Banner/Title/Description/CTA/สินค้า) จะดึงมาจาก Campaign "{campaignsStore.getById(s().campaignId)?.name ?? ""}" โดยอัตโนมัติ
          </p>
        </Show>
      </Show>

      <Show when={hasEyebrow()}>
        <TextField label="Eyebrow" placeholder="NEW / LIMITED EDITION" value={s().eyebrow} onInput={(e) => patch({ eyebrow: e.currentTarget.value })} class="sm:max-w-xs" />
      </Show>

      <Show when={showManualContent()}>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Title" value={s().title} onInput={(e) => patch({ title: e.currentTarget.value })} />
          <label class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-ink">Description</span>
            <textarea
              value={s().description}
              onInput={(e) => patch({ description: e.currentTarget.value })}
              rows={2}
              class="rounded-card border border-border bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink"
            />
          </label>
        </div>
      </Show>

      <Show when={s().type === "content"}>
        <label class="flex flex-col gap-1.5 sm:max-w-md">
          <span class="text-sm font-medium text-ink">Layout</span>
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
          <p class="text-sm font-semibold text-ink">Hero Banner Assets (รูปภาพ / วิดีโอ / YouTube)</p>
          <HeroAssetsEditor assets={s().assets} onChange={(assets) => patch({ assets })} />
        </div>
      </Show>

      <Show when={hasBanners()}>
        <div class="flex flex-col gap-2">
          <Show when={s().type === "hero"}>
            <p class="text-sm font-semibold text-ink">Banner เดี่ยว (เดิม — ใช้เมื่อไม่มี Hero Banner Assets ด้านบน)</p>
          </Show>
          <BannerLibraryPicker onSelect={(banners) => patch({ banners })} />
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <BannerUploader label="Desktop Banner" device="desktop" value={s().banners.desktop} onChange={(v) => patch({ banners: { ...s().banners, desktop: v } })} />
            <BannerUploader label="Tablet Banner" device="tablet" value={s().banners.tablet} onChange={(v) => patch({ banners: { ...s().banners, tablet: v } })} />
            <BannerUploader label="Mobile Banner" device="mobile" value={s().banners.mobile} onChange={(v) => patch({ banners: { ...s().banners, mobile: v } })} />
          </div>
        </div>
      </Show>

      <Show when={s().type === "product"}>
        <Show when={s().productSource === "manual"}>
          <p class="rounded-card bg-warning-soft px-3 py-2 text-sm text-ink">
            Section นี้ยังใช้การเลือกสินค้าเอง (แบบเดิม) อยู่ — กรุณาสร้างหรือใช้ Product Collection แล้วเปลี่ยน Product Source ด้านล่างเป็น "Product Collection" เพื่อย้ายมาใช้รูปแบบปัจจุบัน
          </p>
        </Show>
        <label class="flex flex-col gap-1.5 sm:max-w-md">
          <span class="text-sm font-medium text-ink">Product Source</span>
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
            <span class="text-sm font-medium text-ink">Product Collection</span>
            <div class="relative">
              <select
                value={s().collectionId}
                onChange={(e) => patch({ collectionId: e.currentTarget.value })}
                class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink"
              >
                <option value="">-- เลือก Collection --</option>
                <For each={collectionsStore.collections()}>{(c) => <option value={c.id}>{c.name} ({c.products.length} สินค้า)</option>}</For>
              </select>
              <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
            </div>
          </label>
        </Show>
        <Show when={s().productSource === "category"}>
          <label class="flex flex-col gap-1.5 sm:max-w-md">
            <span class="text-sm font-medium text-ink">หมวดหมู่สินค้า</span>
            <div class="relative">
              <select
                value={s().categoryId}
                onChange={(e) => patch({ categoryId: e.currentTarget.value })}
                class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink"
              >
                <option value="">-- เลือกหมวดหมู่ --</option>
                <For each={categoriesStore.categories()}>{(c) => <option value={c.id}>{c.name}</option>}</For>
              </select>
              <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
            </div>
          </label>
        </Show>
        <Show when={s().productSource !== "manual" && s().productSource !== "collection" && s().productSource !== "category"}>
          <p class="text-sm text-ink-gray">แสดงสินค้าโดยอัตโนมัติจาก {HOMEPAGE_PRODUCT_SOURCE_META[s().productSource].label} — ไม่ต้องเลือกสินค้าเอง</p>
        </Show>
      </Show>

      <Show when={hasProducts() && (s().type !== "product" || s().productSource === "manual")}>
        <div class="flex flex-col gap-2">
          <p class="text-sm font-semibold text-ink">สินค้าในเซกชันนี้</p>
          <PromotionPageProductPicker selected={s().products} onChange={(products) => patch({ products })} />
        </div>
      </Show>

      <Show when={hasCta()}>
        <div class="flex flex-col gap-3 rounded-card bg-surface-gray/40 p-3">
          <p class="text-sm font-semibold text-ink">Call to Action</p>
          <TextField label="CTA Label" placeholder="ช้อปเลย" value={s().cta.label} onInput={(e) => patch({ cta: { ...s().cta, label: e.currentTarget.value } })} class="sm:max-w-xs" />
          <DestinationSelector value={s().cta.destination} onChange={(destination) => patch({ cta: { ...s().cta, destination } })} />
        </div>
      </Show>
    </div>
  );
}
