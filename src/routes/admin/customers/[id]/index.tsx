import { createMemo, createSignal, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { DataTable, type DataTableColumn } from "~/components/admin/DataTable";
import { CustomerRowActionsMenu } from "~/components/admin/customers/CustomerRowActionsMenu";
import { CustomersIcon } from "~/components/admin/icons";
import { OrderQuickView } from "~/components/admin/orders/OrderQuickView";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { useAdminCustomers } from "~/lib/adminCustomerStore";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { ORDER_STATUS_META, PAYMENT_STATUS_META, FULFILLMENT_STATUS_META, type AdminOrder } from "~/lib/adminOrders";
import { CUSTOMER_STATUS_META, CUSTOMER_TIER_META, getCustomerFullName, getCustomerInitials, type CustomerStatus } from "~/lib/adminCustomers";
import { getCustomerAverageOrderValue, getCustomerOrders, getCustomerTotalSpent } from "~/lib/customerResolvers";
import { pushToast } from "~/lib/toast";

/**
 * Phase 05 §13/§14/§15/§16 — Profile → Purchase Summary → Order History →
 * Loyalty → Additional info, one simple linear stack of cards (the same
 * Charmiss CMS visual language every other Detail page already uses), never
 * a generic multi-panel ERP dashboard. Order History reads `useAdminOrders()`
 * directly (the exact same store `/admin/orders` reads) filtered by
 * `customerId` — never a second, Customer-specific Order dataset — and its
 * Quick View is the literal same `OrderQuickView` component Orders List uses,
 * so the two can never show different information for the same order.
 */
export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminCustomers();
  const orderStore = useAdminOrders();
  const navigate = useNavigate();

  const customer = createMemo(() => store.getById(params.id));
  const orders = createMemo(() => (customer() ? getCustomerOrders(customer()!.id, orderStore.orders()) : []));
  const orderCount = () => orders().length;
  const totalSpent = () => (customer() ? getCustomerTotalSpent(customer()!.id, orderStore.orders()) : 0);
  const averageOrderValue = () => (customer() ? getCustomerAverageOrderValue(customer()!.id, orderStore.orders()) : 0);
  const lastOrder = () => orders()[0];

  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [confirmToggleBlocked, setConfirmToggleBlocked] = createSignal(false);
  const [blockedDelete, setBlockedDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const [quickViewOrderId, setQuickViewOrderId] = createSignal<string | null>(null);
  const quickViewOrder = createMemo(() => orders().find((o) => o.id === quickViewOrderId()));

  const requestDelete = () => {
    if (orderCount() > 0) setBlockedDelete(true);
    else setConfirmDelete(true);
  };

  const confirmDeleteAction = async () => {
    const current = customer();
    if (!current) return;
    setActionLoading(true);
    await store.remove(current.id);
    setActionLoading(false);
    setConfirmDelete(false);
    pushToast(`ลบ "${getCustomerFullName(current)}" เรียบร้อยแล้ว`, "error");
    navigate("/admin/customers");
  };

  const confirmToggleBlockedAction = async () => {
    const current = customer();
    if (!current) return;
    const nextStatus: CustomerStatus = current.status === "blocked" ? "active" : "blocked";
    setActionLoading(true);
    await store.setStatus(current.id, nextStatus);
    setActionLoading(false);
    setConfirmToggleBlocked(false);
    pushToast(nextStatus === "blocked" ? "ระงับบัญชีลูกค้าแล้ว" : "เปิดใช้งานบัญชีลูกค้าแล้ว", "success");
  };

  const orderColumns: DataTableColumn<AdminOrder>[] = [
    { key: "orderNumber", label: "Order ID", render: (row) => <span class="font-medium text-ink">{row.orderNumber}</span> },
    { key: "date", label: "Date", render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.createdAt}</span> },
    { key: "items", label: "Items", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.items.length} รายการ</span> },
    { key: "total", label: "Total", align: "right", render: (row) => <span class="font-medium text-ink">{formatAdminCurrency(row.totals.grandTotal)}</span> },
    { key: "orderStatus", label: "Order Status", render: (row) => <StatusBadge tone={ORDER_STATUS_META[row.orderStatus].tone}>{ORDER_STATUS_META[row.orderStatus].label}</StatusBadge> },
    {
      key: "paymentStatus",
      label: "Payment",
      hideBelowXl: true,
      render: (row) => <StatusBadge tone={PAYMENT_STATUS_META[row.paymentStatus].tone}>{PAYMENT_STATUS_META[row.paymentStatus].label}</StatusBadge>,
    },
    {
      key: "fulfillmentStatus",
      label: "Fulfillment",
      hideBelowXl: true,
      render: (row) => <StatusBadge tone={FULFILLMENT_STATUS_META[row.fulfillmentStatus].tone}>{FULFILLMENT_STATUS_META[row.fulfillmentStatus].label}</StatusBadge>,
    },
  ];

  return (
    <Show
      when={customer()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "ลูกค้า", href: "/admin/customers" }]} />
          <EmptyState icon={<CustomersIcon />} title="ไม่พบลูกค้ารายนี้" description="ลูกค้ารายนี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ารายการ" onAction={() => navigate("/admin/customers")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "ลูกค้า", href: "/admin/customers" }, { label: getCustomerFullName(current()) }]} />
          <PageHeader
            title={getCustomerFullName(current())}
            description={current().email}
            actions={
              <div class="flex items-center gap-2">
                <Button variant="primary" href={`/admin/customers/${current().id}/edit`}>
                  แก้ไขข้อมูล
                </Button>
                <CustomerRowActionsMenu
                  customer={current()}
                  hideView
                  onToggleBlocked={() => setConfirmToggleBlocked(true)}
                  onDelete={requestDelete}
                  triggerClass="flex size-11 items-center justify-center rounded-pill border border-border text-ink-gray hover:bg-surface-pink"
                />
              </div>
            }
          />

          {/* ข้อมูลลูกค้า */}
          <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
            <h2 class="text-base font-semibold text-ink">ข้อมูลลูกค้า</h2>
            <div class="flex items-center gap-4">
              <div class="flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-pink text-xl font-semibold text-white">{getCustomerInitials(current())}</div>
              <div>
                <p class="text-base font-semibold text-ink">{getCustomerFullName(current())}</p>
                <StatusBadge tone={CUSTOMER_STATUS_META[current().status].tone}>{CUSTOMER_STATUS_META[current().status].label}</StatusBadge>
              </div>
            </div>
            <div class="grid grid-cols-1 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm sm:grid-cols-3">
              <Field label="อีเมล" value={current().email} />
              <Field label="เบอร์โทร" value={current().phone} />
              <Field label="เป็นสมาชิกตั้งแต่" value={current().memberSince || "-"} />
              {/* CMS + Frontend Final Refinement §2 — Loyalty (points/tier) folded into this same ข้อมูลลูกค้า card instead of its own floating Section below, so it reads as one Customer Information set; same fields, same source (`current()`), only rendered here now. */}
              <Show when={current().loyaltyPoints !== undefined}>
                <Field label="คะแนนสะสม" value={String(current().loyaltyPoints)} />
              </Show>
              <Show when={current().tier}>{(tier) => <Field label="ระดับสมาชิก" value={CUSTOMER_TIER_META[tier()].label} />}</Show>
            </div>
          </div>

          {/* สรุปการซื้อ */}
          <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
            <h2 class="text-base font-semibold text-ink">สรุปการซื้อ</h2>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryStat label="คำสั่งซื้อทั้งหมด" value={String(orderCount())} />
              <SummaryStat label="ยอดซื้อสะสม" value={formatAdminCurrency(totalSpent())} />
              <SummaryStat label="มูลค่าเฉลี่ยต่อคำสั่งซื้อ" value={formatAdminCurrency(averageOrderValue())} />
              <SummaryStat label="คำสั่งซื้อล่าสุด" value={lastOrder()?.createdAt ?? "-"} />
            </div>
          </div>

          {/* คำสั่งซื้อ */}
          <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
            <h2 class="text-base font-semibold text-ink">คำสั่งซื้อ</h2>
            <Show when={orders().length > 0} fallback={<p class="text-sm text-ink-gray">ลูกค้ารายนี้ยังไม่เคยสั่งซื้อ</p>}>
              <DataTable
                columns={orderColumns}
                rows={orders()}
                getRowKey={(row) => row.id}
                onRowClick={(row) => setQuickViewOrderId(row.id)}
                renderMobileCard={(row) => (
                  <button type="button" onClick={() => setQuickViewOrderId(row.id)} class="font-normal flex w-full flex-col gap-1.5 rounded-card bg-surface-card p-3 text-left shadow-card">
                    <div class="flex items-center justify-between">
                      <p class="text-sm font-medium text-ink">{row.orderNumber}</p>
                      <p class="text-sm font-semibold text-ink">{formatAdminCurrency(row.totals.grandTotal)}</p>
                    </div>
                    <p class="text-xs text-ink-gray">{row.createdAt} · {row.items.length} รายการ</p>
                    <div class="flex flex-wrap gap-1.5">
                      <StatusBadge tone={ORDER_STATUS_META[row.orderStatus].tone}>{ORDER_STATUS_META[row.orderStatus].label}</StatusBadge>
                      <StatusBadge tone={PAYMENT_STATUS_META[row.paymentStatus].tone}>{PAYMENT_STATUS_META[row.paymentStatus].label}</StatusBadge>
                    </div>
                  </button>
                )}
              />
            </Show>
          </div>

          {/* ข้อมูลเพิ่มเติม */}
          <Show when={current().address}>
            <div class="flex flex-col gap-2 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
              <h2 class="text-base font-semibold text-ink">ข้อมูลเพิ่มเติม</h2>
              <Field label="ที่อยู่" value={current().address ?? "-"} />
            </div>
          </Show>

          <QuickViewDrawer
            open={quickViewOrder() !== undefined}
            onOpenChange={(open) => !open && setQuickViewOrderId(null)}
            title={quickViewOrder()?.orderNumber ?? ""}
            subtitle={quickViewOrder()?.createdAt}
            onViewFull={() => {
              const id = quickViewOrderId();
              setQuickViewOrderId(null);
              if (id) navigate(`/admin/orders/${id}`);
            }}
          >
            <Show when={quickViewOrder()}>{(order) => <OrderQuickView order={order()} />}</Show>
          </QuickViewDrawer>

          <ConfirmDialog
            open={confirmDelete()}
            onOpenChange={setConfirmDelete}
            title="ลบลูกค้า?"
            description={`คุณต้องการลบ "${getCustomerFullName(current())}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
            confirmLabel="ลบลูกค้า"
            tone="danger"
            loading={actionLoading()}
            onConfirm={confirmDeleteAction}
          />

          <ConfirmDialog
            open={blockedDelete()}
            onOpenChange={setBlockedDelete}
            title="ไม่สามารถลบได้"
            description={`"${getCustomerFullName(current())}" มีคำสั่งซื้อ ${orderCount()} รายการผูกอยู่ — ต้องรักษาความสัมพันธ์กับคำสั่งซื้อในอดีตไว้ จึงไม่สามารถลบลูกค้ารายนี้ได้`}
            confirmLabel="เข้าใจแล้ว"
            cancelLabel="ปิด"
            onConfirm={() => setBlockedDelete(false)}
          />

          <ConfirmDialog
            open={confirmToggleBlocked()}
            onOpenChange={setConfirmToggleBlocked}
            title={current().status === "blocked" ? "เปิดใช้งานบัญชีนี้?" : "ระงับบัญชีนี้?"}
            description={`"${getCustomerFullName(current())}" จะ${current().status === "blocked" ? "กลับมาใช้งานได้ตามปกติ" : "ถูกระงับการใช้งาน"}`}
            confirmLabel={current().status === "blocked" ? "เปิดใช้งาน" : "ระงับบัญชี"}
            tone={current().status === "blocked" ? "default" : "danger"}
            loading={actionLoading()}
            onConfirm={confirmToggleBlockedAction}
          />
        </div>
      )}
    </Show>
  );
}

function Field(props: { label: string; value: string }) {
  return (
    <div>
      <p class="text-xs text-ink-placeholder">{props.label}</p>
      <p class="font-medium text-ink">{props.value}</p>
    </div>
  );
}

function SummaryStat(props: { label: string; value: string }) {
  return (
    <div class="rounded-card bg-surface-gray/60 p-3">
      <p class="text-xs text-ink-placeholder">{props.label}</p>
      <p class="mt-1 text-lg font-bold text-ink">{props.value}</p>
    </div>
  );
}
