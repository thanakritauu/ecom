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
import { COLLECTION_STATUS_META, collectionPublishProblems } from "~/lib/adminCollections";
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
  const [confirmToggle, setConfirmToggle] = createSignal(false);
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

  /** Draft-first: same checks as the form's บันทึกและเผยแพร่; refuses with a toast naming what's missing. */
  const publish = async () => {
    const current = collection();
    if (!current) return;
    const problems = collectionPublishProblems(current);
    if (problems.length > 0) {
      pushToast(`เผยแพร่ "${current.name}" ไม่ได้`, "error", `ยังกรอกข้อมูลไม่ครบ: ${problems.join(", ")}`);
      return;
    }
    await store.setStatus(current.id, "active");
    pushToast(`เผยแพร่ "${current.name}" แล้ว`, "success");
  };

  const confirmToggleAction = async () => {
    const current = collection();
    if (!current) return;
    setActionLoading(true);
    try {
      await store.setStatus(current.id, current.status === "active" ? "inactive" : "active");
      pushToast(current.status === "active" ? "ปิดใช้งานกลุ่มสินค้าพิเศษแล้ว" : "เปิดใช้งานกลุ่มสินค้าพิเศษแล้ว", "success");
      setConfirmToggle(false);
    } catch {
      pushToast("เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Show
      when={collection()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สินค้า", href: "/admin/products" }, { label: "กลุ่มสินค้าพิเศษ", href: "/admin/content/product-collections" }]} />
          <EmptyState icon={<LayersIcon />} title="ไม่พบกลุ่มสินค้าพิเศษนี้" description="กลุ่มสินค้าพิเศษนี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ากลุ่มสินค้าพิเศษ" onAction={() => navigate("/admin/content/product-collections")} class="bg-surface-card shadow-card" />
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
                { label: "สินค้า", href: "/admin/products" },
                { label: "กลุ่มสินค้าพิเศษ", href: "/admin/content/product-collections" },
                { label: c().name },
              ]}
            />
            <PageHeader
              title={c().name}
              description={c().id}
              actions={
                <div class="flex items-center gap-2">
                  <Button variant="primary" href={`/admin/content/product-collections/${c().id}/edit`}>
                    แก้ไขกลุ่มสินค้าพิเศษ
                  </Button>
                  <CollectionRowActionsMenu
                    id={c().id}
                    name={c().name}
                    isActive={c().status === "active"}
                    isDraft={c().status === "draft"}
                    onToggleStatus={() => (c().status === "draft" ? void publish() : setConfirmToggle(true))}
                    hideView
                    onDelete={requestDelete}
                    triggerClass="flex size-11 items-center justify-center rounded-pill border border-border text-ink-gray hover:bg-surface-pink"
                  />
                </div>
              }
            />

            <div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div class="flex min-w-0 flex-col gap-6">
                <Section title="สินค้าในกลุ่มสินค้าพิเศษ">
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
                                {product!.sku} ราคา {formatAdminCurrency(product!.price)}
                                <Show when={ref.variantIds.length > 0}> เลือกไว้ {ref.variantIds.length} ตัวเลือก</Show>
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

                <Section title="ใช้งานอยู่ที่">
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="หน้า" value={pageRefs().length > 0 ? [...new Set(pageRefs().map((r) => (r.isHomepage ? "หน้าแรก" : r.pageName)))].join(", ") : "-"} />
                    <Row label="เมนู" value={navigationRefs().length > 0 ? navigationRefs().map((r) => r.label).join(", ") : "-"} />
                  </dl>
                </Section>

                <Section title="ข้อมูลเพิ่มเติม">
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="สร้างเมื่อ" value={c().createdAt || "-"} />
                    <Row label="แก้ไขล่าสุด" value={c().updatedAt || "-"} />
                  </dl>
                </Section>
              </div>
            </div>

            <ConfirmDialog
              open={confirmDelete()}
              onOpenChange={setConfirmDelete}
              title="ลบกลุ่มสินค้าพิเศษ?"
              description={`คุณต้องการลบ "${c().name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
              confirmLabel="ลบกลุ่มสินค้าพิเศษ"
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
                if (navigationRefs().length > 0) parts.push(`ถูกใช้งานในเมนู: ${navigationRefs().map((r) => describeNavigationReference(r, navigation.items())).join(", ")}`);
                if (pageRefs().length > 0) parts.push(`ถูกใช้งานในหน้า: ${pageRefs().map((r) => (r.isHomepage ? "หน้าแรก" : r.pageName)).join(", ")}`);
                return `กลุ่มสินค้าพิเศษ "${c().name}" ${parts.join(" / ")} กรุณาย้ายหรือแก้ไขข้อมูลที่เกี่ยวข้องก่อนลบกลุ่มสินค้าพิเศษนี้`;
              })()}
              confirmLabel="เข้าใจแล้ว"
              cancelLabel="ปิด"
              onConfirm={() => setBlockedDelete(false)}
            />

            <ConfirmDialog
              open={confirmToggle()}
              onOpenChange={setConfirmToggle}
              title={c().status === "active" ? "ปิดใช้งานกลุ่มสินค้าพิเศษนี้?" : "เปิดใช้งานกลุ่มสินค้าพิเศษนี้?"}
              description={c().status === "active" ? `"${c().name}" จะไม่แสดงสินค้าในส่วนที่ใช้กลุ่มสินค้าพิเศษนี้บนหน้าร้าน` : `"${c().name}" จะกลับมาแสดงสินค้าบนหน้าร้าน`}
              confirmLabel={c().status === "active" ? "ปิดใช้งาน" : "เปิดใช้งาน"}
              loading={actionLoading()}
              onConfirm={confirmToggleAction}
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
    <div class="flex items-center justify-between gap-3">
      <dt class="shrink-0 text-ink-gray">{props.label}</dt>
      <dd class="text-right font-medium text-ink">{props.value}</dd>
    </div>
  );
}
