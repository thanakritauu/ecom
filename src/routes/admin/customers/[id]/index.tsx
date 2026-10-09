import { createEffect, createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { useLocation, useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { DataTable, type DataTableColumn } from "~/components/admin/DataTable";
import { CustomerRowActionsMenu } from "~/components/admin/customers/CustomerRowActionsMenu";
import { CustomersIcon, ImageIcon } from "~/components/admin/icons";
import { OrderQuickView } from "~/components/admin/orders/OrderQuickView";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { useAdminCustomers } from "~/lib/adminCustomerStore";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { ORDER_STATUS_META, PAYMENT_STATUS_META, type AdminOrder } from "~/lib/adminOrders";
import { TierBadge } from "~/components/admin/loyalty/TierBadge";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAddress } from "~/lib/checkoutData";
import {
  ADDRESS_KIND_META,
  CARD_BRAND_LABEL,
  CUSTOMER_SOURCE_META,
  formatBirthDate,
  GENDER_LABEL,
  getCustomerCode,
  getCustomerFullName,
  SIGNUP_METHOD_LABEL,
} from "~/lib/adminCustomers";
import {
  getCustomerAverageOrderValue,
  getCustomerCoinHistory,
  getCustomerOrders,
  getCustomerTotalSpent,
  type CustomerCoinEntry,
} from "~/lib/customerResolvers";
import { pushToast } from "~/lib/toast";

/**
 * Customer Detail — the storefront member as staff need to see them: purchase
 * summary, order history (same `useAdminOrders()` store and `OrderQuickView`
 * as the Orders list), address book, wishlist, and in the sidebar their
 * Charmiss Club tier and coins, profile and membership info.
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
  /** Same movements and wording as the member's own /account/points history. */
  const coinHistory = createMemo(() => (customer() ? getCustomerCoinHistory(customer()!, orderStore.orders()) : undefined));
  const scrollToCoinHistory = () => document.getElementById("coin-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
  // Quick View's "ประวัติคอยน์" links here with #coin-history.
  const location = useLocation();
  let scrolledToHash = false;
  createEffect(() => {
    if (scrolledToHash || !customer() || location.hash !== "#coin-history") return;
    scrolledToHash = true;
    requestAnimationFrame(scrollToCoinHistory);
  });
  /** Wishlist ids resolved against the live product catalog — an id whose product was deleted just drops out. */
  const wishlistProducts = createMemo(() => (customer()?.wishlistProductIds ?? []).map((id) => productStore.getById(id)).filter((p) => p !== undefined));
  // Default shipping first, then other shipping, then billing — same order as the storefront address page.
  const sortedAddresses = createMemo(() => {
    const rank = (a: { isDefault?: boolean; kind?: string }) => (a.isDefault ? 0 : a.kind === "billing" ? 2 : 1);
    return [...(customer()?.addresses ?? [])].sort((a, b) => rank(a) - rank(b));
  });

  const [confirmDelete, setConfirmDelete] = createSignal(false);
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

  const orderColumns: DataTableColumn<AdminOrder>[] = [
    { key: "orderNumber", label: "คำสั่งซื้อ", render: (row) => <span class="font-medium text-ink">{row.orderNumber}</span> },
    { key: "date", label: "วันที่", render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.createdAt}</span> },
    { key: "items", label: "สินค้า", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.items.length.toLocaleString("th-TH")} รายการ</span> },
    { key: "total", label: "ยอดชำระ", align: "right", render: (row) => <span class="font-medium text-ink">{formatAdminCurrency(row.totals.grandTotal)}</span> },
    { key: "orderStatus", label: "สถานะ", render: (row) => <StatusBadge tone={ORDER_STATUS_META[row.orderStatus].tone}>{ORDER_STATUS_META[row.orderStatus].label}</StatusBadge> },
    {
      key: "paymentStatus",
      label: "การชำระเงิน",
      hideBelowXl: true,
      render: (row) => <StatusBadge tone={PAYMENT_STATUS_META[row.paymentStatus].tone}>{PAYMENT_STATUS_META[row.paymentStatus].label}</StatusBadge>,
    },
  ];

  const formatCoins = (n: number) => n.toLocaleString("th-TH");
  const signedCoins = (e: CustomerCoinEntry) => `${e.coins > 0 ? "+" : ""}${formatCoins(e.coins)}${e.state === "pending" ? " (รอรับ)" : ""}`;
  const coinToneClass = (e: CustomerCoinEntry) => (e.state === "earned" ? "text-success" : e.state === "used" ? "text-system-red" : "text-ink-gray");
  const openCoinOrder = (e: CustomerCoinEntry) => e.orderId && setQuickViewOrderId(e.orderId);

  const coinColumns: DataTableColumn<CustomerCoinEntry>[] = [
    { key: "date", label: "วันที่", render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.date}</span> },
    {
      key: "label",
      label: "รายการ",
      render: (row) => (
        <div class="min-w-0">
          <p class="text-ink">{row.label}</p>
          <p class="text-xs text-ink-gray">{row.orderNumber ?? "Charmiss Club"}</p>
        </div>
      ),
    },
    { key: "coins", label: "คอยน์", align: "right", render: (row) => <span class={`whitespace-nowrap font-semibold ${coinToneClass(row)}`}>{signedCoins(row)}</span> },
    { key: "balance", label: "คงเหลือ", align: "right", render: (row) => <span class="whitespace-nowrap text-ink">{formatCoins(row.balance)}</span> },
  ];

  return (
    <Show
      when={customer()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "ลูกค้า", href: "/admin/customers" }]} />
          <EmptyState icon={<CustomersIcon />} title="ไม่พบลูกค้ารายนี้" description="ลูกค้ารายนี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าลูกค้า" onAction={() => navigate("/admin/customers")} class="bg-surface-card shadow-card" />
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
                  แก้ไขลูกค้า
                </Button>
                <CustomerRowActionsMenu
                  customer={current()}
                  hideView
                  onDelete={requestDelete}
                  triggerClass="flex size-11 items-center justify-center rounded-pill border border-border text-ink-gray hover:bg-surface-pink"
                />
              </div>
            }
          />

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div class="flex flex-col gap-6 lg:col-span-2">
              <Section title="สรุปการซื้อ">
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <SummaryStat label="คำสั่งซื้อ" value={`${orderCount().toLocaleString("th-TH")} รายการ`} />
                  <SummaryStat label="ยอดซื้อสะสม" value={formatAdminCurrency(totalSpent())} />
                  <SummaryStat label="เฉลี่ยต่อคำสั่งซื้อ" value={formatAdminCurrency(averageOrderValue())} />
                  <SummaryStat label="สั่งซื้อล่าสุด" value={lastOrder()?.createdAt ?? "-"} />
                </div>
              </Section>

              <Section title="คำสั่งซื้อ">
                <Show when={orders().length > 0} fallback={<p class="text-sm text-ink-gray">ลูกค้ารายนี้ยังไม่เคยสั่งซื้อ</p>}>
                  <DataTable
                    columns={orderColumns}
                    rows={orders()}
                    getRowKey={(row) => row.id}
                    onRowClick={(row) => setQuickViewOrderId(row.id)}
                    renderMobileCard={(row) => (
                      <button type="button" onClick={() => setQuickViewOrderId(row.id)} class="font-normal flex w-full flex-col gap-1.5 rounded-card bg-surface-card p-3 text-left shadow-card">
                        <div class="flex items-center justify-between gap-2">
                          <p class="text-sm font-medium text-ink">{row.orderNumber}</p>
                          <p class="text-sm font-semibold text-ink">{formatAdminCurrency(row.totals.grandTotal)}</p>
                        </div>
                        <p class="text-xs text-ink-gray">
                          สั่งเมื่อ {row.createdAt} จำนวน {row.items.length.toLocaleString("th-TH")} รายการ
                        </p>
                        <div class="flex flex-wrap gap-1.5">
                          <StatusBadge tone={ORDER_STATUS_META[row.orderStatus].tone}>{ORDER_STATUS_META[row.orderStatus].label}</StatusBadge>
                          <StatusBadge tone={PAYMENT_STATUS_META[row.paymentStatus].tone}>{PAYMENT_STATUS_META[row.paymentStatus].label}</StatusBadge>
                        </div>
                      </button>
                    )}
                  />
                </Show>
              </Section>

              {/* Same movements as the member's /account/points "ประวัติคอยน์" */}
              <section id="coin-history" class="flex scroll-mt-24 flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
                <h2 class="text-base font-semibold text-ink">ประวัติคอยน์</h2>
                <Show when={coinHistory()}>
                  {(h) => (
                    <>
                      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <SummaryStat label="คอยน์คงเหลือ" value={formatCoins(h().balance)} />
                        <SummaryStat label="ได้รับทั้งหมด" value={formatCoins(h().totalEarned)} />
                        <SummaryStat label="ใช้ไปแล้ว" value={formatCoins(h().totalUsed)} />
                        <SummaryStat label="รอรับ" value={formatCoins(h().pending)} />
                      </div>
                      <Show when={h().entries.length > 0} fallback={<p class="text-sm text-ink-gray">ลูกค้ารายนี้ยังไม่มีประวัติคอยน์</p>}>
                        <DataTable
                          columns={coinColumns}
                          rows={h().entries}
                          getRowKey={(row) => row.key}
                          onRowClick={(row) => openCoinOrder(row)}
                          renderMobileCard={(row) => (
                            <button
                              type="button"
                              disabled={!row.orderId}
                              onClick={() => openCoinOrder(row)}
                              class="font-normal flex w-full items-center justify-between gap-3 rounded-card bg-surface-card p-3 text-left shadow-card disabled:cursor-default"
                            >
                              <div class="min-w-0">
                                <p class="text-sm font-medium text-ink">{row.label}</p>
                                <p class="flex flex-wrap gap-x-2 text-xs text-ink-gray">
                                  <span>{row.orderNumber ?? "Charmiss Club"}</span>
                                  <span>{row.date}</span>
                                </p>
                              </div>
                              <div class="shrink-0 text-right">
                                <p class={`text-sm font-semibold ${coinToneClass(row)}`}>{signedCoins(row)}</p>
                                <p class="text-xs text-ink-gray">คงเหลือ {formatCoins(row.balance)}</p>
                              </div>
                            </button>
                          )}
                        />
                      </Show>
                    </>
                  )}
                </Show>
              </section>

              {/* Same entries the customer manages on /account/address */}
              <Section title="สมุดที่อยู่">
                <Show when={sortedAddresses().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีที่อยู่ที่บันทึกไว้</p>}>
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <For each={sortedAddresses()}>
                      {(a) => (
                        <div class="flex flex-col gap-1 rounded-card border border-border p-3 text-sm">
                          <div class="flex flex-wrap items-center gap-1.5">
                            <p class="font-semibold text-ink">{a.label}</p>
                            <Show when={a.isDefault}>
                              <StatusBadge tone={ADDRESS_KIND_META.default.tone}>{ADDRESS_KIND_META.default.label}</StatusBadge>
                            </Show>
                            <Show when={a.kind === "billing"}>
                              <StatusBadge tone={ADDRESS_KIND_META.billing.tone}>{ADDRESS_KIND_META.billing.label}</StatusBadge>
                            </Show>
                          </div>
                          <p class="text-ink">
                            {a.recipientName} โทร {a.phone}
                          </p>
                          <p class="text-ink-gray">{formatAddress(a)}</p>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </Section>

              {/* Products looked up live from the catalog */}
              <Section title="รายการโปรด">
                <Show when={wishlistProducts().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีสินค้าในรายการโปรด</p>}>
                  <ul class="flex flex-col divide-y divide-border">
                    <For each={wishlistProducts()}>
                      {(p) => (
                        <li>
                          <a href={`/admin/products/${p!.id}`} class="flex items-center gap-3 py-2.5 lg:hover:opacity-80">
                            <Show
                              when={p!.image}
                              fallback={
                                <span class="flex size-11 shrink-0 items-center justify-center rounded-media bg-surface-gray/60">
                                  <ImageIcon class="size-5 text-ink-placeholder" />
                                </span>
                              }
                            >
                              <img src={p!.image} alt="" class="size-11 shrink-0 rounded-media object-cover" loading="lazy" />
                            </Show>
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
              </Section>
            </div>

            <div class="flex flex-col gap-6">
              <Section title="Charmiss Club">
                <TierBadge tier={current().tier ?? "glow"} />
                <div>
                  <p class="text-xs text-ink-placeholder">Charmiss Coin คงเหลือ</p>
                  <p class="text-2xl font-bold text-ink">{(current().loyaltyPoints ?? 0).toLocaleString("th-TH")} คอยน์</p>
                </div>
                <Button variant="outline" size="sm" class="self-start" onClick={scrollToCoinHistory}>
                  ดูประวัติคอยน์
                </Button>
              </Section>

              <Section title="ข้อมูลส่วนตัว">
                <dl class="flex flex-col gap-1.5 text-sm">
                  <Row label="อีเมล" value={current().email || "-"} />
                  <Row label="เบอร์โทร" value={current().phone || "-"} />
                  <Row label="วันเกิด" value={formatBirthDate(current().birthDate)} />
                  <Row label="เพศ" value={current().gender ? GENDER_LABEL[current().gender!] : "-"} />
                </dl>
              </Section>

              {/* Only brand / last 4 / expiry, never a full number */}
              <Section title="บัตรที่บันทึกไว้">
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
              </Section>

              <Section title="ข้อมูลสมาชิก">
                <StatusBadge tone={CUSTOMER_SOURCE_META[current().source].tone} class="w-fit">
                  {CUSTOMER_SOURCE_META[current().source].label}
                </StatusBadge>
                <dl class="flex flex-col gap-1.5 text-sm">
                  <Row label="รหัสลูกค้า" value={getCustomerCode(current())} />
                  <Row label="เข้าสู่ระบบด้วย" value={current().signupMethod ? SIGNUP_METHOD_LABEL[current().signupMethod!] : "-"} />
                  <Row label="รหัส CRM" value={current().crmMemberId ?? "-"} />
                  <Show when={current().crmCoinsTransferred !== undefined}>
                    <Row label="คอยน์ที่ย้ายมาจาก CRM" value={`${current().crmCoinsTransferred!.toLocaleString("th-TH")} คอยน์`} />
                  </Show>
                  <Row label="เป็นสมาชิกตั้งแต่" value={current().memberSince || "-"} />
                  <Row label="แก้ไขล่าสุด" value={current().updatedAt || "-"} />
                </dl>
              </Section>
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
            description={`ลูกค้า "${getCustomerFullName(current())}" ถูกใช้งานในคำสั่งซื้อ ${orderCount().toLocaleString("th-TH")} รายการ ต้องเก็บประวัติคำสั่งซื้อไว้ จึงลบลูกค้ารายนี้ไม่ได้`}
            confirmLabel="เข้าใจแล้ว"
            cancelLabel="ปิด"
            onConfirm={() => setBlockedDelete(false)}
          />
        </div>
      )}
    </Show>
  );
}

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <section class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </section>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between gap-3">
      <dt class="text-ink-gray">{props.label}</dt>
      <dd class="min-w-0 truncate text-right font-medium text-ink">{props.value}</dd>
    </div>
  );
}

function SummaryStat(props: { label: string; value: string }) {
  return (
    <div class="rounded-card bg-surface-gray/60 p-3">
      <p class="text-xs text-ink-placeholder">{props.label}</p>
      <p class="mt-1 text-xl font-bold text-ink">{props.value}</p>
    </div>
  );
}
