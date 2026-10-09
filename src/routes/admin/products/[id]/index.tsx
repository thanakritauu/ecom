import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { ProductRowActionsMenu } from "~/components/admin/products/ProductRowActionsMenu";
import { ProductVariantImages } from "~/components/admin/products/ProductVariantImages";
import { CatalogIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import {
  useAdminProducts,
  getStockStatus,
  STOCK_STATUS_META,
  stockStatusLabel,
  ADMIN_PRODUCT_STATUS_META,
  type AdminProduct,
  type AdminProductStatus,
} from "~/lib/adminProductStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { useAdminCollections } from "~/lib/adminCollectionStore";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminNavigation } from "~/lib/adminNavigationStore";
import { findNavigationReferences, describeNavigationReference } from "~/lib/adminNavigation";
import { collectionsContainingProduct, findProductReferencesInPromotionPages } from "~/lib/masterDataRelations";
import { pushToast } from "~/lib/toast";
import { useAdminTiktokClips } from "~/lib/adminTiktokClips";
import { ReviewStars } from "~/components/admin/reviews/ReviewStars";
import { TiktokClipCover } from "~/components/admin/reviews/TiktokClipCover";

/** Fallback only for products saved before `categoryId` existed (see `normalizeAdminProduct`). */
const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  cushion: "คุชชั่น",
  eye: "ตา",
  cheek: "แก้ม",
  lip: "ปาก",
  skincare: "สกินแคร์",
  "suncare-bodycare": "กันแดด & บอดี้แคร์",
};

export default function AdminProductDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminProducts();
  const categoryStore = useAdminCategories();
  const collectionStore = useAdminCollections();
  const contentStore = useAdminContent();
  const navigation = useAdminNavigation();
  const tiktokClips = useAdminTiktokClips();
  const navigate = useNavigate();

  const product = createMemo(() => store.getById(params.id));

  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [confirmToggle, setConfirmToggle] = createSignal(false);
  const [blockedDelete, setBlockedDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);

  /** §21/§46 dependency guard — a Product must never be deleted while a Collection still curates it, a NavigationItem still targets it, or a Promotion Page/Homepage Section's CTA (or legacy flat product list) still references it. */
  const collectionRefs = createMemo(() => {
    const current = product();
    return current ? collectionsContainingProduct(current.id, collectionStore.collections()) : [];
  });
  const navigationRefs = createMemo(() => {
    const current = product();
    return current ? findNavigationReferences(navigation.items(), "product", current.id) : [];
  });
  const pageRefs = createMemo(() => {
    const current = product();
    return current ? findProductReferencesInPromotionPages(current.id, contentStore.pages()) : [];
  });
  const requestDelete = () => {
    if (collectionRefs().length > 0 || navigationRefs().length > 0 || pageRefs().length > 0) setBlockedDelete(true);
    else setConfirmDelete(true);
  };

  const handleDuplicate = async () => {
    const current = product();
    if (!current) return;
    const duplicate = await store.duplicateProduct(current.id);
    pushToast(`ทำสำเนา "${current.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/products/${duplicate.id}/edit`);
  };

  const confirmToggleAction = async () => {
    const current = product();
    if (!current) return;
    const nextStatus: AdminProductStatus = current.status === "active" ? "disabled" : "active";
    setActionLoading(true);
    await store.setStatus(current.id, nextStatus);
    setActionLoading(false);
    setConfirmToggle(false);
    pushToast(nextStatus === "disabled" ? "ปิดการขายสินค้าแล้ว" : "เปิดการขายสินค้าแล้ว", "success");
  };

  const confirmDeleteAction = async () => {
    const current = product();
    if (!current) return;
    setActionLoading(true);
    await store.deleteProduct(current.id);
    setActionLoading(false);
    setConfirmDelete(false);
    pushToast(`ลบ "${current.name}" เรียบร้อยแล้ว`, "error");
    navigate("/admin/products");
  };

  return (
    <Show
      when={product()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สินค้า", href: "/admin/products" }]} />
          <EmptyState icon={<CatalogIcon />} title="ไม่พบสินค้านี้" description="สินค้าอาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าสินค้า" onAction={() => navigate("/admin/products")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const p = () => current() as AdminProduct;
        const [selectedVariantId, setSelectedVariantId] = createSignal<string | undefined>(p().adminVariants[0]?.id);
        // `p()` can point at a different product across navigations within
        // this same mounted route (e.g. Related Products) without this
        // Show's callback re-running — this effect keeps selection in sync
        // regardless.
        createEffect(() => setSelectedVariantId(p().adminVariants[0]?.id));
        const selectedVariant = () => p().adminVariants.find((v) => v.id === selectedVariantId());
        // Variant Image Upload — Final Override: Product Gallery is a fixed,
        // independent collection — it never changes based on which variant
        // is selected, and a variant's own images never fall back to it.
        const galleryImages = () => (p().images?.length ? p().images! : [p().image]);
        // Global UI Correction — Final Overrides #6: selecting a variant
        // updates Price/Stock alongside the gallery when that variant
        // carries its own values.
        const displayPrice = () => selectedVariant()?.price ?? p().price;
        const displayStock = () => selectedVariant()?.stock ?? p().stockLeft ?? 0;
        const displayStockStatus = () => getStockStatus({ stockLeft: displayStock(), lowStockThreshold: p().lowStockThreshold });

        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สินค้า", href: "/admin/products" }, { label: p().name }]} />
            <PageHeader
              title={p().name}
              description={p().sku}
              actions={
                <div class="flex items-center gap-2">
                  <Button variant="primary" href={`/admin/products/${p().id}/edit`}>
                    แก้ไขสินค้า
                  </Button>
                  <ProductRowActionsMenu
                    product={p()}
                    hideView
                    onDuplicate={handleDuplicate}
                    onToggleStatus={() => setConfirmToggle(true)}
                    onDelete={requestDelete}
                    triggerClass="flex size-11 items-center justify-center rounded-pill border border-border text-ink-gray hover:bg-surface-pink"
                  />
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
                  <h2 class="text-base font-semibold text-ink">รูปภาพสินค้า</h2>
                  <div class="flex gap-3 overflow-x-auto">
                    <For each={galleryImages()}>{(src) => <img src={src} alt="" class="size-40 shrink-0 rounded-media object-cover" />}</For>
                  </div>
                </div>

                <Show when={p().adminVariants.length > 0}>
                  <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
                    <h2 class="text-base font-semibold text-ink">ตัวเลือกสินค้า</h2>
                    <ProductVariantImages
                      variants={p().adminVariants}
                      selectedId={selectedVariantId()}
                      onSelect={setSelectedVariantId}
                    />
                    {/* Variant Image Upload — Final Override #4/9: a distinct
                        block, visually separate from the Product Gallery card
                        above — these photos come only from the selected
                        variant's own `images`, never the Gallery. */}
                    <div class="border-t border-border pt-4">
                      <h3 class="mb-2 text-sm font-semibold text-ink">
                        รูปตัวเลือก{selectedVariant() ? ` ${selectedVariant()!.label}` : ""}
                      </h3>
                      <Show
                        when={(selectedVariant()?.images?.length ?? 0) > 0}
                        fallback={<p class="text-sm text-ink-gray">ตัวเลือกนี้ยังไม่มีรูปภาพของตัวเอง</p>}
                      >
                        <div class="flex gap-3 overflow-x-auto">
                          <For each={selectedVariant()?.images ?? []}>{(src) => <img src={src} alt="" class="size-28 shrink-0 rounded-media object-cover" />}</For>
                        </div>
                      </Show>
                    </div>
                  </div>
                </Show>

                <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
                  <h2 class="text-base font-semibold text-ink">คำอธิบายสินค้า</h2>
                  <p class="text-sm text-ink-gray">{p().description ?? "ยังไม่มีคำอธิบายสินค้า"}</p>
                </div>

                {/* Read-only — what this product's PDP review area shows: its TikTok clips first, then its own reviews. Managed under รีวิว. */}
                <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
                  <div class="flex items-center justify-between gap-2">
                    <h2 class="text-base font-semibold text-ink">คลิปรีวิว TikTok ({tiktokClips.clipsForProduct(p().id).length})</h2>
                    <Button variant="outline" size="sm" href="/admin/reviews/tiktok">
                      จัดการคลิป
                    </Button>
                  </div>
                  <Show
                    when={tiktokClips.clipsForProduct(p().id).length > 0}
                    fallback={<p class="text-sm text-ink-gray">ยังไม่มีคลิปของสินค้านี้ หน้าสินค้าจะแสดงคลิปอื่นของ Charmiss แทน</p>}
                  >
                    <div class="flex gap-3 overflow-x-auto">
                      <For each={tiktokClips.clipsForProduct(p().id)}>
                        {(clip) => (
                          <div class="flex w-24 shrink-0 flex-col gap-1" classList={{ "opacity-60": !clip.active }}>
                            <TiktokClipCover clip={clip} class="w-24" />
                            <p class="truncate text-xs text-ink-gray">@{clip.author}</p>
                            <Show when={!clip.active}>
                              <StatusBadge tone="neutral" class="w-fit">ซ่อน</StatusBadge>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>

                <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
                  <h2 class="text-base font-semibold text-ink">ข้อมูลตัวเลือกสินค้า</h2>
                  <Show when={p().adminVariants.length > 0} fallback={<p class="text-sm text-ink-gray">สินค้านี้ไม่มีตัวเลือก</p>}>
                    <div class="overflow-x-auto">
                      <table class="w-full text-left text-sm">
                        <thead>
                          <tr class="border-b border-border text-xs uppercase text-ink-placeholder">
                            <th class="py-2 pr-3">ชื่อตัวเลือก</th>
                            <th class="py-2 pr-3">SKU</th>
                            <th class="py-2 pr-3">ราคา</th>
                            <th class="py-2 pr-3">สต๊อก</th>
                            <th class="py-2">รีวิว</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={p().adminVariants}>
                            {(v) => (
                              <tr class="border-b border-border last:border-0">
                                <td class="py-2 pr-3 text-ink">{v.label}</td>
                                <td class="py-2 pr-3 text-ink-gray">{v.sku}</td>
                                <td class="py-2 pr-3 text-ink-gray">{v.price !== undefined ? formatAdminCurrency(v.price) : "-"}</td>
                                <td class="py-2 pr-3 text-ink-gray">
                                  {v.stock}
                                  <Show when={v.soldOut || v.stock <= 0}>
                                    <StatusBadge tone="danger" class="ml-2">สินค้าหมด</StatusBadge>
                                  </Show>
                                </td>
                                <td class="py-2 text-ink-gray">{(p().reviews ?? []).filter((r) => r.variantId === v.id).length}</td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </Show>
                </div>
              </div>

              <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
                  <h2 class="text-base font-semibold text-ink">ราคา</h2>
                  <div class="flex items-baseline gap-2">
                    <p class="text-2xl font-bold text-ink">{formatAdminCurrency(displayPrice())}</p>
                    <Show when={p().compareAtPrice}>
                      <p class="text-sm text-ink-gray line-through">{formatAdminCurrency(p().compareAtPrice!)}</p>
                    </Show>
                  </div>
                  <Show when={selectedVariant()}>{(v) => <p class="text-xs text-ink-placeholder">ตัวเลือก: {v().label}</p>}</Show>
                </div>

                <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
                  <div class="flex items-center justify-between gap-2">
                    <h2 class="text-base font-semibold text-ink">รีวิวและยอดขาย</h2>
                    <Button variant="outline" size="sm" href="/admin/reviews">
                      ดูรีวิว
                    </Button>
                  </div>
                  <Show when={p().rating !== undefined} fallback={<p class="text-sm text-ink-gray">ไม่แสดงคะแนนบนการ์ด</p>}>
                    <div class="flex items-center gap-2">
                      <p class="text-2xl font-bold text-ink">{p().rating!.toFixed(1)}</p>
                      <ReviewStars rating={p().rating!} />
                    </div>
                  </Show>
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="จำนวนรีวิวบนการ์ด" value={p().reviewCount !== undefined ? String(p().reviewCount) : "-"} />
                    <Row label="รีวิวในระบบ" value={String(p().reviews?.length ?? 0)} />
                    <Row label="ขายแล้ว" value={p().soldCount !== undefined ? `${p().soldCount} ชิ้น` : "-"} />
                  </dl>
                </div>

                <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
                  <h2 class="text-base font-semibold text-ink">สต๊อกสินค้า</h2>
                  <p class="text-2xl font-bold text-ink">{displayStock()}</p>
                  <StatusBadge tone={STOCK_STATUS_META[displayStockStatus()].tone} class="w-fit">
                    {stockStatusLabel({ stockLeft: displayStock(), lowStockThreshold: p().lowStockThreshold })}
                  </StatusBadge>
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="ใกล้หมดเมื่อเหลือ" value={`${p().lowStockThreshold} ชิ้น`} />
                  </dl>
                </div>

                <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
                  <h2 class="text-base font-semibold text-ink">สถานะ</h2>
                  <StatusBadge tone={ADMIN_PRODUCT_STATUS_META[p().status].tone} class="w-fit">
                    {ADMIN_PRODUCT_STATUS_META[p().status].label}
                  </StatusBadge>
                  <p class="text-xs text-ink-gray">{p().status === "active" ? "แสดงบนหน้าร้านและลูกค้าสั่งซื้อได้" : "ไม่แสดงบนหน้าร้าน"}</p>
                </div>

                <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
                  <h2 class="text-base font-semibold text-ink">ข้อมูลสินค้า</h2>
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="SKU" value={p().sku} />
                    <Row label="หมวดหมู่" value={categoryStore.getById(p().categoryId)?.name ?? LEGACY_CATEGORY_LABELS[p().category ?? ""] ?? "-"} />
                    <Row label="แก้ไขล่าสุด" value={p().updatedAt} />
                  </dl>
                </div>
              </div>
            </div>

            <ConfirmDialog
              open={confirmToggle()}
              onOpenChange={setConfirmToggle}
              title={p().status === "active" ? "ปิดการขายสินค้านี้?" : "เปิดการขายสินค้านี้?"}
              description={`"${p().name}" จะ${p().status === "active" ? "ถูกซ่อนจากหน้าร้านทุกหน้า" : "แสดงบนหน้าร้านและลูกค้าสั่งซื้อได้"}`}
              confirmLabel={p().status === "active" ? "ปิดการขาย" : "เปิดการขาย"}
              loading={actionLoading()}
              onConfirm={confirmToggleAction}
            />

            <ConfirmDialog
              open={confirmDelete()}
              onOpenChange={setConfirmDelete}
              title="ลบสินค้า?"
              description={`คุณต้องการลบ "${p().name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
              confirmLabel="ลบสินค้า"
              tone="danger"
              loading={actionLoading()}
              onConfirm={confirmDeleteAction}
            />

            <ConfirmDialog
              open={blockedDelete()}
              onOpenChange={setBlockedDelete}
              title="ไม่สามารถลบได้"
              description={(() => {
                const parts: string[] = [];
                if (collectionRefs().length > 0) parts.push(`ถูกใช้งานในกลุ่มสินค้าพิเศษ: ${collectionRefs().map((c) => c.name).join(", ")}`);
                if (navigationRefs().length > 0) parts.push(`ถูกใช้งานในเมนู: ${navigationRefs().map((r) => describeNavigationReference(r, navigation.items())).join(", ")}`);
                if (pageRefs().length > 0) parts.push(`ถูกใช้งานในหน้าแคมเปญ: ${pageRefs().map((r) => (r.isHomepage ? "หน้าแรก" : r.pageName)).join(", ")}`);
                return `สินค้า "${p().name}" ${parts.join(" / ")} กรุณาย้ายหรือแก้ไขข้อมูลที่เกี่ยวข้องก่อนลบสินค้านี้`;
              })()}
              confirmLabel="เข้าใจแล้ว"
              cancelLabel="ปิด"
              onConfirm={() => setBlockedDelete(false)}
            />
          </div>
        );
      }}
    </Show>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between gap-3">
      <dt class="text-ink-gray">{props.label}</dt>
      <dd class="font-medium text-ink">{props.value}</dd>
    </div>
  );
}
