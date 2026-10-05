import { createMemo, createSignal, For, Show } from "solid-js";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { NavigationItemFormDrawer } from "~/components/admin/navigation/NavigationItemFormDrawer";
import { NavigationIcon, ArrowUpIcon, ArrowDownIcon, DragHandleIcon, PlusIcon, TrashIcon } from "~/components/admin/icons";
import { NavIcon } from "~/components/shared/NavIcon";
import {
  NAVIGATION_TARGET_TYPE_LABELS,
  NAVIGATION_VISIBILITY_META,
  BOTTOM_NAV_PROMOTION_ITEM_ID,
  BOTTOM_NAV_PROMOTION_FALLBACK_HREF,
  type NavigationItem,
  type NavigationItemFormValues,
} from "~/lib/adminNavigation";
import { useAdminNavigation } from "~/lib/adminNavigationStore";
import { buildNavigationTree, flattenNavigationTree, type ResolvedNavigationItem } from "~/lib/navigationResolver";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { useAdminCollections } from "~/lib/adminCollectionStore";
import { useAdminProducts } from "~/lib/adminProductStore";
import { pushToast } from "~/lib/toast";

/**
 * Navigation Architecture (Blueprint v1 FINAL) — the standalone Admin
 * Navigation module. Deliberately its own top-level page (not nested under
 * Content/Promotion Pages/Homepage/Marketing, §13) and a light custom
 * list/drawer shell instead of the heavier `DataTable`+`FilterBar` shell
 * every catalog-style module uses — a ~13-item menu tree reads better as a
 * simple, visual, CMS-style list than as an enterprise table (§7).
 *
 * Admin's own tree is built from `buildNavigationTree` UNFILTERED (every
 * item, including ones whose target isn't currently reachable) so broken/
 * not-yet-published targets still show up here with a dependency warning
 * instead of silently disappearing (§18/§36).
 */
export default function AdminNavigationPage() {
  const navigation = useAdminNavigation();
  const contentStore = useAdminContent();
  const categoryStore = useAdminCategories();
  const collectionStore = useAdminCollections();
  const productStore = useAdminProducts();

  const lookups = {
    getPromotionPage: contentStore.getById,
    getCategory: categoryStore.getById,
    getCollection: collectionStore.getById,
    getProduct: productStore.getById,
  };

  const tree = createMemo(() => buildNavigationTree(navigation.items(), lookups));
  const rows = createMemo(() => flattenNavigationTree(tree()));
  /** Exactly what the storefront's `navigationContent.visibleTree()` keeps — visible + target live, top level only (Header's rail never renders children). */
  const storefrontItems = createMemo(() => tree().filter((i) => i.visible && i.available));
  const bottomNavPromotionHref = () => storefrontItems().find((i) => i.id === BOTTOM_NAV_PROMOTION_ITEM_ID)?.href ?? BOTTOM_NAV_PROMOTION_FALLBACK_HREF;

  const [formOpen, setFormOpen] = createSignal(false);
  const [editing, setEditing] = createSignal<NavigationItem | undefined>(undefined);
  const [saving, setSaving] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal<NavigationItem | null>(null);
  const [actionLoading, setActionLoading] = createSignal(false);

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (item: NavigationItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleSubmit = async (values: NavigationItemFormValues) => {
    setSaving(true);
    try {
      const current = editing();
      if (current) {
        await navigation.update(current.id, values);
        pushToast("บันทึกการเปลี่ยนแปลงแล้ว", "success");
      } else {
        await navigation.add(values);
        pushToast("เพิ่มเมนูแล้ว", "success");
      }
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const childCount = (id: string) => navigation.items().filter((i) => i.parentId === id).length;

  const confirmDeleteAction = async () => {
    const item = confirmDelete();
    if (!item) return;
    setActionLoading(true);
    await navigation.remove(item.id);
    setActionLoading(false);
    setConfirmDelete(null);
    pushToast(`ลบเมนู "${item.label}" เรียบร้อยแล้ว`, "error");
  };

  const siblingBounds = (item: ResolvedNavigationItem) => {
    const siblings = navigation
      .items()
      .filter((i) => i.parentId === item.parentId)
      .sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((i) => i.id === item.id);
    return { canUp: index > 0, canDown: index >= 0 && index < siblings.length - 1 };
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเมนู" }]} />
      <PageHeader
        title="จัดการเมนู"
        description="จัดการเมนูนำทางของหน้าร้าน — เมนูแต่ละรายการชี้ไปยังหน้าแรก, หน้ารวมสินค้า, หน้าโปรโมชั่น, หมวดหมู่, คอลเลกชัน, สินค้า หรือลิงก์ภายนอก"
        primaryAction={
          <Button variant="primary" onClick={openCreate}>
            <PlusIcon class="size-4" /> เพิ่มเมนู
          </Button>
        }
      />

      <Show
        when={rows().length > 0}
        fallback={
          <EmptyState
            icon={<NavigationIcon />}
            title="ยังไม่มีรายการเมนู"
            description="เพิ่มเมนูเพื่อกำหนดว่าหน้าเว็บไซต์จะแสดงลิงก์อะไรบ้างในแถบนำทาง"
            actionLabel="เพิ่มเมนู"
            onAction={openCreate}
            class="bg-surface-card shadow-card"
          />
        }
      >
        <div class="flex flex-col divide-y divide-border rounded-card bg-surface-card shadow-card">
          <For each={rows()}>
            {(item) => {
              const bounds = () => siblingBounds(item);
              const missingTarget = () => item.href === "";
              const unavailable = () => !missingTarget() && !item.available;
              return (
                <div class="flex flex-wrap items-center gap-3 p-3 sm:p-4" style={{ "padding-left": `${1 + item.depth * 1.5}rem` }}>
                  <div class="flex min-w-0 flex-1 items-center gap-3">
                    <div class="flex shrink-0 flex-col items-center gap-0.5 text-ink-placeholder">
                      <DragHandleIcon class="size-4" />
                    </div>
                    <div class="flex shrink-0 flex-col gap-0.5">
                      <button
                        type="button"
                        aria-label="เลื่อนขึ้น"
                        disabled={!bounds().canUp}
                        onClick={() => navigation.move(item.id, "up")}
                        class="flex size-6 items-center justify-center rounded text-ink-gray transition-colors duration-150 hover:bg-surface-pink disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowUpIcon class="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="เลื่อนลง"
                        disabled={!bounds().canDown}
                        onClick={() => navigation.move(item.id, "down")}
                        class="flex size-6 items-center justify-center rounded text-ink-gray transition-colors duration-150 hover:bg-surface-pink disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowDownIcon class="size-3.5" />
                      </button>
                    </div>

                    <div class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-gray">
                      {item.icon ? <NavIcon icon={item.icon} class="size-5 rounded-media" /> : <span class="text-xs">—</span>}
                    </div>

                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="truncate text-sm font-medium text-ink">{item.label}</p>
                        <StatusBadge tone={NAVIGATION_VISIBILITY_META[item.visible ? "visible" : "hidden"].tone}>
                          {NAVIGATION_VISIBILITY_META[item.visible ? "visible" : "hidden"].label}
                        </StatusBadge>
                        <Show when={item.id === BOTTOM_NAV_PROMOTION_ITEM_ID}>
                          <span class="rounded-pill bg-surface-pink px-2 py-0.5 text-[11px] font-medium text-brand-pink">แท็บ “โปรโมชั่น” แถบล่าง</span>
                        </Show>
                        <Show when={childCount(item.id) > 0}>
                          <span class="text-xs text-ink-placeholder">{childCount(item.id)} เมนูย่อย</span>
                        </Show>
                      </div>
                      <p class="truncate text-xs text-ink-gray">
                        {NAVIGATION_TARGET_TYPE_LABELS[item.targetType]}
                        <Show when={item.href}> · {item.href}</Show>
                      </p>
                      <Show when={missingTarget()}>
                        <p class="text-xs font-medium text-danger-strong">⚠ ไม่พบปลายทางของเมนูนี้</p>
                      </Show>
                      <Show when={unavailable()}>
                        <p class="text-xs font-medium text-system-yellow">⚠ ปลายทางยังไม่พร้อมแสดงบนเว็บไซต์</p>
                      </Show>
                    </div>
                  </div>

                  <div class="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
                    <button
                      type="button"
                      onClick={() => navigation.toggleVisible(item.id)}
                      class="rounded-pill border border-brand-pink px-3 py-1.5 text-xs font-medium text-brand-pink transition-colors duration-150 hover:bg-surface-pink"
                    >
                      {item.visible ? "ซ่อน" : "แสดง"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      class="rounded-pill px-3 py-1.5 text-xs font-medium text-ink-gray transition-colors duration-150 hover:bg-surface-gray"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      aria-label={`ลบเมนู ${item.label}`}
                      onClick={() => setConfirmDelete(item)}
                      class="flex size-8 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-danger-soft hover:text-danger-strong"
                    >
                      <TrashIcon class="size-4" />
                    </button>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>

      {/* Storefront sync — same filter, same `NavIcon`, same sizes (24px mobile / 32px desktop) and weight rule (semibold when the item has an icon) as Header.tsx's pink category rail. */}
      <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
        <h2 class="text-base font-semibold text-ink">ตัวอย่างแถบเมนูบนหน้าร้าน</h2>
        <p class="text-xs text-ink-gray">แสดงเฉพาะเมนูที่เปิดแสดงและปลายทางพร้อมใช้งาน ตามลำดับเดียวกับหน้าร้าน (เมนูย่อยไม่แสดงในแถบนี้)</p>
        <For each={[{ label: "Desktop", icon: "size-8", text: "text-base", gap: "gap-6" }, { label: "Mobile", icon: "size-6", text: "text-sm", gap: "gap-2" }]}>
          {(device) => (
            <div class="flex flex-col gap-1.5">
              <p class="text-xs font-medium text-ink-gray">{device.label}</p>
              <div class={`flex overflow-x-auto rounded-card bg-brand-pink px-4 py-3 ${device.gap}`}>
                <For each={storefrontItems()} fallback={<span class="text-sm text-white/80">ไม่มีเมนูที่แสดงบนหน้าร้าน</span>}>
                  {(item) => (
                    <span
                      class={`flex shrink-0 items-center gap-1 whitespace-nowrap px-2 text-white ${device.text}`}
                      classList={{ "font-semibold": !!item.icon, "font-medium": !item.icon }}
                    >
                      <NavIcon icon={item.icon} class={`${device.icon} shrink-0`} />
                      {item.label}
                    </span>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
        <p class="text-xs text-ink-gray">
          แถบเมนูด้านล่าง (มือถือ/แท็บเล็ต): แท็บ “โปรโมชั่น” ไปที่ <span class="font-medium text-ink">{bottomNavPromotionHref()}</span> — ตามเมนู {BOTTOM_NAV_PROMOTION_ITEM_ID} (Flash Sale)
          ถ้าเมนูนั้นถูกซ่อนหรือปลายทางยังไม่พร้อม จะใช้ {BOTTOM_NAV_PROMOTION_FALLBACK_HREF}
        </p>
      </div>

      <NavigationItemFormDrawer
        open={formOpen()}
        onOpenChange={setFormOpen}
        mode={editing() ? "edit" : "create"}
        initial={editing()}
        items={navigation.items()}
        // Promotion Page / Homepage Architecture §18/§35 — Homepage is never a `promotion_page` target (it resolves via `targetType: "homepage"` instead, straight to `/`), so it's excluded here the same way `DestinationSelector.tsx`'s Promotion Page picker excludes it.
        pages={contentStore.pages().filter((p) => !p.isHomepage)}
        categories={categoryStore.categories()}
        collections={collectionStore.collections()}
        products={productStore.products()}
        saving={saving()}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบเมนูนี้?"
        description={
          confirmDelete() && childCount(confirmDelete()!.id) > 0
            ? `คุณต้องการลบ "${confirmDelete()?.label ?? ""}" หรือไม่? เมนูย่อย ${childCount(confirmDelete()!.id)} รายการจะถูกย้ายไปเป็นเมนูระดับบนสุดแทนการลบ การกระทำนี้ไม่สามารถย้อนกลับได้`
            : `คุณต้องการลบ "${confirmDelete()?.label ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`
        }
        confirmLabel="ลบ"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />
    </div>
  );
}
