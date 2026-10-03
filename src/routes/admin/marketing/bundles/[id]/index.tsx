import { createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { MarketingRowActionsMenu } from "~/components/admin/marketing/MarketingRowActionsMenu";
import { ReviewsIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { useAdminProducts } from "~/lib/adminProductStore";
import { MARKETING_STATUS_META, formatMarketingDate, type MarketingStatus } from "~/lib/adminMarketing";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";

export default function AdminBundleDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminMarketing().bundles;
  const productStore = useAdminProducts();
  const navigate = useNavigate();
  const bundle = createMemo(() => store.getById(params.id));

  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [confirmToggle, setConfirmToggle] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);

  const handleDuplicate = async () => {
    const current = bundle();
    if (!current) return;
    const copy = await store.duplicate(current.id);
    pushToast(`ทำสำเนาเซ็ต "${current.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/marketing/bundles/${copy.id}/edit`);
  };

  const confirmToggleAction = async () => {
    const current = bundle();
    if (!current) return;
    const next: MarketingStatus = current.status === "disabled" ? "active" : "disabled";
    setActionLoading(true);
    await store.setStatus(current.id, next);
    setActionLoading(false);
    setConfirmToggle(false);
    pushToast(next === "disabled" ? "ปิดใช้งานเซ็ตแล้ว" : "เปิดใช้งานเซ็ตแล้ว", "success");
  };

  const confirmDeleteAction = async () => {
    const current = bundle();
    if (!current) return;
    setActionLoading(true);
    await store.remove(current.id);
    setActionLoading(false);
    setConfirmDelete(false);
    pushToast(`ลบ "${current.name}" เรียบร้อยแล้ว`, "error");
    navigate("/admin/marketing/bundles");
  };

  return (
    <Show
      when={bundle()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "บันเดิล / เซ็ต", href: "/admin/marketing/bundles" }]} />
          <EmptyState icon={<ReviewsIcon />} title="ไม่พบเซ็ตสินค้านี้" description="เซ็ตสินค้าอาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าบันเดิล" onAction={() => navigate("/admin/marketing/bundles")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const b = current;
        const regularTotal = () => b().items.reduce((sum, item) => sum + (productStore.getById(item.productId)?.price ?? 0) * item.qty, 0);
        const savings = () => Math.max(0, regularTotal() - b().bundlePrice);

        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "บันเดิล / เซ็ต", href: "/admin/marketing/bundles" }, { label: b().name }]} />
            <PageHeader
              title={b().name}
              description={b().description}
              actions={
                <div class="flex items-center gap-2">
                  <Button variant="primary" href={`/admin/marketing/bundles/${b().id}/edit`}>
                    แก้ไข
                  </Button>
                  <MarketingRowActionsMenu
                    id={b().id}
                    name={b().name}
                    basePath="/admin/marketing/bundles"
                    isDisabled={b().status === "disabled"}
                    hideView
                    onDuplicate={handleDuplicate}
                    onToggleStatus={() => setConfirmToggle(true)}
                    onDelete={() => setConfirmDelete(true)}
                    triggerClass="flex size-11 items-center justify-center rounded-pill border border-border text-ink-gray hover:bg-surface-pink"
                  />
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title="สินค้าในเซ็ต">
                  <div class="flex flex-col gap-3">
                    <For each={b().items}>
                      {(item) => {
                        const product = productStore.getById(item.productId);
                        return (
                          <div class="flex items-center gap-3">
                            <img src={product?.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
                            <div class="min-w-0 flex-1">
                              <p class="truncate text-sm font-medium text-ink">{product?.name ?? item.productId}</p>
                              <p class="text-xs text-ink-gray">{product?.sku}</p>
                            </div>
                            <span class="shrink-0 text-sm text-ink-gray">x{item.qty}</span>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะ">
                  <StatusBadge tone={MARKETING_STATUS_META[b().status].tone} class="w-fit">
                    {MARKETING_STATUS_META[b().status].label}
                  </StatusBadge>
                </Section>

                <Section title="ราคา">
                  <Row label="ราคารวมปกติ" value={formatAdminCurrency(regularTotal())} />
                  <Row label="ราคาเซ็ต" value={formatAdminCurrency(b().bundlePrice)} />
                  <div class="flex items-center justify-between pt-1 text-base font-bold text-ink">
                    <span>ประหยัด</span>
                    <span>{formatAdminCurrency(savings())}</span>
                  </div>
                </Section>

                <Section title="ระยะเวลา">
                  <Row label="เริ่ม" value={`${formatMarketingDate(b().startDate)} ${b().startTime}`} />
                  <Row label="สิ้นสุด" value={`${formatMarketingDate(b().endDate)} ${b().endTime}`} />
                </Section>

                <Section title="ข้อมูลเพิ่มเติม">
                  <Row label="สร้างเมื่อ" value={b().createdAt} />
                  <Row label="แก้ไขล่าสุด" value={b().updatedAt} />
                </Section>
              </div>
            </div>

            <ConfirmDialog
              open={confirmToggle()}
              onOpenChange={setConfirmToggle}
              title={b().status === "disabled" ? "เปิดใช้งานเซ็ตนี้?" : "ปิดใช้งานเซ็ตนี้?"}
              description={b().name}
              confirmLabel={b().status === "disabled" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
              loading={actionLoading()}
              onConfirm={confirmToggleAction}
            />

            <ConfirmDialog
              open={confirmDelete()}
              onOpenChange={setConfirmDelete}
              title="ลบเซ็ตสินค้า?"
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
