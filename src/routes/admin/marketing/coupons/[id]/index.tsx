import { createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { A, useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { CouponCard } from "~/components/shared/CouponCard";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { MarketingRowActionsMenu } from "~/components/admin/marketing/MarketingRowActionsMenu";
import { adminCouponTicket } from "~/components/admin/marketing/CouponQuickView";
import { ProductSkuRefList } from "~/components/admin/ProductSkuPicker";
import { CouponTicketIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import {
  MARKETING_PHASE_META,
  COUPON_DISCOUNT_TYPE_META,
  formatCouponDiscount,
  formatCouponLimit,
  formatCouponMinSpend,
  formatCouponUsage,
  formatMarketingDateTime,
  marketingPhase,
  couponPublishProblems,
} from "~/lib/adminMarketing";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { formatOrderDateLabel } from "~/lib/adminOrders";
import { pushToast } from "~/lib/toast";
import { isRichTextEmpty } from "~/lib/richText";
import { RichTextContent } from "~/components/shared/RichTextContent";

export default function AdminCouponDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminMarketing().coupons;
  const orderStore = useAdminOrders();
  const navigate = useNavigate();
  const coupon = createMemo(() => store.getById(params.id));
  const usedIn = createMemo(() => {
    const c = coupon();
    if (!c) return [];
    return orderStore
      .orders()
      .filter((o) => o.orderStatus !== "cancelled" && o.totals.couponCode === c.code)
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  });

  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [confirmToggle, setConfirmToggle] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);

  const handleDuplicate = async () => {
    const current = coupon();
    if (!current) return;
    const copy = await store.duplicate(current.id);
    pushToast(`ทำสำเนา "${current.code}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/marketing/coupons/${copy.id}/edit`);
  };

  const confirmToggleAction = async () => {
    const current = coupon();
    if (!current) return;
    const turnOn = current.status !== "active";
    setActionLoading(true);
    await store.setStatus(current.id, turnOn ? "active" : "disabled");
    setActionLoading(false);
    setConfirmToggle(false);
    pushToast(turnOn ? (current.status === "draft" ? "เผยแพร่คูปองแล้ว" : "เปิดใช้งานคูปองแล้ว") : "ปิดใช้งานคูปองแล้ว", "success");
  };

  const confirmDeleteAction = async () => {
    const current = coupon();
    if (!current) return;
    setActionLoading(true);
    await store.remove(current.id);
    setActionLoading(false);
    setConfirmDelete(false);
    pushToast(`ลบ "${current.code}" เรียบร้อยแล้ว`, "error");
    navigate("/admin/marketing/coupons");
  };

  return (
    <Show
      when={coupon()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด" }, { label: "คูปอง", href: "/admin/marketing/coupons" }]} />
          <EmptyState icon={<CouponTicketIcon />} title="ไม่พบคูปองนี้" description="คูปองอาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าคูปอง" onAction={() => navigate("/admin/marketing/coupons")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(c) => {
        const phase = () => MARKETING_PHASE_META[marketingPhase(c())];
        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด" }, { label: "คูปอง", href: "/admin/marketing/coupons" }, { label: c().code }]} />
            <PageHeader
              title={c().code}
              description={`${formatCouponDiscount(c())} ${formatCouponMinSpend(c())}`}
              actions={
                <div class="flex items-center gap-2">
                  <Button variant="primary" href={`/admin/marketing/coupons/${c().id}/edit`}>
                    แก้ไขคูปอง
                  </Button>
                  <MarketingRowActionsMenu
                    id={c().id}
                    name={c().code}
                    entity="คูปอง"
                    basePath="/admin/marketing/coupons"
                    isDisabled={c().status === "disabled"}
                    isDraft={c().status === "draft"}
                    hideView
                    onDuplicate={handleDuplicate}
                    onToggleStatus={() => {
                      // A แบบร่าง is published only once it passes the full check; the toast names what's missing.
                      const missing = c().status === "draft" ? couponPublishProblems(c()) : [];
                      if (missing.length > 0) pushToast(`เผยแพร่ "${c().code}" ไม่ได้ ยังขาดข้อมูล ${missing.length} รายการ`, "error", missing.join(", "));
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
                <Section title="คูปองบนหน้าร้าน">
                  <div class="max-w-[369px] px-1 pt-1">
                    <CouponCard
                      coupon={adminCouponTicket(c())}
                      display
                    />
                  </div>
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="แสดงในหน้าแรก" value={c().showOnHome ? "แสดง" : "ไม่แสดง"} />
                    <Row label="แสดงในหน้าชำระเงิน" value={c().showAtCheckout ? "แสดง" : "ไม่แสดง"} />
                  </dl>
                  <p class="text-xs text-ink-gray">ลูกค้ากรอกโค้ดนี้เองได้ที่หน้าชำระเงินเสมอเมื่อคูปองใช้งานอยู่</p>
                </Section>

                <Section title="ใช้ได้กับสินค้า">
                  <Show when={c().productScope !== undefined} fallback={<p class="text-sm text-ink-gray">ทั้งร้าน ใช้ได้กับทุกสินค้าในตะกร้า</p>}>
                    <ProductSkuRefList refs={c().productScope!} />
                  </Show>
                </Section>

                <Section title="เงื่อนไขเพิ่มเติม">
                  <Show when={!isRichTextEmpty(c().extraConditions)} fallback={<p class="text-sm text-ink-gray">ไม่มีเงื่อนไขเพิ่มเติม</p>}>
                    <RichTextContent value={c().extraConditions} class="text-sm text-ink-gray" />
                  </Show>
                </Section>

                <Section title={`คำสั่งซื้อที่ใช้คูปองนี้ (${usedIn().length.toLocaleString("th-TH")})`}>
                  <Show when={usedIn().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีคำสั่งซื้อที่ใช้คูปองนี้</p>}>
                    <table class="w-full text-left text-sm">
                      <thead>
                        <tr class="border-b border-border text-xs uppercase text-ink-placeholder">
                          <th class="py-2 pr-3 font-semibold">คำสั่งซื้อ</th>
                          <th class="py-2 pr-3 font-semibold">ลูกค้า</th>
                          <th class="py-2 pr-3 font-semibold">วันที่</th>
                          <th class="py-2 text-right font-semibold">ส่วนลด</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={usedIn().slice(0, 10)}>
                          {(o) => (
                            <tr class="border-b border-border last:border-0">
                              <td class="py-2 pr-3">
                                <A href={`/admin/orders/${o.id}`} class="font-medium text-brand-pink hover:underline">
                                  {o.orderNumber}
                                </A>
                              </td>
                              <td class="py-2 pr-3 text-ink">{o.customer.name}</td>
                              <td class="whitespace-nowrap py-2 pr-3 text-ink-gray">{formatOrderDateLabel(o.placedAt)}</td>
                              <td class="py-2 text-right font-medium text-ink">-{formatAdminCurrency(o.totals.couponDiscount)}</td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </Show>
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะ">
                  <StatusBadge tone={phase().tone} class="w-fit">
                    {phase().label}
                  </StatusBadge>
                  <p class="text-sm text-ink-gray">{c().status === "draft" ? "แบบร่าง ลูกค้ายังใช้ไม่ได้" : c().status === "active" ? "เปิดใช้งานอยู่ ใช้ได้ตามช่วงเวลา" : "ปิดใช้งานอยู่ ลูกค้าใช้ไม่ได้"}</p>
                </Section>

                <Section title="ส่วนลด">
                  <p class="text-2xl font-bold text-ink">{formatCouponDiscount(c())}</p>
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="ประเภท" value={COUPON_DISCOUNT_TYPE_META[c().discountType].label} />
                    <Show when={c().discountType === "percent"}>
                      <Row label="ลดสูงสุด" value={c().maxDiscount ? formatAdminCurrency(c().maxDiscount!) : "ไม่จำกัด"} />
                    </Show>
                    <Row label="ยอดซื้อขั้นต่ำ" value={c().minSpend ? formatAdminCurrency(c().minSpend!) : "ไม่มีขั้นต่ำ"} />
                  </dl>
                </Section>

                <Section title="จำกัดการใช้">
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="ใช้แล้ว" value={`${formatCouponUsage(usedIn().length, c().usageLimit)} ครั้ง`} />
                    <Row label="จำกัดจำนวนครั้ง" value={formatCouponLimit(c().usageLimit)} />
                    <Row label="จำกัดต่อลูกค้า" value={formatCouponLimit(c().perCustomerLimit)} />
                  </dl>
                </Section>

                <Section title="ระยะเวลา">
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="เริ่ม" value={formatMarketingDateTime(c().startDate, c().startTime)} />
                    <Row label="สิ้นสุด" value={formatMarketingDateTime(c().endDate, c().endTime)} />
                  </dl>
                </Section>

                <Section title="ข้อมูลเพิ่มเติม">
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="ID" value={c().id} />
                    <Row label="สร้างเมื่อ" value={c().createdAt} />
                    <Row label="แก้ไขล่าสุด" value={c().updatedAt} />
                  </dl>
                </Section>
              </div>
            </div>

            <ConfirmDialog
              open={confirmToggle()}
              onOpenChange={setConfirmToggle}
              title={c().status === "draft" ? "เผยแพร่คูปองนี้?" : c().status === "disabled" ? "เปิดใช้งานคูปองนี้?" : "ปิดใช้งานคูปองนี้?"}
              description={c().status !== "active" ? `"${c().code}" จะใช้ได้ที่หน้าร้านตามวันที่ที่ตั้งไว้` : `"${c().code}" จะถูกซ่อนจากร้านค้าและใช้ไม่ได้ทันที`}
              confirmLabel={c().status === "draft" ? "เผยแพร่" : c().status === "disabled" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
              loading={actionLoading()}
              onConfirm={confirmToggleAction}
            />

            <ConfirmDialog
              open={confirmDelete()}
              onOpenChange={setConfirmDelete}
              title="ลบคูปอง?"
              description={`คุณต้องการลบ "${c().code}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
              confirmLabel="ลบคูปอง"
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

function Section(props: { title: string; children: JSX.Element }) {
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
