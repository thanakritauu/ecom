import { Dialog } from "@kobalte/core/dialog";
import { CloseXIcon } from "~/components/admin/icons";
import { HomepageSectionsPreview } from "./HomepageSectionsPreview";
import type { HomepageSection } from "~/lib/adminHomepage";

/**
 * §22 — reuses the exact same `HomepageSections`/`AdminHeroSlide` the real
 * storefront renders (not a re-imagined mini homepage), so what Admin
 * previews here is what actually ships once Published — same reuse
 * decision `PromotionPagePreviewDialog` already made for Promotion Pages.
 * The device toggle + render body live in `HomepageSectionsPreview`,
 * shared with `LandingPageForm`'s own always-visible Live Preview column.
 */
export function HomepagePreviewDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; sections: HomepageSection[] }) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-card bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
            <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
              <Dialog.Title class="text-lg font-semibold text-ink">Preview Homepage</Dialog.Title>
              <Dialog.CloseButton aria-label="ปิด" class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink">
                <CloseXIcon />
              </Dialog.CloseButton>
            </div>
            <div class="flex-1 overflow-y-auto bg-surface-gray/40 p-5">
              <HomepageSectionsPreview sections={props.sections} />
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
