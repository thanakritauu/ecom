import { useProductCatalog } from "~/lib/productCatalog";
import { createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { Badge } from "~/components/shared/Badge";
import { PriceDisplay } from "~/components/shared/PriceDisplay";
import { ProductMeta } from "~/components/shared/ProductMeta";
import { ProductCard } from "~/components/shared/ProductCard";
import { CouponCard, type Coupon } from "~/components/shared/CouponCard";
import { MobileNavRow } from "~/components/shared/MobileMenu";
import { PromoStrip, UtilityBar } from "~/components/shared/PromotionStrip";
import { HomepageSections } from "~/components/home/HomepageSections";
import { AdminHeroSlide } from "~/components/home/HeroBanner";
import { useAdminProducts } from "~/lib/adminProductStore";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { formatCouponDiscount, formatMarketingDate } from "~/lib/adminMarketing";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminCollections } from "~/lib/adminCollectionStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { useAdminNavigation } from "~/lib/adminNavigationStore";
import { buildNavigationTree, filterVisibleNavigationTree } from "~/lib/navigationResolver";
import { emptyBanners, emptyCta, type HomepageSection } from "~/lib/adminHomepage";
import { pushToast } from "~/lib/toast";

/**
 * CHARMISS CMS — ADMIN ONLY §3/§5 — the "Global Component Preview" gallery.
 * Every swatch below renders through the REAL Frontend component (never a
 * look-alike rebuild), fed with data pulled live from the existing Admin/
 * customer stores — the "Frontend Source of Truth → Preview Adapter/Mock
 * Data → CMS Live Preview" flow §5 asks for. A handful of entries (Banner
 * section, Collection section) need their real records reshaped into the
 * `HomepageSection` object `HomepageSections` expects; that reshaping only
 * ever copies existing field values (never invents copy/labels), and is
 * called out inline where it happens. No Customer Frontend file is touched
 * by this route.
 */
export default function AdminComponentPreviewPage() {
  const productStore = useAdminProducts();
  const catalog = useProductCatalog();
  const marketing = useAdminMarketing();
  const contentStore = useAdminContent();
  const collectionStore = useAdminCollections();
  const categoryStore = useAdminCategories();
  const navigation = useAdminNavigation();
  const navigationLookups = {
    getPromotionPage: contentStore.getById,
    getCategory: categoryStore.getById,
    getCollection: collectionStore.getById,
    getProduct: productStore.getById,
  };

  const homepage = createMemo(() => contentStore.pages().find((p) => p.isHomepage));
  const homepageSection = (type: HomepageSection["type"]) => homepage()?.sections.find((s) => s.type === type);

  // Product Card swatches — real Product records, chosen for the states each swatch demonstrates.
  const normalProduct = createMemo(() => productStore.products().find((p) => !p.discountPercent && !p.id.startsWith("flash-")) ?? productStore.products()[0]);
  const discountProduct = createMemo(() => productStore.getById("best-1") ?? productStore.products().find((p) => p.discountPercent) ?? productStore.products()[0]);
  // "flash-2" is deliberately the catalog's one sold-out flash-sale demo card (see products.ts) — picked on purpose elsewhere to exercise "สินค้าหมด", but wrong for demonstrating the ribbon/countdown here, so this prefers an in-stock flash-sale product instead.
  // Flash prices come from the live flash sale campaigns, so this reads the storefront catalog's priced copy.
  const flashSaleProduct = createMemo(
    () =>
      catalog.products().find((p) => p.id === "flash-1" && p.flashSaleEndsAt) ??
      catalog.products().find((p) => p.flashSaleEndsAt && (p.stockLeft ?? 1) > 0) ??
      discountProduct(),
  );

  // Coupon — a real Admin coupon record reshaped into CouponCard's `{amountLabel, minSpendLabel, expiryLabel}` shape (a Preview Adapter step, not new copy).
  const sourceCoupon = createMemo(() => marketing.coupons.items().find((c) => c.status === "active") ?? marketing.coupons.items()[0]);
  const previewCoupon = createMemo<Coupon | undefined>(() => {
    const c = sourceCoupon();
    if (!c) return undefined;
    return {
      id: c.id,
      amountLabel: formatCouponDiscount(c),
      minSpendLabel: c.minSpend ? `ขั้นต่ำ ฿${c.minSpend.toLocaleString("th-TH")}` : "ไม่มีขั้นต่ำ",
      expiryLabel: `หมดอายุ ${formatMarketingDate(c.endDate)}`,
    };
  });
  const [couponCollected, setCouponCollected] = createSignal(false);

  // Hero Banner — the Homepage's own real "hero" section, previewed regardless of its current enabled flag (same bypass the Full Page Preview route already applies to whole pages).
  const heroSection = createMemo<HomepageSection | undefined>(() => {
    const s = homepageSection("hero");
    return s ? { ...s, enabled: true } : undefined;
  });

  // Banner (Promotion Banner section) — a real Promotion Page's uploaded banners + a link to that page, reshaped into a promotion_banner-type HomepageSection (the baseline homepage section of this type ships with no image).
  const bannerSection = createMemo<HomepageSection | undefined>(() => {
    const base = homepageSection("promotion_banner");
    const source = contentStore.pages().find((p) => !p.isHomepage && (p.banners.desktop || p.banners.tablet || p.banners.mobile));
    if (!base || !source) return undefined;
    return { ...base, enabled: true, banners: source.banners, cta: { label: "", destination: { type: "landingPage", landingPageId: source.id } } };
  });

  // Product Section — the Homepage's own real "featured" product section, already enabled.
  const productSection = createMemo(() => homepageSection("product"));

  // Collection — a real Product Collection's id/name, reshaped into a product-type HomepageSection with productSource "collection" (no such section exists in the baseline homepage today).
  const collectionSection = createMemo<HomepageSection | undefined>(() => {
    const collection = collectionStore.collections()[0];
    if (!collection) return undefined;
    return {
      id: `gallery-collection-${collection.id}`,
      type: "product",
      name: collection.name,
      enabled: true,
      eyebrow: "",
      title: collection.name,
      description: "",
      banners: emptyBanners(),
      assets: [],
      cta: emptyCta(),
      contentLayout: "image-text",
      productSource: "collection",
      products: [],
      collectionId: collection.id,
      categoryId: "",
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  });

  // Content Section — the Homepage's own real "content" section, previewed regardless of its current enabled flag.
  const contentSection = createMemo<HomepageSection | undefined>(() => {
    const s = homepageSection("content");
    return s ? { ...s, enabled: true } : undefined;
  });

  const ctaSection = createMemo<HomepageSection | undefined>(() => {
    const s = homepageSection("cta");
    return s ? { ...s, enabled: true } : undefined;
  });

  // Navigation / Mobile Navigation — identical filtered tree + identical MobileNavRow renderer the Navigation module's own Fixed Preview uses (see /admin/navigation).
  const navTree = createMemo(() => filterVisibleNavigationTree(buildNavigationTree(navigation.items(), navigationLookups)));

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "ตัวอย่างส่วนประกอบหน้าร้าน" }]} />
      <PageHeader title="ตัวอย่างส่วนประกอบหน้าร้าน" description="ดูหน้าตาส่วนต่างๆ ของหน้าร้านจากข้อมูลจริงในระบบ" />

      <Gallery title="การ์ดสินค้า" description="สินค้าราคาปกติ ไม่มีส่วนลดหรือ Flash Sale">
        <Show when={normalProduct()} fallback={<EmptyNote />}>
          {(p) => <div class="max-w-[260px]"><ProductCard product={p()} /></div>}
        </Show>
      </Gallery>

      <Gallery title="การ์ดสินค้าที่มีส่วนลด" description="สินค้าที่มีส่วนลดและมีตัวเลือกสีหลายแบบ">
        <Show when={discountProduct()} fallback={<EmptyNote />}>
          {(p) => <div class="max-w-[260px]"><ProductCard product={p()} /></div>}
        </Show>
      </Gallery>

      <Gallery title="การ์ดสินค้า Flash Sale" description="มีนับถอยหลังบนรูปและแถบสต๊อก แสดงแบบนี้เฉพาะส่วน Flash Sale หน้าแรกและหน้า Flash Sale">
        <Show when={flashSaleProduct()} fallback={<EmptyNote />}>
          {(p) => <div class="max-w-[260px]"><ProductCard product={p()} flashSale /></div>}
        </Show>
      </Gallery>

      <Gallery title="ป้ายส่วนลด ราคา และคะแนนรีวิว" description="จากสินค้าที่มีส่วนลดรายการเดียวกับด้านบน">
        <Show when={discountProduct()} fallback={<EmptyNote />}>
          {(p) => (
            <div class="flex flex-wrap items-center gap-6">
              <Show when={p().discountPercent}>{(pct) => <Badge tone="red">-{pct()}%</Badge>}</Show>
              <PriceDisplay price={p().price} compareAtPrice={p().compareAtPrice} />
              <ProductMeta rating={p().rating} soldCount={p().soldCount} />
            </div>
          )}
        </Show>
      </Gallery>

      <Gallery title="ปุ่ม" description="ปุ่มหลักและปุ่มรองใช้บนพื้นขาว ส่วนปุ่มสำหรับพื้นสีใช้บนแบนเนอร์ของหน้าร้าน">
        <div class="flex flex-wrap items-center gap-3">
          <Button variant="primary">ปุ่มหลัก</Button>
          <Button variant="outline">ปุ่มรอง</Button>
        </div>
        <div class="flex flex-wrap items-center gap-3 rounded-media bg-brand-purple p-4">
          <Button variant="white">ปุ่มบนพื้นสี</Button>
          <Button variant="ghost">ปุ่มโปร่งบนพื้นสี</Button>
        </div>
      </Gallery>

      <Gallery title="คูปอง" description="คูปองจากเมนูคูปอง การกดเก็บในหน้านี้ไม่มีผลกับลูกค้า">
        <Show when={previewCoupon()} fallback={<EmptyNote />}>
          {(coupon) => (
            <div class="max-w-md overflow-hidden rounded-media border border-border">
              <CouponCard
                coupon={coupon()}
                collected={couponCollected()}
                onCollect={async () => {
                  setCouponCollected(true);
                  pushToast("นี่เป็นตัวอย่าง ระบบไม่ได้เก็บคูปองจริง", "info");
                }}
              />
            </div>
          )}
        </Show>
      </Gallery>

      <Gallery title="แบนเนอร์โปรโมชั่น" description="ใช้แบนเนอร์จากหน้าแคมเปญแรกที่มีรูป และลิงก์ไปที่หน้านั้น">
        <Show when={bannerSection()} fallback={<EmptyNote text="ยังไม่มีหน้าแคมเปญที่อัปโหลดแบนเนอร์ไว้" />}>
          {(section) => <SectionFrame><HomepageSections sections={[section()]} /></SectionFrame>}
        </Show>
      </Gallery>

      <Gallery title="แบนเนอร์สไลด์" description="สไลด์แรกจากส่วนแบนเนอร์สไลด์ของหน้าแรก แสดงแม้ส่วนนั้นยังไม่ได้เปิด">
        <Show when={heroSection()} fallback={<EmptyNote />}>
          {(section) => <SectionFrame><AdminHeroSlide section={section()} /></SectionFrame>}
        </Show>
      </Gallery>

      <Gallery title="รายการสินค้าจากกลุ่มสินค้าพิเศษ" description="ส่วนรายการสินค้าที่ดึงสินค้าจากกลุ่มแรกในเมนูกลุ่มสินค้าพิเศษ">
        <Show when={collectionSection()} fallback={<EmptyNote text="ยังไม่มีกลุ่มสินค้าพิเศษในระบบ" />}>
          {(section) => <SectionFrame><HomepageSections sections={[section()]} /></SectionFrame>}
        </Show>
      </Gallery>

      <Gallery title="รายการสินค้า" description="ส่วนรายการสินค้าจากหน้าแรก">
        <Show when={productSection()} fallback={<EmptyNote />}>
          {(section) => <SectionFrame><HomepageSections sections={[section()]} /></SectionFrame>}
        </Show>
      </Gallery>

      <Gallery title="รูปพร้อมข้อความ" description="ส่วนรูปพร้อมข้อความจากหน้าแรก แสดงแม้ส่วนนั้นยังไม่ได้เปิด">
        <Show when={contentSection()} fallback={<EmptyNote />}>
          {(section) => <SectionFrame><HomepageSections sections={[section()]} /></SectionFrame>}
        </Show>
      </Gallery>

      <Gallery title="ปุ่มชวนคลิก" description="ส่วนปุ่มชวนคลิกจากหน้าแรก">
        <Show when={ctaSection()} fallback={<EmptyNote text="หน้าแรกยังไม่มีส่วนปุ่มชวนคลิก" />}>
          {(section) => <SectionFrame><HomepageSections sections={[section()]} /></SectionFrame>}
        </Show>
      </Gallery>

      <Gallery title="เมนูบนมือถือ" description="เมนูที่แสดงอยู่และมีปลายทางพร้อมใช้งาน ตามที่ตั้งไว้ในหน้าจัดการเมนู">
        <Show when={navTree().length > 0} fallback={<EmptyNote />}>
          <div class="max-h-64 max-w-sm overflow-y-auto rounded-media border border-border bg-surface-card p-2">
            <nav aria-label="เมนูหลัก (ตัวอย่าง)" class="flex flex-col gap-1">
              <For each={navTree()}>{(item) => <MobileNavRow item={item} depth={0} onNavigate={() => {}} />}</For>
            </nav>
          </div>
        </Show>
      </Gallery>

      <Gallery title="แถบประกาศด้านบน" description="แถบสีม่วงและแถบสีชมพู แถบสีชมพูแสดงเฉพาะหน้าจอเดสก์ท็อป">
        <SectionFrame>
          <PromoStrip />
          <UtilityBar />
        </SectionFrame>
      </Gallery>
    </div>
  );
}

function Gallery(props: { title: string; description?: string; children: JSX.Element }) {
  return (
    <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <div>
        <h2 class="text-base font-semibold text-ink">{props.title}</h2>
        <Show when={props.description}>
          <p class="mt-1 text-xs text-ink-gray">{props.description}</p>
        </Show>
      </div>
      {props.children}
    </div>
  );
}

function SectionFrame(props: { children: JSX.Element }) {
  return <div class="overflow-hidden rounded-media border border-border">{props.children}</div>;
}

function EmptyNote(props: { text?: string }) {
  return <p class="text-sm text-ink-gray">{props.text ?? "ยังไม่มีข้อมูลให้แสดงตัวอย่าง"}</p>;
}
