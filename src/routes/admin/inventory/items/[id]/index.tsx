import { createMemo, createSignal, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ImageIcon, InventoryIcon, RefreshIcon } from "~/components/admin/icons";
import { STOCK_STATUS_META, getAvailableStock, inventoryStatusLabel } from "~/lib/adminInventoryStock";
import { useAdminInventoryStock } from "~/lib/adminInventoryStockStore";
import { useAdminProducts } from "~/lib/adminProductStore";
import { pushToast } from "~/lib/toast";

/** Read-only Detail (C) — every Stock field here is the Inventory System's own data; "ดูสินค้า" is the only way to reach the real Product Detail page. */
export default function AdminInventoryItemDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminInventoryStock();
  const productStore = useAdminProducts();
  const navigate = useNavigate();
  const stock = createMemo(() => store.getById(params.id));
  const product = createMemo(() => {
    const s = stock();
    return s ? productStore.getById(s.productId) : undefined;
  });

  const [syncing, setSyncing] = createSignal(false);

  const handleSync = async () => {
    const s = stock();
    if (!s) return;
    setSyncing(true);
    await store.syncSelected([s.id]);
    setSyncing(false);
    pushToast("Sync ข้อมูลจากระบบคลังสินค้าเรียบร้อยแล้ว", "success");
  };

  return (
    <Show
      when={stock()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "คลังสินค้า", href: "/admin/inventory" }, { label: "สินค้าคงคลัง", href: "/admin/inventory/items" }]} />
          <EmptyState icon={<InventoryIcon />} title="ไม่พบข้อมูลสต็อกนี้" description="ข้อมูลอาจยังไม่ได้ Sync มาจากระบบคลังสินค้า หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าสินค้าคงคลัง" onAction={() => navigate("/admin/inventory/items")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const s = current;
        const p = product;
        const name = () => p()?.name ?? "(ไม่พบสินค้า)";
        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "คลังสินค้า", href: "/admin/inventory" }, { label: "สินค้าคงคลัง", href: "/admin/inventory/items" }, { label: name() }]} />
            <PageHeader
              title={name()}
              description={`${p()?.sku ?? "-"}${s().variantLabel ? ` · ${s().variantLabel}` : ""}`}
              actions={
                <div class="flex flex-wrap items-center gap-2">
                  <Show when={p()}>
                    <Button variant="outline" href={`/admin/products/${p()!.id}`}>
                      ดูสินค้า
                    </Button>
                  </Show>
                  <Button variant="primary" onClick={handleSync} loading={syncing()}>
                    <RefreshIcon class="size-4" /> Sync
                  </Button>
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title="Product / Variant">
                  <div class="flex items-center gap-3">
                    <div class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
                      <Show when={p()?.image} fallback={<ImageIcon class="size-5" />}>
                        <img src={p()!.image} alt="" class="size-full object-cover" />
                      </Show>
                    </div>
                    <div class="min-w-0">
                      <p class="truncate font-medium text-ink">{name()}</p>
                      <p class="truncate text-sm text-ink-gray">
                        SKU: {p()?.sku ?? "-"}
                        {s().variantLabel ? ` · ${s().variantLabel}` : ""}
                      </p>
                    </div>
                  </div>
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะสต็อก">
                  <StatusBadge tone={STOCK_STATUS_META[s().status].tone} class="w-fit">
                    {inventoryStatusLabel(s())}
                  </StatusBadge>
                </Section>

                <Section title="จำนวนสต็อก">
                  <Row label="Stock On Hand" value={s().onHand.toLocaleString("th-TH")} />
                  <Row label="Reserved" value={s().reserved.toLocaleString("th-TH")} />
                  <Row label="Available" value={getAvailableStock(s()).toLocaleString("th-TH")} />
                </Section>

                <Section title="คลังสินค้า">
                  <Row label="Warehouse" value={s().warehouse} />
                </Section>

                <Section title="ข้อมูลการเชื่อมต่อ">
                  <Row label="Source" value={s().source} />
                  <Row label="Last Sync" value={s().syncedAt} />
                </Section>
              </div>
            </div>
          </div>
        );
      }}
    </Show>
  );
}

function Section(props: { title: string; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between gap-3 text-sm">
      <dt class="text-ink-gray">{props.label}</dt>
      <dd class="font-medium text-ink">{props.value}</dd>
    </div>
  );
}
