import { createSignal, For } from "solid-js";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { PlusIcon, CloseXIcon } from "~/components/admin/icons";
import { pushToast } from "~/lib/toast";

const PERMISSIONS = [
  "ดูแดชบอร์ด",
  "จัดการสินค้า / หมวดหมู่",
  "จัดการคำสั่งซื้อ",
  "จัดการลูกค้า",
  "จัดการการตลาด / โปรโมชั่น",
  "จัดการคลังสินค้า",
  "จัดการเนื้อหาหน้าเว็บ",
  "จัดการตั้งค่าระบบ",
] as const;

type RoleColumn = { id: string; name: string; granted: Set<string> };

let nextId = 100;

const INITIAL_ROLES: RoleColumn[] = [
  { id: "1", name: "Super Admin", granted: new Set(PERMISSIONS) },
  { id: "2", name: "ผู้จัดการสินค้า", granted: new Set(["ดูแดชบอร์ด", "จัดการสินค้า / หมวดหมู่", "จัดการคลังสินค้า"]) },
  { id: "3", name: "การตลาด", granted: new Set(["ดูแดชบอร์ด", "จัดการการตลาด / โปรโมชั่น", "จัดการเนื้อหาหน้าเว็บ"]) },
  { id: "4", name: "ดูอย่างเดียว", granted: new Set(["ดูแดชบอร์ด"]) },
];

/**
 * สิทธิ์การใช้งาน — UI Prototype mockup only, same status as
 * `settings/admins.tsx` (no store, no persistence, no seed-data lib file).
 * Roles are the addable/removable dimension (columns); the permission list
 * (rows) mirrors this Admin's own real module list, so every checkbox reads
 * as something a role in this CMS could plausibly need.
 */
export default function AdminSettingsPermissionsPage() {
  const [roles, setRoles] = createSignal<RoleColumn[]>(INITIAL_ROLES);
  const [confirmDeleteRole, setConfirmDeleteRole] = createSignal<RoleColumn | null>(null);

  const addRole = () => {
    const name = `บทบาทใหม่ ${nextId}`;
    setRoles((list) => [...list, { id: String(nextId++), name, granted: new Set() }]);
    pushToast(`เพิ่ม "${name}" แล้ว ตั้งชื่อและเลือกสิทธิ์ในตารางได้เลย`, "success");
  };

  const renameRole = (id: string, name: string) => {
    setRoles((list) => list.map((r) => (r.id === id ? { ...r, name } : r)));
  };

  const toggleGrant = (roleId: string, permission: string) => {
    setRoles((list) =>
      list.map((r) => {
        if (r.id !== roleId) return r;
        const next = new Set(r.granted);
        next.has(permission) ? next.delete(permission) : next.add(permission);
        return { ...r, granted: next };
      }),
    );
  };

  const handleDeleteRole = () => {
    const target = confirmDeleteRole();
    if (!target) return;
    setRoles((list) => list.filter((r) => r.id !== target.id));
    setConfirmDeleteRole(null);
    pushToast(`ลบ "${target.name}" เรียบร้อยแล้ว`, "error");
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "ตั้งค่า", href: "/admin/settings" }, { label: "สิทธิ์การใช้งาน" }]} />
      <PageHeader
        title="สิทธิ์การใช้งาน"
        description="กำหนดว่าแต่ละบทบาทเข้าถึงส่วนใดของหลังบ้านได้บ้าง"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={addRole}>
              <PlusIcon class="size-4" /> เพิ่มบทบาท
            </Button>
          </div>
        }
      />

      <div class="overflow-x-auto rounded-card border border-border bg-surface-card shadow-card">
        <table class="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="sticky left-0 bg-surface-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-placeholder">สิทธิ์การใช้งาน</th>
              <For each={roles()}>
                {(role) => (
                  <th class="px-4 py-3 text-center font-semibold text-ink">
                    <div class="flex flex-col items-center gap-1.5">
                      <input
                        value={role.name}
                        onInput={(e) => renameRole(role.id, e.currentTarget.value)}
                        aria-label="ชื่อบทบาท"
                        class="h-11 w-36 rounded-card border border-border bg-surface-card px-3 text-center text-sm font-semibold text-ink outline-none focus:border-brand-pink"
                      />
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteRole(role)}
                        aria-label={`ลบบทบาท ${role.name}`}
                        class="flex size-9 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-danger-soft hover:text-danger-strong"
                      >
                        <CloseXIcon class="size-4" />
                      </button>
                    </div>
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={PERMISSIONS}>
              {(permission, i) => (
                <tr class={i() < PERMISSIONS.length - 1 ? "border-b border-border" : ""}>
                  <td class="sticky left-0 bg-surface-card px-4 py-3 text-ink-gray">{permission}</td>
                  <For each={roles()}>
                    {(role) => (
                      <td class="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={role.granted.has(permission)}
                          onChange={() => toggleGrant(role.id, permission)}
                          class="size-4 rounded accent-brand-pink"
                          aria-label={`${role.name}: ${permission}`}
                        />
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmDeleteRole() !== null}
        onOpenChange={(open) => !open && setConfirmDeleteRole(null)}
        title="ลบบทบาท?"
        description={`คุณต้องการลบ "${confirmDeleteRole()?.name ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบบทบาท"
        tone="danger"
        onConfirm={handleDeleteRole}
      />
    </div>
  );
}
