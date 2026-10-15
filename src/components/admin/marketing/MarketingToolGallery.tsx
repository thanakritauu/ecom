import { For } from "solid-js";
import { Button } from "~/components/shared/Button";
import { MarketingToolIconBox } from "./MarketingToolIcon";
import { MARKETING_TOOL_GROUPS, MARKETING_TOOL_META, MARKETING_TOOLS, marketingToolCreateHref } from "~/lib/adminMarketing";

/** "เครื่องมือโปรโมชั่น": every tool as a card, grouped like TikTok Shop's tools (ส่วนลด / คูปอง / สิ่งจูงใจ). */
export function MarketingToolGallery() {
  return (
    <div class="flex flex-col gap-6">
      <For each={MARKETING_TOOL_GROUPS}>
        {(group) => (
          <section class="flex flex-col gap-3" aria-labelledby={`tool-group-${group.id}`}>
            <div class="flex flex-col gap-0.5">
              <h2 id={`tool-group-${group.id}`} class="text-base font-semibold text-ink">
                {group.label}
              </h2>
              <p class="text-sm text-ink-gray">{group.description}</p>
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <For each={MARKETING_TOOLS.filter((t) => MARKETING_TOOL_META[t].group === group.id)}>
                {(tool) => (
                  <div class="flex items-start gap-3 rounded-card border border-border bg-surface-card p-4 shadow-card">
                    <MarketingToolIconBox tool={tool} />
                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                      <p class="text-sm font-semibold text-ink">{MARKETING_TOOL_META[tool].label}</p>
                      <p class="text-xs leading-5 text-ink-gray">{MARKETING_TOOL_META[tool].description}</p>
                    </div>
                    <Button href={marketingToolCreateHref(tool)} variant="outline" size="sm" class="min-h-9 shrink-0 self-center">
                      สร้าง
                    </Button>
                  </div>
                )}
              </For>
            </div>
          </section>
        )}
      </For>
    </div>
  );
}
