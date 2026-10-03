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
import { OrdersIcon, ReceiptIcon, PrintIcon, DownloadIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { ORDER_STATUS_META, PAYMENT_STATUS_META, FULFILLMENT_STATUS_META, getNextStatusActions, type AdminOrder, type OrderStatus } from "~/lib/adminOrders";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { useAdminCustomers } from "~/lib/adminCustomerStore";
import { getCustomerFullName } from "~/lib/adminCustomers";
import { getReceiptData, downloadReceiptHtml } from "~/lib/receiptResolver";
import { computeCoinsEarned } from "~/lib/cartSelectors";
import { LINE_ITEM_STOCK_STATUS_META, getMockLineItemStockStatus } from "~/lib/adminInventoryStock";
import { pushToast } from "~/lib/toast";

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminOrders();
  const customerStore = useAdminCustomers();
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
          <EmptyState icon={<OrdersIcon />} title="ไม่พบคำสั่งซื้อนี้" description="คำสั่งซื้ออาจไม่มีอยู่ หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าคำสั่งซื้อ" onAction={() => navigate("/admin/orders")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const o = () => current() as AdminOrder;
        const nextActions = () => getNextStatusActions(o().orderStatus);
        const targetMeta = () => (pendingStatus() ? ORDER_STATUS_META[pendingStatus()!] : undefined);
        // §03/§09 — Order Detail resolves the *current* Customer Master record (with a link into Customer Management), separate from `o().customer` (the frozen historical snapshot the Receipt/Order.customer field always keeps). Falls back to the snapshot, un-linked, if this order's customerId doesn't resolve (e.g. legacy data) — never a broken link.
        const resolvedCustomer = () => customerStore.getById(o().customerId);
        const goToReceipt = (print?: boolean) => navigate(`/admin/orders/${o().id}/receipt${print ? "?print=1" : ""}`);
        const handleDownloadReceipt = () => {
          const data = getReceiptData(o().id, store.orders());
          if (data) downloadReceiptHtml(data, formatAdminCurrency);
        };

        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "คำสั่งซื้อ", href: "/admin/orders" }, { label: o().orderNumber }]} />
            {/* CMS + Frontend Final Refinement §1 — the 3 receipt document actions move into the page's own Header/Action area (top-right on desktop, wraps on mobile) instead of a mid-page Section; same buttons, same handlers, nothing about the action/logic itself changes. */}
            <PageHeader
              title={o().orderNumber}
              description={`สั่งซื้อเมื่อ ${o().createdAt}`}
              actions={
                <div class="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={() => goToReceipt()}>
                    <ReceiptIcon class="size-4" /> ดูใบเสร็จ
                  </Button>
                  <Button variant="outline" onClick={() => goToReceipt(true)}>
                    <PrintIcon class="size-4" /> พิมพ์ใบเสร็จ
                  </Button>
                  <Button variant="outline" onClick={handleDownloadReceipt}>
                    <DownloadIcon class="size-4" /> ดาวน์โหลดใบเสร็จ
                  </Button>
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title="สรุปคำสั่งซื้อ">
                  <div class="flex flex-col gap-2">
                    <StatusRow label="Order Status" tone={ORDER_STATUS_META[o().orderStatus].tone} value={ORDER_STATUS_META[o().orderStatus].label} />
                    <StatusRow label="Payment" tone={PAYMENT_STATUS_META[o().paymentStatus].tone} value={PAYMENT_STATUS_META[o().paymentStatus].label} />
                    <StatusRow label="Fulfillment" tone={FULFILLMENT_STATUS_META[o().fulfillmentStatus].tone} value={FULFILLMENT_STATUS_META[o().fulfillmentStatus].label} />
                  </div>
                  <div class="flex flex-col gap-1.5 border-t border-border pt-4 text-sm">
                    <Row label="ยอดรวมสินค้า" value={formatAdminCurrency(o().totals.subtotal)} />
                    <Show when={o().totals.discount > 0}>
                      <Row label="ส่วนลด" value={`-${formatAdminCurrency(o().totals.discount)}`} />
                    </Show>
                    <Row label="ค่าจัดส่ง" value={o().totals.shippingFee > 0 ? formatAdminCurrency(o().totals.shippingFee) : "ฟรี"} />
                    <div class="flex items-center justify-between pt-1 text-base font-bold text-ink">
                      <span>ยอดรวมทั้งหมด</span>
                      <span>{formatAdminCurrency(o().totals.grandTotal)}</span>
                    </div>
                    {/* Display-only mockup, same as the Customer Frontend's own
                        (checkout success screen / account order history) —
                        no loyalty-points backend exists, so this is computed
                        from the order total with the exact same
                        `computeCoinsEarned` formula, not read from any stored
                        per-order value. Hidden for cancelled/refunded orders,
                        since no money was actually kept on those. */}
                    <Show when={o().orderStatus !== "cancelled" && o().orderStatus !== "refunded"}>
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-ink-gray">คอยน์ที่ลูกค้าได้รับ</span>
                        <span class="font-semibold text-success">
                          +{computeCoinsEarned(o().totals.grandTotal - o().totals.shippingFee).toLocaleString("th-TH")} คอยน์
                        </span>
                      </div>
                    </Show>
                  </div>
                </Section>

                <Section title="สินค้า">
                  <div class="flex flex-col gap-4">
                    <For each={o().items}>
                      {(item) => {
                        const stockStatus = () => getMockLineItemStockStatus(o().orderStatus);
                        return (
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
                              <StatusBadge tone={LINE_ITEM_STOCK_STATUS_META[stockStatus()].tone} class="mt-1">
                                {LINE_ITEM_STOCK_STATUS_META[stockStatus()].label}
                              </StatusBadge>
                            </div>
                            <p class="shrink-0 text-sm font-semibold text-ink">{formatAdminCurrency(item.lineTotal)}</p>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Section>

                <Section title="ไทม์ไลน์คำสั่งซื้อ">
                  <OrderTimeline order={o()} />
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="ลูกค้า">
                  <Show
                    when={resolvedCustomer()}
                    fallback={
                      <dl class="flex flex-col gap-1.5 text-sm">
                        <Row label="ชื่อ" value={o().customer.name} />
                        <Row label="อีเมล" value={o().customer.email} />
                        <Row label="โทรศัพท์" value={o().customer.phone} />
                      </dl>
                    }
                  >
                    {(c) => (
                      <div class="flex flex-col gap-2">
                        <dl class="flex flex-col gap-1.5 text-sm">
                          <Row label="ชื่อ" value={getCustomerFullName(c())} />
                          <Row label="อีเมล" value={c().email} />
                          <Row label="โทรศัพท์" value={c().phone} />
                        </dl>
                        <Button variant="outline" class="self-start" onClick={() => navigate(`/admin/customers/${c().id}`)}>
                          ดูข้อมูลลูกค้า
                        </Button>
                      </div>
                    )}
                  </Show>
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
                    <Row label="ผู้รับ" value={o().shipping.address.recipientName} />
                    <Row label="โทรศัพท์" value={o().shipping.address.phone} />
                  </dl>
                  <p class="text-sm text-ink-gray">
                    {o().shipping.address.addressLine} {o().shipping.address.subDistrict} {o().shipping.address.district}{" "}
                    {o().shipping.address.province} {o().shipping.address.postalCode}
                  </p>
                  <dl class="flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
                    <Row label="วิธีจัดส่ง" value={o().shipping.method} />
                    <Row label="ขนส่ง" value={o().shipping.courier ?? "-"} />
                    <Row label="เลขพัสดุ" value={o().shipping.trackingNumber ?? "-"} />
                    <StatusRow label="สถานะจัดส่ง" tone={FULFILLMENT_STATUS_META[o().fulfillmentStatus].tone} value={FULFILLMENT_STATUS_META[o().fulfillmentStatus].label} />
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
    <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
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
