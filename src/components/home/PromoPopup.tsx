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
          <Dialog.Content class="flex max-h-[90dvh] w-full max-w-[400px] flex-col items-center gap-3 sm:max-w-[540px] outline-none data-[expanded]:animate-toast-in">
          <div class="relative flex min-h-0 w-full flex-col overflow-hidden rounded-card bg-white shadow-card">
            <div class="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-surface-pink">
              <img
                src={content().image.src}
                alt={content().image.alt}
                class="size-full object-cover"
                style={{ "object-position": content().image.objectPosition ?? "center" }}
              />
              {/* Small 32px circle, but the button itself keeps a 44px tap area around it. */}
              <Dialog.CloseButton class="group absolute right-1 top-1 flex size-11 items-center justify-center">
                <span class="flex size-8 items-center justify-center rounded-pill bg-white/80 text-ink-gray shadow-card transition-colors lg:group-hover:bg-white" aria-hidden="true">
                  <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
                  </svg>
                </span>
                <span class="sr-only">ปิด</span>
              </Dialog.CloseButton>
            </div>

            <div class="flex min-h-0 flex-col items-center gap-4 overflow-y-auto px-5 pb-6 pt-6 text-center sm:gap-5 sm:px-8 sm:pb-8">
              <div class="flex flex-col gap-1.5">
                <Dialog.Title class="text-2xl font-bold leading-[1.4] text-ink sm:text-[30px]">{content().title}</Dialog.Title>
                <Dialog.Description class="whitespace-pre-line text-[15px] leading-[1.75] text-ink-gray sm:text-lg">{content().description}</Dialog.Description>
              </div>
              <Show when={content().condition}>
                <p class="whitespace-nowrap rounded-pill bg-surface-pink px-4 py-2 text-xs font-medium text-brand-pink sm:text-sm">{content().condition}</p>
              </Show>

              <Show
                when={auth.isAuthenticated()}
                fallback={
                  <Button
                    size="lg"
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
                <Button href={content().memberCta.href} size="lg" class="w-full" onClick={close}>
                  {content().memberCta.label}
                </Button>
              </Show>

            </div>
          </div>

          <label class="flex min-h-[44px] cursor-pointer items-center gap-2 px-2 text-base font-medium text-white">
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
