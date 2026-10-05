import { Show } from "solid-js";

/**
 * The centred page heading every product listing uses (nav pages: Promotion pages, categories, all products) —
 * same 24/28/32px Bold title as the Promotion page's product section, with an optional one-line intro under it.
 * The view/sort row (`ProductListingToolbar` with `hideTitle`) follows directly below.
 */
export function ListingHeading(props: { title: string; description?: string }) {
  return (
    <div class="flex flex-col items-center gap-1 text-center">
      <h1 class="text-2xl font-bold leading-[normal] text-ink sm:text-[28px] lg:text-[32px]">{props.title}</h1>
      <Show when={props.description}>
        <p class="whitespace-pre-line text-ink-gray">{props.description}</p>
      </Show>
    </div>
  );
}
