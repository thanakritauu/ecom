import { createSignal, For, Show } from "solid-js";
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
 */
export function HomepageSectionsPreview(props: { sections: HomepageSection[]; class?: string }) {
  const [device, setDevice] = createSignal<PreviewDevice>("desktop");
  const enabledHero = () => props.sections.filter((s) => s.type === "hero" && s.enabled);

  return (
    <div class={props.class}>
      <div class="mb-3 flex items-center gap-1 rounded-pill bg-surface-gray p-1 text-sm">
        <button
          type="button"
          onClick={() => setDevice("desktop")}
          class={`min-h-9 flex-1 rounded-pill px-3 font-medium transition-colors duration-150 ${device() === "desktop" ? "bg-surface-card text-ink shadow-sm" : "text-ink-gray"}`}
        >
          Desktop
        </button>
        <button
          type="button"
          onClick={() => setDevice("mobile")}
          class={`min-h-9 flex-1 rounded-pill px-3 font-medium transition-colors duration-150 ${device() === "mobile" ? "bg-surface-card text-ink shadow-sm" : "text-ink-gray"}`}
        >
          Mobile
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
        <Show when={enabledHero().length > 0}>
          <For each={enabledHero()}>
            {(s) => (
              <Show when={s.assets.length > 0} fallback={<AdminHeroSlide section={s} />}>
                <For each={s.assets}>{(asset) => <AdminHeroSlide section={s} asset={asset} />}</For>
              </Show>
            )}
          </For>
        </Show>
        <HomepageSections sections={props.sections} />
      </div>
    </div>
  );
}
