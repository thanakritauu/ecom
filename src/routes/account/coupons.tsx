import { createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { AccountShell, AccountPanel } from "~/components/account/AccountShell";
import { CouponCard, couponTicket, type CouponCardAction } from "~/components/shared/CouponCard";
import { EmptyState } from "~/components/shared/EmptyState";
import { TagIcon } from "~/components/shared/icons";
import { isCouponExpired, type Coupon } from "~/lib/cartSelectors";
import { useCollectedCoupons } from "~/lib/collectedCoupons";
import { useStorefrontPromotions } from "~/lib/storefrontPromotions";
import { pushToast } from "~/lib/toast";

type Tab = "mine" | "more" | "expired";

/**
 * คูปองและสิทธิพิเศษ (profile menu, after Charmiss Club): the member's own
 * coupons, from the same collected list Home and Checkout's "เก็บแล้ว" use.
 * - คูปองของฉัน: collected and still valid ("ใช้คูปอง"; another group's shows why it can't be used).
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

  /** The ticket's button per tab: shop with a usable one, collect a new one, or say why not. */
  const action = (c: Coupon): CouponCardAction | undefined => {
    if (isCouponExpired(c)) return { label: "หมดอายุแล้ว", variant: "outline", disabled: true, onClick: () => {} };
    if (c.audienceBlock) return { label: "ไม่ตรงเงื่อนไข", variant: "outline", disabled: true, onClick: () => {} };
    if (tab() === "mine") return { label: "ใช้คูปอง", variant: "primary", onClick: () => navigate("/products") };
    return undefined; // เก็บคูปองเพิ่ม: the ticket's own "เก็บเลย"
  };

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
          {/* As many columns as fit with each ticket at least 330px (1 on phones); the gap leaves room for each ticket's shadow and reason line.
              Phones: the list reaches 12px into the panel's padding so a ticket keeps room for its amount beside "ไม่ตรงเงื่อนไข". */}
          <ul class="-mx-3 grid grid-cols-[repeat(auto-fill,minmax(min(100%,330px),1fr))] gap-x-4 gap-y-6 pt-2 sm:mx-0">
            <For each={lists[tab()]()}>
              {(c) => (
                <li class="flex list-none flex-col gap-3">
                  <CouponCard
                    coupon={couponTicket(c)}
                    collected={store.isCollected(c.code)}
                    onCollect={() => collect(c.code)}
                    action={action(c)}
                    expired={isCouponExpired(c)}
                  />
                  <Show when={isCouponExpired(c) || c.audienceBlock}>
                    <p class="px-1 text-xs text-ink-gray">{isCouponExpired(c) ? `คูปองนี้${c.expiresLabel.replace("หมดอายุ", "หมดอายุเมื่อ")}` : c.audienceBlock}</p>
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </AccountPanel>
    </AccountShell>
  );
}
