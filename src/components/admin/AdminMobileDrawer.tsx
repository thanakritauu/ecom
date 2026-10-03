import { Dialog } from "@kobalte/core/dialog";
import { For } from "solid-js";
import { A } from "@solidjs/router";
import { adminNavGroups } from "~/lib/adminNav";
import { CloseXIcon } from "./icons";
import logo from "~/assets/icons/logo-charmiss-pink.svg";

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
          <Dialog.Content class="flex size-full flex-col gap-5 overflow-y-auto bg-surface-card p-4 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-drawer-in data-[closed]:animate-drawer-out">
            <div class="flex items-center justify-between px-2">
              {/* §25 — the brand mark here must always be the real Charmiss pink
                  logo asset, never the "Charmiss Admin"/"Charmiss CMS" text it
                  replaced; "Charmiss CMS" still exists as the page title via
                  Dialog.Title's accessible name (img alt), it's just not drawn
                  as visible text. */}
              <Dialog.Title as="div">
                <img src={logo} alt="Charmiss CMS" class="h-6 w-auto" />
              </Dialog.Title>
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
                      {(item) => (
                        <>
                          {item.href ? (
                            <A
                              href={item.href}
                              end={item.end}
                              onClick={() => props.onOpenChange(false)}
                              class="flex min-h-11 items-center gap-3 rounded-card px-3 text-sm font-medium text-ink-gray transition-colors duration-150 hover:bg-surface-pink [&.active]:bg-brand-pink [&.active]:text-white"
                            >
                              {(() => {
                                const ItemIcon = item.icon ?? group.icon;
                                return <ItemIcon class="size-5 shrink-0" />;
                              })()}
                              {item.label}
                            </A>
                          ) : (
                            <button
                              type="button"
                              disabled
                              class="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-card px-3 text-sm font-medium text-ink-placeholder"
                            >
                              {(() => {
                                const ItemIcon = item.icon ?? group.icon;
                                return <ItemIcon class="size-5 shrink-0" />;
                              })()}
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
