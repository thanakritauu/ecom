import { A } from "@solidjs/router";
import type { User } from "~/lib/types";
import { ChevronIcon } from "../shared/ChevronIcon";
import coinMark from "~/assets/icons/charmiss-coin.png";

/**
 * Top of the account menu (every breakpoint): the name, then the Charmiss
 * Coin mark with the coin balance on a plain white card, the same
 * "name … [C] คอยน์" read as the top-bar member badge. Tier medals live only on the Charmiss Club page
 * this taps through to (`/account/points`).
 */
export function ProfileHeaderCard(props: { user: User }) {
  return (
    <A
      href="/account/points"
      aria-label={`${props.user.name} มี ${props.user.coinBalance.toLocaleString("th-TH")} คอยน์ ไปที่ Charmiss Club`}
      class="flex w-full items-center gap-3 rounded-card border border-surface-gray bg-white p-4 font-normal shadow-card sm:gap-4 sm:p-6"
    >
      <p class="min-w-0 flex-1 truncate text-lg font-semibold text-ink sm:text-2xl">{props.user.name}</p>
      {/* Balance at the same size/weight as the name beside it. */}
      <span class="flex shrink-0 items-center gap-1.5 text-lg font-semibold text-ink sm:gap-2 sm:text-2xl">
        <img src={coinMark} alt="" class="size-6 shrink-0 sm:size-8" />
        {props.user.coinBalance.toLocaleString("th-TH")} คอยน์
        <ChevronIcon direction="right" class="size-5 text-ink-gray sm:size-6" />
      </span>
    </A>
  );
}
