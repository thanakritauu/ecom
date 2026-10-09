import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { MoreIcon } from "~/components/admin/icons";

const ITEM_CLASS =
  "flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink";

/** Same Kobalte dropdown shell as `ProductRowActionsMenu`. */
export function InventoryRowActionsMenu(props: {
  productId: string;
  name: string;
  onView?: () => void;
  onEditStock: () => void;
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
          <Show when={props.onView}>
            <DropdownMenu.Item onSelect={() => props.onView?.()} class={ITEM_CLASS}>
              ดูรายละเอียด
            </DropdownMenu.Item>
          </Show>
          <DropdownMenu.Item onSelect={props.onEditStock} class={ITEM_CLASS}>
            แก้ไขสต๊อก
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => navigate(`/admin/products/${props.productId}`)} class={ITEM_CLASS}>
            ไปที่หน้าสินค้า
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );
}
