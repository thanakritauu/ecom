import { createSignal, Show } from "solid-js";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { NotificationItemFormDrawer } from "~/components/admin/notifications/NotificationItemFormDrawer";
import { PromoStrip, UtilityBar } from "~/components/shared/PromotionStrip";
import { useAdminNotificationBar } from "~/lib/adminNotificationBarStore";
import type { PromotionStripContent } from "~/lib/adminNotificationBar";
import { pushToast } from "~/lib/toast";

/**
 * CMS Final Admin UX Refinement §02-08 — "โปรโมชั่นแถบ", now nested under
 * "จัดการเนื้อหา" (§02/§18). Exactly two fixed strips, not a list: Purple
 * (content + one on/off Toggle) and Light Pink (content only, always
 * visible, no toggle, no order — §03/§06). Management UI only — nothing
 * here writes back to the Customer Frontend this phase.
 */
export default function AdminNotificationsPage() {
  const bar = useAdminNotificationBar();

  const [editingVariant, setEditingVariant] = createSignal<"purple" | "pink" | null>(null);
  const [saving, setSaving] = createSignal(false);

  const openEdit = (variant: "purple" | "pink") => setEditingVariant(variant);

  const handleSubmit = async (values: PromotionStripContent) => {
    const variant = editingVariant();
    if (!variant) return;
    setSaving(true);
    try {
      if (variant === "purple") await bar.updatePurple(values);
      else await bar.updatePink(values);
      pushToast("บันทึกการเปลี่ยนแปลงแล้ว", "success");
      setEditingVariant(null);
    } finally {
      setSaving(false);
    }
  };

  const editingContent = (): PromotionStripContent => {
    const variant = editingVariant();
    if (variant === "purple") return bar.state().purple;
    if (variant === "pink") return bar.state().pink;
    return { icon: "", text: "" };
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "โปรโมชั่นแถบ" }]} />
      <PageHeader title="โปรโมชั่นแถบ" description="จัดการข้อความแถบด้านบนของหน้าร้าน — แถบสีม่วงและแถบสีชมพูอ่อน แต่ละแถบมีตำแหน่งตายตัว ไม่สามารถจัดลำดับได้" />

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Purple strip — content + one on/off Toggle (§05) */}
        <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="flex items-center gap-2 text-sm font-semibold text-ink">
                <span class="size-3 rounded-pill bg-brand-purple" /> แถบสีม่วง
              </p>
              <p class="mt-1 text-xs text-ink-gray">แสดงบนสุดของหน้าเว็บไซต์</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={bar.state().purple.enabled}
              aria-label="เปิด/ปิดแถบสีม่วง"
              onClick={() => bar.togglePurpleEnabled()}
              class="relative flex h-7 w-12 shrink-0 items-center rounded-pill transition-colors duration-150"
              classList={{ "bg-brand-pink": bar.state().purple.enabled, "bg-surface-gray": !bar.state().purple.enabled }}
            >
              <span
                class="absolute size-5 rounded-pill bg-surface-card shadow-card transition-transform duration-150"
                classList={{ "translate-x-6": bar.state().purple.enabled, "translate-x-1": !bar.state().purple.enabled }}
              />
            </button>
          </div>

          <div class="flex items-center gap-3 rounded-card bg-surface-gray/40 p-3">
            <div class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-card text-ink-placeholder">
              <Show when={bar.state().purple.icon} fallback={<span class="text-xs">—</span>}>
                <img src={bar.state().purple.icon} alt="" class="size-full object-cover" />
              </Show>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-ink">{bar.state().purple.text}</p>
              <Show when={bar.state().purple.linkLabel}>
                <p class="truncate text-xs text-ink-gray">ลิงก์: {bar.state().purple.linkLabel} → {bar.state().purple.linkUrl}</p>
              </Show>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openEdit("purple")}
            class="w-fit rounded-pill border border-brand-pink px-4 py-2 text-sm font-medium text-brand-pink transition-colors duration-150 hover:bg-surface-pink"
          >
            แก้ไขข้อความ
          </button>
        </div>

        {/* Pink strip — always visible, no toggle, no order (§06) */}
        <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
          <div>
            <p class="flex items-center gap-2 text-sm font-semibold text-ink">
              <span class="size-3 rounded-pill bg-surface-pink ring-1 ring-inset ring-brand-pink/40" /> แถบสีชมพูอ่อน
            </p>
            <p class="mt-1 text-xs text-ink-gray">แสดงตลอดเวลา — ไม่มีปุ่มเปิด/ปิด</p>
          </div>

          <div class="flex items-center gap-3 rounded-card bg-surface-gray/40 p-3">
            <div class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-card text-ink-placeholder">
              <Show when={bar.state().pink.icon} fallback={<span class="text-xs">—</span>}>
                <img src={bar.state().pink.icon} alt="" class="size-full object-cover" />
              </Show>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-ink">{bar.state().pink.text}</p>
              <Show when={bar.state().pink.linkLabel} fallback={<p class="text-xs text-ink-gray">ไม่มีลิงก์</p>}>
                <p class="truncate text-xs text-ink-gray">ลิงก์: {bar.state().pink.linkLabel} → {bar.state().pink.linkUrl}</p>
              </Show>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openEdit("pink")}
            class="w-fit rounded-pill border border-brand-pink px-4 py-2 text-sm font-medium text-brand-pink transition-colors duration-150 hover:bg-surface-pink"
          >
            แก้ไขข้อความ
          </button>
        </div>
      </div>

      {/* CHARMISS CMS — ADMIN ONLY §3/§5 — genuine Frontend reuse: the exact
          `PromoStrip`/`UtilityBar` components Header.tsx renders (extracted
          verbatim, see ~/components/shared/PromotionStrip.tsx), not a
          look-alike mock. Disclosure: Header.tsx's real strips are still
          static copy today (pre-existing, unrelated to this phase) and do
          not read from this store yet, so editing the fields above does not
          change what customers see — the note below says so plainly instead
          of silently faking a "live" preview that would disagree with the
          real Frontend. */}
      <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
        <h2 class="text-base font-semibold text-ink">ตัวอย่างการแสดงผล</h2>
        <p class="text-xs text-ink-gray">
          แสดงผลด้วย Component เดียวกับ Header จริงของหน้าร้าน — ปัจจุบันเนื้อหาของทั้งสองแถบในหน้าร้านยังเป็นข้อความคงที่ (ยังไม่เชื่อมกับข้อมูลที่แก้ไขด้านบน) การแก้ไขข้อความ/ไอคอนข้างต้นจึงยังไม่มีผลต่อสิ่งที่ลูกค้าเห็นจริงในเฟสนี้
        </p>
        <div class="overflow-hidden rounded-card border border-border">
          <PromoStrip />
          <UtilityBar />
        </div>
      </div>

      <NotificationItemFormDrawer
        open={editingVariant() !== null}
        onOpenChange={(open) => !open && setEditingVariant(null)}
        variant={editingVariant() ?? "purple"}
        initial={editingContent()}
        saving={saving()}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
