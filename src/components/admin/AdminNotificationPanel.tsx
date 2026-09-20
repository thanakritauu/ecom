import { Popover } from "@kobalte/core/popover";
import { For, Show } from "solid-js";
import { useAdminNotifications, formatRelativeTimeTH } from "~/lib/adminNotifications";
import { BellIcon } from "./icons";

/**
 * Spec PART 12/13 — a real Notification panel (mock data + localStorage
 * persistence only, no backend): empty state, title/description/time per
 * item, read/unread visual distinction, mark-one/mark-all-as-read, unread
 * count badge. Built on Kobalte `Popover` (not `DropdownMenu`) since this is
 * an arbitrary content panel to scan, not a list of actionable menu items —
 * same dismissable-layer behavior (outside-click/Escape) as every other
 * admin overlay, same `z-50`/`rounded-card`/`shadow-card` content look as
 * AdminUserMenu's dropdown.
 */
export function AdminNotificationPanel() {
  const store = useAdminNotifications();

  return (
    <Popover placement="bottom-end" gutter={8}>
      <Popover.Trigger
        aria-label="การแจ้งเตือน"
        class="relative flex size-11 items-center justify-center rounded-pill bg-surface-gray text-ink transition-colors duration-150 hover:bg-surface-gray/70"
      >
        <BellIcon class="size-5" />
        <Show when={store.unreadCount() > 0}>
          <span class="absolute right-2 top-2 flex size-2 shrink-0 rounded-full bg-brand-pink" aria-hidden="true" />
        </Show>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content class="z-50 w-80 max-w-[calc(100vw-2rem)] rounded-card border border-surface-gray bg-white shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
          <div class="flex items-center justify-between gap-3 border-b border-surface-gray px-4 py-3">
            <Popover.Title class="text-sm font-semibold text-ink">การแจ้งเตือน</Popover.Title>
            <Show when={store.unreadCount() > 0}>
              <button
                type="button"
                onClick={() => store.markAllAsRead()}
                class="text-xs font-medium text-brand-pink hover:underline"
              >
                อ่านทั้งหมด
              </button>
            </Show>
          </div>

          <div class="max-h-80 overflow-y-auto">
            <Show
              when={store.notifications().length > 0}
              fallback={<p class="px-4 py-8 text-center text-sm text-ink-gray">ยังไม่มีการแจ้งเตือน</p>}
            >
              <ul class="flex flex-col">
                <For each={store.notifications()}>
                  {(n) => (
                    <li>
                      <button
                        type="button"
                        onClick={() => store.markAsRead(n.id)}
                        class="flex w-full items-start gap-2.5 border-b border-surface-gray px-4 py-3 text-left transition-colors duration-150 last:border-b-0 hover:bg-surface-pink/40"
                      >
                        <span
                          class={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-brand-pink"}`}
                          aria-hidden="true"
                        />
                        <span class="min-w-0 flex-1">
                          <span class={`block text-sm ${n.read ? "font-normal text-ink-gray" : "font-semibold text-ink"}`}>
                            {n.title}
                          </span>
                          <span class="block text-xs text-ink-gray">{n.description}</span>
                          <span class="mt-1 block text-xs text-ink-placeholder">{formatRelativeTimeTH(n.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  );
}
