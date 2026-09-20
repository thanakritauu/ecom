import { A } from "@solidjs/router";
import type { User } from "~/lib/types";

export function ProfileHeaderCard(props: { user: User }) {
  return (
    <div class="flex w-full flex-wrap items-center justify-between gap-3 rounded-card bg-white p-4 shadow-card sm:p-6">
      <div class="flex items-center gap-4">
        <div class="flex size-14 shrink-0 items-center justify-center rounded-pill border border-brand-pink bg-surface-pink" aria-hidden="true">
          <span class="text-2xl font-medium text-brand-pink">{props.user.name.charAt(0)}</span>
        </div>
        <p class="text-xl font-semibold text-ink sm:text-2xl">{props.user.name}</p>
      </div>

      <A
        href="/account/points"
        class="flex items-center gap-2 rounded-pill bg-[#fff4e6] p-2 pr-3 transition-colors duration-150 hover:bg-[#ffe9cc]"
      >
        <CoinIcon />
        <span class="whitespace-nowrap text-sm font-semibold text-ink">คุณมี {props.user.coinBalance.toLocaleString("th-TH")} คอยน์</span>
        <ChevronIcon />
      </A>
    </div>
  );
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-8 shrink-0 text-brand-yellow" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <text x="12" y="16" text-anchor="middle" font-size="11" fill="white" font-weight="bold">
        C
      </text>
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-4 shrink-0 -rotate-90 text-ink" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}
