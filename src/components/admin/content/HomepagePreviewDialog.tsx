import { Dialog } from "@kobalte/core/dialog";
import { createSignal, For, Show } from "solid-js";
import { CloseXIcon } from "~/components/admin/icons";
import { AdminHeroSlide } from "~/components/home/HeroBanner";
import { HomepageSections } from "~/components/home/HomepageSections";
import type { HomepageSection } from "~/lib/adminHomepage";

type PreviewDevice = "desktop" | "mobile";

/**
 * §22 — reuses the exact same `HomepageSections`/`AdminHeroSlide` the real
 * storefront renders (not a re-imagined mini homepage), so what Admin
 * previews here is what actually ships once Published — same reuse
 * decision `PromotionPagePreviewDialog` already made for Promotion Pages.
 */
export function HomepagePreviewDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; sections: HomepageSection[] }) {
  const [device, setDevice] = createSignal<PreviewDevice>("desktop");
  const enabledHero = () => props.sections.filter((s) => s.type === "hero" && s.enabled);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-card bg-white shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
            <div class="flex shrink-0 items-center justify-between gap-3 border-b border-surface-gray px-5 py-4">
              <Dialog.Title class="text-lg font-semibold text-ink">Preview Homepage</Dialog.Title>
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1 rounded-pill bg-surface-gray p-1">
                  <button
                    type="button"
                    onClick={() => setDevice("desktop")}
                    class={`min-h-9 rounded-pill px-3 text-sm font-medium transition-colors duration-150 ${device() === "desktop" ? "bg-white text-ink shadow-sm" : "text-ink-gray"}`}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevice("mobile")}
                    class={`min-h-9 rounded-pill px-3 text-sm font-medium transition-colors duration-150 ${device() === "mobile" ? "bg-white text-ink shadow-sm" : "text-ink-gray"}`}
                  >
                    Mobile
                  </button>
                </div>
                <Dialog.CloseButton aria-label="ปิด" class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink">
                  <CloseXIcon />
                </Dialog.CloseButton>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto bg-surface-gray/40 p-5">
              {/* `ProductRail`/etc. switch their own mobile-rail-vs-desktop-grid
                  markup off the *real browser viewport* (Tailwind `md:`), which
                  never changes just because this dialog's own box gets narrower.
                  These two rules force that swap inside the preview specifically
                  — matching by the exact utility-class token Tailwind already
                  outputs (`class~=`, not a substring match) — without touching
                  `ProductRail.tsx` itself, so the real site's actual responsive
                  behavior is unaffected. */}
              <Show when={device() === "mobile"}>
                <style>
                  {`.homepage-preview-mobile [class~="md:hidden"] { display: flex !important; }
                    .homepage-preview-mobile [class~="md:grid"] { display: none !important; }`}
                </style>
              </Show>
              <div class="mx-auto overflow-hidden rounded-card bg-white shadow-card" classList={{ "max-w-[375px] homepage-preview-mobile": device() === "mobile" }}>
                <Show when={enabledHero().length > 0}>
                  <For each={enabledHero()}>{(s) => <AdminHeroSlide section={s} />}</For>
                </Show>
                <HomepageSections sections={props.sections} />
              </div>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
