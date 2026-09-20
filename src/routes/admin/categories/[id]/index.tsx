import { createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { CategoryRowActionsMenu } from "~/components/admin/categories/CategoryRowActionsMenu";
import { CatalogIcon, ImageIcon } from "~/components/admin/icons";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { CATEGORY_STATUS_META } from "~/lib/adminCategories";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { productsInCategory } from "~/lib/masterDataRelations";
import { pushToast } from "~/lib/toast";

/** Header / Products / Status / Description / Metadata — mirrors `product-collections/[id]/index.tsx`, plus the thumbnail/slug a taxonomy entry needs. */
export default function AdminCategoryDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminCategories();
  const productStore = useAdminProducts();
  const navigate = useNavigate();
  const category = createMemo(() => store.getById(params.id));

  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);

  const confirmDeleteAction = async () => {
    const current = category();
    if (!current) return;
    setActionLoading(true);
    await store.remove(current.id);
    setActionLoading(false);
    setConfirmDelete(false);
    pushToast(`ลบ "${current.name}" เรียบร้อยแล้ว`, "error");
    navigate("/admin/categories");
  };

  return (
    <Show
      when={category()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "แคตตาล็อก", href: "/admin/products" }, { label: "หมวดหมู่", href: "/admin/categories" }]} />
          <EmptyState icon={<CatalogIcon />} title="ไม่พบหมวดหมู่นี้" description="หมวดหมู่นี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ารายการ" onAction={() => navigate("/admin/categories")} class="bg-white shadow-card" />
        </div>
      }
    >
      {(current) => {
        const c = current;
        /** Category = Product Classification — every product that classifies *itself* under this Category via `ProductForm`'s Category field. Categories no longer curate their own separate "featured" product list (that's Collection's job — see Architecture Cleanup & Source of Truth). */
        const classifiedProducts = () => productsInCategory(c().id, productStore.products());

        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb
              items={[
                { label: "แดชบอร์ด", href: "/admin" },
                { label: "แคตตาล็อก", href: "/admin/products" },
                { label: "หมวดหมู่", href: "/admin/categories" },
                { label: c().name },
              ]}
            />
            <PageHeader
              title={c().name}
              description={`/${c().slug}`}
              actions={
                <div class="flex items-center gap-2">
                  <StatusBadge tone={CATEGORY_STATUS_META[c().status].tone}>{CATEGORY_STATUS_META[c().status].label}</StatusBadge>
                  <Button variant="primary" href={`/admin/categories/${c().id}/edit`}>
                    แก้ไข
                  </Button>
                  <CategoryRowActionsMenu
                    id={c().id}
                    name={c().name}
                    hideView
                    onDelete={() => setConfirmDelete(true)}
                    triggerClass="flex size-11 items-center justify-center rounded-pill border border-surface-gray text-ink-gray hover:bg-surface-pink"
                  />
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title={`สินค้าในหมวดหมู่นี้ (${classifiedProducts().length})`}>
                  <p class="-mt-1 text-xs text-ink-gray">สินค้าที่ตั้งค่าหมวดหมู่นี้ไว้ในหน้าแก้ไขสินค้า</p>
                  <Show when={classifiedProducts().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีสินค้าในหมวดหมู่นี้</p>}>
                    <div class="flex flex-col gap-3">
                      <For each={classifiedProducts()}>
                        {(product) => (
                          <a href={`/admin/products/${product.id}`} class="flex items-center gap-3 rounded-card p-1.5 transition-colors duration-150 hover:bg-surface-pink/30">
                            <img src={product.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
                            <div class="min-w-0 flex-1">
                              <p class="truncate text-sm font-medium text-ink">{product.name}</p>
                              <p class="text-xs text-ink-gray">
                                {product.sku} · {formatAdminCurrency(product.price)}
                              </p>
                            </div>
                          </a>
                        )}
                      </For>
                    </div>
                  </Show>
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="รูปภาพ">
                  <div class="flex size-24 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
                    <Show when={c().image} fallback={<ImageIcon class="size-6" />}>
                      <img src={c().image} alt="" class="size-full object-cover" />
                    </Show>
                  </div>
                </Section>

                <Section title="สถานะ">
                  <StatusBadge tone={CATEGORY_STATUS_META[c().status].tone} class="w-fit">
                    {CATEGORY_STATUS_META[c().status].label}
                  </StatusBadge>
                </Section>

                <Section title="คำอธิบาย">
                  <p class="text-sm text-ink-gray">{c().description || "—"}</p>
                </Section>

                <Section title="ข้อมูลเพิ่มเติม">
                  <Row label="ลำดับการแสดงผล" value={String(c().sortOrder)} />
                  <Row label="สร้างเมื่อ" value={c().createdAt} />
                  <Row label="แก้ไขล่าสุด" value={c().updatedAt} />
                </Section>
              </div>
            </div>

            <ConfirmDialog
              open={confirmDelete()}
              onOpenChange={setConfirmDelete}
              title="ลบหมวดหมู่?"
              description={`คุณต้องการลบ "${c().name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
              confirmLabel="ลบ"
              tone="danger"
              loading={actionLoading()}
              onConfirm={confirmDeleteAction}
            />
          </div>
        );
      }}
    </Show>
  );
}

function Section(props: { title: string; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card sm:p-5">
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
