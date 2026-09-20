import type { JSX } from "solid-js";
import arrowDown2 from "~/assets/icons/arrow-down-2.svg";

export function SectionHeader(props: {
  title: string;
  href?: string;
  headingId?: string;
  viewAllLabel?: string;
  hideViewAll?: boolean;
  /** Slot for extras under the title, e.g. the Best Sellers filter tabs. */
  children?: JSX.Element;
}) {
  return (
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex flex-col items-start gap-2">
        <h2 id={props.headingId} class="text-[22px] font-bold text-ink sm:text-2xl lg:text-[28px]">
          {props.title}
        </h2>
        {props.children}
      </div>
      {!props.hideViewAll && (
        <a
          href={props.href ?? "#"}
          class="flex min-h-[44px] items-center gap-1 text-lg text-ink hover:text-brand-pink"
        >
          {props.viewAllLabel ?? "ดูทั้งหมด"}
          {/* arrow-down-2.svg's native viewBox is 12×6.75 (not square) —
              `size-[18px]` forced it into an 18×18 box, squashing it before
              the rotation even applied. Pin width only and let height follow
              the asset's own ratio, matching how ProductRail's mobile-rail
              padding fix and the Footer/MobileMenu logo fixes handled the
              same "img forced into a mismatched box" pattern earlier. */}
          <img src={arrowDown2} alt="" class="w-[18px] h-auto shrink-0 -rotate-90" />
        </a>
      )}
    </div>
  );
}
