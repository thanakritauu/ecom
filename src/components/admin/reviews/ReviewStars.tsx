import { For } from "solid-js";
import { StarIcon } from "~/components/admin/icons";

/** Read-only 5-star row for a review's (or a product's average) rating. */
export function ReviewStars(props: { rating: number }) {
  return (
    <span class="inline-flex items-center gap-0.5 text-brand-yellow" aria-label={`${props.rating} ดาว`}>
      <For each={[1, 2, 3, 4, 5]}>{(n) => <StarIcon class="size-3.5" filled={n <= Math.round(props.rating)} />}</For>
    </span>
  );
}
