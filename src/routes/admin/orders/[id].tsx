import { createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { OrderTimeline } from "~/components/admin/orders/OrderTimeline";
import { OrdersIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { ORDER_STATUS_META, PAYMENT_STATUS_META, FULFILLMENT_STATUS_META, getNextStatusActions, type AdminOrder, type OrderStatus } from "~/lib/adminOrders";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { pushToast } from "~/lib/toast";

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminOrders();
  const navigate = useNavigate();

  const order = createMemo(() => store.getById(params.id));

  const [pendingStatus, setPendingStatus] = createSignal<OrderStatus | null>(null);
  const [saving, setSaving] = createSignal(false);

  const confirmChange = async () => {
    const current = order();
    const target = pendingStatus();
    if (!current || !target) return;
    setSaving(true);
    try {
      await store.updateOrderStatus(current.id, target);
      // Cancel is destructive even when it succeeds — Global Toast Rule #7 groups "Cancel Order" under red regardless of outcome, distinct from a routine status advance.
      pushToast("อัปเดตสถานะคำสั่งซื้อแล้ว", target === "cancelled" ? "error" : "success");
      setPendingStatus(null);
    } catch {
      pushToast("อัปเดตสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Show
      when={order()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "คำสั่งซื้อ", href: "/admin/orders" }]} />
          <EmptyState icon={<OrdersIcon />} title="ไม่พบคำสั่งซื้อนี้" description="คำสั่งซื้ออาจไม่มีอยู่ หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าคำสั่งซื้อ" onAction={() => navigate("/admin/orders")} class="bg-white shadow-card" />
        </div>
      }
    >
      {(current) => {
        const o = () => current() as AdminOrder;
        const nextActions = () => getNextStatusActions(o().orderStatus);
        const targetMeta = () => (pendingStatus() ? ORDER_STATUS_META[pendingStatus()!] : undefined);

        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "คำสั่งซื้อ", href: "/admin/orders" }, { label: o().orderNumber }]} />
            <PageHeader title={o().orderNumber} description={`สั่งซื้อเมื่อ ${o().createdAt}`} />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title="สินค้า">
                  <div class="flex flex-col gap-4">
                    <For each={o().items}>
                      {(item) => (
                        <div class="flex gap-3">
                          <img src={item.image} alt="" class="size-14 shrink-0 rounded-media object-cover" />
                          <div class="min-w-0 flex-1">
                            <p class="truncate text-sm font-medium text-ink">{item.name}</p>
                            <p class="text-xs text-ink-gray">
                              {item.sku}
                              {item.variantLabel ? ` · ${item.variantLabel}` : ""}
                            </p>
                            <p class="text-xs text-ink-gray">
                              {formatAdminCurrency(item.unitPrice)} × {item.qty}
                              {item.discount > 0 ? ` · ส่วนลด ${formatAdminCurrency(item.discount)}` : ""}
                            </p>
                          </div>
                          <p class="shrink-0 text-sm font-semibold text-ink">{formatAdminCurrency(item.lineTotal)}</p>
                        </div>
                      )}
                    </For>
                  </div>
                  <div class="flex flex-col gap-1.5 border-t border-surface-gray pt-4 text-sm">
                    <Row label="ยอดรวมสินค้า" value={formatAdminCurrency(o().totals.subtotal)} />
                    <Show when={o().totals.discount > 0}>
                      <Row label="ส่วนลด" value={`-${formatAdminCurrency(o().totals.discount)}`} />
                    </Show>
                    <Row label="ค่าจัดส่ง" value={o().totals.shippingFee > 0 ? formatAdminCurrency(o().totals.shippingFee) : "ฟรี"} />
                    <div class="flex items-center justify-between pt-1 text-base font-bold text-ink">
                      <span>ยอดรวมทั้งหมด</span>
                      <span>{formatAdminCurrency(o().totals.grandTotal)}</span>
                    </div>
                  </div>
                </Section>

                <Section title="ไทม์ไลน์คำสั่งซื้อ">
                  <OrderTimeline order={o()} />
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะคำสั่งซื้อ">
                  <div class="flex flex-col gap-2">
                    <StatusRow label="Order Status" tone={ORDER_STATUS_META[o().orderStatus].tone} value={ORDER_STATUS_META[o().orderStatus].label} />
                    <StatusRow label="Payment" tone={PAYMENT_STATUS_META[o().paymentStatus].tone} value={PAYMENT_STATUS_META[o().paymentStatus].label} />
                    <StatusRow label="Shipping" tone={FULFILLMENT_STATUS_META[o().fulfillmentStatus].tone} value={FULFILLMENT_STATUS_META[o().fulfillmentStatus].label} />
                  </div>
                </Section>

                <Section title="ลูกค้า">
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="ชื่อ" value={o().customer.name} />
                    <Row label="อีเมล" value={o().customer.email} />
                    <Row label="โทรศัพท์" value={o().customer.phone} />
                  </dl>
                </Section>

                <Section title="ที่อยู่จัดส่ง">
                  <p class="text-sm text-ink">{o().shipping.address.recipientName}</p>
                  <p class="text-sm text-ink-gray">{o().shipping.address.phone}</p>
                  <p class="text-sm text-ink-gray">
                    {o().shipping.address.addressLine} {o().shipping.address.subDistrict} {o().shipping.address.district}{" "}
                    {o().shipping.address.province} {o().shipping.address.postalCode}
                  </p>
                </Section>

                <Section title="การชำระเงิน">
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="ช่องทาง" value={o().payment.method} />
                    <Row label="เลขที่ธุรกรรม" value={o().payment.transactionId ?? "-"} />
                    <Row label="วันที่ชำระเงิน" value={o().payment.paidDate ?? "-"} />
                  </dl>
                </Section>

                <Section title="การจัดส่ง">
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="วิธีจัดส่ง" value={o().shipping.method} />
                    <Row label="ขนส่ง" value={o().shipping.courier ?? "-"} />
                    <Row label="เลขพัสดุ" value={o().shipping.trackingNumber ?? "-"} />
                  </dl>
                </Section>
              </div>
            </div>

            {/* "เปลี่ยนสถานะ" is exactly the kind of action Global Admin UX
                Rule #1 names directly — always reachable rather than buried
                partway down a long Detail page. Only rendered at all once
                there's something to change to (a terminal order like
                `refunded` has none). */}
            <Show when={nextActions().length > 0}>
              <AdminFloatingBar>
                <div class="flex w-full flex-wrap items-center gap-3">
                  <span class="hidden text-sm font-medium text-ink-gray sm:inline">เปลี่ยนสถานะ:</span>
                  <div class="ml-auto flex flex-wrap items-center gap-2">
                    <For each={nextActions()}>
                      {(action) => (
                        <Button
                          type="button"
                          variant={action.status === "cancelled" ? "outline" : "primary"}
                          class={action.status === "cancelled" ? "!border-system-red !text-system-red" : ""}
                          onClick={() => setPendingStatus(action.status)}
                        >
                          {action.label}
                        </Button>
                      )}
                    </For>
                  </div>
                </div>
              </AdminFloatingBar>
              <div class="h-16" aria-hidden="true" />
            </Show>

            <ConfirmDialog
              open={pendingStatus() !== null}
              onOpenChange={(open) => !open && !saving() && setPendingStatus(null)}
              title="เปลี่ยนสถานะคำสั่งซื้อ?"
              description={`จาก "${ORDER_STATUS_META[o().orderStatus].label}" เป็น "${targetMeta()?.label ?? ""}"`}
              confirmLabel="ยืนยัน"
              tone={pendingStatus() === "cancelled" ? "danger" : "default"}
              loading={saving()}
              onConfirm={confirmChange}
            />
          </div>
        );
      }}
    </Show>
  );
}

function Section(props: { title: string; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-4 rounded-card bg-white p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between gap-3">
      <dt class="text-ink-gray">{props.label}</dt>
      <dd class="text-right font-medium text-ink">{props.value}</dd>
    </div>
  );
}

function StatusRow(props: { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info"; value: string }) {
  return (
    <div class="flex items-center justify-between gap-3">
      <span class="text-sm text-ink-gray">{props.label}</span>
      <StatusBadge tone={props.tone}>{props.value}</StatusBadge>
    </div>
  );
}
