import { Dialog } from "@kobalte/core/dialog";
import { For } from "solid-js";
import { A } from "@solidjs/router";
import { adminNavGroups } from "~/lib/adminNav";
import { CloseXIcon } from "./icons";

/**
 * Mobile nav — a Drawer, not a shrunk-down AdminSidebar (per PART 7 of the
 * spec). Closes on: the close button, clicking the overlay (both handled by
 * Kobalte's `onOpenChange`), and on navigating to any enabled item.
 */
export function AdminMobileDrawer(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-y-0 left-0 z-50 flex w-full max-w-[300px]">
          <Dialog.Content class="flex size-full flex-col gap-5 overflow-y-auto bg-white p-4 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-drawer-in data-[closed]:animate-drawer-out">
            <div class="flex items-center justify-between px-2">
              <Dialog.Title class="text-lg font-bold text-brand-pink">Charmiss Admin</Dialog.Title>
              <Dialog.CloseButton
                aria-label="ปิดเมนู"
                class="flex size-11 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink"
              >
                <CloseXIcon />
              </Dialog.CloseButton>
            </div>

            <nav aria-label="เมนูผู้ดูแลระบบ" class="flex flex-col gap-5">
              <For each={adminNavGroups}>
                {(group) => (
                  <div class="flex flex-col gap-1">
                    {group.label ? (
                      <p class="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-placeholder">{group.label}</p>
                    ) : null}
                    <For each={group.items}>
                      {(item, i) => (
                        <>
                          {item.href ? (
                            <A
                              href={item.href}
                              end={item.end}
                              onClick={() => props.onOpenChange(false)}
                              class="flex min-h-11 items-center gap-3 rounded-card px-3 text-sm font-medium text-ink-gray transition-colors duration-150 hover:bg-surface-pink [&.active]:bg-brand-pink [&.active]:text-white"
                            >
                              {i() === 0 ? <group.icon class="size-5 shrink-0" /> : <span class="size-5 shrink-0" aria-hidden="true" />}
                              {item.label}
                            </A>
                          ) : (
                            <button
                              type="button"
                              disabled
                              class="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-card px-3 text-sm font-medium text-ink-placeholder"
                            >
                              <span class="size-5 shrink-0" aria-hidden="true" />
                              {item.label}
                            </button>
                          )}
                        </>
                      )}
                    </For>
                  </div>
                )}
              </For>
            </nav>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
