import { createMemo, createSignal, For, Show } from "solid-js";
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
import { TierBadge } from "~/components/admin/loyalty/TierBadge";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAddress } from "~/lib/checkoutData";
import {
  CARD_BRAND_LABEL,
  CUSTOMER_SOURCE_META,
  CUSTOMER_STATUS_META,
  formatBirthDate,
  GENDER_LABEL,
  getCustomerFullName,
  getCustomerInitials,
  SIGNUP_METHOD_LABEL,
  type CustomerStatus,
} from "~/lib/adminCustomers";
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
  const productStore = useAdminProducts();
  const navigate = useNavigate();

  const customer = createMemo(() => store.getById(params.id));
  const orders = createMemo(() => (customer() ? getCustomerOrders(customer()!.id, orderStore.orders()) : []));
  const orderCount = () => orders().length;
  const totalSpent = () => (customer() ? getCustomerTotalSpent(customer()!.id, orderStore.orders()) : 0);
  const averageOrderValue = () => (customer() ? getCustomerAverageOrderValue(customer()!.id, orderStore.orders()) : 0);
  const lastOrder = () => orders()[0];
  /** Wishlist ids resolved against the live product catalog — an id whose product was deleted just drops out. */
  const wishlistProducts = createMemo(() => (customer()?.wishlistProductIds ?? []).map((id) => productStore.getById(id)).filter((p) => p !== undefined));
  // Default shipping first, then other shipping, then billing — same order as the storefront address page.
  const sortedAddresses = createMemo(() => {
    const rank = (a: { isDefault?: boolean; kind?: string }) => (a.isDefault ? 0 : a.kind === "billing" ? 2 : 1);
    return [...(customer()?.addresses ?? [])].sort((a, b) => rank(a) - rank(b));
  });

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
                <div class="flex flex-wrap gap-1.5">
                  <StatusBadge tone={CUSTOMER_STATUS_META[current().status].tone}>{CUSTOMER_STATUS_META[current().status].label}</StatusBadge>
                  <StatusBadge tone={CUSTOMER_SOURCE_META[current().source].tone}>{CUSTOMER_SOURCE_META[current().source].label}</StatusBadge>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-1 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm sm:grid-cols-3">
              <Field label="อีเมล" value={current().email} />
              <Field label="เบอร์โทร" value={current().phone} />
              <Field label="เป็นสมาชิกตั้งแต่" value={current().memberSince || "-"} />
              <Field label="วันเกิด" value={formatBirthDate(current().birthDate)} />
              <Field label="เพศ" value={current().gender ? GENDER_LABEL[current().gender!] : "-"} />
              {/* The storefront collects no marketing / PDPA consent yet — shown honestly rather than a made-up "ยินยอม". */}
              <Field label="ความยินยอมรับข่าวสาร (PDPA)" value="ยังไม่เก็บ" />
              {/* CMS + Frontend Final Refinement §2 — Loyalty (coins/tier) folded into this same ข้อมูลลูกค้า card instead of its own floating Section below, so it reads as one Customer Information set. */}
              <Show when={current().loyaltyPoints !== undefined}>
                <Field label="Charmiss Coin" value={`${current().loyaltyPoints!.toLocaleString("th-TH")} คอยน์`} />
              </Show>
              <Show when={current().tier}>
                {(tier) => (
                  <div>
                    <p class="text-xs text-ink-placeholder">ระดับสมาชิก</p>
                    <TierBadge tier={tier()} class="mt-0.5" />
                  </div>
                )}
              </Show>
              <Field label="ที่มาของสมาชิก" value={CUSTOMER_SOURCE_META[current().source].label} />
              <Show when={current().signupMethod}>{(m) => <Field label="สมัคร / เข้าสู่ระบบด้วย" value={SIGNUP_METHOD_LABEL[m()]} />}</Show>
              <Show when={current().crmMemberId}>{(id) => <Field label="รหัสสมาชิก Charmiss Club CRM" value={id()} />}</Show>
              <Show when={current().crmCoinsTransferred !== undefined}>
                <Field label="คอยน์ที่ย้ายมาจาก CRM" value={`${current().crmCoinsTransferred!.toLocaleString("th-TH")} คอยน์`} />
              </Show>
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

          {/* สมุดที่อยู่ — same entries the customer manages on /account/address */}
          <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
            <h2 class="text-base font-semibold text-ink">สมุดที่อยู่</h2>
            <Show when={sortedAddresses().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีที่อยู่ที่บันทึกไว้</p>}>
              <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <For each={sortedAddresses()}>
                  {(a) => (
                    <div class="flex flex-col gap-1 rounded-card border border-border p-3 text-sm">
                      <div class="flex flex-wrap items-center gap-1.5">
                        <p class="font-semibold text-ink">{a.label}</p>
                        <Show when={a.isDefault}>
                          <StatusBadge tone="success">ที่อยู่หลัก</StatusBadge>
                        </Show>
                        <StatusBadge tone={a.kind === "billing" ? "info" : "neutral"}>{a.kind === "billing" ? "ออกใบเสร็จ" : "จัดส่ง"}</StatusBadge>
                      </div>
                      <p class="text-ink">
                        {a.recipientName} · {a.phone}
                      </p>
                      <p class="text-ink-gray">{formatAddress(a)}</p>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* รายการโปรด (mock, read-only) — products looked up live from the catalog */}
            <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
              <h2 class="text-base font-semibold text-ink">รายการโปรด</h2>
              <Show when={wishlistProducts().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีสินค้าในรายการโปรด</p>}>
                <ul class="flex flex-col divide-y divide-border">
                  <For each={wishlistProducts()}>
                    {(p) => (
                      <li>
                        <a href={`/admin/products/${p!.id}`} class="flex items-center gap-3 py-2.5 lg:hover:opacity-80">
                          <img src={p!.image} alt="" class="size-12 shrink-0 rounded-card bg-surface-gray object-cover" loading="lazy" />
                          <div class="min-w-0 flex-1">
                            <p class="truncate text-sm font-medium text-ink">{p!.name}</p>
                            <p class="text-xs text-ink-gray">{p!.sku}</p>
                          </div>
                          <p class="shrink-0 text-sm font-medium text-ink">{formatAdminCurrency(p!.price)}</p>
                        </a>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </div>

            {/* บัตรที่บันทึกไว้ (mock, read-only) — only brand / last 4 / expiry, never a full number */}
            <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
              <h2 class="text-base font-semibold text-ink">บัตรที่บันทึกไว้</h2>
              <Show when={current().savedCards.length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีบัตรที่บันทึกไว้</p>}>
                <ul class="flex flex-col divide-y divide-border">
                  <For each={current().savedCards}>
                    {(card) => (
                      <li class="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <div class="min-w-0">
                          <p class="font-medium text-ink">
                            {CARD_BRAND_LABEL[card.brand]} •••• {card.last4}
                          </p>
                          <p class="truncate text-xs text-ink-gray">{card.holder}</p>
                        </div>
                        <p class="shrink-0 text-ink-gray">หมดอายุ {card.expiry}</p>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </div>
          </div>

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
