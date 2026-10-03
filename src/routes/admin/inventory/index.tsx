import { createMemo, createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { RefreshIcon, CheckCircleIcon, InventoryIcon, ImageIcon } from "~/components/admin/icons";
import { STOCK_STATUS_META, getAvailableStock } from "~/lib/adminInventoryStock";
import { useAdminInventoryStock } from "~/lib/adminInventoryStockStore";
import { useAdminProducts } from "~/lib/adminProductStore";
import { pushToast } from "~/lib/toast";

/**
 * Inventory (Phase 06) — "ภาพรวมสต็อก" (A). An external Inventory System is
 * the Source of Truth for Stock; this page only summarizes the last synced
 * snapshot and links to the full list/detail — no adjust/receive/transfer
 * action exists anywhere in this module (see `adminInventoryStock.ts`'s doc
 * comment).
 */
export default function AdminInventoryOverviewPage() {
  const store = useAdminInventoryStock();
  const productStore = useAdminProducts();
  const [syncingAll, setSyncingAll] = createSignal(false);

  const skuCount = createMemo(() => new Set(productStore.products().map((p) => p.sku)).size);
  const inStockCount = createMemo(() => store.stocks().filter((s) => s.status === "in_stock").length);
  const lowStockCount = createMemo(() => store.stocks().filter((s) => s.status === "low_stock").length);
  const outOfStockCount = createMemo(() => store.stocks().filter((s) => s.status === "out_of_stock").length);
  const reservedTotal = createMemo(() => store.stocks().reduce((sum, s) => sum + s.reserved, 0));
  const availableTotal = createMemo(() => store.stocks().reduce((sum, s) => sum + getAvailableStock(s), 0));

  const recentStocks = createMemo(() => [...store.stocks()].sort((a, b) => b.syncedAt.localeCompare(a.syncedAt)).slice(0, 5));
  const productOf = (productId: string) => productStore.getById(productId);

  const handleSyncAll = async () => {
    setSyncingAll(true);
    await store.syncAll();
    setSyncingAll(false);
    pushToast("Sync ข้อมูลจากระบบคลังสินค้าเรียบร้อยแล้ว", "success");
  };

  const openInventorySystem = () => pushToast("(จำลอง) กำลังเปิดระบบคลังสินค้าในแท็บใหม่", "success");

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "คลังสินค้า" }]} />
      <PageHeader
        title="คลังสินค้า"
        description="ภาพรวมสต็อกสินค้าที่ Sync มาจากระบบคลังสินค้า"
        actions={
          <Button href="/admin/inventory/items" variant="primary">
            ดูสินค้าคงคลังทั้งหมด
          </Button>
        }
      />

      <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <CheckCircleIcon class="size-5 text-success" />
            <p class="text-sm font-semibold text-ink">เชื่อมต่อกับระบบคลังสินค้าแล้ว (Connected)</p>
          </div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-gray">
            <span>Last Sync: {store.lastSyncedAt()}</span>
            <span>จำนวนข้อมูลที่ Sync: {store.stocks().length.toLocaleString("th-TH")} SKU</span>
          </div>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" onClick={openInventorySystem}>
            ดูในระบบคลังสินค้า
          </Button>
          <Button variant="primary" onClick={handleSyncAll} loading={syncingAll()}>
            <RefreshIcon class="size-4" /> Sync ข้อมูล
          </Button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="สินค้าทั้งหมด" value={productStore.products().length} />
        <StatCard label="SKU ทั้งหมด" value={skuCount()} />
        <StatCard label="มีสินค้า" value={inStockCount()} tone="success" />
        <StatCard label="ใกล้หมด" value={lowStockCount()} tone="warning" />
        <StatCard label="สินค้าหมด" value={outOfStockCount()} tone="danger" />
        <StatCard label="Reserved Stock" value={reservedTotal()} />
        <StatCard label="Available Stock" value={availableTotal()} />
      </div>

      <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-ink">Sync ล่าสุด</h2>
          <A href="/admin/inventory/items" class="text-sm font-medium text-brand-pink hover:underline">
            ดูทั้งหมด
          </A>
        </div>
        <div class="flex flex-col divide-y divide-border">
          <Show when={recentStocks().length > 0} fallback={<p class="py-3 text-sm text-ink-gray">ยังไม่มีข้อมูลจากระบบคลังสินค้า</p>}>
            {recentStocks().map((s) => {
              const p = productOf(s.productId);
              return (
                <A href={`/admin/inventory/items/${s.id}`} class="flex items-center gap-3 py-3 transition-colors duration-150 hover:bg-surface-pink/40">
                  <div class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
                    <Show when={p?.image} fallback={<ImageIcon class="size-4" />}>
                      <img src={p!.image} alt="" class="size-full object-cover" />
                    </Show>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-ink">{p?.name ?? "(ไม่พบสินค้า)"}</p>
                    <p class="truncate text-xs text-ink-gray">{p?.sku ?? "-"} · {s.warehouse}</p>
                  </div>
                  <StatusBadge tone={STOCK_STATUS_META[s.status].tone}>{STOCK_STATUS_META[s.status].label}</StatusBadge>
                </A>
              );
            })}
          </Show>
        </div>
      </div>
    </div>
  );
}

function StatCard(props: { label: string; value: number; tone?: "success" | "warning" | "danger" }) {
  const toneClass = () =>
    props.tone === "success" ? "text-success" : props.tone === "warning" ? "text-system-yellow" : props.tone === "danger" ? "text-danger-strong" : "text-ink";
  return (
    <div class="flex flex-col gap-1 rounded-card bg-surface-card p-4 shadow-card">
      <p class="text-xs text-ink-gray">{props.label}</p>
      <p class={`text-2xl font-bold ${toneClass()}`}>{props.value.toLocaleString("th-TH")}</p>
    </div>
  );
}
