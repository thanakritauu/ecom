import type { User } from "~/lib/types";

export function ProfileHeaderCard(props: { user: User }) {
  return (
    <div class="hidden w-full items-center gap-4 rounded-card sm:flex bg-white p-4 shadow-card sm:p-6">
      <div class="flex size-14 shrink-0 items-center justify-center rounded-pill border border-brand-pink bg-surface-pink" aria-hidden="true">
        <span class="text-2xl font-medium text-brand-pink">{props.user.name.charAt(0)}</span>
      </div>
      <p class="text-xl font-semibold text-ink sm:text-2xl">{props.user.name}</p>
    </div>
  );
}
