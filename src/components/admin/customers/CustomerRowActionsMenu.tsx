import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { getCustomerFullName, type Customer } from "~/lib/adminCustomers";
import { MoreIcon } from "~/components/admin/icons";

/**
 * The View/Edit/Suspend-Reactivate/Delete menu — shared by the desktop
 * table's Actions column, the mobile card's overflow button, and Customer
 * Detail's secondary actions. Same shape as `ProductRowActionsMenu` — no
 * "ทำสำเนา" (duplicating a customer record makes no sense) and no generic
 * enable/disable toggle: the one status action here is specifically
 * ระงับบัญชี/เปิดใช้งานบัญชี (blocked ↔ active); switching to `inactive`
 * only happens through the full Edit form's status field.
 */
export function CustomerRowActionsMenu(props: {
  customer: Customer;
  onToggleBlocked: () => void;
  onDelete: () => void;
  hideView?: boolean;
  triggerClass?: string;
}) {
  const navigate = useNavigate();

  return (
    <DropdownMenu placement="bottom-end" gutter={4}>
      <DropdownMenu.Trigger
        aria-label={`จัดการ ${getCustomerFullName(props.customer)}`}
        onClick={(e: MouseEvent) => e.stopPropagation()}
        class={props.triggerClass ?? "flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink"}
      >
        <MoreIcon class="size-5" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="z-50 w-52 rounded-card border border-border bg-surface-card p-2 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
          <Show when={!props.hideView}>
            <DropdownMenu.Item
              onSelect={() => navigate(`/admin/customers/${props.customer.id}`)}
              class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
            >
              ดูรายละเอียด
            </DropdownMenu.Item>
          </Show>
          <DropdownMenu.Item
            onSelect={() => navigate(`/admin/customers/${props.customer.id}/edit`)}
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
          >
            แก้ไขข้อมูลลูกค้า
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={props.onToggleBlocked}
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
          >
            {props.customer.status === "blocked" ? "เปิดใช้งานบัญชี" : "ระงับบัญชี"}
          </DropdownMenu.Item>
          <DropdownMenu.Separator class="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={props.onDelete}
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm font-medium text-system-red outline-none transition-colors duration-150 hover:bg-danger-soft data-[highlighted]:bg-danger-soft"
          >
            ลบลูกค้า
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );
}
