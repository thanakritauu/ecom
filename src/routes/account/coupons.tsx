import { createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { AccountShell, AccountPanel } from "~/components/account/AccountShell";
import { CouponCard, couponTicket, type CouponCardAction } from "~/components/shared/CouponCard";
import { EmptyState } from "~/components/shared/EmptyState";
import { TagIcon } from "~/components/shared/icons";
import { couponStamp, isCouponExpired, type Coupon } from "~/lib/cartSelectors";
import { useCollectedCoupons } from "~/lib/collectedCoupons";
import { useStorefrontPromotions } from "~/lib/storefrontPromotions";
import { pushToast } from "~/lib/toast";

type Tab = "mine" | "more" | "expired";

/**
 * คูปองและสิทธิพิเศษ (profile menu, after Charmiss Club): the member's own
 * coupons, from the same collected list Home and Checkout's "เก็บแล้ว" use.
 * - คูปองของฉัน: collected and still valid ("ใช้คูปอง"; another group's shows a grey "เฉพาะ ..." pill).
 * - เก็บคูปองเพิ่ม: live coupons not collected yet (every group, same rules as /coupons).
 * - หมดอายุ: collected ones past their dates, in black and white.
 */
export default function AccountCouponsPage() {
  const promos = useStorefrontPromotions();
  const store = useCollectedCoupons();
  const navigate = useNavigate();

  const live = () => {
    const byCode = new Map([...promos.homeCoupons(), ...promos.checkoutCoupons()].map((c) => [c.code, c] as const));
    return [...byCode.values()];
  };
  // This shopper's own groups first, as on /coupons.
  const eligibleFirst = (list: Coupon[]) => [...list.filter((c) => !c.audienceBlock), ...list.filter((c) => c.audienceBlock)];
  const lists: Record<Tab, () => Coupon[]> = {
    mine: () => eligibleFirst(live().filter((c) => store.isCollected(c.code))),
    more: () => eligibleFirst(live().filter((c) => !store.isCollected(c.code))),
    expired: () => promos.codeCoupons().filter((c) => store.isCollected(c.code) && isCouponExpired(c)),
  };
  const TABS: { key: Tab; label: string; empty: { title: string; description: string } }[] = [
    { key: "mine", label: "คูปองของฉัน", empty: { title: "ยังไม่มีคูปองที่เก็บไว้", description: "เก็บคูปองได้ที่แท็บเก็บคูปองเพิ่ม หรือหน้าคูปอง" } },
    { key: "more", label: "เก็บคูปองเพิ่ม", empty: { title: "เก็บคูปองครบแล้ว", description: "คูปองใหม่จะขึ้นที่นี่ แวะมาดูอีกครั้งนะ" } },
    { key: "expired", label: "หมดอายุ", empty: { title: "ไม่มีคูปองที่หมดอายุ", description: "คูปองที่เก็บไว้แล้วหมดอายุจะแสดงที่นี่" } },
  ];
  const [tab, setTab] = createSignal<Tab>("mine");

  const collect = async (code: string) => {
    await new Promise((r) => setTimeout(r, 350));
    store.collect(code);
    pushToast("เก็บคูปองสำเร็จ");
  };

  /** Another group's coupon: the grey "เฉพาะ ..." pill (collected or not); otherwise the ticket's own "เก็บ" / "ใช้คูปอง". */
  const action = (c: Coupon): CouponCardAction | undefined =>
    c.audienceBlock ? { label: `เฉพาะ${c.audienceOnly ?? ""}`, variant: "outline", disabled: true, onClick: () => {}, onlyFor: c.audienceOnly ?? "กลุ่มอื่น" } : undefined;

  return (
    <AccountShell>
      <AccountPanel title="คูปองและสิทธิพิเศษ" headingId="account-coupons-heading">
        {/* Same underline tabs as Purchase History, each with its count. */}
        <div role="tablist" aria-label="ประเภทคูปอง" class="-mx-4 flex h-11 items-start overflow-x-auto border-b border-surface-gray px-4 sm:-mx-6 sm:px-6">
          <For each={TABS}>
            {(t) => (
              <button
                type="button"
                role="tab"
                aria-selected={tab() === t.key}
                onClick={() => setTab(t.key)}
                class="flex h-full shrink-0 items-center justify-center whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors duration-150"
                classList={{
                  "border-brand-pink text-ink": tab() === t.key,
                  "border-transparent text-ink-placeholder lg:hover:text-ink-gray": tab() !== t.key,
                }}
              >
                {t.label} ({lists[t.key]().length})
              </button>
            )}
          </For>
        </div>

        <Show
          when={lists[tab()]().length > 0}
          fallback={<EmptyState icon={TagIcon} title={TABS.find((t) => t.key === tab())!.empty.title} description={TABS.find((t) => t.key === tab())!.empty.description} />}
        >
          {/* 1 column on phones, 2 across from md; the gap leaves room for each ticket's shadow.
              Phones: the list reaches 12px into the panel's padding so a ticket keeps room for its amount beside "ไม่ตรงเงื่อนไข". */}
          <ul class="-mx-3 grid grid-cols-1 gap-x-4 gap-y-6 pt-2 sm:mx-0 md:grid-cols-2">
            <For each={lists[tab()]()}>
              {(c) => (
                <li class="flex list-none flex-col gap-3">
                  <CouponCard
                    coupon={couponTicket(c)}
                    collected={store.isCollected(c.code)}
                    onCollect={() => collect(c.code)}
                    onUse={() => navigate("/products")}
                    action={action(c)}
                    stamp={couponStamp(c)}
                  />
                </li>
              )}
            </For>
          </ul>
        </Show>
      </AccountPanel>
    </AccountShell>
  );
}
