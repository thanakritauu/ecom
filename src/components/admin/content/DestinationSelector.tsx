import { createMemo, createSignal, For, Show } from "solid-js";
import { mediaImage } from "~/lib/media";
import { TextField } from "~/components/shared/TextField";
import { SearchInput } from "~/components/admin/SearchInput";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { ChevronDownIcon, ImageIcon } from "~/components/admin/icons";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminProducts } from "~/lib/adminProductStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { useAdminCollections } from "~/lib/adminCollectionStore";
import { LANDING_PAGE_STATUS_META } from "~/lib/adminContent";
import { CATEGORY_STATUS_META } from "~/lib/adminCategories";
import { COLLECTION_STATUS_META } from "~/lib/adminCollections";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { categoryListHref, collectionListHref, type HomepageDestination } from "~/lib/adminHomepage";

const TYPE_OPTIONS: { value: HomepageDestination["type"]; label: string }[] = [
  { value: "none", label: "ไม่มี" },
  { value: "internal", label: "หน้าภายในเว็บไซต์" },
  { value: "landingPage", label: "หน้าแคมเปญ" },
  { value: "product", label: "สินค้า" },
  { value: "category", label: "หมวดหมู่สินค้า" },
  { value: "collection", label: "กลุ่มสินค้าพิเศษ" },
  { value: "external", label: "ลิงก์ภายนอก" },
];

/**
 * §10/§11/§18 — one destination picker reused by Hero/Promotion Banner/
 * Content/CTA sections. Choosing "Landing Page"/"สินค้า"/"หมวดหมู่สินค้า"/
 * "Product Collection" never asks for a URL — the id picked here is resolved
 * at render time (`resolveHomepageDestinationHref`), so slug/id stays the
 * one source of truth for the actual link. Category/Collection resolve to
 * the *existing* `/products` listing page filtered by query string (see
 * `categoryListHref`/`collectionListHref` in `adminHomepage.ts`) — this
 * phase deliberately does not add dedicated Category/Collection landing
 * pages. "Landing Page" is the generic-navigation vocabulary (Landing Page
 * Architecture & Promotion Page Migration) for what used to be labeled
 * "Promotion Page" here — same underlying data (`useAdminContent()`), same
 * `/promotion/:slug` route, only the destination kind's name and label
 * changed (`landingPage`/`landingPageId`, normalized from any legacy
 * `promotion`-typed record on read — see `normalizeHomepageDestination`).
 */
export function DestinationSelector(props: { value: HomepageDestination; onChange: (next: HomepageDestination) => void }) {
  const setType = (type: HomepageDestination["type"]) => {
    switch (type) {
      case "internal":
        props.onChange({ type: "internal", path: "" });
        break;
      case "landingPage":
        props.onChange({ type: "landingPage", landingPageId: "" });
        break;
      case "product":
        props.onChange({ type: "product", productId: "" });
        break;
      case "category":
        props.onChange({ type: "category", categoryId: "" });
        break;
      case "collection":
        props.onChange({ type: "collection", collectionId: "" });
        break;
      case "external":
        props.onChange({ type: "external", url: "" });
        break;
      default:
        props.onChange({ type: "none" });
    }
  };

  return (
    <div class="flex flex-col gap-3">
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium text-ink">ปลายทาง</span>
        <div class="relative">
          <select
            value={props.value.type}
            onChange={(e) => setType(e.currentTarget.value as HomepageDestination["type"])}
            class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
        </div>
      </label>

      <Show when={props.value.type === "internal"}>
        <TextField
          label="ลิงก์หน้าในเว็บไซต์"
          placeholder="/products"
          value={(props.value as { path: string }).path}
          onInput={(e) => props.onChange({ type: "internal", path: e.currentTarget.value })}
        />
      </Show>

      <Show when={props.value.type === "external"}>
        <TextField
          label="URL ภายนอก"
          placeholder="https://..."
          value={(props.value as { url: string }).url}
          onInput={(e) => props.onChange({ type: "external", url: e.currentTarget.value })}
        />
      </Show>

      <Show when={props.value.type === "landingPage"}>
        <LandingPagePicker value={(props.value as { landingPageId: string }).landingPageId} onChange={(id) => props.onChange({ type: "landingPage", landingPageId: id })} />
      </Show>

      <Show when={props.value.type === "product"}>
        <SingleProductPicker value={(props.value as { productId: string }).productId} onChange={(id) => props.onChange({ type: "product", productId: id })} />
      </Show>

      <Show when={props.value.type === "category"}>
        <CategoryPicker value={(props.value as { categoryId: string }).categoryId} onChange={(id) => props.onChange({ type: "category", categoryId: id })} />
      </Show>

      <Show when={props.value.type === "collection"}>
        <CollectionPicker value={(props.value as { collectionId: string }).collectionId} onChange={(id) => props.onChange({ type: "collection", collectionId: id })} />
      </Show>
    </div>
  );
}

function LandingPagePicker(props: { value: string; onChange: (id: string) => void }) {
  const store = useAdminContent();
  const [search, setSearch] = createSignal("");
  // §18/§35 — Homepage never resolves through `/promotion/:slug`, so it's never a valid target for this destination kind; pick "หน้าแรก" (the `homepage`/`internal` destination) for that instead.
  const pickable = () => store.pages().filter((p) => !p.isHomepage);
  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    if (!q) return pickable();
    return pickable().filter((p) => `${p.name} ${p.slug}`.toLowerCase().includes(q));
  });

  return (
    <div class="flex flex-col gap-2 rounded-card border border-border p-3">
      <SearchInput value={search()} onInput={setSearch} placeholder="ค้นหาหน้าแคมเปญ..." />
      <div class="flex max-h-56 flex-col gap-1 overflow-y-auto">
        <Show when={filtered().length > 0} fallback={<p class="p-3 text-center text-sm text-ink-gray">ไม่พบหน้าแคมเปญ</p>}>
          <For each={filtered()}>
            {(page) => (
              <label class="flex cursor-pointer items-center gap-3 rounded-card p-2 transition-colors duration-150 hover:bg-surface-pink/40">
                <input
                  type="radio"
                  name="landing-page-destination"
                  checked={props.value === page.id}
                  onChange={() => props.onChange(page.id)}
                  class="size-4 accent-brand-pink"
                />
                <div class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
                  <Show when={mediaImage(page.banners.desktop)} fallback={<ImageIcon class="size-4" />}>
                    <img src={mediaImage(page.banners.desktop)} alt="" class="size-full object-cover" />
                  </Show>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-ink">{page.name}</p>
                  <p class="truncate text-xs text-ink-gray">/{page.slug}</p>
                </div>
                <StatusBadge tone={LANDING_PAGE_STATUS_META[page.status].tone}>{LANDING_PAGE_STATUS_META[page.status].label}</StatusBadge>
              </label>
            )}
          </For>
        </Show>
      </div>
      <Show when={props.value !== ""}>
        <p class="text-xs text-ink-gray">
          ลิงก์ <span class="font-medium text-ink">/promotion/{store.getById(props.value)?.slug ?? "?"}</span>
        </p>
      </Show>
    </div>
  );
}

function SingleProductPicker(props: { value: string; onChange: (id: string) => void }) {
  const store = useAdminProducts();
  const [search, setSearch] = createSignal("");
  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    if (!q) return store.products();
    return store.products().filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(q));
  });

  return (
    <div class="flex flex-col gap-2 rounded-card border border-border p-3">
      <SearchInput value={search()} onInput={setSearch} placeholder="ค้นหาสินค้า, SKU..." />
      <div class="flex max-h-56 flex-col gap-1 overflow-y-auto">
        <Show when={filtered().length > 0} fallback={<p class="p-3 text-center text-sm text-ink-gray">ไม่พบสินค้า</p>}>
          <For each={filtered()}>
            {(product) => (
              <label class="flex cursor-pointer items-center gap-3 rounded-card p-2 transition-colors duration-150 hover:bg-surface-pink/40">
                <input
                  type="radio"
                  name="product-destination"
                  checked={props.value === product.id}
                  onChange={() => props.onChange(product.id)}
                  class="size-4 accent-brand-pink"
                />
                <img src={product.image} alt="" class="size-10 shrink-0 rounded-media object-cover" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-ink">{product.name}</p>
                  <p class="text-xs text-ink-gray">
                    {product.sku} ราคา {formatAdminCurrency(product.price)}
                  </p>
                </div>
              </label>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}

function CategoryPicker(props: { value: string; onChange: (id: string) => void }) {
  const store = useAdminCategories();
  const [search, setSearch] = createSignal("");
  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    if (!q) return store.categories();
    return store.categories().filter((c) => `${c.name} ${c.slug}`.toLowerCase().includes(q));
  });

  return (
    <div class="flex flex-col gap-2 rounded-card border border-border p-3">
      <SearchInput value={search()} onInput={setSearch} placeholder="ค้นหาหมวดหมู่..." />
      <div class="flex max-h-56 flex-col gap-1 overflow-y-auto">
        <Show when={filtered().length > 0} fallback={<p class="p-3 text-center text-sm text-ink-gray">ไม่พบหมวดหมู่</p>}>
          <For each={filtered()}>
            {(category) => (
              <label class="flex cursor-pointer items-center gap-3 rounded-card p-2 transition-colors duration-150 hover:bg-surface-pink/40">
                <input
                  type="radio"
                  name="category-destination"
                  checked={props.value === category.id}
                  onChange={() => props.onChange(category.id)}
                  class="size-4 accent-brand-pink"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-ink">{category.name}</p>
                  <p class="truncate text-xs text-ink-gray">/{category.slug}</p>
                </div>
                <StatusBadge tone={CATEGORY_STATUS_META[category.status].tone}>{CATEGORY_STATUS_META[category.status].label}</StatusBadge>
              </label>
            )}
          </For>
        </Show>
      </div>
      <Show when={props.value !== ""}>
        <p class="text-xs text-ink-gray">
          ลิงก์ <span class="font-medium text-ink">{categoryListHref(store.getById(props.value)?.slug ?? "?")}</span>
        </p>
      </Show>
    </div>
  );
}

function CollectionPicker(props: { value: string; onChange: (id: string) => void }) {
  const store = useAdminCollections();
  const [search, setSearch] = createSignal("");
  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    if (!q) return store.collections();
    return store.collections().filter((c) => c.name.toLowerCase().includes(q));
  });

  return (
    <div class="flex flex-col gap-2 rounded-card border border-border p-3">
      <SearchInput value={search()} onInput={setSearch} placeholder="ค้นหากลุ่มสินค้าพิเศษ..." />
      <div class="flex max-h-56 flex-col gap-1 overflow-y-auto">
        <Show when={filtered().length > 0} fallback={<p class="p-3 text-center text-sm text-ink-gray">ไม่พบกลุ่มสินค้าพิเศษ</p>}>
          <For each={filtered()}>
            {(collection) => (
              <label class="flex cursor-pointer items-center gap-3 rounded-card p-2 transition-colors duration-150 hover:bg-surface-pink/40">
                <input
                  type="radio"
                  name="collection-destination"
                  checked={props.value === collection.id}
                  onChange={() => props.onChange(collection.id)}
                  class="size-4 accent-brand-pink"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-ink">{collection.name}</p>
                  <p class="truncate text-xs text-ink-gray">{collection.products.length} สินค้า</p>
                </div>
                <StatusBadge tone={COLLECTION_STATUS_META[collection.status].tone}>{COLLECTION_STATUS_META[collection.status].label}</StatusBadge>
              </label>
            )}
          </For>
        </Show>
      </div>
      <Show when={props.value !== ""}>
        <p class="text-xs text-ink-gray">
          ลิงก์ <span class="font-medium text-ink">{collectionListHref(props.value)}</span>
        </p>
      </Show>
    </div>
  );
}
