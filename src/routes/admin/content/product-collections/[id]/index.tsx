import { createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { CollectionRowActionsMenu } from "~/components/admin/content/CollectionRowActionsMenu";
import { LayersIcon } from "~/components/admin/icons";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { COLLECTION_STATUS_META } from "~/lib/adminCollections";
import { useAdminCollections } from "~/lib/adminCollectionStore";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminNavigation } from "~/lib/adminNavigationStore";
import { findNavigationReferences, describeNavigationReference } from "~/lib/adminNavigation";
import { findCollectionReferencesInPromotionPages } from "~/lib/masterDataRelations";
import { pushToast } from "~/lib/toast";

/** Header / Products / Status / Description / Metadata — simpler than Promotion Page's Detail page: no banner/schedule/CTA sections at all. */
export default function AdminProductCollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminCollections();
  const productStore = useAdminProducts();
  const contentStore = useAdminContent();
  const navigation = useAdminNavigation();
  const navigate = useNavigate();
  const collection = createMemo(() => store.getById(params.id));

  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [blockedDelete, setBlockedDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);

  /** §20/§45 dependency guard — a Collection must never be deleted while a NavigationItem still targets it or a Promotion Page/Homepage Section still sources from it. */
  const navigationRefs = createMemo(() => {
    const current = collection();
    return current ? findNavigationReferences(navigation.items(), "collection", current.id) : [];
  });
  const pageRefs = createMemo(() => {
    const current = collection();
    return current ? findCollectionReferencesInPromotionPages(current.id, contentStore.pages()) : [];
  });
  const requestDelete = () => {
    if (navigationRefs().length > 0 || pageRefs().length > 0) setBlockedDelete(true);
    else setConfirmDelete(true);
  };

  const confirmDeleteAction = async () => {
    const current = collection();
    if (!current) return;
    setActionLoading(true);
    await store.remove(current.id);
    setActionLoading(false);
    setConfirmDelete(false);
    pushToast(`ลบ "${current.name}" เรียบร้อยแล้ว`, "error");
    navigate("/admin/content/product-collections");
  };

  return (
    <Show
      when={collection()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "Product Collections", href: "/admin/content/product-collections" }]} />
          <EmptyState icon={<LayersIcon />} title="ไม่พบ Collection นี้" description="Collection นี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ารายการ" onAction={() => navigate("/admin/content/product-collections")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const c = current;
        const products = () => c().products.map((ref) => ({ ref, product: productStore.getById(ref.productId) })).filter((x) => x.product !== undefined);

        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb
              items={[
                { label: "แดชบอร์ด", href: "/admin" },
                { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" },
                { label: "Product Collections", href: "/admin/content/product-collections" },
                { label: c().name },
              ]}
            />
            <PageHeader
              title={c().name}
              description={c().id}
              actions={
                <div class="flex items-center gap-2">
                  <StatusBadge tone={COLLECTION_STATUS_META[c().status].tone}>{COLLECTION_STATUS_META[c().status].label}</StatusBadge>
                  <Button variant="primary" href={`/admin/content/product-collections/${c().id}/edit`}>
                    แก้ไข
                  </Button>
                  <CollectionRowActionsMenu
                    id={c().id}
                    name={c().name}
                    hideView
                    onDelete={requestDelete}
                    triggerClass="flex size-11 items-center justify-center rounded-pill border border-border text-ink-gray hover:bg-surface-pink"
                  />
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title="สินค้าใน Collection">
                  <Show when={products().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่ได้เลือกสินค้า</p>}>
                    <div class="flex flex-col gap-3">
                      <For each={products()}>
                        {({ ref, product }, index) => (
                          <div class="flex items-center gap-3">
                            <span class="flex size-6 shrink-0 items-center justify-center rounded-pill bg-surface-gray text-xs font-semibold text-ink-gray">{index() + 1}</span>
                            <img src={product!.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
                            <div class="min-w-0 flex-1">
                              <p class="truncate text-sm font-medium text-ink">{product!.name}</p>
                              <p class="text-xs text-ink-gray">
                                {product!.sku} · {formatAdminCurrency(product!.price)}
                                <Show when={ref.variantIds.length > 0}> · {ref.variantIds.length} ตัวเลือก</Show>
                              </p>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะ">
                  <StatusBadge tone={COLLECTION_STATUS_META[c().status].tone} class="w-fit">
                    {COLLECTION_STATUS_META[c().status].label}
                  </StatusBadge>
                </Section>

                <Section title="คำอธิบาย">
                  <p class="text-sm text-ink-gray">{c().description || "—"}</p>
                </Section>

                <Section title="ข้อมูลเพิ่มเติม">
                  <Row label="สร้างเมื่อ" value={c().createdAt} />
                  <Row label="แก้ไขล่าสุด" value={c().updatedAt} />
                </Section>
              </div>
            </div>

            <ConfirmDialog
              open={confirmDelete()}
              onOpenChange={setConfirmDelete}
              title="ลบ Collection?"
              description={`คุณต้องการลบ "${c().name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
              confirmLabel="ลบ"
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
                if (navigationRefs().length > 0) parts.push(`ถูกใช้งานใน Navigation: ${navigationRefs().map((r) => describeNavigationReference(r, navigation.items())).join(", ")}`);
                if (pageRefs().length > 0) parts.push(`ถูกใช้งานใน Promotion Page: ${pageRefs().map((r) => (r.isHomepage ? "Homepage" : r.pageName)).join(", ")}`);
                return `"${c().name}" — ${parts.join(" / ")} กรุณาย้ายหรือแก้ไขข้อมูลที่เกี่ยวข้องก่อนลบ Collection นี้`;
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

function Section(props: { title: string; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between gap-3 text-sm">
      <dt class="text-ink-gray">{props.label}</dt>
      <dd class="font-medium text-ink">{props.value}</dd>
    </div>
  );
}
