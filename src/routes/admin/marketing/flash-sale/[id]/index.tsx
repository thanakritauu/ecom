import { createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { MarketingRowActionsMenu } from "~/components/admin/marketing/MarketingRowActionsMenu";
import { LoyaltyIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { useAdminProducts } from "~/lib/adminProductStore";
import { MARKETING_STATUS_META, flashSaleDiscountPercent, flashSaleOriginalPrice, formatMarketingDate, type MarketingStatus } from "~/lib/adminMarketing";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";

export default function AdminFlashSaleDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminMarketing().flashSales;
  const productStore = useAdminProducts();
  const navigate = useNavigate();
  const flashSale = createMemo(() => store.getById(params.id));

  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [confirmToggle, setConfirmToggle] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);

  const handleDuplicate = async () => {
    const current = flashSale();
    if (!current) return;
    const copy = await store.duplicate(current.id);
    pushToast(`ทำสำเนาแคมเปญ "${current.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/marketing/flash-sale/${copy.id}/edit`);
  };

  const confirmToggleAction = async () => {
    const current = flashSale();
    if (!current) return;
    const next: MarketingStatus = current.status === "disabled" ? "active" : "disabled";
    setActionLoading(true);
    await store.setStatus(current.id, next);
    setActionLoading(false);
    setConfirmToggle(false);
    pushToast(next === "disabled" ? "ปิดใช้งานแคมเปญแล้ว" : "เปิดใช้งานแคมเปญแล้ว", "success");
  };

  const confirmDeleteAction = async () => {
    const current = flashSale();
    if (!current) return;
    setActionLoading(true);
    await store.remove(current.id);
    setActionLoading(false);
    setConfirmDelete(false);
    pushToast(`ลบ "${current.name}" เรียบร้อยแล้ว`, "error");
    navigate("/admin/marketing/flash-sale");
  };

  return (
    <Show
      when={flashSale()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "แฟลชเซล", href: "/admin/marketing/flash-sale" }]} />
          <EmptyState icon={<LoyaltyIcon />} title="ไม่พบแฟลชเซลนี้" description="แคมเปญอาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าแฟลชเซล" onAction={() => navigate("/admin/marketing/flash-sale")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const f = current;
        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "แฟลชเซล", href: "/admin/marketing/flash-sale" }, { label: f().name }]} />
            <PageHeader
              title={f().name}
              description={`${f().items.length} สินค้าเข้าร่วม`}
              actions={
                <div class="flex items-center gap-2">
                  <Button variant="primary" href={`/admin/marketing/flash-sale/${f().id}/edit`}>
                    แก้ไข
                  </Button>
                  <MarketingRowActionsMenu
                    id={f().id}
                    name={f().name}
                    basePath="/admin/marketing/flash-sale"
                    isDisabled={f().status === "disabled"}
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
                <Section title="สินค้าในแคมเปญ">
                  <div class="flex flex-col gap-4">
                    <For each={f().items}>
                      {(item) => {
                        const product = productStore.getById(item.productId);
                        const discountPct = product ? flashSaleDiscountPercent(product, item.salePrice) : 0;
                        return (
                          <div class="flex gap-3">
                            <img src={product?.image} alt="" class="size-14 shrink-0 rounded-media object-cover" />
                            <div class="min-w-0 flex-1">
                              <p class="truncate text-sm font-medium text-ink">{product?.name ?? item.productId}</p>
                              <p class="text-xs text-ink-gray">{product?.sku}</p>
                              <Show when={item.saleLimit}>
                                <p class="text-xs text-ink-gray">
                                  ขายแล้ว {item.soldCount} / {item.saleLimit} · {item.soldCount >= item.saleLimit! ? "สินค้าหมด" : `เหลือ ${item.saleLimit! - item.soldCount} ชิ้น`}
                                </p>
                              </Show>
                            </div>
                            <div class="shrink-0 text-right">
                              <p class="text-xs text-ink-placeholder line-through">{product ? formatAdminCurrency(flashSaleOriginalPrice(product)) : ""}</p>
                              <p class="text-sm font-semibold text-system-red">{formatAdminCurrency(item.salePrice)}</p>
                              {discountPct > 0 ? <p class="text-xs text-ink-gray">-{discountPct}%</p> : null}
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะ">
                  <StatusBadge tone={MARKETING_STATUS_META[f().status].tone} class="w-fit">
                    {MARKETING_STATUS_META[f().status].label}
                  </StatusBadge>
                </Section>

                <Section title="ระยะเวลา">
                  <Row label="เริ่ม" value={`${formatMarketingDate(f().startDate)} ${f().startTime}`} />
                  <Row label="สิ้นสุด" value={`${formatMarketingDate(f().endDate)} ${f().endTime}`} />
                </Section>

                <Section title="ข้อมูลเพิ่มเติม">
                  <Row label="สร้างเมื่อ" value={f().createdAt} />
                  <Row label="แก้ไขล่าสุด" value={f().updatedAt} />
                </Section>
              </div>
            </div>

            <ConfirmDialog
              open={confirmToggle()}
              onOpenChange={setConfirmToggle}
              title={f().status === "disabled" ? "เปิดใช้งานแฟลชเซลนี้?" : "ปิดใช้งานแฟลชเซลนี้?"}
              description={f().name}
              confirmLabel={f().status === "disabled" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
              loading={actionLoading()}
              onConfirm={confirmToggleAction}
            />

            <ConfirmDialog
              open={confirmDelete()}
              onOpenChange={setConfirmDelete}
              title="ลบแฟลชเซล?"
              description={`คุณต้องการลบ "${f().name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
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
