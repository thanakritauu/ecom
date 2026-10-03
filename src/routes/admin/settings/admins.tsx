import { createSignal, For, Show } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { TextField } from "~/components/shared/TextField";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { EmptyState } from "~/components/admin/EmptyState";
import { ChevronDownIcon, PlusIcon, ShieldUserIcon, TrashIcon } from "~/components/admin/icons";
import { pushToast } from "~/lib/toast";

const ROLES = ["Super Admin", "ผู้จัดการสินค้า", "ผู้จัดการคำสั่งซื้อ", "การตลาด", "ดูอย่างเดียว"] as const;

type AdminUserRow = { id: string; name: string; email: string; role: (typeof ROLES)[number] };

let nextId = 100;

/**
 * ผู้ดูแลระบบ — UI Prototype mockup only, per explicit request: no store, no
 * localStorage, no seed-data lib file like every other real module here has.
 * A few inline example rows so the page isn't empty on load, held in plain
 * component state — Add/Delete/Reassign-role all work (and look identical to
 * a real module's UX), none of it persists past a refresh.
 */
export default function AdminSettingsAdminsPage() {
  const [admins, setAdmins] = createSignal<AdminUserRow[]>([
    { id: "1", name: "กมลชนก ใจดี", email: "kamonchanok@charmiss.co", role: "Super Admin" },
    { id: "2", name: "ธนกฤต พันธุ์อ", email: "thanakrit@charmiss.co", role: "ผู้จัดการสินค้า" },
    { id: "3", name: "นัชชา ส.", email: "nutcha@charmiss.co", role: "การตลาด" },
  ]);

  const [formOpen, setFormOpen] = createSignal(false);
  const [name, setName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [role, setRole] = createSignal<(typeof ROLES)[number]>(ROLES[1]);
  const [confirmDelete, setConfirmDelete] = createSignal<AdminUserRow | null>(null);

  const resetForm = () => {
    setName("");
    setEmail("");
    setRole(ROLES[1]);
  };

  const openForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const handleAdd = (e: SubmitEvent) => {
    e.preventDefault();
    if (!name().trim() || !email().trim()) return;
    setAdmins((list) => [...list, { id: String(nextId++), name: name().trim(), email: email().trim(), role: role() }]);
    setFormOpen(false);
    pushToast(`เพิ่ม "${name().trim()}" เป็นผู้ดูแลระบบแล้ว`, "success");
  };

  const handleRoleChange = (id: string, nextRole: (typeof ROLES)[number]) => {
    setAdmins((list) => list.map((a) => (a.id === id ? { ...a, role: nextRole } : a)));
  };

  const handleDelete = () => {
    const target = confirmDelete();
    if (!target) return;
    setAdmins((list) => list.filter((a) => a.id !== target.id));
    setConfirmDelete(null);
    pushToast(`ลบ "${target.name}" ออกจากผู้ดูแลระบบแล้ว`, "error");
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "ตั้งค่า", href: "/admin/settings" }, { label: "ผู้ดูแลระบบ" }]} />
      <PageHeader
        title="ผู้ดูแลระบบ"
        description="จัดการบัญชีผู้ดูแลระบบและบทบาทของแต่ละคน"
        actions={
          <Button variant="primary" onClick={openForm}>
            <PlusIcon class="size-4" /> เพิ่มผู้ดูแลระบบ
          </Button>
        }
      />

      <Show
        when={admins().length > 0}
        fallback={<EmptyState icon={<ShieldUserIcon />} title="ยังไม่มีผู้ดูแลระบบ" actionLabel="เพิ่มผู้ดูแลระบบ" onAction={openForm} class="bg-surface-card shadow-card" />}
      >
        <div class="flex flex-col gap-3">
          <For each={admins()}>
            {(admin) => (
              <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-3">
                  <span class="flex size-11 shrink-0 items-center justify-center rounded-pill bg-brand-pink text-sm font-semibold text-white">
                    {admin.name.trim().charAt(0)}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-ink">{admin.name}</p>
                    <p class="truncate text-xs text-ink-gray">{admin.email}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="relative">
                    <select
                      value={admin.role}
                      onChange={(e) => handleRoleChange(admin.id, e.currentTarget.value as (typeof ROLES)[number])}
                      class="h-11 appearance-none rounded-card border border-border bg-surface-card py-2 pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink"
                    >
                      <For each={ROLES}>{(r) => <option value={r}>{r}</option>}</For>
                    </select>
                    <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(admin)}
                    aria-label={`ลบผู้ดูแลระบบ ${admin.name}`}
                    class="flex size-11 shrink-0 items-center justify-center rounded-pill border border-border text-system-red transition-colors duration-150 hover:bg-danger-soft"
                  >
                    <TrashIcon class="size-4" />
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Dialog open={formOpen()} onOpenChange={setFormOpen}>
        <Dialog.Portal>
          <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Dialog.Content class="w-full max-w-sm rounded-card bg-surface-card p-5 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
              <Dialog.Title class="text-lg font-semibold text-ink">เพิ่มผู้ดูแลระบบ</Dialog.Title>
              <form onSubmit={handleAdd} class="mt-4 flex flex-col gap-4">
                <TextField label="ชื่อ" required value={name()} onInput={(e) => setName(e.currentTarget.value)} placeholder="ชื่อ-นามสกุล" />
                <TextField label="อีเมล" type="email" required value={email()} onInput={(e) => setEmail(e.currentTarget.value)} placeholder="name@charmiss.co" />
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">บทบาท</span>
                  <div class="relative">
                    <select
                      value={role()}
                      onChange={(e) => setRole(e.currentTarget.value as (typeof ROLES)[number])}
                      class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink"
                    >
                      <For each={ROLES}>{(r) => <option value={r}>{r}</option>}</For>
                    </select>
                    <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
                  </div>
                </label>
                <div class="mt-1 flex gap-3">
                  <Button type="button" variant="outline" class="flex-1" onClick={() => setFormOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit" variant="primary" class="flex-1">
                    เพิ่ม
                  </Button>
                </div>
              </form>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบผู้ดูแลระบบ?"
        description={`คุณต้องการลบ "${confirmDelete()?.name ?? ""}" ออกจากผู้ดูแลระบบหรือไม่?`}
        confirmLabel="ลบ"
        tone="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
