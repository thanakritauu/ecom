import { Accordion as KAccordion } from "@kobalte/core/accordion";
import { For, type JSX } from "solid-js";
import chevronDown from "~/assets/icons/faq-chevron-down.svg";

export type AccordionItem = {
  id: string;
  trigger: JSX.Element;
  content: JSX.Element;
};

export function Accordion(props: {
  items: AccordionItem[];
  /** Kobalte always takes `value`/`defaultValue` as string[], even in single (non-`multiple`) mode. */
  defaultValue?: string[];
  class?: string;
  itemClass?: string;
  /** Override the trigger label / content text color (defaults to `text-ink`, the light-background color FAQSection relies on) — needed by Footer, which renders this on a dark background. */
  triggerClass?: string;
  contentClass?: string;
  /** Applied to the chevron `<img>`; e.g. `"brightness-0 invert"` to force a white chevron regardless of the source asset's own hardcoded fill. */
  chevronClass?: string;
}) {
  return (
    <KAccordion
      collapsible
      defaultValue={props.defaultValue}
      class={`flex flex-col gap-3 ${props.class ?? ""}`}
    >
      <For each={props.items}>
        {(item) => (
          <KAccordion.Item
            value={item.id}
            class={`rounded-card border-b border-surface-gray bg-surface-pink p-6 ${props.itemClass ?? ""}`}
          >
            <KAccordion.Header class="flex w-full">
              <KAccordion.Trigger class="flex min-h-[44px] w-full items-center justify-between gap-4 text-left">
                <span class={`text-lg font-medium sm:text-xl ${props.triggerClass ?? "text-ink"}`}>{item.trigger}</span>
                <img
                  src={chevronDown}
                  alt=""
                  class={`size-6 shrink-0 transition-transform duration-250 [[data-expanded]_&]:rotate-180 ${props.chevronClass ?? ""}`}
                />
              </KAccordion.Trigger>
            </KAccordion.Header>
            <KAccordion.Content
              class={`overflow-hidden text-base leading-relaxed data-[expanded]:animate-accordion-down data-[closed]:animate-accordion-up ${props.contentClass ?? "text-ink"}`}
            >
              <div class="pt-4">{item.content}</div>
            </KAccordion.Content>
          </KAccordion.Item>
        )}
      </For>
    </KAccordion>
  );
}
