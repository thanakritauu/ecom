import { children, createSignal, For, Show, type JSX } from "solid-js";
import { AdminHeroSlide } from "~/components/home/HeroBanner";
import { HomepageSections } from "~/components/home/HomepageSections";
import type { HomepageSection } from "~/lib/adminHomepage";

type PreviewDevice = "desktop" | "mobile";

/**
 * REAL-TIME LIVE PREVIEW SYSTEM §10/§12/§18 — the device-toggle + render
 * body shared by `HomepagePreviewDialog` (the modal "zoom" view) and
 * `LandingPageForm`'s always-visible inline Live Preview column, so there
 * is exactly one implementation of "render this section list through the
 * real Frontend" (`HomepageSections`/`AdminHeroSlide`, same renderer the
 * real `/` and `/promotion/:slug` routes use), never two competing ones.
 *
 * `content` — replaces the default Hero + Sections body inside the same
 * device frame, for a page the storefront renders another way (a Promotion
 * Page in listing mode / with a YouTube video, see `PromotionPagePreviewBody`).
 */
export function HomepageSectionsPreview(props: {
  sections: HomepageSection[];
  content?: JSX.Element;
  class?: string;
  /** Homepage: a hero section that's off still shows the storefront's default slides there, so the preview marks that spot. */
  homepage?: boolean;
}) {
  const [device, setDevice] = createSignal<PreviewDevice>("desktop");
  // Resolved once — `props.content` is read twice below and must not mount the custom body twice.
  const content = children(() => props.content);

  return (
    <div class={props.class}>
      <div class="mb-3 flex items-center gap-1 rounded-pill bg-surface-gray p-1 text-sm">
        <button
          type="button"
          onClick={() => setDevice("desktop")}
          class={`min-h-9 flex-1 rounded-pill px-3 font-medium transition-colors duration-150 ${device() === "desktop" ? "bg-surface-card text-ink shadow-card" : "text-ink-gray"}`}
        >
          เดสก์ท็อป
        </button>
        <button
          type="button"
          onClick={() => setDevice("mobile")}
          class={`min-h-9 flex-1 rounded-pill px-3 font-medium transition-colors duration-150 ${device() === "mobile" ? "bg-surface-card text-ink shadow-card" : "text-ink-gray"}`}
        >
          มือถือ
        </button>
      </div>

      {/* `ProductRail`/etc. switch their own mobile-rail-vs-desktop-grid
          markup off the *real browser viewport* (Tailwind `md:`), which
          never changes just because this box gets narrower. These two rules
          force that swap inside the preview specifically — matching by the
          exact utility-class token Tailwind already outputs (`class~=`, not
          a substring match) — without touching any real component. */}
      <Show when={device() === "mobile"}>
        <style>
          {`.homepage-preview-mobile [class~="md:hidden"] { display: flex !important; }
            .homepage-preview-mobile [class~="md:grid"] { display: none !important; }`}
        </style>
      </Show>
      <div
        class="mx-auto max-h-[70vh] overflow-y-auto overflow-x-hidden rounded-card border border-border bg-surface-card"
        classList={{ "max-w-[375px] homepage-preview-mobile": device() === "mobile" }}
      >
        <Show when={!content()} fallback={content()}>
          {/* Every section in list order, the same order the storefront renders them. */}
          <For each={props.sections}>
            {(s) => (
              <Show when={s.type === "hero"} fallback={<HomepageSections sections={[s]} />}>
                <Show
                  when={s.enabled}
                  fallback={
                    <Show when={props.homepage}>
                      <div class="m-3 flex aspect-[3/1] flex-col items-center justify-center gap-1 rounded-card border border-dashed border-border bg-surface-gray/60 px-4 text-center">
                        <p class="text-sm font-medium text-ink">แบนเนอร์สไลด์เริ่มต้น</p>
                        <p class="text-xs text-ink-gray">หน้าร้านแสดง 3 สไลด์เริ่มต้นตรงนี้ เปิดส่วนนี้เพื่อใช้สไลด์ของหน้านี้แทน</p>
                      </div>
                    </Show>
                  }
                >
                  <Show when={s.assets.length > 0} fallback={<AdminHeroSlide section={s} />}>
                    <For each={s.assets}>{(asset) => <AdminHeroSlide section={s} asset={asset} />}</For>
                  </Show>
                </Show>
              </Show>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}
