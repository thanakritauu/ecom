/** Mirrors ProductCard's real proportions (both variants) so swapping skeleton→real card causes no layout shift. */
export function ProductCardSkeleton(props: { variant?: "grid" | "list" }) {
  const shimmer = "animate-shimmer rounded bg-surface-gray bg-[length:400px_100%] bg-no-repeat";

  if (props.variant === "list") {
    return (
      <div class="flex w-full gap-3 rounded-card bg-white p-3 shadow-card sm:gap-4 sm:p-4">
        <div class={`size-[96px] shrink-0 rounded-media sm:size-[128px] lg:size-[150px] ${shimmer}`} />
        <div class="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
          <div class={`h-4 w-3/4 ${shimmer}`} />
          <div class={`h-5 w-1/3 ${shimmer}`} />
          <div class={`h-4 w-1/2 ${shimmer}`} />
          <div class={`mt-auto h-11 w-full rounded-pill sm:w-32 ${shimmer}`} />
        </div>
      </div>
    );
  }

  return (
    <div class="flex h-full w-full flex-col gap-4 rounded-card bg-white p-4 shadow-card">
      <div class={`aspect-square w-full rounded-media ${shimmer}`} />
      <div class="flex flex-1 flex-col gap-3">
        <div class="flex flex-col gap-2">
          <div class={`h-4 w-full ${shimmer}`} />
          <div class={`h-4 w-2/3 ${shimmer}`} />
          <div class={`h-5 w-1/2 ${shimmer}`} />
        </div>
        <div class={`mt-auto h-11 w-full rounded-pill ${shimmer}`} />
      </div>
    </div>
  );
}
