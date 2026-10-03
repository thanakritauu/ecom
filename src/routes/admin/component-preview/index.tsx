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
import { useAdminBanners } from "~/lib/adminBannerStore";
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
  const marketing = useAdminMarketing();
  const contentStore = useAdminContent();
  const bannerStore = useAdminBanners();
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
  const normalProduct = createMemo(() => productStore.products().find((p) => !p.discountPercent && !p.flashSaleEndsAt) ?? productStore.products()[0]);
  const discountProduct = createMemo(() => productStore.getById("best-1") ?? productStore.products().find((p) => p.discountPercent) ?? productStore.products()[0]);
  // "flash-2" is deliberately the catalog's one sold-out flash-sale demo card (see products.ts) — picked on purpose elsewhere to exercise "สินค้าหมด", but wrong for demonstrating the ribbon/countdown here, so this prefers an in-stock flash-sale product instead.
  const flashSaleProduct = createMemo(
    () => productStore.getById("flash-1") ?? productStore.products().find((p) => p.flashSaleEndsAt && (p.stockLeft ?? 1) > 0) ?? discountProduct(),
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

  // Banner (Promotion Banner section) — real uploaded Banner images + real destination, reshaped into a promotion_banner-type HomepageSection (the baseline homepage section of this type ships with no image).
  const bannerSection = createMemo<HomepageSection | undefined>(() => {
    const base = homepageSection("promotion_banner");
    const source = bannerStore.banners().find((b) => b.banners.desktop || b.banners.tablet || b.banners.mobile);
    if (!base || !source) return undefined;
    return { ...base, enabled: true, banners: source.banners, cta: { label: "", destination: source.destination } };
  });

  // Campaign — the Homepage's own real "campaign" section already ships with real title/description/products inline (campaignId unlinked), so no reshaping is needed at all.
  const campaignSection = createMemo(() => homepageSection("campaign"));

  // Product Section — the Homepage's own real "featured" product section, already enabled.
  const productSection = createMemo(() => homepageSection("product"));

  // Collection — a real Product Collection's id/name/description, reshaped into a product-type HomepageSection with productSource "collection" (no such section exists in the baseline homepage today).
  const collectionSection = createMemo<HomepageSection | undefined>(() => {
    const collection = collectionStore.collections()[0];
    if (!collection) return undefined;
    return {
      id: `gallery-collection-${collection.id}`,
      type: "product",
      name: collection.name,
      enabled: true,
      eyebrow: "คอลเลกชัน",
      title: collection.name,
      description: collection.description,
      banners: emptyBanners(),
      assets: [],
      cta: emptyCta(),
      contentLayout: "image-text",
      productSource: "collection",
      products: [],
      collectionId: collection.id,
      categoryId: "",
      campaignId: "",
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  });

  // Content Section — the Homepage's own real "content" section, previewed regardless of its current enabled flag.
  const contentSection = createMemo<HomepageSection | undefined>(() => {
    const s = homepageSection("content");
    return s ? { ...s, enabled: true } : undefined;
  });

  // Navigation / Mobile Navigation — identical filtered tree + identical MobileNavRow renderer the Navigation module's own Fixed Preview uses (see /admin/navigation).
  const navTree = createMemo(() => filterVisibleNavigationTree(buildNavigationTree(navigation.items(), navigationLookups)));

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "Preview คอมโพเนนต์" }]} />
      <PageHeader
        title="Preview คอมโพเนนต์"
        description="ตัวอย่างการแสดงผลของทุก Component จริงจากหน้าร้าน — ใช้ Component เดียวกันกับที่ลูกค้าเห็นจริง ไม่ใช่หน้าตาจำลอง ข้อมูลที่ใช้คือข้อมูลจริงที่มีอยู่แล้วในระบบ (ไม่มีการสร้างข้อมูลปลอมขึ้นมาใหม่)"
      />

      <Gallery title="Product Card" description="สถานะปกติ — ยังไม่มีส่วนลด/แฟลชเซล">
        <Show when={normalProduct()} fallback={<EmptyNote />}>
          {(p) => <div class="max-w-[260px]"><ProductCard product={p()} /></div>}
        </Show>
      </Gallery>

      <Gallery title="Product Card + Discount / Product Image / Product Variant" description="สินค้าที่มีส่วนลด พร้อมตัวเลือกสี (Variant) หลายรายการ — ภาพสินค้าและตัวเลือกสีเป็นส่วนหนึ่งของ Product Card เดียวกันนี้ (Frontend ไม่มี Component แยกสำหรับภาพ/ตัวเลือกสีโดยเฉพาะ)">
        <Show when={discountProduct()} fallback={<EmptyNote />}>
          {(p) => <div class="max-w-[260px]"><ProductCard product={p()} /></div>}
        </Show>
      </Gallery>

      <Gallery title="Product Card + Flash Sale Badge" description="ริบบอนแฟลชเซล + ตัวนับถอยหลัง (หากเวลาสิ้นสุดของข้อมูลตัวอย่างผ่านไปแล้ว ตัวนับอาจแสดง 0 — เป็นพฤติกรรมจริงของ Component เดียวกับหน้าร้าน ไม่ใช่ข้อผิดพลาด)">
        <Show when={flashSaleProduct()} fallback={<EmptyNote />}>
          {(p) => <div class="max-w-[260px]"><ProductCard product={p()} /></div>}
        </Show>
      </Gallery>

      <Gallery title="Discount Badge / Price / Rating" description="แยกเฉพาะส่วนป้ายส่วนลด ราคา และคะแนนรีวิว จากสินค้าจริงรายการเดียวกัน">
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

      <Gallery title="CTA Button" description="ทุก Variant ของปุ่มที่ใช้ทั้ง Admin และหน้าร้าน">
        <div class="flex flex-wrap items-center gap-3 rounded-media bg-ink p-4">
          <Button variant="primary">Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="white">White</Button>
        </div>
      </Gallery>

      <Gallery title="Coupon" description="คูปองจริงจากโมดูลการตลาด (Marketing → คูปอง) แปลงข้อมูลให้ตรงกับรูปแบบที่ Component ต้องการ (ปุ่ม “เก็บเลย” ใน Preview นี้ไม่มีผลต่อกระเป๋าคูปองจริงของลูกค้า)">
        <Show when={previewCoupon()} fallback={<EmptyNote />}>
          {(coupon) => (
            <div class="max-w-md overflow-hidden rounded-media border border-border">
              <CouponCard
                coupon={coupon()}
                collected={couponCollected()}
                onCollect={async () => {
                  setCouponCollected(true);
                  pushToast("นี่คือ Preview — ไม่มีการเก็บคูปองจริง", "success");
                }}
              />
            </div>
          )}
        </Show>
      </Gallery>

      <Gallery title="Banner" description="Section ประเภท Promotion Banner — ใช้ภาพและปลายทางจริงจากโมดูลแบนเนอร์ (Content → แบนเนอร์)">
        <Show when={bannerSection()} fallback={<EmptyNote text="ยังไม่มี Banner ที่อัปโหลดรูปไว้ในระบบ" />}>
          {(section) => <SectionFrame><HomepageSections sections={[section()]} /></SectionFrame>}
        </Show>
      </Gallery>

      <Gallery title="Hero Banner" description="Section ประเภท Hero จากหน้าแรกจริง (แสดงผลไม่ว่าสถานะ enabled ปัจจุบันจะเป็นเท่าใด เช่นเดียวกับ Full Page Preview ของหน้าโปรโมชั่น)">
        <Show when={heroSection()} fallback={<EmptyNote />}>
          {(section) => <SectionFrame><AdminHeroSlide section={section()} /></SectionFrame>}
        </Show>
      </Gallery>

      <Gallery title="Collection" description="Product Section ที่ดึงสินค้าจากคอลเลกชันจริง (Content → คอลเลกชันสินค้า)">
        <Show when={collectionSection()} fallback={<EmptyNote text="ยังไม่มีคอลเลกชันสินค้าในระบบ" />}>
          {(section) => <SectionFrame><HomepageSections sections={[section()]} /></SectionFrame>}
        </Show>
      </Gallery>

      <Gallery title="Campaign" description="Section ประเภท Campaign จากหน้าแรกจริง">
        <Show when={campaignSection()} fallback={<EmptyNote />}>
          {(section) => <SectionFrame><HomepageSections sections={[section()]} /></SectionFrame>}
        </Show>
      </Gallery>

      <Gallery title="Product Section" description="Section สินค้าจริงจากหน้าแรก (แหล่งที่มา: สินค้าแนะนำ/Featured)">
        <Show when={productSection()} fallback={<EmptyNote />}>
          {(section) => <SectionFrame><HomepageSections sections={[section()]} /></SectionFrame>}
        </Show>
      </Gallery>

      <Gallery title="Content Section" description="Section เนื้อหาอิสระจากหน้าแรกจริง (แสดงผลไม่ว่าสถานะ enabled ปัจจุบันจะเป็นเท่าใด)">
        <Show when={contentSection()} fallback={<EmptyNote />}>
          {(section) => <SectionFrame><HomepageSections sections={[section()]} /></SectionFrame>}
        </Show>
      </Gallery>

      <Gallery title="CTA Section" description="ยังไม่มี Section ประเภท CTA ที่ตั้งค่าไว้ในหน้าแรกขณะนี้ — เมื่อมีการสร้าง Section ประเภทนี้ในหน้าแรก ตัวอย่างจะแสดงที่นี่โดยอัตโนมัติ (ไม่สร้างข้อมูลจำลองขึ้นมาแทน)">
        <EmptyNote text="ยังไม่มี CTA Section ในหน้าแรก" />
      </Gallery>

      <Gallery title="Navigation / Mobile Navigation" description="รายการเดียวกับที่ใช้ใน “จัดการเมนู” — filter visible + target พร้อมใช้งานเหมือนกันทุกประการ, ใช้ MobileNavRow ตัวจริงจาก MobileMenu.tsx">
        <Show when={navTree().length > 0} fallback={<EmptyNote />}>
          <div class="max-h-64 max-w-sm overflow-y-auto rounded-media border border-border bg-surface-card p-2">
            <nav aria-label="เมนูหลัก (ตัวอย่าง)" class="flex flex-col gap-1">
              <For each={navTree()}>{(item) => <MobileNavRow item={item} depth={0} onNavigate={() => {}} />}</For>
            </nav>
          </div>
        </Show>
      </Gallery>

      <Gallery title="Promotion Strip" description="แถบสีม่วง + แถบสีชมพู ตัวจริงจาก Header (แถบสีชมพูแสดงเฉพาะจอกว้าง lg ขึ้นไป เช่นเดียวกับหน้าร้านจริง)">
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
  return <p class="text-sm text-ink-gray">{props.text ?? "ยังไม่มีข้อมูลจริงให้แสดงตัวอย่างในขณะนี้"}</p>;
}
