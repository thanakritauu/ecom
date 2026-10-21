import { For, Show, onMount } from "solid-js";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { EmptyState } from "~/components/admin/EmptyState";
import { PrintIcon, DownloadIcon, OrdersIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { formatOrderAddress } from "~/lib/adminOrders";
import { formatTaxBranch, formatTaxId, taxIdLabel, vatBreakdown } from "~/lib/taxInvoice";
import { SELLER } from "~/lib/sellerInfo";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { getReceiptData } from "~/lib/receiptResolver";
import { downloadOrderReceiptHtml } from "~/components/admin/orders/orderReceiptDocument";
import { OrderTotalsBreakdown } from "~/components/admin/orders/OrderTotalsBreakdown";
import logoCharmiss from "~/assets/icons/logo-charmiss-pink.svg";

/**
 * Order + Receipt Phase §17/§18/§20 — a real document page (not a
 * Toast/Alert), reachable at `/admin/orders/:id/receipt`. Screen chrome
 * (Breadcrumb, Print/Download buttons) is `print:hidden`; the receipt card
 * itself is what a Browser Print (§22, `window.print()`) renders — Sidebar/
 * Topbar are already stripped globally by `AdminLayout`'s own print rules.
 * `?print=1` (set by Order Detail's "พิมพ์ใบเสร็จ" shortcut) auto-opens the
 * print dialog on load so that action doesn't need its own duplicate print
 * logic.
 */
export default function AdminOrderReceiptPage() {
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const store = useAdminOrders();
  const navigate = useNavigate();

  const order = () => store.getById(params.id);
  // A receipt exists only once the order is paid (storefront: pending orders have nothing to receipt, cancelled ones were never charged).
  const receipt = () => (order()?.paymentStatus === "paid" ? getReceiptData(params.id, store.orders()) : undefined);

  onMount(() => {
    if (searchParams.print === "1" && receipt()) {
      setTimeout(() => window.print(), 200);
    }
  });

  return (
    <Show
      when={receipt()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "คำสั่งซื้อ", href: "/admin/orders" }]} />
          <Show
            when={order()}
            fallback={
              <EmptyState icon={<OrdersIcon />} title="ไม่พบคำสั่งซื้อนี้" description="คำสั่งซื้ออาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าคำสั่งซื้อ" onAction={() => navigate("/admin/orders")} class="bg-surface-card shadow-card" />
            }
          >
            {(o) => (
              <EmptyState
                icon={<OrdersIcon />}
                title="ยังไม่มีใบเสร็จ"
                description={`คำสั่งซื้อ ${o().orderNumber} ยังไม่ได้ชำระเงิน จึงยังไม่มีใบเสร็จ`}
                actionLabel="กลับไปหน้าคำสั่งซื้อนี้"
                onAction={() => navigate(`/admin/orders/${o().id}`)}
                class="bg-surface-card shadow-card"
              />
            )}
          </Show>
        </div>
      }
    >
      {(data) => (
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-4 print:hidden">
            <Breadcrumb
              items={[
                { label: "แดชบอร์ด", href: "/admin" },
                { label: "คำสั่งซื้อ", href: "/admin/orders" },
                { label: data().order.orderNumber, href: `/admin/orders/${data().order.id}` },
                { label: data().taxInvoice ? "ใบกำกับภาษี" : "ใบเสร็จ" },
              ]}
            />
            <PageHeader
              title={`${data().documentTitle} ${data().receiptNumber}`}
              description={`คำสั่งซื้อ ${data().order.orderNumber}`}
              actions={
                <div class="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={() => downloadOrderReceiptHtml(data(), formatAdminCurrency)}>
                    <DownloadIcon class="size-4" /> ดาวน์โหลด{data().taxInvoice ? "ใบกำกับภาษี" : "ใบเสร็จ"}
                  </Button>
                  <Button variant="primary" onClick={() => window.print()}>
                    <PrintIcon class="size-4" /> พิมพ์{data().taxInvoice ? "ใบกำกับภาษี" : "ใบเสร็จ"}
                  </Button>
                </div>
              }
            />
          </div>

          <div class="mx-auto w-full max-w-2xl rounded-card bg-surface-card p-6 shadow-card print:max-w-none print:rounded-none print:p-0 print:shadow-none sm:p-8">
            {/* Phone: seller block, then the document number below it; side by side from sm. */}
            <div class="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <img src={logoCharmiss} alt="Charmiss" class="h-8 w-auto" />
                <p class="mt-2 text-sm font-semibold text-ink">{data().documentTitle}</p>
                {/* The seller, as a tax invoice must state: name + branch, address, tax ID. */}
                <p class="mt-2 text-xs text-ink-gray">
                  {SELLER.name} ({SELLER.branch})
                </p>
                <p class="text-xs text-ink-gray">{SELLER.address}</p>
                <p class="text-xs text-ink-gray">
                  <Show when={SELLER.taxId}>
                    เลขประจำตัวผู้เสียภาษี <span class="whitespace-nowrap">{formatTaxId(SELLER.taxId)}</span>{" "}
                  </Show>
                  โทร{" "}
                  <span class="whitespace-nowrap">{SELLER.phone}</span>
                </p>
              </div>
              <div class="shrink-0 text-sm sm:text-right">
                <p class="font-semibold text-ink">เลขที่ {data().receiptNumber}</p>
                <p class="text-ink-gray">คำสั่งซื้อ {data().order.orderNumber}</p>
                <p class="text-ink-gray">{data().receiptDate}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">ลูกค้า</p>
                <p class="mt-1 text-sm font-medium text-ink">{data().customer.name}</p>
                <p class="text-sm text-ink-gray">{data().customer.email}</p>
                <p class="text-sm text-ink-gray">{data().customer.phone}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">ที่อยู่ออกใบกำกับภาษี</p>
                {/* Asked for a tax invoice: buyer name (company + สาขา) and the 13-digit number, same as the downloaded file. */}
                <Show
                  when={data().taxInvoice}
                  fallback={<p class="mt-1 text-sm font-medium text-ink">{data().billing.recipientName}</p>}
                >
                  {(t) => (
                    <>
                      <p class="mt-1 text-sm font-medium text-ink">
                        {t().name}
                        <Show when={formatTaxBranch(t())}>{(branch) => ` (${branch()})`}</Show>
                      </p>
                      <p class="text-sm text-ink-gray">
                        {taxIdLabel(t().type)} {formatTaxId(t().taxId)}
                      </p>
                    </>
                  )}
                </Show>
                <p class="text-sm text-ink-gray">{data().billing.phone}</p>
                <p class="text-sm text-ink-gray">{formatOrderAddress(data().billing)}</p>
              </div>
              <div class="sm:col-span-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">ที่อยู่จัดส่ง</p>
                <p class="mt-1 text-sm font-medium text-ink">{data().shipping.address.recipientName}</p>
                <p class="text-sm text-ink-gray">{data().shipping.address.phone}</p>
                <p class="text-sm text-ink-gray">{formatOrderAddress(data().shipping.address)}</p>
              </div>
            </div>

            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-border text-left text-xs uppercase tracking-wide text-ink-placeholder">
                  <th class="py-2 font-medium">สินค้า</th>
                  <th class="py-2 text-right font-medium">จำนวน</th>
                  <th class="py-2 text-right font-medium">ราคา/หน่วย</th>
                  <th class="py-2 text-right font-medium">รวม</th>
                </tr>
              </thead>
              <tbody>
                <For each={data().items}>
                  {(item) => (
                    <tr class="border-b border-border/60">
                      <td class="py-2">
                        <p class="font-medium text-ink">{item.name}</p>
                        <Show when={item.variantLabel}>
                          <p class="text-xs text-ink-gray">{item.variantLabel}</p>
                        </Show>
                        <Show when={item.isFreeGift}>
                          <p class="text-xs font-semibold text-success">ของแถมฟรี</p>
                        </Show>
                      </td>
                      <td class="py-2 text-right text-ink-gray">{item.qty}</td>
                      <td class="py-2 pl-3 text-right text-ink-gray">{formatAdminCurrency(item.unitPrice)}</td>
                      <td class="py-2 pl-3 text-right font-medium text-ink">{item.isFreeGift ? "ฟรี" : formatAdminCurrency(item.lineTotal)}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>

            <div class="ml-auto mt-4 w-full max-w-sm">
              <OrderTotalsBreakdown order={data().order} showCoinsEarned={false} />
              {/* Prices include VAT: the tax invoice splits the total into before-VAT + 7% VAT. */}
              <Show when={data().taxInvoice && vatBreakdown(data().totals.grandTotal)}>
                {(v) => (
                  <dl class="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
                    <div class="flex items-center justify-between gap-3">
                      <dt class="text-ink-gray">มูลค่าก่อนภาษีมูลค่าเพิ่ม</dt>
                      <dd class="text-ink">{formatAdminCurrency(v().beforeVat)}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <dt class="text-ink-gray">ภาษีมูลค่าเพิ่ม 7%</dt>
                      <dd class="text-ink">{formatAdminCurrency(v().vat)}</dd>
                    </div>
                  </dl>
                )}
              </Show>
            </div>

            <div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">การชำระเงิน</p>
                <p class="mt-1 text-ink">
                  {data().payment.method}
                  {data().payment.detail ? ` ${data().payment.detail}` : ""}
                </p>
                <Show when={data().payment.transactionId}>
                  <p class="text-xs text-ink-gray">เลขอ้างอิง {data().payment.transactionId}</p>
                </Show>
              </div>
              <p class="font-medium text-ink">ชำระเงินแล้ว {data().receiptDate}</p>
            </div>

            <p class="mt-8 text-center text-sm text-ink-gray">ขอบคุณที่อุดหนุน Charmiss</p>
          </div>
        </div>
      )}
    </Show>
  );
}
