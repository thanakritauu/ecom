import { createEffect, createSignal, For, Show } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { adminNavGroups, type AdminNavGroup } from "~/lib/adminNav";
import { useAdminUI } from "~/lib/adminUI";
import { ChevronRightIcon } from "./icons";
import logo from "~/assets/icons/logo-charmiss-pink.svg";

/** Only a group with more than one item has anything worth hiding — Dashboard/Sales/Customers stay a single plain link with no header to click. */
const isCollapsibleGroup = (group: AdminNavGroup) => group.items.length > 1;

const isPathInGroup = (group: AdminNavGroup, pathname: string) =>
  group.items.some((item) => item.href && (item.end ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)));

/**
 * Desktop-only persistent sidebar (see AdminMobileDrawer for the mobile
 * equivalent — a Drawer, not a collapsed version of this). Active state
 * relies on @solidjs/router's own `.active` class on `<A>`; Dashboard (`/admin`)
 * and Settings Overview (`/admin/settings`) both pass `end` since either href
 * would otherwise prefix-match every route nested under it, lighting up two
 * sidebar items at once (Global Nav Fix — Settings sub-routes surfaced this
 * the same way Dashboard's own routes already had).
 *
 * Global UI Correction #5-7: the sidebar can collapse to an icon rail, and
 * it now owns its own scroll container (`nav` below, `overflow-y-auto`)
 * pinned in place with `sticky top-0 h-screen` instead of stretching to the
 * height of the page's own content. Previously the `<aside>` had no fixed
 * height, so it stretched to match whatever the main content column's
 * height was (flex's default `align-items: stretch`) — its "scroll" was
 * really just the page/window scrolling, so navigating from a tall list to
 * a short page snapped the whole sidebar back to the top with it. Pinning
 * the sidebar to the viewport removes that shared scroll frame at the root
 * instead of patching it with a scroll-position hack.
 */
export function AdminSidebar() {
  const ui = useAdminUI();
  const location = useLocation();
  let navRef: HTMLElement | undefined;

  // Bring the active link into view only if it's actually scrolled out of
  // the sidebar's own viewport — never an unconditional scroll-to-top/into-
  // view on every route change (that would reintroduce the same jumpiness
  // this rework is fixing).
  createEffect(() => {
    location.pathname;
    queueMicrotask(() => {
      const nav = navRef;
      const active = nav?.querySelector<HTMLElement>("a.active");
      if (!nav || !active) return;
      const navRect = nav.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const isVisible = activeRect.top >= navRect.top && activeRect.bottom <= navRect.bottom;
      if (!isVisible) active.scrollIntoView({ block: "nearest" });
    });
  });

  // Every collapsible group (Marketing, Content, ...) starts expanded — the
  // exact flat layout this sidebar always had, so adding the ability to
  // collapse a group is purely additive with no visual regression on first
  // render. Collapsing one is a deliberate, session-local user choice: it's
  // never touched by navigation, which is what satisfies "navigating within
  // an open group must not collapse it" for free (nothing here reacts to
  // route changes by closing a group — only by opening one, below).
  const [expandedGroups, setExpandedGroups] = createSignal<Set<string>>(
    new Set(adminNavGroups.filter(isCollapsibleGroup).map((g) => g.id)),
  );
  const isGroupExpanded = (group: AdminNavGroup) => !isCollapsibleGroup(group) || expandedGroups().has(group.id);
  const toggleGroup = (id: string) =>
    setExpandedGroups((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // If the active route lives inside a group the user had previously
  // collapsed (e.g. arriving via a direct link or a breadcrumb), silently
  // re-open it so the active item is never hidden — this only ever *adds* to
  // the expanded set, so it can't fight a group the user just collapsed on
  // purpose within that same group.
  createEffect(() => {
    const pathname = location.pathname;
    const activeGroup = adminNavGroups.find((g) => isCollapsibleGroup(g) && isPathInGroup(g, pathname));
    if (activeGroup) setExpandedGroups((set) => (set.has(activeGroup.id) ? set : new Set(set).add(activeGroup.id)));
  });

  return (
    <aside
      classList={{
        "hidden shrink-0 flex-col border-r border-border bg-surface-card transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen lg:self-start":
          true,
        "lg:w-64": !ui.sidebarCollapsed(),
        "lg:w-20": ui.sidebarCollapsed(),
      }}
    >
      <div class="flex h-16 shrink-0 items-center overflow-hidden border-b border-border px-4">
        <Show
          when={!ui.sidebarCollapsed()}
          fallback={
            <div class="mx-auto size-8 shrink-0 overflow-hidden">
              {/* No standalone brand-mark asset exists — only the full wordmark
                  (logo-charmiss-pink.svg). `object-cover` + `object-left` crops
                  to its leading glyph without stretching/distorting the file. */}
              <img src={logo} alt="Charmiss" class="size-8 object-cover object-left" />
            </div>
          }
        >
          <img src={logo} alt="Charmiss" class="h-6 w-auto" />
        </Show>
      </div>

      <nav ref={navRef} aria-label="เมนูผู้ดูแลระบบ" class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        <For each={adminNavGroups}>
          {(group) => (
            <div class="flex flex-col gap-1">
              <Show when={group.label && !ui.sidebarCollapsed()}>
                <Show
                  when={isCollapsibleGroup(group)}
                  fallback={<p class="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-placeholder">{group.label}</p>}
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isGroupExpanded(group)}
                    class={`flex items-center justify-between gap-2 rounded-card px-3 pb-1 text-xs font-medium uppercase tracking-wide transition-colors duration-150 hover:text-ink-gray ${
                      isPathInGroup(group, location.pathname) ? "text-ink" : "text-ink-placeholder"
                    }`}
                  >
                    <span>{group.label}</span>
                    <ChevronRightIcon class={`size-3 shrink-0 transition-transform duration-150 ${isGroupExpanded(group) ? "rotate-90" : ""}`} />
                  </button>
                </Show>
              </Show>
              <Show when={isGroupExpanded(group) || ui.sidebarCollapsed()}>
                <For each={group.items}>
                  {(item) => (
                    <Show when={item.href || !ui.sidebarCollapsed()}>
                      {item.href ? (
                        <A
                          href={item.href}
                          end={item.end}
                          title={ui.sidebarCollapsed() ? item.label : undefined}
                          class={`flex min-h-11 items-center gap-3 rounded-card text-sm font-medium text-ink-gray transition-colors duration-150 hover:bg-surface-pink hover:text-brand-pink [&.active]:bg-brand-pink [&.active]:text-white ${
                            ui.sidebarCollapsed() ? "justify-center px-0" : "px-3"
                          }`}
                        >
                          {(() => {
                            const ItemIcon = item.icon ?? group.icon;
                            return <ItemIcon class="size-5 shrink-0" />;
                          })()}
                          <Show when={!ui.sidebarCollapsed()}>{item.label}</Show>
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
                    </Show>
                  )}
                </For>
              </Show>
            </div>
          )}
        </For>
      </nav>

      <div class="shrink-0 border-t border-border p-2">
        <button
          type="button"
          onClick={ui.toggleSidebarCollapsed}
          aria-label={ui.sidebarCollapsed() ? "ขยายเมนู" : "ย่อเมนู"}
          class="flex min-h-11 w-full items-center justify-center gap-2 rounded-card text-sm font-medium text-ink-gray transition-colors duration-150 hover:bg-surface-pink hover:text-brand-pink"
        >
          <ChevronRightIcon class={`size-4 shrink-0 transition-transform duration-200 ${ui.sidebarCollapsed() ? "" : "rotate-180"}`} />
          <Show when={!ui.sidebarCollapsed()}>ย่อเมนู</Show>
        </button>
      </div>
    </aside>
  );
}
