import { createSignal, For, Show } from "solid-js";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { Toggle } from "~/components/admin/Toggle";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { NotificationItemFormDrawer } from "~/components/admin/notifications/NotificationItemFormDrawer";
import { PromoStrip, UtilityBar } from "~/components/shared/PromotionStrip";
import { useAdminNotificationBar } from "~/lib/adminNotificationBarStore";
import type { PromotionStripContent } from "~/lib/adminNotificationBar";
import { pushToast } from "~/lib/toast";

type Variant = "purple" | "pink";

const VARIANT_META: Record<Variant, { title: string; note: string; swatch: string }> = {
  purple: { title: "แถบสีม่วง", note: "แถบบนสุดของทุกหน้า แสดงทั้งมือถือและเดสก์ท็อป ลูกค้ากดปิดได้", swatch: "bg-brand-purple" },
  pink: { title: "แถบสีชมพู", note: "แถบใต้แถบสีม่วง แสดงเฉพาะบนเดสก์ท็อป คู่กับปุ่มเข้าสู่ระบบและเลือกภาษา", swatch: "bg-surface-pink ring-1 ring-inset ring-brand-pink/40" },
};

/** The storefront's two top bars. Edits here show on the storefront right after saving. */
export default function AdminNotificationsPage() {
  const bar = useAdminNotificationBar();

  const [editingVariant, setEditingVariant] = createSignal<Variant | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [confirmToggle, setConfirmToggle] = createSignal<boolean | null>(null);
  const [toggling, setToggling] = createSignal(false);

  const content = (variant: Variant): PromotionStripContent => (variant === "purple" ? bar.state().purple : bar.state().pink);

  const handleSubmit = async (values: PromotionStripContent) => {
    const variant = editingVariant();
    if (!variant) return;
    setSaving(true);
    try {
      if (variant === "purple") await bar.updatePurple(values);
      else await bar.updatePink(values);
      pushToast("บันทึกแถบประกาศเรียบร้อยแล้ว", "success");
      setEditingVariant(null);
    } catch {
      pushToast("บันทึกแถบประกาศไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSaving(false);
    }
  };

  const applyToggle = async () => {
    const next = confirmToggle();
    if (next === null) return;
    setToggling(true);
    try {
      await bar.setPurpleEnabled(next);
      pushToast(next ? "เปิดแถบสีม่วงแล้ว" : "ปิดแถบสีม่วงแล้ว", "success");
      setConfirmToggle(null);
    } catch {
      pushToast("เปลี่ยนสถานะแถบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "แถบประกาศด้านบน" }]} />
      <PageHeader title="แถบประกาศด้านบน" description="แก้ไขข้อความแถบด้านบนของหน้าร้าน" />

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <For each={["purple", "pink"] as Variant[]}>
          {(variant) => (
            <section class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="flex items-center gap-2 text-base font-semibold text-ink">
                    <span class={`size-3 rounded-pill ${VARIANT_META[variant].swatch}`} /> {VARIANT_META[variant].title}
                  </h2>
                  <p class="mt-1 text-xs text-ink-gray">{VARIANT_META[variant].note}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditingVariant(variant)}>
                  แก้ไขข้อความ
                </Button>
              </div>

              <div class="flex items-center gap-3 rounded-card bg-surface-gray/60 p-3">
                <div class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-card text-ink-placeholder">
                  <Show when={content(variant).icon} fallback={<span class="text-xs">-</span>}>
                    <img src={content(variant).icon} alt="" class="size-full object-contain" />
                  </Show>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-ink">{content(variant).text}</p>
                  <Show when={content(variant).linkLabel} fallback={<p class="text-xs text-ink-gray">ไม่มีลิงก์</p>}>
                    <p class="truncate text-xs text-ink-gray">
                      ลิงก์ "{content(variant).linkLabel}" ไปที่ {content(variant).linkUrl}
                    </p>
                  </Show>
                </div>
              </div>

              <Show when={variant === "purple"}>
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">การแสดงผล</span>
                  <Toggle checked={bar.state().purple.enabled} onChange={(v) => setConfirmToggle(v)} onLabel="แสดง" offLabel="ไม่แสดง" />
                  <span class="text-xs text-ink-gray">ปิดแล้วแถบสีม่วงจะหายจากหน้าร้านทุกหน้า</span>
                </label>
              </Show>
            </section>
          )}
        </For>
      </div>

      <section class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
        <h2 class="text-base font-semibold text-ink">ตัวอย่างบนหน้าร้าน</h2>
        <p class="text-xs text-ink-gray">แถบสีชมพูแสดงเฉพาะหน้าจอเดสก์ท็อป</p>
        {/* Look only: `inert` + no pointer events so the bars' own hover menus (account, language) never open in Admin. */}
        <div class="pointer-events-none select-none overflow-hidden rounded-card border border-border" inert>
          <PromoStrip state={bar.state()} />
          <UtilityBar state={bar.state()} />
        </div>
      </section>

      <NotificationItemFormDrawer
        open={editingVariant() !== null}
        onOpenChange={(open) => !open && setEditingVariant(null)}
        variant={editingVariant() ?? "purple"}
        initial={content(editingVariant() ?? "purple")}
        saving={saving()}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={confirmToggle() !== null}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle() ? "แสดงแถบสีม่วง?" : "ซ่อนแถบสีม่วง?"}
        description={confirmToggle() ? "แถบสีม่วงจะกลับมาแสดงบนหน้าร้านทุกหน้า" : "แถบสีม่วงจะถูกซ่อนจากหน้าร้านทุกหน้า"}
        confirmLabel={confirmToggle() ? "แสดงแถบ" : "ซ่อนแถบ"}
        loading={toggling()}
        onConfirm={applyToggle}
      />
    </div>
  );
}
