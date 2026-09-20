import { For, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { BannerUploader } from "./BannerUploader";
import { BannerLibraryPicker } from "./BannerLibraryPicker";
import { DestinationSelector } from "./DestinationSelector";
import { PromotionPageProductPicker } from "./PromotionPageProductPicker";
import { HOMEPAGE_PRODUCT_SOURCE_META, type HomepageContentLayout, type HomepageProductSource, type HomepageSection } from "~/lib/adminHomepage";
import { useAdminCollections } from "~/lib/adminCollectionStore";
import { useAdminCampaigns } from "~/lib/adminCampaignStore";

const PRODUCT_SOURCE_OPTIONS: { value: HomepageProductSource; label: string }[] = Object.entries(HOMEPAGE_PRODUCT_SOURCE_META).map(([value, meta]) => ({
  value: value as HomepageProductSource,
  label: meta.label,
}));

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
  const campaignsStore = useAdminCampaigns();

  const isLinkedCampaign = () => s().type === "campaign" && s().campaignId !== "";
  const hasBanners = () => (s().type === "hero" || s().type === "promotion_banner" || s().type === "campaign" || s().type === "content") && !isLinkedCampaign();
  /** Landing Page Frontend Polish §10 — "product" sections now get a CTA too, used as the section's "View All" link (e.g. to the Collection's own listing). */
  const hasCta = () => !isLinkedCampaign();
  const hasProducts = () => (s().type === "product" || s().type === "campaign") && !isLinkedCampaign();
  const showManualContent = () => !isLinkedCampaign();
  const hasEyebrow = () => (s().type === "hero" || s().type === "content" || s().type === "cta") && !isLinkedCampaign();

  return (
    <div class="flex flex-col gap-4 border-t border-surface-gray p-4 sm:p-5">
      <TextField label="Section Name" required value={s().name} onInput={(e) => patch({ name: e.currentTarget.value })} class="sm:max-w-md" />

      <Show when={s().type === "campaign"}>
        <label class="flex flex-col gap-1.5 sm:max-w-md">
          <span class="text-sm font-medium text-ink">เชื่อมกับ Campaign ที่มีอยู่ (ไม่บังคับ)</span>
          <select
            value={s().campaignId}
            onChange={(e) => patch({ campaignId: e.currentTarget.value })}
            class="h-11 rounded-card border border-surface-gray bg-white px-4 text-sm text-ink outline-none focus:border-brand-pink"
          >
            <option value="">-- กำหนดเนื้อหาเอง --</option>
            <For each={campaignsStore.campaigns()}>{(c) => <option value={c.id}>{c.name}</option>}</For>
          </select>
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
              class="rounded-card border border-surface-gray bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink"
            />
          </label>
        </div>
      </Show>

      <Show when={s().type === "content"}>
        <label class="flex flex-col gap-1.5 sm:max-w-md">
          <span class="text-sm font-medium text-ink">Layout</span>
          <select
            value={s().contentLayout}
            onChange={(e) => patch({ contentLayout: e.currentTarget.value as HomepageContentLayout })}
            class="h-11 rounded-card border border-surface-gray bg-white px-4 text-sm text-ink outline-none focus:border-brand-pink"
          >
            {CONTENT_LAYOUT_OPTIONS.map((opt) => (
              <option value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      </Show>

      <Show when={hasBanners()}>
        <div class="flex flex-col gap-2">
          <BannerLibraryPicker onSelect={(banners) => patch({ banners })} />
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <BannerUploader label="Desktop Banner" hint="แนะนำ 1920×840px" value={s().banners.desktop} onChange={(v) => patch({ banners: { ...s().banners, desktop: v } })} />
            <BannerUploader label="Tablet Banner" hint="แนะนำ 1024×600px" value={s().banners.tablet} onChange={(v) => patch({ banners: { ...s().banners, tablet: v } })} />
            <BannerUploader label="Mobile Banner" hint="แนะนำ 750×960px" value={s().banners.mobile} onChange={(v) => patch({ banners: { ...s().banners, mobile: v } })} />
          </div>
        </div>
      </Show>

      <Show when={s().type === "product"}>
        <label class="flex flex-col gap-1.5 sm:max-w-md">
          <span class="text-sm font-medium text-ink">Product Source</span>
          <select
            value={s().productSource}
            onChange={(e) => patch({ productSource: e.currentTarget.value as HomepageProductSource })}
            class="h-11 rounded-card border border-surface-gray bg-white px-4 text-sm text-ink outline-none focus:border-brand-pink"
          >
            {PRODUCT_SOURCE_OPTIONS.map((opt) => (
              <option value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <Show when={s().productSource === "collection"}>
          <label class="flex flex-col gap-1.5 sm:max-w-md">
            <span class="text-sm font-medium text-ink">Product Collection</span>
            <select
              value={s().collectionId}
              onChange={(e) => patch({ collectionId: e.currentTarget.value })}
              class="h-11 rounded-card border border-surface-gray bg-white px-4 text-sm text-ink outline-none focus:border-brand-pink"
            >
              <option value="">-- เลือก Collection --</option>
              <For each={collectionsStore.collections()}>{(c) => <option value={c.id}>{c.name} ({c.products.length} สินค้า)</option>}</For>
            </select>
          </label>
        </Show>
        <Show when={s().productSource !== "manual" && s().productSource !== "collection"}>
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
