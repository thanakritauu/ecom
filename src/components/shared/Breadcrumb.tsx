import { For } from "solid-js";
import { A } from "@solidjs/router";

export type BreadcrumbItem = { label: string; href?: string };

/** Every crumb but the current page is a real link — the current page (last item, no `href`) renders as plain text per PART 17. */
export function Breadcrumb(props: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb" class="scroll-rail !mx-0">
      <ol class="flex items-center gap-2 whitespace-nowrap text-sm">
        <For each={props.items}>
          {(item, i) => (
            <li class="flex items-center gap-2">
              {item.href ? (
                <A href={item.href} class="text-ink-gray transition-colors hover:text-brand-pink">
                  {item.label}
                </A>
              ) : (
                <span class="text-ink" aria-current="page">
                  {item.label}
                </span>
              )}
              {i() < props.items.length - 1 && (
                <span class="text-ink-placeholder" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          )}
        </For>
      </ol>
    </nav>
  );
}
