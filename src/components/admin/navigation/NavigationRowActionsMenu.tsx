import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { MoreIcon } from "~/components/admin/icons";

const ITEM_CLASS =
  "flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink";

/** Row menu for one navigation item: edit, show/hide, delete. Same Kobalte shell as the other admin row menus. */
export function NavigationRowActionsMenu(props: { label: string; visible: boolean; onEdit: () => void; onToggleVisible: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu placement="bottom-end" gutter={4}>
      <DropdownMenu.Trigger
        aria-label={`จัดการ ${props.label}`}
        onClick={(e: MouseEvent) => e.stopPropagation()}
        class="flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink"
      >
        <MoreIcon class="size-5" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="z-50 w-48 rounded-card border border-border bg-surface-card p-2 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
          <DropdownMenu.Item onSelect={props.onEdit} class={ITEM_CLASS}>
            แก้ไขเมนู
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={props.onToggleVisible} class={ITEM_CLASS}>
            {props.visible ? "ซ่อนเมนู" : "แสดงเมนู"}
          </DropdownMenu.Item>
          <DropdownMenu.Separator class="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={props.onDelete}
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm font-medium text-system-red outline-none transition-colors duration-150 hover:bg-danger-soft data-[highlighted]:bg-danger-soft"
          >
            ลบเมนู
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );
}
