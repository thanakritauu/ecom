import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { MoreIcon } from "~/components/admin/icons";

/**
 * The View/Edit/Duplicate/Enable-Disable/Delete menu — same action set
 * `ProductRowActionsMenu` already established for Product Management, made
 * generic here so Promotion/Coupon/Flash Sale/Bundle all share one
 * implementation instead of four near-identical copies. `basePath` is the
 * entity's list route (e.g. `/admin/marketing/promotions`); `isDisabled`
 * drives the Enable/Disable label the same way Product's own toggle does.
 */
export function MarketingRowActionsMenu(props: {
  id: string;
  name: string;
  basePath: string;
  isDisabled: boolean;
  onDuplicate: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  hideView?: boolean;
  triggerClass?: string;
}) {
  const navigate = useNavigate();

  return (
    <DropdownMenu placement="bottom-end" gutter={4}>
      <DropdownMenu.Trigger
        aria-label={`จัดการ ${props.name}`}
        onClick={(e: MouseEvent) => e.stopPropagation()}
        class={props.triggerClass ?? "flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink"}
      >
        <MoreIcon class="size-5" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="z-50 w-48 rounded-card border border-border bg-surface-card p-2 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
          <Show when={!props.hideView}>
            <DropdownMenu.Item
              onSelect={() => navigate(`${props.basePath}/${props.id}`)}
              class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
            >
              ดูรายละเอียด
            </DropdownMenu.Item>
          </Show>
          <DropdownMenu.Item
            onSelect={() => navigate(`${props.basePath}/${props.id}/edit`)}
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
          >
            แก้ไข
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={props.onDuplicate}
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
          >
            ทำสำเนา
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={props.onToggleStatus}
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
          >
            {props.isDisabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}
          </DropdownMenu.Item>
          <DropdownMenu.Separator class="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={props.onDelete}
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm font-medium text-system-red outline-none transition-colors duration-150 hover:bg-danger-soft data-[highlighted]:bg-danger-soft"
          >
            ลบ
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );
}
