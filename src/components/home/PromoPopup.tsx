import { Dialog } from "@kobalte/core/dialog";
import { createSignal, onMount, Show } from "solid-js";
import { useAuth } from "~/lib/auth";
import { hidePromoForever, HOME_PROMO_POPUP, isPromoHidden, type PromoPopupContent } from "~/lib/promoPopup";
import { Button } from "../shared/Button";
import { CheckIcon } from "../shared/icons";

// Closed with × once → stays closed while navigating around this visit; a full reload shows it again.
let closedThisVisit = false;

/**
 * Home-only promo popup. Same overlay and card language as `SheetModal`, but
 * a compact centered card (image on top, copy below, full-width CTA) rather
 * than the 668px sheet — it's a one-glance announcement, not a task. Opened
 * client-side after mount (SSR always renders it closed, so no hydration
 * mismatch), and skipped when another dialog is already up on first paint.
 */
export function PromoPopup(props: { content?: PromoPopupContent }) {
  const content = () => props.content ?? HOME_PROMO_POPUP;
  const auth = useAuth();
  const [open, setOpen] = createSignal(false);
  // "ไม่ต้องแสดงอีก" is a checkbox under the card: ticked, any way of closing (×, overlay, CTA) hides it for good.
  const [neverAgain, setNeverAgain] = createSignal(false);

  onMount(() => {
    if (closedThisVisit || isPromoHidden(content().id)) return;
    if (auth.isAuthModalOpen() || document.querySelector('[role="dialog"]')) return;
    setOpen(true);
  });

  const close = () => {
    closedThisVisit = true;
    if (neverAgain()) hidePromoForever(content().id);
    setOpen(false);
  };

  return (
    <Dialog open={open()} onOpenChange={(next) => !next && close()}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/60 data-[expanded]:animate-toast-in" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Content = the card + the checkbox below it (still inside, so clicking it doesn't count as "outside"). */}
          <Dialog.Content class="flex max-h-[90dvh] w-full max-w-[440px] flex-col items-center gap-3 outline-none data-[expanded]:animate-toast-in">
          <div class="relative flex min-h-0 w-full flex-col overflow-hidden rounded-card bg-white shadow-card">
            <div class="relative aspect-[2/1] w-full shrink-0 overflow-hidden bg-surface-pink">
              <img
                src={content().image.src}
                alt={content().image.alt}
                class="size-full object-cover"
                style={{ "object-position": content().image.objectPosition ?? "center" }}
              />
              <Dialog.CloseButton class="absolute right-2 top-2 flex size-11 items-center justify-center rounded-pill bg-white/80 text-2xl text-ink-gray shadow-card lg:hover:bg-white">
                <span aria-hidden="true">×</span>
                <span class="sr-only">ปิด</span>
              </Dialog.CloseButton>
            </div>

            <div class="flex min-h-0 flex-col items-center gap-4 overflow-y-auto px-6 pb-5 pt-5 text-center">
              <div class="flex flex-col gap-1">
                <Dialog.Title class="text-xl font-bold text-ink">{content().title}</Dialog.Title>
                <Dialog.Description class="whitespace-pre-line text-sm leading-[1.75] text-ink-gray">{content().description}</Dialog.Description>
              </div>
              <Show when={content().condition}>
                <p class="rounded-pill bg-surface-pink px-4 py-1.5 text-xs font-medium text-brand-pink">{content().condition}</p>
              </Show>

              <Show
                when={auth.isAuthenticated()}
                fallback={
                  <Button
                    class="w-full"
                    onClick={() => {
                      close();
                      auth.openAuthModal();
                    }}
                  >
                    {content().guestCta}
                  </Button>
                }
              >
                <Button href={content().memberCta.href} class="w-full" onClick={close}>
                  {content().memberCta.label}
                </Button>
              </Show>

            </div>
          </div>

          <label class="flex min-h-[44px] cursor-pointer items-center gap-2 px-2 text-sm font-medium text-white">
            <input type="checkbox" class="peer sr-only" checked={neverAgain()} onChange={(e) => setNeverAgain(e.currentTarget.checked)} />
            <span
              class="flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2 border-white transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white"
              classList={{ "bg-white text-brand-pink": neverAgain(), "bg-transparent text-transparent": !neverAgain() }}
              aria-hidden="true"
            >
              <CheckIcon class="size-3.5" />
            </span>
            ไม่ต้องแสดงอีก
          </label>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
