import { createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { MarketingRowActionsMenu } from "~/components/admin/marketing/MarketingRowActionsMenu";
import { PromotionTagIcon } from "~/components/admin/icons";
import { PromotionGiftTiers } from "~/components/admin/marketing/PromotionGiftTiers";
import { PromotionBuyGetView, PromotionBundleView } from "~/components/admin/marketing/PromotionItems";
import { useAdminProducts } from "~/lib/adminProductStore";
import {
  MARKETING_PHASE_META,
  PROMOTION_TYPE_META,
  formatMarketingDateTime,
  formatPromotionDiscount,
  marketingPhase,
  promotionPublishProblems,
  PROMOTION_CONDITION_META,
  promotionCondition,
  promotionGiftTiers,
  promotionHasProductScope,
  isStorefrontPromotion,
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
    const turnOn = current.status !== "active";
    setActionLoading(true);
    await store.setStatus(current.id, turnOn ? "active" : "disabled");
    setActionLoading(false);
    setConfirmToggle(false);
    pushToast(turnOn ? (current.status === "draft" ? "เผยแพร่โปรโมชั่นแล้ว" : "เปิดใช้งานโปรโมชั่นแล้ว") : "ปิดใช้งานโปรโมชั่นแล้ว", "success");
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
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด" }, { label: "โปรโมชั่น", href: "/admin/marketing/promotions" }]} />
          <EmptyState icon={<PromotionTagIcon />} title="ไม่พบโปรโมชั่นนี้" description="โปรโมชั่นอาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าโปรโมชั่น" onAction={() => navigate("/admin/marketing/promotions")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const p = current;
        const productName = (id: string) => productStore.getById(id)?.name;
        const scopeProducts = () => p().productIds.map((id) => productStore.getById(id)).filter((x) => x !== undefined);
        const phase = () => MARKETING_PHASE_META[marketingPhase(p())];

        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb
              items={[
                { label: "แดชบอร์ด", href: "/admin" },
                { label: "การตลาด" },
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
                    แก้ไขโปรโมชั่น
                  </Button>
                  <MarketingRowActionsMenu
                    id={p().id}
                    name={p().name}
                    basePath="/admin/marketing/promotions"
                    entity="โปรโมชั่น"
                    isDisabled={p().status === "disabled"}
                    isDraft={p().status === "draft"}
                    hideView
                    onDuplicate={handleDuplicate}
                    onToggleStatus={() => {
                      // A แบบร่าง is published only once it passes the full check; the toast names what's missing.
                      const missing = p().status === "draft" ? promotionPublishProblems(p()) : [];
                      if (missing.length > 0) pushToast(`เผยแพร่ "${p().name}" ไม่ได้ ยังขาดข้อมูล ${missing.length} รายการ`, "error", missing.join(", "));
                      else setConfirmToggle(true);
                    }}
                    onDelete={() => setConfirmDelete(true)}
                    triggerClass="flex size-11 items-center justify-center rounded-pill border border-border text-ink-gray hover:bg-surface-pink"
                  />
                </div>
              }
            />

            <div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div class="flex min-w-0 flex-col gap-6">
                <Show when={p().type === "gift_with_purchase"}>
                  <Section title={promotionGiftTiers(p()).length > 1 ? `ของแถมขั้นบันได ${promotionGiftTiers(p()).length} ขั้น` : "ของแถม"}>
                    <PromotionGiftTiers promotion={p()} size="md" />
                    <p class="text-sm text-ink-gray">นับจาก{PROMOTION_CONDITION_META[promotionCondition(p())].label} ของแถมสะสมตามขั้นที่ลูกค้าซื้อถึง</p>
                  </Section>
                </Show>

                <Show when={p().type === "buy_x_get_y"}>
                  <Section title="ซื้อ X แถม Y">
                    <PromotionBuyGetView buyItems={p().buyItems ?? []} getItems={p().getItems ?? []} />
                    <p class="text-sm text-ink-gray">ลูกค้าซื้อครบทุกรายการด้านซ้าย ได้รับฟรีทุกรายการด้านขวา</p>
                  </Section>
                </Show>

                <Show when={p().type === "bundle"}>
                  <Section title="สินค้าในเซ็ต">
                    <PromotionBundleView promotion={p()} />
                  </Section>
                </Show>

                <Show when={promotionHasProductScope(p().type)}>
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
                </Show>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะ">
                  <StatusBadge tone={phase().tone} class="w-fit">
                    {phase().label}
                  </StatusBadge>
                  <p class="text-sm text-ink-gray">{p().status === "draft" ? "แบบร่าง ยังไม่มีผลในตะกร้า" : p().status === "active" ? "เปิดใช้งานอยู่ มีผลตามช่วงเวลา" : "ปิดใช้งานอยู่ ยังไม่มีผล"}</p>
                </Section>

                <Section title="เงื่อนไข">
                  <p class="text-2xl font-bold text-ink">{formatPromotionDiscount(p(), productName)}</p>
                </Section>

                <Show when={isStorefrontPromotion(p())}>
                  <Section title="การแสดงผลหน้าร้าน">
                    <dl class="flex flex-col gap-1.5 text-sm">
                      <Row label="แสดงในตะกร้า" value={p().showInCart ? "แสดง" : "ไม่แสดง"} />
                      <Row label="นับจาก" value={PROMOTION_CONDITION_META[promotionCondition(p())].label} />
                    </dl>
                  </Section>
                </Show>

                <Section title="ระยะเวลา">
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="เริ่ม" value={formatMarketingDateTime(p().startDate, p().startTime)} />
                    <Row label="สิ้นสุด" value={formatMarketingDateTime(p().endDate, p().endTime)} />
                  </dl>
                </Section>

                <Section title="ข้อมูลเพิ่มเติม">
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="ID" value={p().id} />
                    <Row label="สร้างเมื่อ" value={p().createdAt} />
                    <Row label="แก้ไขล่าสุด" value={p().updatedAt} />
                  </dl>
                </Section>
              </div>
            </div>

            <ConfirmDialog
              open={confirmToggle()}
              onOpenChange={setConfirmToggle}
              title={p().status === "draft" ? "เผยแพร่โปรโมชั่นนี้?" : p().status === "disabled" ? "เปิดใช้งานโปรโมชั่นนี้?" : "ปิดใช้งานโปรโมชั่นนี้?"}
              description={p().status !== "active" ? `"${p().name}" จะมีผลในตะกร้าตามวันที่ที่ตั้งไว้` : `"${p().name}" จะหยุดมีผลในตะกร้าทันที`}
              confirmLabel={p().status === "draft" ? "เผยแพร่" : p().status === "disabled" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
              loading={actionLoading()}
              onConfirm={confirmToggleAction}
            />

            <ConfirmDialog
              open={confirmDelete()}
              onOpenChange={setConfirmDelete}
              title="ลบโปรโมชั่น?"
              description={`คุณต้องการลบ "${p().name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
              confirmLabel="ลบโปรโมชั่น"
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
    <div class="flex items-center justify-between gap-3">
      <dt class="text-ink-gray">{props.label}</dt>
      <dd class="font-medium text-ink">{props.value}</dd>
    </div>
  );
}
