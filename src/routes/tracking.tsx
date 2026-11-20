import { createSignal, For, onMount, Show } from "solid-js";
import { A, useSearchParams } from "@solidjs/router";
import { InfoCard, InfoPageShell } from "~/components/info/InfoPageShell";
import { OrderTrackingTimeline } from "~/components/account/OrderTrackingTimeline";
import { Button } from "~/components/shared/Button";
import { EmptyState } from "~/components/shared/EmptyState";
import { TextField } from "~/components/shared/TextField";
import { SearchIcon, TruckIcon } from "~/components/shared/icons";
import { MOCK_USER } from "~/lib/accountData";
import { createMockOrderRepository } from "~/lib/orderHistory";
import { formatOrderDateTime, getOrderDisplayStatus } from "~/lib/orderTracking";
import { INFO_PAGES } from "~/lib/siteInfo";
import type { Order } from "~/lib/types";

const digits = (s: string) => s.replace(/\D/g, "");

/**
 * Which orders a lookup finds, no sign-in needed: an order number or DHL tracking number finds that one order;
 * the phone number it was shipped to, or the buyer's email, finds every order of theirs. Mock: the account's
 * own orders (`orderHistory.ts`), the only ones this prototype has.
 */
function findOrders(orders: Order[], query: string): Order[] {
  const q = query.trim();
  const qLower = q.toLowerCase();
  const qDigits = digits(q);
  if (q.includes("@")) return qLower === MOCK_USER.email.toLowerCase() ? orders : [];
  return orders.filter(
    (o) =>
      o.id.toLowerCase() === qLower ||
      (!!o.shipment.trackingNumber && o.shipment.trackingNumber === qDigits) ||
      (qDigits.length >= 9 && digits(o.shippingAddress.phone) === qDigits),
  );
}

/**
 * ติดตามคำสั่งซื้อ (Footer > ช่วยเหลือ): look up an order's shipping status without signing in, by phone, email,
 * order number or tracking number. Each order found shows the same DHL timeline as its order page. `?q=` keeps
 * the last lookup, so a refresh or a shared link shows the same result.
 */
export default function TrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const repo = createMockOrderRepository();
  const [query, setQuery] = createSignal(typeof searchParams.q === "string" ? searchParams.q : "");
  const [error, setError] = createSignal<string>();
  const [searching, setSearching] = createSignal(false);
  /** Unset until the first lookup. */
  const [results, setResults] = createSignal<Order[]>();
  /** What the shown results are for (the field may have changed since). */
  const [searched, setSearched] = createSignal("");

  const lookup = async (q: string) => {
    setSearching(true);
    await new Promise((r) => setTimeout(r, 400));
    setResults(findOrders(await repo.list(), q));
    setSearched(q);
    setSearching(false);
  };

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const q = query().trim();
    if (!q) return setError("กรุณากรอกเบอร์โทรศัพท์ อีเมล หมายเลขคำสั่งซื้อ หรือเลขพัสดุ");
    setError(undefined);
    setSearchParams({ q });
    void lookup(q);
  };

  onMount(() => {
    if (query().trim()) void lookup(query().trim());
  });

  return (
    <InfoPageShell title={INFO_PAGES.tracking.label} subtitle="กรอกเบอร์โทรศัพท์ที่ใช้สั่งซื้อ หมายเลขคำสั่งซื้อ หรือเลขพัสดุ เพื่อตรวจสอบสถานะการจัดส่ง">
      <InfoCard>
        {/* Same field + button row as the coupon code box: the button lines up with the input, a message under the input doesn't move it. */}
        <form onSubmit={submit} novalidate class="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div class="min-w-0 flex-1">
            <TextField
              label="กรอกเบอร์โทรศัพท์หรือหมายเลขคำสั่งซื้อ"
              placeholder="เช่น 0812345678 หรือ ORD-2026-1027"
              autocomplete="off"
              enterkeyhint="search"
              value={query()}
              onInput={(e) => {
                setQuery(e.currentTarget.value);
                if (error() && e.currentTarget.value.trim()) setError(undefined);
              }}
              error={error()}
            />
          </div>
          <Button type="submit" variant="primary" loading={searching()} class="h-11 w-full shrink-0 !px-5 sm:mt-[26px] sm:w-auto">
            <SearchIcon class="size-5" />
            ตรวจสอบสถานะ
          </Button>
        </form>
      </InfoCard>

      <Show
        when={results()}
        fallback={
          <InfoCard>
            <EmptyState size="compact" icon={TruckIcon} title="กรอกข้อมูลเพื่อตรวจสอบสถานะ" description="ระบบจะค้นหาประวัติการจัดส่งและ Timeline แบบเรียลไทม์จากระบบขนส่งโดยตรง" />
          </InfoCard>
        }
      >
        {(found) => (
          <Show
            when={found().length > 0}
            fallback={
              <InfoCard>
                <EmptyState
                  size="compact"
                  icon={SearchIcon}
                  title={`ไม่พบข้อมูลพัสดุสำหรับ "${searched()}"`}
                  description="กรุณาตรวจสอบความถูกต้องของหมายเลขพัสดุ (Tracking Number) หรือหมายเลขคำสั่งซื้ออีกครั้ง"
                />
              </InfoCard>
            }
          >
            <p class="text-sm text-ink-gray">พบ {found().length} คำสั่งซื้อ</p>
            <For each={found()}>{(order) => <TrackedOrder order={order} />}</For>
          </Show>
        )}
      </Show>
    </InfoPageShell>
  );
}

/** One order found: its number, date and status above the DHL timeline; unpaid / cancelled ones have no timeline yet. */
function TrackedOrder(props: { order: Order }) {
  const status = () => getOrderDisplayStatus(props.order);
  const hasTimeline = () => props.order.status !== "pending_payment" && props.order.status !== "cancelled";
  const header = (
    <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div class="min-w-0">
        <h2 class="text-lg font-bold text-ink">{props.order.id}</h2>
        <p class="text-sm text-ink-gray">สั่งซื้อเมื่อ {formatOrderDateTime(props.order.placedAt)}</p>
      </div>
      <span class={`shrink-0 rounded-pill px-2 py-0.5 text-xs font-semibold ${status().badgeClass}`}>{status().label}</span>
    </div>
  );
  const detailLink = (
    <A href={`/account/orders/${props.order.id}`} class="self-start text-sm font-medium text-brand-pink underline lg:hover:no-underline">
      ดูรายละเอียดคำสั่งซื้อ
    </A>
  );

  return (
    <Show
      when={hasTimeline()}
      fallback={
        <InfoCard>
          {header}
          <p class="text-sm leading-[1.75] text-ink-gray">
            {props.order.status === "cancelled" ? "คำสั่งซื้อนี้ถูกยกเลิกแล้ว" : "รอชำระเงิน เราจะเริ่มเตรียมและจัดส่งสินค้าทันทีที่ชำระเงินเรียบร้อย"}
          </p>
          {detailLink}
        </InfoCard>
      }
    >
      <div class="flex flex-col gap-2">
        <OrderTrackingTimeline shipment={props.order.shipment} header={header} />
        <div class="px-1">{detailLink}</div>
      </div>
    </Show>
  );
}
