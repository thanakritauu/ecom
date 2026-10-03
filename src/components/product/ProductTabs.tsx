import { createSignal, For, Show, type JSX } from "solid-js";
import type { Product } from "~/lib/types";

const TAB_IDS = ["details", "how-to-use", "ingredients", "shipping"] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_LABELS: Record<TabId, string> = {
  details: "รายละเอียดสินค้า",
  "how-to-use": "วิธีใช้",
  ingredients: "ส่วนผสม",
  shipping: "การจัดส่งและการคืนสินค้า",
};

/**
 * Figma (node 132:5317) only has real written content for the "รายละเอียด
 * สินค้า" tab — the other three are real tabs (so switching between them is
 * a real interaction, not a dead click) but show an honest "not written yet"
 * state rather than invented ingredient/usage claims for a product this
 * catalog has no real copy for.
 */
export function ProductTabs(props: { product: Product }) {
  const [active, setActive] = createSignal<TabId>("details");

  /**
   * Root-cause fix — `template2 is not a function` on `/product/:slug`:
   * these four panels used to be eager `JSX.Element` values, which in Solid
   * means each one runs its compiled `template()`/hydration call immediately
   * at setup time, not lazily when rendered. All four ran on both server and
   * client, but only the active one ever got inserted into the DOM — so the
   * client allocated hydration keys the server never serialized, desyncing
   * `sharedConfig`'s hydration key sequence for every component mounted
   * after this one (the Footer's Kobalte Accordion, downstream, then threw
   * trying to hydrate against a mismatched key). Storing thunks instead and
   * calling only `panels[active()]()` means exactly one panel's template
   * ever runs, on both sides, every time — same as any other conditionally
   * rendered content in this codebase.
   */
  const panels: Record<TabId, () => JSX.Element> = {
    details: () => (
      <div class="flex flex-col gap-6">
        <Show
          when={props.product.description}
          fallback={<p class="text-ink-gray">ยังไม่มีรายละเอียดสินค้าเพิ่มเติมสำหรับสินค้านี้</p>}
        >
          <p class="whitespace-pre-line text-base leading-relaxed text-ink">{props.product.description}</p>
        </Show>
        <img
          src={props.product.image}
          alt={props.product.name}
          loading="lazy"
          class="w-full rounded-card object-cover"
        />
      </div>
    ),
    "how-to-use": () => <p class="text-ink-gray">ยังไม่มีข้อมูลวิธีใช้สำหรับสินค้านี้</p>,
    ingredients: () => <p class="text-ink-gray">ยังไม่มีข้อมูลส่วนผสมสำหรับสินค้านี้</p>,
    shipping: () => (
      <p class="text-ink-gray">
        จัดส่งฟรีทั่วประเทศเมื่อซื้อครบ 990.- คืนสินค้าได้ภายใน 7 วันกรณีสินค้าชำรุด ดูรายละเอียดเพิ่มเติมได้ที่หน้านโยบายการจัดส่งและคืนสินค้า
      </p>
    ),
  };

  return (
    <div class="flex flex-col gap-5 sm:gap-6 lg:gap-8">
      <div role="tablist" aria-label="ข้อมูลสินค้า" class="scroll-rail !mx-0 !px-0 gap-2 border-b border-surface-gray">
        <For each={TAB_IDS}>
          {(id) => (
            <button
              type="button"
              role="tab"
              aria-selected={active() === id}
              onClick={() => setActive(id)}
              class="flex h-[52px] shrink-0 items-center whitespace-nowrap border-b-2 px-6 text-lg font-medium transition-colors duration-150"
              classList={{
                "border-brand-pink text-ink": active() === id,
                "border-transparent text-ink-gray hover:text-ink": active() !== id,
              }}
            >
              {TAB_LABELS[id]}
            </button>
          )}
        </For>
      </div>
      <div role="tabpanel">{panels[active()]()}</div>
    </div>
  );
}
