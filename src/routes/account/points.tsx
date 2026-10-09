import { createMemo, createSignal, For, Show } from "solid-js";
import { AccountShell, AccountPanel } from "~/components/account/AccountShell";
import { clientOnly } from "@solidjs/start";
import { CheckIcon, CoinIcon } from "~/components/shared/icons";
import { EmptyState } from "~/components/shared/EmptyState";
import { ChevronIcon } from "~/components/shared/ChevronIcon";

// Same Kobalte Dialog SSR/hydration workaround as the other account dialogs.
const PerksSheet = clientOnly(() => import("~/components/account/OrderActionDialogs").then((m) => ({ default: m.Sheet })));
import { formatTHB } from "~/components/shared/PriceDisplay";
import charmissCardLogo from "~/assets/images/charmiss-club-card-logo.png";
import rotateIcon from "~/assets/icons/rotate-cw.svg";
import { useAuth } from "~/lib/auth";
import { COIN_TO_BAHT_RATE, computeCoinsEarned } from "~/lib/cartSelectors";
import { createMockOrderRepository, createOrderHistory } from "~/lib/orderHistory";
import { formatOrderDate } from "~/lib/orderTracking";
import { MOCK_CRM_CARRY_OVER_AT } from "~/lib/accountData";
import { resolveTier, tierPosition, TIERS, yearlySpend, type Tier } from "~/lib/membership";

const HISTORY_TABS = [
  { key: "earned", label: "คอยน์ที่ได้รับ" },
  { key: "used", label: "คอยน์ที่แลก" },
] as const;

/** `orderId` unset = the Charmiss Club CRM carry-over. */
type CoinEntry = { orderId?: string; date: string; label: string; coins: number; state: "earned" | "pending" | "used" };

/**
 * Charmiss Club — coins + member tier (Glow → Radiance → Icon) — display-only mockup, no loyalty backend: the
 * balance is the signed-in user's `coinBalance` (same number as the header
 * pill and Checkout's coin card), the history is derived from purchase
 * history with the same earn/redeem rates (and tier multiplier) Checkout
 * uses. A member moved over from the CRM also gets the carry-over entry —
 * whatever the balance holds beyond what the orders earned/used.
 */
export default function AccountPointsPage() {
  const auth = useAuth();
  const history = createOrderHistory(() => createMockOrderRepository());
  const balance = () => auth.user()?.coinBalance ?? 0;
  const spend = () => yearlySpend(history.orders());

  const tier = () => resolveTier(spend()).current;

  const entries = createMemo<CoinEntry[]>(() => {
    const fromOrders = history.orders().flatMap((o) => {
      const list: CoinEntry[] = [];
      if (o.payment.coinDiscount > 0 && o.status !== "cancelled")
        list.push({ orderId: o.id, date: o.placedAt, label: "ใช้เป็นส่วนลด", coins: -Math.round(o.payment.coinDiscount / COIN_TO_BAHT_RATE), state: "used" });
      if (o.status !== "cancelled" && o.status !== "pending_payment")
        list.push({
          orderId: o.id,
          date: o.placedAt,
          label: o.status === "completed" ? "ได้รับจากคำสั่งซื้อ" : "รอรับเมื่อได้รับสินค้า",
          coins: computeCoinsEarned(o.total - o.payment.shippingFee, tier().id),
          state: o.status === "completed" ? "earned" : "pending",
        });
      return list;
    });
    // Pending coins aren't in the balance yet, so they don't count against the carry-over.
    const credited = fromOrders.filter((e) => e.state !== "pending").reduce((sum, e) => sum + e.coins, 0);
    const carryOver = balance() - credited;
    if (auth.user()?.memberSource !== "crm" || carryOver <= 0) return fromOrders;
    return [...fromOrders, { date: MOCK_CRM_CARRY_OVER_AT, label: "ย้ายคอยน์จาก Charmiss Club CRM", coins: carryOver, state: "earned" }];
  });
  const [historyTab, setHistoryTab] = createSignal<"earned" | "used">("earned");
  // "คอยน์ที่ได้รับ" includes coins still waiting for delivery.
  const shownEntries = () => entries().filter((e) => (historyTab() === "used" ? e.state === "used" : e.state !== "used"));

  return (
    <AccountShell>
      <AccountPanel title="Charmiss Club" headingId="account-points-heading" hideTitle>
        <MemberCard name={auth.user()?.name ?? ""} memberCode={auth.user()?.memberCode} balance={balance()} />

        <MemberTierCard spend={spend()} />

        {/* History — earned (incl. pending) | redeemed */}
        <h2 id="coin-history" class="scroll-mt-24 text-lg font-semibold text-ink">
          ประวัติคอยน์
        </h2>
        <div role="tablist" aria-label="ประวัติคอยน์" class="-mx-4 flex h-11 items-start overflow-x-auto border-b border-surface-gray px-4 sm:-mx-6 sm:px-6">
          <For each={HISTORY_TABS}>
            {(tab) => (
              <button
                type="button"
                role="tab"
                aria-selected={historyTab() === tab.key}
                onClick={() => setHistoryTab(tab.key)}
                class="flex h-full shrink-0 items-center justify-center whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors duration-150"
                classList={{
                  "border-brand-pink text-ink": historyTab() === tab.key,
                  "border-transparent text-ink-placeholder lg:hover:text-ink-gray": historyTab() !== tab.key,
                }}
              >
                {tab.label}
              </button>
            )}
          </For>
        </div>
        <Show when={history.ready()} fallback={<div class="h-40 animate-pulse rounded-card bg-surface-gray" aria-hidden="true" />}>
          <Show
            when={shownEntries().length > 0}
            fallback={
              <EmptyState
                size="compact"
                icon={CoinIcon}
                title={historyTab() === "earned" ? "ยังไม่มีคอยน์ที่ได้รับ" : "ยังไม่มีการแลกคอยน์"}
                description={historyTab() === "earned" ? "สั่งซื้อสินค้าแล้วรับคอยน์ เมื่อได้รับสินค้า" : "ใช้คอยน์เป็นส่วนลดได้ตอนชำระเงิน"}
              />
            }
          >
            <ul class="-mt-2 flex flex-col divide-y divide-surface-gray">
              <For each={shownEntries()}>
                {(entry) => (
                  <li class="flex items-center justify-between gap-3 py-3">
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-ink">{entry.label}</p>
                      <p class="flex flex-wrap gap-x-2 text-xs text-ink-gray">
                        <span>{entry.orderId ?? "Charmiss Club"}</span>
                        <span>{formatOrderDate(entry.date)}</span>
                      </p>
                    </div>
                    <p
                      class="shrink-0 text-sm font-semibold"
                      classList={{ "text-success": entry.state === "earned", "text-ink-gray": entry.state === "pending", "text-system-red": entry.state === "used" }}
                    >
                      {entry.coins > 0 ? "+" : ""}
                      {entry.coins.toLocaleString("th-TH")}
                      <Show when={entry.state === "pending"}> (รอรับ)</Show>
                    </p>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Show>

        <div class="flex flex-col gap-1 rounded-card border border-surface-gray p-4">
          <p class="font-semibold text-ink">เงื่อนไขการรับคอยน์</p>
          <p class="text-sm text-ink-gray">
            ทุกการสั่งซื้อสินค้า 10 บาท (ไม่รวมค่าจัดส่ง) จะได้รับ 1 คอยน์ และได้รับเพิ่มตามระดับสมาชิก ({TIERS.map((t) => `${t.shortName} x${t.coinMultiplier}`).join(", ")}) คอยน์จะถูกสะสมให้อัตโนมัติเมื่อได้รับสินค้า
          </p>
        </div>
      </AccountPanel>
    </AccountShell>
  );
}

/**
 * Charmiss Club member card (Figma CharmissCRM 1:538): greeting + member
 * number, the Charmiss mark, and the coin balance with a shortcut down to
 * the coin history. No member photo exists, so the avatar is the name's
 * first letter. Locked to the Figma frame's 367:214 ratio (close to a real
 * bank card), centered, at most 400px wide.
 */
function MemberCard(props: { name: string; memberCode?: string; balance: number }) {
  const firstName = () => props.name.trim().split(/\s+/)[0] ?? "";
  const initial = () => firstName().charAt(0).toUpperCase();
  // Thai names join "คุณ" directly (คุณธนกฤต); Latin names get a space (คุณ Nutcha).
  const greeting = () => (/^[\u0E00-\u0E7F]/.test(firstName()) ? `คุณ${firstName()}` : `คุณ ${firstName()}`);
  const toHistory = () => document.getElementById("coin-history")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <section
      aria-label="บัตรสมาชิก Charmiss Club"
      class="mx-auto flex aspect-[367/214] w-full max-w-[400px] flex-col justify-between gap-3 overflow-hidden rounded-card border-[3px] border-white/30 bg-brand-pink p-5 text-white shadow-card sm:p-6"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-pill bg-white/25 text-sm font-bold" aria-hidden="true">
            {initial()}
          </span>
          <div class="flex min-w-0 flex-col">
            <p class="truncate text-base font-bold leading-[1.5]">สวัสดี {greeting()}</p>
            <Show when={props.memberCode}>
              <p class="text-xs leading-[1.5] text-white/50">{props.memberCode}</p>
            </Show>
          </div>
        </div>
        <img src={charmissCardLogo} alt="Charmiss" width="48" height="48" class="size-12 shrink-0 rounded-pill" />
      </div>

      <div class="flex flex-col">
        <p class="flex items-center gap-1 text-sm font-bold leading-[1.5]">
          คอยน์ทั้งหมด
          <img src={rotateIcon} alt="" width="11" height="11" class="size-[11px]" />
        </p>
        <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p class="text-2xl font-bold leading-[1.5]">{props.balance.toLocaleString("th-TH")} คอยน์</p>
          <button
            type="button"
            onClick={toHistory}
            class="relative flex items-center justify-center rounded-pill bg-white px-3 py-1.5 text-sm font-medium leading-[1.5] text-brand-pink transition-colors duration-150 before:absolute before:-inset-y-1.5 before:inset-x-0 lg:hover:bg-white/90"
          >
            ดูประวัติคอยน์
          </button>
        </div>
      </div>
    </section>
  );
}

/** Member ladder: current tier, progress along Glow → Radiance → Icon, what's left to the next one, and each tier's perks. */
function MemberTierCard(props: { spend: number }) {
  const tier = () => resolveTier(props.spend);
  const [perksOpen, setPerksOpen] = createSignal(false);
  const reached = (t: Tier) => props.spend >= t.minSpend;

  return (
    <section aria-labelledby="member-tier-heading" class="flex flex-col gap-4 rounded-card border border-surface-gray p-4 sm:p-6">
      {/* Tap the tier row → every tier's perks */}
      <button
        type="button"
        onClick={() => setPerksOpen(true)}
        aria-haspopup="dialog"
        aria-label={`ระดับสมาชิกของคุณคือ ${tier().current.name} กดเพื่อดูสิทธิประโยชน์`}
        class="font-normal -m-2 flex items-center gap-3 rounded-2xl p-2 text-left transition-colors duration-150 lg:hover:bg-surface-gray/60"
      >
        <span class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span id="member-tier-heading" class="text-sm text-ink-gray">
            ระดับสมาชิกของคุณ
          </span>
          <TierBadge tier={tier().current} />
        </span>
        <ChevronIcon direction="right" class="size-6 text-ink-gray" />
      </button>

      {/* Ladder — tiers evenly spaced (Radiance centred); the fill is proportional within each step */}
      <div class="flex flex-col gap-2">
        <div class="relative mx-3 h-2 rounded-pill bg-surface-gray">
          <div class="absolute inset-y-0 left-0 rounded-pill bg-brand-pink transition-all duration-500" style={{ width: `${tier().progress * 100}%` }} />
          <For each={TIERS}>
            {(t) => (
              <span
                class="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-pill border-[3px] border-white shadow-sm"
                style={{ left: `${tierPosition(t) * 100}%`, "background-color": reached(t) ? t.bg : "rgb(var(--color-surface-gray))" }}
              />
            )}
          </For>
        </div>
        {/* Labels under their dots; the end labels anchor to the edges so they never overflow. */}
        <div class="relative mx-3 h-9 text-xs">
          <For each={TIERS}>
            {(t, i) => (
              <span
                class="absolute top-0 flex flex-col whitespace-nowrap"
                classList={{
                  "-translate-x-3 items-start": i() === 0,
                  "translate-x-[calc(-100%+0.75rem)] items-end": i() === TIERS.length - 1,
                  "-translate-x-1/2 items-center": i() > 0 && i() < TIERS.length - 1,
                }}
                style={{ left: `${tierPosition(t) * 100}%` }}
              >
                <span class="font-semibold" classList={{ "text-ink": reached(t), "text-ink-placeholder": !reached(t) }}>
                  {t.shortName}
                </span>
                <span class="text-ink-gray">{formatTHB(t.minSpend)}</span>
              </span>
            )}
          </For>
        </div>
      </div>

      <Show
        when={tier().next}
        fallback={<p class="text-center text-sm font-medium text-brand-pink">คุณอยู่ระดับสูงสุดแล้ว ขอบคุณที่เป็นส่วนหนึ่งของ Charmiss</p>}
      >
        {(next) => (
          <p class="text-center text-sm text-ink">
            ช้อปอีก <span class="font-semibold text-ink">{formatTHB(tier().toNext)}</span> ภายในปีนี้ เพื่อเลื่อนเป็น{" "}
            <span class="text-ink">{next().name}</span>
          </p>
        )}
      </Show>

      <PerksSheet
        open={perksOpen()}
        onOpenChange={setPerksOpen}
        title="สิทธิประโยชน์สมาชิก"
        description={`ระดับของคุณ: ${tier().current.name}`}
      >
        {/* Perks per tier */}
        <div class="flex flex-col gap-3 pb-2">
          <For each={TIERS}>
            {(t) => (
              <div
                class="flex flex-col gap-2 rounded-card border-2 p-4"
                classList={{
                  "border-brand-pink bg-surface-pink": t.id === tier().current.id,
                  "border-surface-gray bg-white": t.id !== tier().current.id,
                }}
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="flex items-center gap-2 font-semibold text-ink">
                    <TierMark tier={t} class="h-10" />
                    {t.name}
                  </p>
                  <Show when={t.id === tier().current.id}>
                    <span class="shrink-0 rounded-pill bg-brand-pink px-2.5 py-0.5 text-xs font-semibold text-white">ระดับของคุณ</span>
                  </Show>
                </div>
                <ul class="flex flex-col gap-1 text-sm text-ink">
                  <For each={t.perks}>
                    {(perk) => (
                      <li class="flex items-start gap-1.5">
                        <CheckIcon class="mt-1 size-3.5 shrink-0 text-brand-pink" />
                        {perk}
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            )}
          </For>
        </div>
      </PerksSheet>
    </section>
  );
}

/** Tier name as the DSL status pill (same size/weight as the order-status badges), filled with the tier's own colours. */
function TierBadge(props: { tier: Tier }) {
  return (
    <span class="inline-flex w-fit items-center rounded-pill px-2.5 py-0.5 text-xs font-semibold" style={{ "background-color": props.tier.bg, color: props.tier.fg }}>
      {props.tier.name}
    </span>
  );
}

/** Tier medal (ribbon artwork, 82×98 — sized by height so all three line up). */
function TierMark(props: { tier: Tier; class?: string }) {
  return <img src={props.tier.mark} alt="" class={`w-auto shrink-0 ${props.class ?? "h-14"}`} />;
}
