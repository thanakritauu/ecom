import { createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { MarketingRowActionsMenu } from "~/components/admin/marketing/MarketingRowActionsMenu";
import { MarketingIcon } from "~/components/admin/icons";
import { useAdminProducts } from "~/lib/adminProductStore";
import {
  MARKETING_STATUS_META,
  PROMOTION_TYPE_META,
  formatMarketingDate,
  formatPromotionDiscount,
  type MarketingStatus,
} from "~/lib/adminMarketing";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";

export default function AdminPromotionDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminMarketing().promotions;
  const productStore = useAdminProducts();
  const navigate = useNavigate();
  const promotion = createMemo(() => store.getById(params.id));

  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [confirmToggle, setConfirmToggle] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);

  const handleDuplicate = async () => {
    const current = promotion();
    if (!current) return;
    const copy = await store.duplicate(current.id);
    pushToast(`ทำสำเนา "${current.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/marketing/promotions/${copy.id}/edit`);
  };

  const confirmToggleAction = async () => {
    const current = promotion();
    if (!current) return;
    const next: MarketingStatus = current.status === "disabled" ? "active" : "disabled";
    setActionLoading(true);
    await store.setStatus(current.id, next);
    setActionLoading(false);
    setConfirmToggle(false);
    pushToast(next === "disabled" ? "ปิดใช้งานโปรโมชั่นแล้ว" : "เปิดใช้งานโปรโมชั่นแล้ว", "success");
  };

  const confirmDeleteAction = async () => {
    const current = promotion();
    if (!current) return;
    setActionLoading(true);
    await store.remove(current.id);
    setActionLoading(false);
    setConfirmDelete(false);
    pushToast(`ลบ "${current.name}" เรียบร้อยแล้ว`, "error");
    navigate("/admin/marketing/promotions");
  };

  return (
    <Show
      when={promotion()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "โปรโมชั่น", href: "/admin/marketing/promotions" }]} />
          <EmptyState icon={<MarketingIcon />} title="ไม่พบโปรโมชั่นนี้" description="โปรโมชั่นอาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าโปรโมชั่น" onAction={() => navigate("/admin/marketing/promotions")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const p = current;
        const gift = () => (p().giftProductId ? productStore.getById(p().giftProductId!) : undefined);
        const scopeProducts = () => p().productIds.map((id) => productStore.getById(id)).filter((x) => x !== undefined);

        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb
              items={[
                { label: "แดชบอร์ด", href: "/admin" },
                { label: "การตลาด", href: "/admin/marketing" },
                { label: "โปรโมชั่น", href: "/admin/marketing/promotions" },
                { label: p().name },
              ]}
            />
            <PageHeader
              title={p().name}
              description={PROMOTION_TYPE_META[p().type].label}
              actions={
                <div class="flex items-center gap-2">
                  <Button variant="primary" href={`/admin/marketing/promotions/${p().id}/edit`}>
                    แก้ไข
                  </Button>
                  <MarketingRowActionsMenu
                    id={p().id}
                    name={p().name}
                    basePath="/admin/marketing/promotions"
                    isDisabled={p().status === "disabled"}
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
                <Section title="รายละเอียด">
                  <p class="text-sm text-ink-gray">{p().description ?? "ยังไม่มีคำอธิบาย"}</p>
                </Section>

                <Show when={p().type === "gift_with_purchase"}>
                  <Section title="ของแถม">
                    <Show when={gift()} fallback={<p class="text-sm text-ink-gray">ยังไม่ได้เลือกสินค้าของแถม</p>}>
                      {(g) => (
                        <div class="flex items-center gap-3">
                          <img src={g().image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
                          <div class="min-w-0 flex-1">
                            <p class="truncate text-sm font-medium text-ink">{g().name}</p>
                            <p class="text-xs text-ink-gray">{g().sku}</p>
                          </div>
                          <span class="shrink-0 text-sm font-medium text-ink">x{p().giftQty ?? 1}</span>
                        </div>
                      )}
                    </Show>
                  </Section>
                </Show>

                <Section title="สินค้าที่เข้าร่วม">
                  <Show when={p().productIds.length > 0} fallback={<p class="text-sm text-ink-gray">ใช้กับสินค้าทั้งหมด</p>}>
                    <div class="flex flex-col gap-3">
                      <For each={scopeProducts()}>
                        {(product) => (
                          <div class="flex items-center gap-3">
                            <img src={product!.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
                            <div class="min-w-0">
                              <p class="truncate text-sm font-medium text-ink">{product!.name}</p>
                              <p class="text-xs text-ink-gray">{product!.sku}</p>
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
                  <StatusBadge tone={MARKETING_STATUS_META[p().status].tone} class="w-fit">
                    {MARKETING_STATUS_META[p().status].label}
                  </StatusBadge>
                </Section>

                <Section title="ส่วนลด">
                  <p class="text-2xl font-bold text-ink">{formatPromotionDiscount(p(), gift()?.name)}</p>
                </Section>

                <Section title="การแสดงผลหน้าร้าน">
                  <Row label="แสดงในตะกร้า" value={p().showInCart ? "แสดง" : "ไม่แสดง"} />
                </Section>

                <Section title="ระยะเวลา">
                  <Row label="เริ่ม" value={`${formatMarketingDate(p().startDate)} ${p().startTime}`} />
                  <Row label="สิ้นสุด" value={`${formatMarketingDate(p().endDate)} ${p().endTime}`} />
                </Section>

                <Section title="การใช้งาน">
                  <p class="text-2xl font-bold text-ink">{p().usageCount.toLocaleString("th-TH")}</p>
                  <p class="text-sm text-ink-gray">ครั้งที่ใช้งานแล้ว</p>
                </Section>

                <Section title="ข้อมูลเพิ่มเติม">
                  <Row label="สร้างเมื่อ" value={p().createdAt} />
                  <Row label="แก้ไขล่าสุด" value={p().updatedAt} />
                </Section>
              </div>
            </div>

            <ConfirmDialog
              open={confirmToggle()}
              onOpenChange={setConfirmToggle}
              title={p().status === "disabled" ? "เปิดใช้งานโปรโมชั่นนี้?" : "ปิดใช้งานโปรโมชั่นนี้?"}
              description={p().name}
              confirmLabel={p().status === "disabled" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
              loading={actionLoading()}
              onConfirm={confirmToggleAction}
            />

            <ConfirmDialog
              open={confirmDelete()}
              onOpenChange={setConfirmDelete}
              title="ลบโปรโมชั่น?"
              description={`คุณต้องการลบ "${p().name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
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
