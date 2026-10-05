import { createSignal, For, onMount, Show } from "solid-js";
import { clientOnly } from "@solidjs/start";
import { AccountShell, AccountPanel } from "~/components/account/AccountShell";
import { CardPaymentForm, EMPTY_CARD, validateCard, type CardInput } from "~/components/payment/CardPaymentForm";
import { Button } from "~/components/shared/Button";
import { mockTokenizeCard } from "~/lib/payment";
import { removeCard, resolveSavedCards, storeCard, type SavedCard } from "~/lib/savedCards";
import { pushToast } from "~/lib/toast";
import visaMark from "~/assets/icons/payment/visa.svg";
import mastercardMark from "~/assets/icons/payment/mastercard.svg";

const ConfirmRemoveDialog = clientOnly(() => import("~/components/account/OrderActionDialogs").then((m) => ({ default: m.ConfirmRemoveDialog })));

const BRAND_MARK: Partial<Record<string, string>> = { visa: visaMark, mastercard: mastercardMark };

/**
 * บัตรเครดิต / เดบิต — the same (mock) card vault Checkout's "บัตรที่บันทึกไว้"
 * reads: only brand, last 4, expiry, holder and a token are kept — never the
 * full number or CVV. Cards saved here show up at checkout, and vice versa.
 */
export default function AccountCardsPage() {
  // Card vault is localStorage-backed — read on the client only, so SSR renders the skeleton.
  const [cards, setCards] = createSignal<SavedCard[]>([]);
  const [ready, setReady] = createSignal(false);
  const refresh = () => setCards(resolveSavedCards(undefined, true));
  onMount(() => {
    refresh();
    setReady(true);
  });

  const [adding, setAdding] = createSignal(false);
  const [card, setCard] = createSignal<CardInput>(EMPTY_CARD);
  const [touched, setTouched] = createSignal<Partial<Record<keyof CardInput, boolean>>>({});
  const [submitted, setSubmitted] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [removing, setRemoving] = createSignal<SavedCard | undefined>();

  const errors = () => {
    const all = validateCard(card());
    return Object.fromEntries(Object.entries(all).filter(([key]) => submitted() || touched()[key as keyof CardInput]));
  };

  const closeForm = () => {
    setAdding(false);
    setCard(EMPTY_CARD);
    setTouched({});
    setSubmitted(false);
  };

  const save = async (e: SubmitEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateCard(card())).length > 0) return;
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600)); // stands in for the gateway's tokenize + verify call
    const token = mockTokenizeCard(card().number);
    storeCard({ id: `card-${Date.now()}`, brand: token.brand, last4: token.last4, expiry: card().expiry, holder: card().name.trim(), token: token.token });
    setSaving(false);
    refresh();
    closeForm();
    pushToast("บันทึกบัตรแล้ว", "success", `บัตรลงท้าย ${token.last4} พร้อมใช้ตอนชำระเงิน`);
  };

  return (
    <AccountShell>
      <AccountPanel
        title="บัตรเครดิต / เดบิต"
        headingId="account-cards-heading"
        action={
          <Show when={ready() && !adding()}>
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
              + เพิ่มบัตรใหม่
            </Button>
          </Show>
        }
      >
        <Show when={ready()} fallback={<div class="h-20 animate-pulse rounded-card bg-surface-gray" aria-hidden="true" />}>
          <Show when={adding()}>
            <form onSubmit={save} novalidate class="flex flex-col gap-4 rounded-card border border-surface-gray p-4">
              <p class="text-sm font-medium text-ink">เพิ่มบัตรใหม่</p>
              <CardPaymentForm
                card={card()}
                onChange={setCard}
                errors={errors()}
                onBlurField={(key) => setTouched((prev) => ({ ...prev, [key]: true }))}
                disabled={saving()}
              />
              <div class="flex flex-col-reverse gap-3 sm:flex-row">
                <Button type="button" variant="outline" class="w-full sm:w-auto" onClick={closeForm} disabled={saving()}>
                  ยกเลิก
                </Button>
                <Button type="submit" variant="primary" class="w-full sm:w-auto" loading={saving()}>
                  บันทึกบัตร
                </Button>
              </div>
            </form>
          </Show>

          <Show
            when={cards().length > 0}
            fallback={
              <Show when={!adding()}>
                <div class="flex flex-col items-center gap-3 py-12 text-center">
                  <p class="text-lg font-semibold text-ink">ยังไม่มีบัตรที่บันทึกไว้</p>
                  <p class="max-w-xs text-sm text-ink-gray">บันทึกบัตรไว้ ครั้งหน้าชำระเงินได้เร็วขึ้น แค่กรอก CVV</p>
                  <Button type="button" variant="primary" onClick={() => setAdding(true)}>
                    เพิ่มบัตร
                  </Button>
                </div>
              </Show>
            }
          >
            {/* Same row as Checkout's "บัตรที่บันทึกไว้": brand mark, •••• last 4, expiry · holder. */}
            <ul class="flex flex-col gap-3">
              <For each={cards()}>
                {(c) => (
                  <li class="flex min-h-[56px] items-center gap-3 rounded-card border border-surface-gray bg-white px-4 py-3">
                    <Show when={BRAND_MARK[c.brand]} fallback={<span class="w-9 shrink-0 text-xs font-bold uppercase text-ink">{c.brand}</span>}>
                      {(src) => <img src={src()} alt={c.brand} class="h-6 w-auto shrink-0 rounded-[3px]" />}
                    </Show>
                    <span class="flex min-w-0 flex-1 flex-col">
                      <span class="text-sm font-semibold tracking-wider text-ink">•••• {c.last4}</span>
                      <span class="truncate text-xs text-ink-gray">
                        หมดอายุ {c.expiry} · {c.holder}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setRemoving(c)}
                      class="min-h-11 shrink-0 px-1 text-xs text-ink-gray underline lg:hover:text-system-red"
                      aria-label={`ลบบัตรลงท้าย ${c.last4}`}
                    >
                      ลบ
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </Show>

          <p class="flex items-center gap-1.5 text-xs text-ink-gray">
            <LockIcon /> Charmiss ไม่เก็บเลขบัตรเต็มและ CVV ของคุณ
          </p>
        </Show>
      </AccountPanel>

      <ConfirmRemoveDialog
        open={!!removing()}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title="ลบบัตรนี้?"
        description={removing() ? `บัตร ${removing()!.brand.toUpperCase()} ลงท้าย ${removing()!.last4}` : ""}
        confirmLabel="ลบบัตร"
        onConfirm={async () => {
          removeCard(removing()!.id);
          refresh();
          pushToast("ลบบัตรแล้ว");
        }}
      />
    </AccountShell>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
