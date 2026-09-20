import { createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { BrandRowActionsMenu } from "~/components/admin/brands/BrandRowActionsMenu";
import { LayersIcon, ImageIcon } from "~/components/admin/icons";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { BRAND_STATUS_META } from "~/lib/adminBrands";
import { useAdminBrands } from "~/lib/adminBrandStore";
import { productsInBrand } from "~/lib/masterDataRelations";
import { pushToast } from "~/lib/toast";

/** Header / Products / Status / Description / Metadata — mirrors `categories/[id]/index.tsx`. */
export default function AdminBrandDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminBrands();
  const productStore = useAdminProducts();
  const navigate = useNavigate();
  const brand = createMemo(() => store.getById(params.id));

  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);

  const confirmDeleteAction = async () => {
    const current = brand();
    if (!current) return;
    setActionLoading(true);
    await store.remove(current.id);
    setActionLoading(false);
    setConfirmDelete(false);
    pushToast(`ลบ "${current.name}" เรียบร้อยแล้ว`, "error");
    navigate("/admin/brands");
  };

  return (
    <Show
      when={brand()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "แคตตาล็อก", href: "/admin/products" }, { label: "แบรนด์", href: "/admin/brands" }]} />
          <EmptyState icon={<LayersIcon />} title="ไม่พบแบรนด์นี้" description="แบรนด์นี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ารายการ" onAction={() => navigate("/admin/brands")} class="bg-white shadow-card" />
        </div>
      }
    >
      {(current) => {
        const b = current;
        /** Brand = Product Classification — every product that classifies *itself* under this Brand via `ProductForm`'s Brand field. Brands no longer curate their own separate "featured" product list (that's Collection's job — see Architecture Cleanup & Source of Truth). */
        const classifiedProducts = () => productsInBrand(b().id, productStore.products());

        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb
              items={[
                { label: "แดชบอร์ด", href: "/admin" },
                { label: "แคตตาล็อก", href: "/admin/products" },
                { label: "แบรนด์", href: "/admin/brands" },
                { label: b().name },
              ]}
            />
            <PageHeader
              title={b().name}
              description={`/${b().slug}`}
              actions={
                <div class="flex items-center gap-2">
                  <StatusBadge tone={BRAND_STATUS_META[b().status].tone}>{BRAND_STATUS_META[b().status].label}</StatusBadge>
                  <Button variant="primary" href={`/admin/brands/${b().id}/edit`}>
                    แก้ไข
                  </Button>
                  <BrandRowActionsMenu
                    id={b().id}
                    name={b().name}
                    hideView
                    onDelete={() => setConfirmDelete(true)}
                    triggerClass="flex size-11 items-center justify-center rounded-pill border border-surface-gray text-ink-gray hover:bg-surface-pink"
                  />
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title={`สินค้าของแบรนด์นี้ (${classifiedProducts().length})`}>
                  <p class="-mt-1 text-xs text-ink-gray">สินค้าที่ตั้งค่าแบรนด์นี้ไว้ในหน้าแก้ไขสินค้า</p>
                  <Show when={classifiedProducts().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีสินค้าของแบรนด์นี้</p>}>
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
                <Section title="โลโก้">
                  <div class="flex size-24 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
                    <Show when={b().logo} fallback={<ImageIcon class="size-6" />}>
                      <img src={b().logo} alt="" class="size-full object-cover" />
                    </Show>
                  </div>
                </Section>

                <Section title="สถานะ">
                  <StatusBadge tone={BRAND_STATUS_META[b().status].tone} class="w-fit">
                    {BRAND_STATUS_META[b().status].label}
                  </StatusBadge>
                </Section>

                <Section title="คำอธิบาย">
                  <p class="text-sm text-ink-gray">{b().description || "—"}</p>
                </Section>

                <Section title="ข้อมูลเพิ่มเติม">
                  <Row label="ลำดับการแสดงผล" value={String(b().sortOrder)} />
                  <Row label="สร้างเมื่อ" value={b().createdAt} />
                  <Row label="แก้ไขล่าสุด" value={b().updatedAt} />
                </Section>
              </div>
            </div>

            <ConfirmDialog
              open={confirmDelete()}
              onOpenChange={setConfirmDelete}
              title="ลบแบรนด์?"
              description={`คุณต้องการลบ "${b().name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
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
