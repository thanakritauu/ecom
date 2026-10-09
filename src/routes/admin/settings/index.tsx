import { A } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Toggle } from "~/components/admin/Toggle";
import { ShieldUserIcon, KeyIcon } from "~/components/admin/icons";
import { useAdminUI } from "~/lib/adminUI";

/**
 * CMS + Frontend Final Refinement §9 — the "ตั้งค่า" (Settings) overview page
 * the Theme control lives on. Moved from a flat `settings.tsx` to
 * `settings/index.tsx` (same file-route-vs-sibling-directory reason
 * `[id].tsx` → `[id]/index.tsx` already established elsewhere in this repo)
 * so `settings/admins.tsx` / `settings/permissions.tsx` can exist as real
 * sibling routes instead of disabled preview rows.
 */
export default function AdminSettingsPage() {
  const ui = useAdminUI();

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "ตั้งค่า" }]} />
      <PageHeader title="ตั้งค่า" description="ตั้งค่าการแสดงผล ผู้ดูแลระบบ และสิทธิ์การใช้งานหลังบ้าน" />

      <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
        <h2 class="text-base font-semibold text-ink">ธีมการแสดงผล</h2>
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-ink">โหมดมืด</span>
          <Toggle checked={ui.themeMode() === "dark"} onChange={(checked) => ui.setThemeMode(checked ? "dark" : "light")} onLabel="เปิด" offLabel="ปิด" />
          <span class="text-xs text-ink-gray">มีผลเฉพาะหลังบ้าน ไม่มีผลกับหน้าร้าน</span>
        </label>
      </div>

      {/* UI Prototype mockup only (no store/persistence behind either page) —
          see each page's own doc comment. */}
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <A
          href="/admin/settings/admins"
          class="flex items-center gap-3 rounded-card border border-border bg-surface-card p-4 shadow-card transition-colors duration-150 lg:hover:border-brand-pink lg:hover:bg-surface-pink/40"
        >
          <span class="flex size-11 shrink-0 items-center justify-center rounded-pill bg-surface-pink text-brand-pink">
            <ShieldUserIcon class="size-5" />
          </span>
          <div>
            <p class="text-sm font-semibold text-ink">ผู้ดูแลระบบ</p>
            <p class="text-xs text-ink-gray">จัดการบัญชีผู้ดูแลระบบและบทบาท</p>
          </div>
        </A>
        <A
          href="/admin/settings/permissions"
          class="flex items-center gap-3 rounded-card border border-border bg-surface-card p-4 shadow-card transition-colors duration-150 lg:hover:border-brand-pink lg:hover:bg-surface-pink/40"
        >
          <span class="flex size-11 shrink-0 items-center justify-center rounded-pill bg-surface-pink text-brand-pink">
            <KeyIcon class="size-5" />
          </span>
          <div>
            <p class="text-sm font-semibold text-ink">สิทธิ์การใช้งาน</p>
            <p class="text-xs text-ink-gray">กำหนดสิทธิ์การเข้าถึงของแต่ละบทบาท</p>
          </div>
        </A>
      </div>
    </div>
  );
}
