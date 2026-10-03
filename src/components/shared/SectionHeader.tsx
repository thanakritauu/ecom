import { children, Show, type JSX } from "solid-js";
import { ChevronIcon } from "./ChevronIcon";

export function SectionHeader(props: {
  title: string;
  href?: string;
  headingId?: string;
  viewAllLabel?: string;
  hideViewAll?: boolean;
  /** Slot for extras under the title, e.g. the Best Sellers filter tabs. */
  children?: JSX.Element;
}) {
  // Resolved once — reading `props.children` twice would build the tabs twice.
  const extras = children(() => props.children);
  // Same arrangement at every size (Figma 124:6527 / 124:6845): title on the
  // left, "ดูทั้งหมด" on the right, vertically centred — never wrapped under
  // the title. Extras (Best Sellers' tabs) sit under the title; on desktop
  // the link centres against title + tabs, below lg the tabs take the full
  // row so their scroll rail isn't squeezed by the link.
  return (
    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2">
      <h2 id={props.headingId} class="min-w-0 text-[22px] font-bold leading-[normal] text-ink sm:text-[24px] lg:text-[28px]">
        {props.title}
      </h2>
      <Show when={extras()}>
        <div class="col-span-2 min-w-0 lg:col-span-1 lg:col-start-1 lg:row-start-2">{extras()}</div>
      </Show>
      {!props.hideViewAll && (
        <a
          href={props.href ?? "#"}
          class="col-start-2 row-start-1 flex min-h-[44px] items-center gap-1 whitespace-nowrap text-base text-ink hover:text-brand-pink sm:text-lg"
          classList={{ "lg:row-span-2": !!extras() }}
        >
          {props.viewAllLabel ?? "ดูทั้งหมด"}
<ChevronIcon direction="right" class="size-5 sm:size-6" />
        </a>
      )}
    </div>
  );
}
