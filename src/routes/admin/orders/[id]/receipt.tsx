import { For, Show, onMount } from "solid-js";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { Button } from "~/components/shared/Button";
import { EmptyState } from "~/components/admin/EmptyState";
import { PrintIcon, DownloadIcon, OrdersIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { PAYMENT_STATUS_META, formatOrderAddress } from "~/lib/adminOrders";
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

  const receipt = () => getReceiptData(params.id, store.orders());

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
          <EmptyState icon={<OrdersIcon />} title="ไม่พบคำสั่งซื้อนี้" description="ไม่สามารถออกใบเสร็จได้เนื่องจากไม่พบคำสั่งซื้อ" actionLabel="กลับไปหน้าคำสั่งซื้อ" onAction={() => navigate("/admin/orders")} class="bg-surface-card shadow-card" />
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
                { label: "ใบเสร็จ" },
              ]}
            />
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h1 class="text-xl font-bold text-ink">ใบเสร็จ {data().receiptNumber}</h1>
              <div class="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                  <PrintIcon class="size-4" /> พิมพ์
                </Button>
                <Button variant="outline" onClick={() => downloadOrderReceiptHtml(data(), formatAdminCurrency)}>
                  <DownloadIcon class="size-4" /> ดาวน์โหลด
                </Button>
              </div>
            </div>
          </div>

          <div class="mx-auto w-full max-w-2xl rounded-card bg-surface-card p-6 shadow-card print:max-w-none print:rounded-none print:p-0 print:shadow-none sm:p-8">
            <div class="flex items-start justify-between border-b border-border pb-6">
              <div>
                <img src={logoCharmiss} alt="Charmiss" class="h-8 w-auto" />
                <p class="mt-2 text-sm text-ink-gray">ใบเสร็จรับเงิน</p>
              </div>
              <div class="text-right text-sm">
                <p class="font-semibold text-ink">{data().receiptNumber}</p>
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
                <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">ที่อยู่ออกใบเสร็จรับเงิน</p>
                <Show when={data().order.billingAddress} fallback={<p class="mt-1 text-sm text-ink-gray">ออกในชื่อลูกค้า</p>}>
                  {(b) => (
                    <>
                      <p class="mt-1 text-sm font-medium text-ink">{b().recipientName}</p>
                      <p class="text-sm text-ink-gray">{b().phone}</p>
                      <p class="text-sm text-ink-gray">{formatOrderAddress(b())}</p>
                    </>
                  )}
                </Show>
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
            </div>

            <div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">การชำระเงิน</p>
                <p class="mt-1 text-ink">
                  {data().payment.method}
                  {data().payment.detail ? ` · ${data().payment.detail}` : ""}
                </p>
                <Show when={data().payment.transactionId}>
                  <p class="text-xs text-ink-gray">เลขอ้างอิง {data().payment.transactionId}</p>
                </Show>
              </div>
              <p class="font-medium text-ink">{PAYMENT_STATUS_META[data().order.paymentStatus].label}</p>
            </div>

            <p class="mt-8 text-center text-sm text-ink-gray">ขอบคุณที่อุดหนุน Charmiss</p>
          </div>
        </div>
      )}
    </Show>
  );
}
