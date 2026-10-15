import { For, Show } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { MarketingToolGallery } from "~/components/admin/marketing/MarketingToolGallery";
import { MarketingManageList, isToolFilter, type ToolFilter } from "~/components/admin/marketing/MarketingManageList";

type HubTab = "tools" | "manage";
const TABS: { value: HubTab; label: string }[] = [
  { value: "tools", label: "เครื่องมือโปรโมชั่น" },
  { value: "manage", label: "จัดการโปรโมชั่น" },
];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * The one marketing menu: "เครื่องมือโปรโมชั่น" (every tool as a card, like
 * TikTok Shop's gallery; "สร้าง" opens that tool's form) and "จัดการโปรโมชั่น"
 * (one list of every promotion, coupon and the flash-sale entry). The tab and
 * the tool filter live in the URL (`?tab=manage&tool=coupons`) so other pages
 * can link straight to a filtered list.
 */
export default function AdminMarketingHubPage() {
  const [params, setParams] = useSearchParams();
  const tab = (): HubTab => (first(params.tab) === "manage" ? "manage" : "tools");
  const tool = (): ToolFilter => {
    const t = first(params.tool);
    return isToolFilter(t) ? t : "all";
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด" }, { label: "โปรโมชั่น" }]} />
      <PageHeader title="โปรโมชั่น" description="สร้างและจัดการส่วนลด คูปอง ของแถม ส่งฟรี และแฟลชเซลได้ในที่เดียว" />

      <div role="tablist" aria-label="โปรโมชั่น" class="flex h-11 items-start overflow-x-auto border-b border-border">
        <For each={TABS}>
          {(t) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab() === t.value}
              onClick={() => setParams({ tab: t.value, tool: undefined }, { replace: true })}
              class="flex h-full shrink-0 items-center justify-center whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors duration-150"
              classList={{
                "border-brand-pink text-ink": tab() === t.value,
                "border-transparent text-ink-placeholder lg:hover:text-ink-gray": tab() !== t.value,
              }}
            >
              {t.label}
            </button>
          )}
        </For>
      </div>

      <Show when={tab() === "manage"} fallback={<MarketingToolGallery />}>
        <MarketingManageList tool={tool()} onToolChange={(t) => setParams({ tab: "manage", tool: t === "all" ? undefined : t }, { replace: true })} />
      </Show>
    </div>
  );
}
