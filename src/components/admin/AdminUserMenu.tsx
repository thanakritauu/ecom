import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { useNavigate } from "@solidjs/router";
import { useAdminAuth } from "~/lib/adminAuth";
import { pushToast } from "~/lib/toast";
import { UserIcon } from "~/components/shared/icons";
import { LogoutIcon, ChevronDownIcon } from "./icons";
import { ADMIN_TOPBAR_CONTROL_CLASS } from "./adminTopbarControls";

/**
 * Profile / Settings / Logout menu for the signed-in mock admin. Logout is a
 * mock action (PART 10): clears the admin session and sends the browser to
 * `/admin/login`, same as a real sign-out would, with a toast to confirm it
 * happened — reusing the same global toast queue the customer app already
 * has (lib/toast.tsx), not a second notification system.
 */
export function AdminUserMenu() {
  const admin = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    admin.logout();
    pushToast("ออกจากระบบแล้ว", "success");
    navigate("/admin/login", { replace: true });
  };

  return (
    <DropdownMenu placement="bottom-end" gutter={8}>
      {/* Final UI & Regression Overrides #4: this overrides the previous
          "no left padding" special case — Admin User must render from the
          exact same padding/height/radius/surface token as the Language
          control, not a bespoke exception. */}
      <DropdownMenu.Trigger aria-label="เมนูผู้ใช้" class={ADMIN_TOPBAR_CONTROL_CLASS}>
        <span class="flex size-8 shrink-0 items-center justify-center rounded-pill bg-brand-pink text-white">
          <UserIcon class="size-4" />
        </span>
        <span class="hidden lg:inline">{admin.admin()?.name ?? "Admin"}</span>
        <ChevronDownIcon class="hidden size-3.5 shrink-0 text-ink-gray lg:block" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="z-50 w-60 rounded-card border border-surface-gray bg-white p-2 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
          <div class="flex flex-col gap-0.5 border-b border-surface-gray px-3 pb-3 pt-1">
            <p class="text-sm font-semibold text-ink">{admin.admin()?.name ?? "Admin"}</p>
            <p class="truncate text-xs text-ink-gray">{admin.admin()?.email}</p>
          </div>
          <DropdownMenu.Item
            as="a"
            href="/admin/settings"
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
          >
            โปรไฟล์
          </DropdownMenu.Item>
          <DropdownMenu.Item
            as="a"
            href="/admin/settings"
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
          >
            ตั้งค่า
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={handleLogout}
            class="flex min-h-11 cursor-pointer items-center gap-2 rounded-card px-3 text-sm font-medium text-system-red outline-none transition-colors duration-150 hover:bg-danger-soft data-[highlighted]:bg-danger-soft"
          >
            <LogoutIcon class="size-4" />
            ออกจากระบบ
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );
}
