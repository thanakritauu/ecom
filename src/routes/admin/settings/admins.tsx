import { createSignal, For, Show } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { TextField } from "~/components/shared/TextField";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { EmptyState } from "~/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "~/components/admin/DataTable";
import { ChevronDownIcon, MoreIcon, PlusIcon, ShieldUserIcon } from "~/components/admin/icons";
import { pushToast } from "~/lib/toast";

const ROLES = ["Super Admin", "ผู้จัดการสินค้า", "ผู้จัดการคำสั่งซื้อ", "การตลาด", "ดูอย่างเดียว"] as const;
type Role = (typeof ROLES)[number];

type AdminUserRow = { id: string; name: string; email: string; role: Role };

let nextId = 100;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SELECT_CLASS =
  "h-11 w-full appearance-none rounded-card border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray";

/**
 * ผู้ดูแลระบบ — page-local state only (no store behind it yet): a few example
 * rows so the page isn't empty; add / change role / delete work for the
 * session and reset on refresh.
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
  const [role, setRole] = createSignal<Role>(ROLES[1]);
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = createSignal<AdminUserRow | null>(null);

  const openForm = () => {
    setName("");
    setEmail("");
    setRole(ROLES[1]);
    setErrors({});
    setFormOpen(true);
  };

  const handleAdd = (e: SubmitEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อ";
    if (!email().trim()) next.email = "กรุณากรอกอีเมล";
    else if (!EMAIL_PATTERN.test(email().trim())) next.email = "กรุณากรอกอีเมลที่ถูกต้อง";
    else if (admins().some((a) => a.email.toLowerCase() === email().trim().toLowerCase())) next.email = "อีเมลนี้เป็นผู้ดูแลระบบอยู่แล้ว";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setAdmins((list) => [...list, { id: String(nextId++), name: name().trim(), email: email().trim(), role: role() }]);
    setFormOpen(false);
    pushToast("บันทึกผู้ดูแลระบบเรียบร้อยแล้ว", "success");
  };

  const handleRoleChange = (admin: AdminUserRow, nextRole: Role) => {
    setAdmins((list) => list.map((a) => (a.id === admin.id ? { ...a, role: nextRole } : a)));
    pushToast(`เปลี่ยนบทบาทของ "${admin.name}" เป็น ${nextRole} แล้ว`, "success");
  };

  const handleDelete = () => {
    const target = confirmDelete();
    if (!target) return;
    setAdmins((list) => list.filter((a) => a.id !== target.id));
    setConfirmDelete(null);
    pushToast(`ลบ "${target.name}" เรียบร้อยแล้ว`, "error");
  };

  const RoleSelect = (props: { admin: AdminUserRow }) => (
    <div class="relative w-full min-w-[180px] sm:w-auto" onClick={(e) => e.stopPropagation()}>
      <select
        aria-label={`บทบาทของ ${props.admin.name}`}
        value={props.admin.role}
        onChange={(e) => handleRoleChange(props.admin, e.currentTarget.value as Role)}
        class={`${SELECT_CLASS} border-border`}
      >
        <For each={ROLES}>{(r) => <option value={r}>{r}</option>}</For>
      </select>
      <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
    </div>
  );

  const RowMenu = (props: { admin: AdminUserRow }) => (
    <DropdownMenu placement="bottom-end" gutter={4}>
      <DropdownMenu.Trigger
        aria-label={`จัดการ ${props.admin.name}`}
        onClick={(e: MouseEvent) => e.stopPropagation()}
        class="flex size-9 shrink-0 items-center justify-center self-start rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink sm:self-center"
      >
        <MoreIcon class="size-5" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="z-50 w-48 rounded-card border border-border bg-surface-card p-2 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
          <DropdownMenu.Item
            onSelect={() => setConfirmDelete(props.admin)}
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm font-medium text-system-red outline-none transition-colors duration-150 hover:bg-danger-soft data-[highlighted]:bg-danger-soft"
          >
            ลบผู้ดูแลระบบ
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );

  const Person = (props: { admin: AdminUserRow }) => (
    <div class="flex min-w-0 items-center gap-3">
      <span class="flex size-11 shrink-0 items-center justify-center rounded-pill bg-brand-pink text-sm font-semibold text-white">{props.admin.name.trim().charAt(0)}</span>
      <div class="min-w-0">
        <p class="truncate text-sm font-medium text-ink">{props.admin.name}</p>
        <p class="truncate text-xs text-ink-gray">{props.admin.email}</p>
      </div>
    </div>
  );

  const columns: DataTableColumn<AdminUserRow>[] = [
    { key: "name", label: "ผู้ดูแลระบบ", render: (row) => <Person admin={row} /> },
    { key: "role", label: "บทบาท", render: (row) => <RoleSelect admin={row} /> },
    { key: "actions", label: "", align: "right", render: (row) => <RowMenu admin={row} /> },
  ];

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "ตั้งค่า", href: "/admin/settings" }, { label: "ผู้ดูแลระบบ" }]} />
      <PageHeader
        title="ผู้ดูแลระบบ"
        description="จัดการบัญชีผู้ดูแลระบบและบทบาทของแต่ละคน"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={openForm}>
              <PlusIcon class="size-4" /> เพิ่มผู้ดูแลระบบ
            </Button>
          </div>
        }
      />

      <Show
        when={admins().length > 0}
        fallback={
          <EmptyState
            icon={<ShieldUserIcon />}
            title="ยังไม่มีผู้ดูแลระบบ"
            description="เริ่มเพิ่มผู้ดูแลระบบคนแรกของคุณ"
            actionLabel="+ เพิ่มผู้ดูแลระบบ"
            onAction={openForm}
            class="bg-surface-card shadow-card"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={admins()}
          getRowKey={(row) => row.id}
          renderMobileCard={(row) => (
            <div class="flex flex-col gap-3 rounded-card bg-surface-card p-3 shadow-card">
              <div class="flex items-start gap-3">
                <div class="min-w-0 flex-1">
                  <Person admin={row} />
                </div>
                <RowMenu admin={row} />
              </div>
              <RoleSelect admin={row} />
            </div>
          )}
        />
      </Show>

      <Dialog open={formOpen()} onOpenChange={setFormOpen}>
        <Dialog.Portal>
          <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Dialog.Content class="w-full max-w-sm rounded-card bg-surface-card p-5 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
              <Dialog.Title class="text-base font-semibold text-ink">เพิ่มผู้ดูแลระบบ</Dialog.Title>
              <form onSubmit={handleAdd} class="mt-4 flex flex-col gap-4" noValidate>
                <TextField label="ชื่อ" required value={name()} onInput={(e) => setName(e.currentTarget.value)} error={errors().name} placeholder="ชื่อ-นามสกุล" />
                <TextField label="อีเมล" type="email" required value={email()} onInput={(e) => setEmail(e.currentTarget.value)} error={errors().email} placeholder="name@charmiss.co" />
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">
                    บทบาท <span class="text-system-red">*</span>
                  </span>
                  <div class="relative">
                    <select value={role()} onChange={(e) => setRole(e.currentTarget.value as Role)} class={`${SELECT_CLASS} border-border`}>
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
                    บันทึกผู้ดูแลระบบ
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
        description={`คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? คนนี้จะเข้าสู่ระบบหลังบ้านไม่ได้อีก`}
        confirmLabel="ลบผู้ดูแลระบบ"
        tone="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
