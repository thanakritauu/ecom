import { createEffect, createSignal, on, onCleanup, onMount, Show } from "solid-js";
import { SheetModal } from "../shared/SheetModal";
import { Button } from "../shared/Button";
import { CheckIcon } from "../shared/icons";
import { ReturnPolicyContent, ShippingPolicyContent } from "../info/PolicyContent";
import { CHECKOUT_TERMS, INFO_PAGES } from "~/lib/siteInfo";

type Policy = "shipping" | "returns";
const POLICIES: Policy[] = ["shipping", "returns"];
const POLICY_TITLE: Record<Policy, string> = { shipping: INFO_PAGES.shipping.label, returns: INFO_PAGES.returnPolicy.label };

/**
 * Checkout's "ยอมรับเงื่อนไข", right above the pay button, for every order. Each policy opens in a popup (the same
 * content as /help/shipping and /about/return-policy) whose "ยอมรับ" button only works once the text has been
 * scrolled to the end (or fits without scrolling). Accepting the first opens the second; with both accepted the
 * box ticks itself. The box can't be ticked directly: tapping it (or the sentence) opens what's still unread.
 * Unticking clears both, so ticking again means reading again. Paying without it shows `error` here (Checkout's
 * `validateOrder`). Checkout passes `checked` already true for a member who accepted this version before
 * (`termsAcceptance.ts`): the box shows ticked with both policies accepted, read-only unless they untick it.
 */
export function TermsConsent(props: { checked: boolean; onChange: (checked: boolean) => void; error?: string }) {
  const [open, setOpen] = createSignal<Policy>();
  const [accepted, setAccepted] = createSignal<Record<Policy, boolean>>({ shipping: false, returns: false });
  /** The open popup's text has been scrolled to its end. */
  const [readToEnd, setReadToEnd] = createSignal(false);
  // The popup mounts on the client only (same Kobalte Dialog SSR/hydration workaround as Checkout's other sheets).
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));
  const errorId = "terms-consent-error";

  // Ticked from outside (a member's earlier acceptance): both policies count as accepted.
  createEffect(on(() => props.checked, (checked) => checked && setAccepted({ shipping: true, returns: true })));

  const acceptedCount = () => POLICIES.filter((p) => accepted()[p]).length;
  const openPolicy = (p: Policy) => {
    setReadToEnd(false);
    setOpen(p);
  };
  /** The box / sentence: untick (clears both), or open the first policy not accepted yet. */
  const toggle = () => {
    if (props.checked) {
      setAccepted({ shipping: false, returns: false });
      props.onChange(false);
      return;
    }
    openPolicy(POLICIES.find((p) => !accepted()[p]) ?? "shipping");
  };
  const accept = () => {
    const current = open();
    if (!current) return;
    const next = { ...accepted(), [current]: true };
    setAccepted(next);
    const unread = POLICIES.find((p) => !next[p]);
    if (unread) return openPolicy(unread);
    setOpen(undefined);
    props.onChange(true);
  };

  // The end of the text: a 1px marker after it, mounted with each policy's text. Once it's laid out, the popup's
  // scroll area goes back to the top (switching policies would otherwise keep the old scroll and count as read),
  // then each scroll checks whether the bottom is reached; a text short enough to fit counts as read at once.
  let stopWatching: (() => void) | undefined;
  const watchEnd = (el: HTMLElement) => {
    stopWatching?.();
    setTimeout(() => {
      if (!el.isConnected) return;
      let scroller = el.parentElement;
      while (scroller && scroller.scrollHeight <= scroller.clientHeight) scroller = scroller.parentElement;
      if (!scroller) return setReadToEnd(true);
      const area = scroller;
      area.scrollTop = 0;
      const check = () => area.scrollTop + area.clientHeight >= area.scrollHeight - 8 && setReadToEnd(true);
      area.addEventListener("scroll", check, { passive: true });
      stopWatching = () => area.removeEventListener("scroll", check);
      check();
    }, 0);
  };
  onCleanup(() => stopWatching?.());

  const PolicyLink = (p: { policy: Policy }) => (
    <button
      type="button"
      onClick={() => openPolicy(p.policy)}
      aria-haspopup="dialog"
      class="inline-flex items-center gap-1 font-medium text-brand-pink underline lg:hover:no-underline"
    >
      {POLICY_TITLE[p.policy]}
      <Show when={accepted()[p.policy]}>
        <CheckIcon class="size-4 text-success" />
        <span class="sr-only">(ยอมรับแล้ว)</span>
      </Show>
    </button>
  );

  /** Nothing to accept in the popup: already accepted (by this member before, or in this order). */
  const readOnly = () => (open() ? accepted()[open()!] : false);
  const footerLabel = () => {
    const current = open();
    if (current && accepted()[current]) return "ยอมรับแล้ว";
    return readToEnd() ? "ยอมรับ" : "เลื่อนอ่านให้จบเพื่อยอมรับ";
  };

  return (
    <div id="terms-consent" class="flex scroll-mt-24 flex-col gap-1.5">
      <div class="flex items-start gap-3 text-sm leading-[1.75] text-ink">
        <input
          id="terms-consent-box"
          type="checkbox"
          checked={props.checked}
          // Never ticked by hand: the box follows the two acceptances (`toggle`), so put it back to that right away.
          onChange={(e) => {
            const box = e.currentTarget;
            toggle();
            box.checked = props.checked;
          }}
          aria-invalid={props.error ? true : undefined}
          aria-describedby={props.error ? errorId : undefined}
          class="mt-1 size-5 shrink-0 cursor-pointer rounded accent-brand-pink"
        />
        {/* Not a <label>: the policy names inside are buttons of their own. Tapping the sentence acts like the box. */}
        <p>
          <span class="cursor-pointer" onClick={toggle}>
            ฉันได้อ่านและยอมรับ
          </span>{" "}
          <PolicyLink policy="shipping" /> และ <PolicyLink policy="returns" />
        </p>
      </div>
      <Show when={!props.checked && acceptedCount() > 0}>
        <p class="pl-8 text-xs text-ink-gray">อ่านและยอมรับแล้ว {acceptedCount()} จาก {POLICIES.length}</p>
      </Show>
      <Show when={props.error}>
        <p id={errorId} class="pl-8 text-sm text-system-red" role="alert">
          {props.error}
        </p>
      </Show>

      <Show when={mounted()}>
        <SheetModal
          open={!!open()}
          onOpenChange={(o) => !o && setOpen(undefined)}
          title={open() ? POLICY_TITLE[open()!] : ""}
          description={CHECKOUT_TERMS.label}
          footer={
            <Button
              type="button"
              variant="primary"
              size="lg"
              class="w-full"
              disabled={!readToEnd() && !readOnly()}
              onClick={() => (readOnly() ? setOpen(undefined) : accept())}
            >
              {footerLabel()}
            </Button>
          }
        >
          {/* Each policy mounts its own end marker, so switching to the other one starts unread. */}
          <div class="flex flex-col gap-6 pb-2">
            <Show
              when={open() === "shipping"}
              fallback={
                <>
                  <ReturnPolicyContent plain />
                  <div ref={watchEnd} class="h-px" aria-hidden="true" />
                </>
              }
            >
              <ShippingPolicyContent plain />
              <div ref={watchEnd} class="h-px" aria-hidden="true" />
            </Show>
          </div>
        </SheetModal>
      </Show>
    </div>
  );
}
