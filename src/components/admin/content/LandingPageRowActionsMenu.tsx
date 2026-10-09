import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { MoreIcon } from "~/components/admin/icons";

/**
 * Landing Page Architecture & Promotion Page Migration — was
 * `PromotionPageRowActionsMenu.tsx`, routes updated to
 * `/admin/promotion-pages`. Same Kobalte dropdown shell as
 * `MarketingRowActionsMenu`, with a Publish/Unpublish toggle instead of
 * Enable/Disable.
 *
 * Landing Page Admin Management §3/§25 — "ทำสำเนา" added: `onDuplicate` is
 * optional so any other caller of this menu (there is none today, but the
 * shape follows `HomepageSectionCard.onDuplicate`'s precedent) isn't forced
 * to wire it up.
 */
export function LandingPageRowActionsMenu(props: {
  id: string;
  name: string;
  isPublished: boolean;
  onTogglePublish: () => void;
  onDuplicate?: () => void;
  onDelete: () => void;
  hideView?: boolean;
  /** §44 — the Homepage row hides the Delete action entirely (in addition to the store-level guard) rather than offering an action that always fails. */
  hideDelete?: boolean;
  triggerClass?: string;
}) {
  const navigate = useNavigate();
  const basePath = "/admin/promotion-pages";

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
              onSelect={() => navigate(`${basePath}/${props.id}`)}
              class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
            >
              ดูรายละเอียด
            </DropdownMenu.Item>
          </Show>
          <DropdownMenu.Item
            onSelect={() => navigate(`${basePath}/${props.id}/edit`)}
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
          >
            แก้ไขหน้า
          </DropdownMenu.Item>
          <Show when={props.onDuplicate}>
            <DropdownMenu.Item
              onSelect={props.onDuplicate}
              class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
            >
              ทำสำเนาหน้า
            </DropdownMenu.Item>
          </Show>
          <DropdownMenu.Item
            onSelect={props.onTogglePublish}
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
          >
            {props.isPublished ? "ยกเลิกการเผยแพร่" : "เผยแพร่"}
          </DropdownMenu.Item>
          <Show when={!props.hideDelete}>
            <DropdownMenu.Separator class="my-1 h-px bg-border" />
            <DropdownMenu.Item
              onSelect={props.onDelete}
              class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm font-medium text-system-red outline-none transition-colors duration-150 hover:bg-danger-soft data-[highlighted]:bg-danger-soft"
            >
              ลบหน้า
            </DropdownMenu.Item>
          </Show>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );
}
