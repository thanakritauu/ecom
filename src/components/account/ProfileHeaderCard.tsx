import { A } from "@solidjs/router";
import type { User } from "~/lib/types";
import { ChevronIcon } from "../shared/ChevronIcon";
import coinMark from "~/assets/icons/charmiss-coin.png";

/**
 * Top of the account menu (every breakpoint): the Charmiss Coin mark, name,
 * and the coin balance on a plain white card — same "[C] name … คอยน์" read
 * as the top-bar member badge. Tier medals live only on the Charmiss Club page
 * this taps through to (`/account/points`).
 */
export function ProfileHeaderCard(props: { user: User }) {
  return (
    <A
      href="/account/points"
      aria-label={`${props.user.name} · ${props.user.coinBalance.toLocaleString("th-TH")} คอยน์ — ดู Charmiss Club`}
      class="flex w-full items-center gap-3 rounded-card border border-surface-gray bg-white p-4 font-normal shadow-card sm:gap-4 sm:p-6"
    >
      <img src={coinMark} alt="" class="size-8 shrink-0 sm:size-10" />
      <p class="min-w-0 flex-1 truncate text-lg font-semibold text-ink sm:text-2xl">{props.user.name}</p>
      <span class="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-ink sm:text-base">
        {props.user.coinBalance.toLocaleString("th-TH")} คอยน์
        <ChevronIcon direction="right" class="size-5 text-ink-gray" />
      </span>
    </A>
  );
}
