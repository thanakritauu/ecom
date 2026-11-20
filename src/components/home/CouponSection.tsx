import { createEffect, createSignal, For, on, Show, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Container } from "../shared/Container";
import { EmptyState } from "../shared/EmptyState";
import { TagIcon } from "../shared/icons";
import { Button } from "../shared/Button";
import { CouponCard, couponTicket, type Coupon as TicketCoupon } from "../shared/CouponCard";
import { pushToast } from "~/lib/toast";
import { useStorefrontPromotions } from "~/lib/storefrontPromotions";
import { useAuth } from "~/lib/auth";
import { A, useNavigate } from "@solidjs/router";
import { couponStamp, isShippingCoupon, type Coupon as StoreCoupon } from "~/lib/cartSelectors";
import { ChevronIcon } from "../shared/ChevronIcon";
import { useCollectedCoupons } from "~/lib/collectedCoupons";
import glowEllipse from "~/assets/icons/coupon-glow-ellipse.svg";
import blurShape from "~/assets/images/coupon/blur-shape.png";
import ticketDeco1 from "~/assets/images/coupon/coupon-ticket-deco-1.svg";
import ticketDeco2 from "~/assets/images/coupon/coupon-ticket-deco-2.svg";
import ticketDeco3 from "~/assets/images/coupon/coupon-ticket-deco-3.svg";

async function simulateCollect() {
  await new Promise((resolve) => setTimeout(resolve, 350 + Math.random() * 250));
  if (Math.random() < 0.05) throw new Error("COLLECT_FAILED");
}

/** /coupons sections, one per กลุ่มลูกค้า (by the ticket's group tag, `couponAudienceTag`). */
const GROUPS = [
  { tag: "ทุกคน", title: "สำหรับทุกคน" },
  { tag: "ลูกค้าใหม่", title: "สำหรับลูกค้าใหม่" },
  { tag: "เคยสั่งซื้อ", title: "สำหรับลูกค้าที่เคยสั่งซื้อแล้ว" },
  { tag: "สมาชิก", title: "สำหรับสมาชิก Charmiss Club" },
] as const;

/** A section's "เก็บทั้งหมด (n)": plain white underlined text beside the group title. */
const GROUP_COLLECT_TEXT =
  "-my-2 -mr-1 flex min-h-11 shrink-0 items-center px-1 text-base font-medium text-white underline decoration-white/60 underline-offset-4 transition-opacity lg:hover:decoration-white disabled:cursor-wait disabled:opacity-70";

type Filter = "all" | "discount" | "shipping";
const FILTERS: { key: Filter; label: string; empty: string }[] = [
  { key: "all", label: "ทั้งหมด", empty: "ยังไม่มีคูปองในตอนนี้" },
  { key: "discount", label: "คูปองส่วนลด", empty: "ยังไม่มีคูปองส่วนลดในตอนนี้" },
  { key: "shipping", label: "คูปองส่งฟรี", empty: "ยังไม่มีคูปองส่งฟรีในตอนนี้" },
];

/**
 * Home: only the coupons this shopper can collect now (their own groups, uses left), a "เก็บคูปองทั้งหมด (n)"
 * button and "ดูคูปองทั้งหมด" to /coupons.
 * `page` = the /coupons page (nav menu "คูปอง"): same purple and yellow artwork, every live coupon (Home's and
 * Checkout's) with chips ทั้งหมด / โค้ดส่วนลด / คูปองส่งฟรี, one section per กลุ่มลูกค้า (the shopper's own first),
 * each with its own "เก็บทั้งหมด (n)", an h1, a wrapping grid instead of the sideways rail, and an empty state.
 */
export function CouponSection(props: { page?: boolean; /** Home heading override from the page's section settings; empty = "คูปองส่วนลด". */ title?: string; /** Extra content under the coupons, on the purple (the page's "วิธีใช้คูปอง" box). */ after?: JSX.Element }) {
  /** Live coupons Admin shows (switched on, inside their dates, every กลุ่มลูกค้า), one per code, the same ticket Checkout's picker uses. */
  const { homeCoupons, checkoutCoupons } = useStorefrontPromotions();
  const auth = useAuth();
  const navigate = useNavigate();
  const store = useCollectedCoupons();
  const all = () => {
    if (!props.page) return homeCoupons();
    const byCode = new Map([...homeCoupons(), ...checkoutCoupons()].map((c) => [c.code, c] as const));
    return [...byCode.values()];
  };
  const eligible = (code: string) => !all().find((c) => c.code === code)?.audienceBlock;
  /** Can be collected right now: this shopper's group, not collected yet, uses left. */
  const collectable = (list: StoreCoupon[]) => list.filter((c) => !store.isCollected(c.code) && !c.audienceBlock && !couponStamp(c));

  const [filter, setFilter] = createSignal<Filter>("all");
  const byFilter = (f: Filter) => all().filter((c) => f === "all" || (f === "shipping") === isShippingCoupon(c));
  /** Home: only what this shopper can use (other groups' and used-up ones are on /coupons). */
  const homeList = () => all().filter((c) => !c.audienceBlock && !couponStamp(c));
  const sectionsOf = (list: StoreCoupon[]) => {
    const secs = GROUPS.map((g) => ({ ...g, coupons: list.filter((c) => (c.audienceTag ?? "ทุกคน") === g.tag) })).filter((s) => s.coupons.length > 0);
    // Signed in: the groups with a coupon this shopper can use come first.
    if (!auth.isAuthenticated()) return secs;
    const mine = (s: (typeof secs)[number]) => s.coupons.some((c) => !c.audienceBlock);
    return [...secs.filter(mine), ...secs.filter((s) => !mine(s))];
  };
  const sections = () => sectionsOf(byFilter(filter()));
  /** What the big button collects: Home's list, or the page's current filter. */
  const bulkList = () => (props.page ? byFilter(filter()) : homeList());

  const collect = async (id: string) => {
    await simulateCollect();
    store.collect(id);
  };

  const collectOne = async (id: string) => {
    await collect(id);
    pushToast("เก็บคูปองสำเร็จ");
  };

  // One toast for the whole batch with the result, never one per coupon. Only this shopper's own groups' coupons are collected.
  const [busy, setBusy] = createSignal<string>();
  const collectMany = async (list: StoreCoupon[], key: string) => {
    const todo = collectable(list);
    const skipped = list.filter((c) => c.audienceBlock && !store.isCollected(c.code)).length;
    if (todo.length === 0) return pushToast("เก็บคูปองที่ใช้ได้ครบแล้ว");
    setBusy(key);
    const results = await Promise.allSettled(todo.map((c) => collect(c.code)));
    setBusy(undefined);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    if (ok === todo.length) pushToast(`เก็บคูปองแล้ว ${ok} ใบ`, "success", skipped > 0 ? `คูปองของกลุ่มอื่น ${skipped} ใบ เก็บไม่ได้` : undefined);
    else pushToast(`เก็บได้ ${ok} จาก ${todo.length} ใบ`, "error", "กดเก็บอีกครั้งเพื่อเก็บใบที่เหลือ");
  };

  // Not signed in: "เก็บ" / "เก็บทั้งหมด" open the sign-in popup and finish the collect once signed in.
  // `pending`: a code, "all" (the big button) or "group:<tag>" (a section's button).
  const [pending, setPending] = createSignal<string>();
  const signInToCollect = (what: string) => {
    setPending(what);
    auth.openAuthModal();
  };
  createEffect(
    on(auth.isAuthenticated, (signedIn) => {
      const what = pending();
      if (!signedIn || !what) return;
      setPending(undefined);
      if (what === "all") return void collectMany(bulkList(), "all");
      if (what.startsWith("group:")) return void collectMany(byFilter(filter()).filter((c) => `group:${c.audienceTag ?? "ทุกคน"}` === what), what);
      if (!eligible(what)) return pushToast("คูปองนี้ไม่ตรงกับกลุ่มลูกค้าของบัญชีคุณ", "error");
      if (!store.isCollected(what)) void collectOne(what).catch(() => pushToast("เก็บคูปองไม่สำเร็จ ลองอีกครั้ง", "error"));
    }),
  );
  // Closing the popup without signing in drops the pending collect.
  createEffect(on(auth.isAuthModalOpen, (open, wasOpen) => wasOpen && !open && !auth.isAuthenticated() && setPending(undefined), { defer: true }));

  /**
   * The ticket's button: "เก็บ" (a guest signs in first), "ใช้คูปอง" once collected (goes shopping), a grey
   * "เฉพาะ ..." pill for another group's coupon, or a stamp when no use is left.
   */
  const Ticket = (p: { coupon: TicketCoupon }) => {
    const source = () => all().find((c) => c.code === p.coupon.id);
    return (
      <CouponCard
        coupon={p.coupon}
        wide
        collected={store.isCollected(p.coupon.id)}
        onCollect={() => collectOne(p.coupon.id)}
        onUse={() => navigate("/products")}
        stamp={source() ? couponStamp(source()!) : undefined}
        action={
          !auth.isAuthenticated()
            ? { label: "เก็บ", variant: "primary", onClick: () => signInToCollect(p.coupon.id) }
            : !eligible(p.coupon.id)
              ? { label: `เฉพาะ${source()?.audienceOnly ?? ""}`, variant: "outline", disabled: true, onClick: () => {}, onlyFor: source()?.audienceOnly ?? "กลุ่มอื่น" }
              : undefined
        }
      />
    );
  };

  /*
   * Figma 124:6557, painted in the same order as the Figma layers: #7650ff +
   * 10% white base, the darker #7650ff ellipse whose lower edge curves under
   * the title, the title pair, two blurred yellow light shapes, the coupons,
   * six floating tickets (the four outer ones blurred), and a third light
   * shape on the right. Decoration offsets are measured from the 1440 frame's
   * centre (`calc(50% ± …px)`) so they stay put around the content at any
   * width (exact Figma values from xl). Below that each piece keeps its desktop artwork/size and is scaled
   * down from its top-centre (`Deco`) and moved closer to the centre, so the
   * tickets still frame the smaller title and the light shapes still glow
   * from the same corners on tablet and phone.
   */
  // Nothing to collect once every code has expired — drop the whole section rather than an empty ticket row.
  return (
    <Show when={props.page || homeList().length > 0}>
      <section
        aria-labelledby="coupon-heading"
        class="relative overflow-hidden bg-[#7650ff] pb-11 pt-10 [background-image:linear-gradient(rgba(255,255,255,0.1),rgba(255,255,255,0.1))] sm:pb-14 sm:pt-[52px] lg:pb-[72px] lg:pt-[65px]"
        classList={{ "rounded-t-3xl sm:rounded-t-[32px] lg:rounded-t-[40px]": !props.page }}
      >
        <img
          src={glowEllipse}
          alt=""
          aria-hidden="true"
          class="pointer-events-none absolute left-1/2 top-[-292px] h-[455px] w-[900px] max-w-none -translate-x-1/2 rotate-180 sm:top-[-241px] lg:top-[-928px] lg:h-[1206px] lg:w-[2388px]"
        />

        <Container width="wide" class="flex flex-col items-center gap-4">
          {/* /coupons: the coupons sit closer under the heading than on Home. */}
          <div
            class="relative flex flex-col items-center text-center"
            classList={{ "mb-9 sm:mb-[52px] lg:mb-[75px]": !props.page, "mb-4 sm:mb-6 lg:mb-8": !!props.page }}
          >
            <Dynamic component={props.page ? "h1" : "h2"} id="coupon-heading" class="text-4xl font-bold leading-[normal] text-white sm:text-[48px] lg:text-[62px]">
              {props.title || "คูปองส่วนลด"}
            </Dynamic>
            <p class="-mt-2 text-[31px] font-bold leading-[normal] text-white sm:-mt-[11px] sm:text-[41px] lg:-mt-[14px] lg:text-[53px]">ลดทั้งเว็บ!</p>
          </div>

          {/* Light shapes behind the coupons (Figma 124:6561, 124:6562) */}
          <Deco class="h-[852px] w-[1769px] left-[calc(50%-29px)] top-[-213px] scale-[0.45] sm:left-[calc(50%-42px)] sm:top-[-254px] sm:scale-[0.65] lg:left-[calc(50%-52px)] lg:top-[-465px] lg:scale-[0.85] xl:left-[calc(50%-64.47px)] xl:scale-100">
            <div class="flex size-full items-center justify-center">
              <div class="h-[1769px] w-[852px] shrink-0 -rotate-90">
                <img src={blurShape} alt="" class="size-full max-w-none object-cover" />
              </div>
            </div>
          </Deco>
          <Deco class="h-[325px] w-[333px] left-[calc(50%-180px)] top-[200px] scale-50 sm:left-[calc(50%-380px)] sm:scale-[0.65] lg:left-[calc(50%-560px)] lg:top-[250.62px] lg:scale-[0.85] xl:left-[calc(50%-743.42px)] xl:scale-100">
            <div class="flex size-full items-center justify-center">
              <div class="relative h-[283px] w-[183px] shrink-0 rotate-[-131.6deg] overflow-hidden">
                <img src={blurShape} alt="" class="absolute left-0 top-0 h-[347.16%] w-[258.12%] max-w-none" />
              </div>
            </div>
          </Deco>

          <div class="relative flex w-full flex-col gap-4 lg:max-w-[1140px]">
            <Show
              when={(props.page ? all() : homeList()).length > 0}
              fallback={
                <div class="rounded-card bg-white p-6">
                  <EmptyState size="compact" icon={TagIcon} title="ยังไม่มีคูปองในตอนนี้" description="คูปองใหม่จะขึ้นที่หน้านี้ แวะมาดูอีกครั้งนะ" />
                </div>
              }
            >
              <Show
                when={props.page}
                fallback={
                  // Phone/tablet rail gets vertical room so the ticket shadows aren't clipped by its overflow; two across from lg.
                  <div class="scroll-rail -mb-4 -mt-2 pb-4 !pr-0 pt-2 lg:m-0 lg:grid lg:w-full lg:grid-cols-2 lg:gap-x-4 lg:gap-y-6 lg:overflow-visible lg:!p-0">
                    <For each={homeList()}>
                      {(coupon) => (
                        // Sideways rail until lg, then a 2-across grid of the wider desktop ticket.
                        <div class="w-[88%] min-w-[330px] max-w-[369px] shrink-0 lg:w-auto lg:min-w-0 lg:max-w-none">
                          <Ticket coupon={couponTicket(coupon)} />
                        </div>
                      )}
                    </For>
                  </div>
                }
              >
                {/* Page: ทั้งหมด / โค้ดส่วนลด / คูปองส่งฟรี, each with its count. */}
                <div class="no-scrollbar -mx-4 flex justify-start gap-2 overflow-x-auto px-4 sm:mx-0 sm:justify-center sm:px-0" role="group" aria-label="ประเภทคูปอง">
                  <For each={FILTERS}>
                    {(f) => (
                      <button
                        type="button"
                        aria-pressed={filter() === f.key}
                        onClick={(e) => {
                          setFilter(f.key);
                          // Phones: the bigger chips scroll sideways; keep the picked one fully in view.
                          e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
                        }}
                        class="flex min-h-12 shrink-0 items-center rounded-pill border px-4 text-base font-medium transition-colors duration-150 sm:px-5 lg:min-h-[52px] lg:px-6 lg:text-lg"
                        classList={{
                          "border-white bg-white text-[#7650ff]": filter() === f.key,
                          "border-white/40 bg-white/15 text-white lg:hover:bg-white/25": filter() !== f.key,
                        }}
                      >
                        {f.label} ({byFilter(f.key).length})
                      </button>
                    )}
                  </For>
                </div>

                <Show
                  when={sections().length > 0}
                  fallback={
                    <div class="rounded-card bg-white p-6">
                      <EmptyState size="compact" icon={TagIcon} title={FILTERS.find((f) => f.key === filter())!.empty} description="คูปองใหม่จะขึ้นที่หน้านี้ แวะมาดูอีกครั้งนะ" />
                    </div>
                  }
                >
                  <div class="flex flex-col gap-10">
                    <For each={sections()}>
                      {(section) => {
                        const key = `group:${section.tag}`;
                        const left = () => collectable(section.coupons).length;
                        const mine = () => section.coupons.some((c) => !c.audienceBlock);
                        return (
                          <section class="flex flex-col gap-2" aria-labelledby={`coupon-group-${section.tag}`}>
                            {/* Group title + its own collect button (a guest signs in first; another group's has none, its tickets say "เฉพาะ ..."). */}
                            {/* Header row, 8px above its tickets; groups 40px apart. The text button keeps its 44px tap area without adding height (-my-2). */}
                            <div class="flex items-center justify-between gap-3">
                              <h2 id={`coupon-group-${section.tag}`} class="text-lg font-semibold text-white sm:text-xl">
                                {section.title}
                              </h2>
                              {/* Text, not a button: white, underlined, 44px tap area. */}
                              <Show when={!auth.isAuthenticated()}>
                                <button type="button" class={GROUP_COLLECT_TEXT} onClick={() => signInToCollect(key)}>
                                  เก็บทั้งหมด
                                </button>
                              </Show>
                              <Show when={auth.isAuthenticated() && mine()}>
                                <Show when={left() > 0} fallback={<span class="shrink-0 text-base text-white/80">เก็บครบแล้ว</span>}>
                                  <button type="button" class={GROUP_COLLECT_TEXT} disabled={busy() === key} onClick={() => collectMany(section.coupons, key)}>
                                    {busy() === key ? "กำลังเก็บ" : `เก็บทั้งหมด (${left()})`}
                                  </button>
                                </Show>
                              </Show>
                            </div>
                            {/* 1 column on phones, 2 across from md (the wider desktop ticket from lg). */}
                            <div class="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2">
                              <For each={section.coupons}>{(coupon) => <Ticket coupon={couponTicket(coupon)} />}</For>
                            </div>
                          </section>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </Show>

              {/* Signed in: how many are left to collect (none left = done); a guest signs in first. */}
              <Show
                when={auth.isAuthenticated()}
                fallback={
                  <Button variant="white" class="w-full !px-8 !py-2 !text-lg !font-medium !leading-[normal] sm:!text-xl sm:!leading-[normal]" onClick={() => signInToCollect("all")}>
                    เข้าสู่ระบบเพื่อเก็บทั้งหมด
                  </Button>
                }
              >
                <Button
                  variant="white"
                  class="w-full !px-8 !py-2 !text-lg !font-medium !leading-[normal] sm:!text-xl sm:!leading-[normal]"
                  loading={busy() === "all"}
                  disabled={collectable(bulkList()).length === 0}
                  onClick={() => collectMany(bulkList(), "all")}
                >
                  {collectable(bulkList()).length > 0 ? `เก็บคูปองทั้งหมด (${collectable(bulkList()).length})` : "เก็บคูปองครบแล้ว"}
                </Button>
              </Show>
              <Show when={!props.page}>
                <A href="/coupons" class="mx-auto flex min-h-11 items-center gap-1 text-base font-medium text-white underline-offset-4 lg:hover:underline">
                  ดูคูปองทั้งหมด
                  <ChevronIcon direction="right" class="size-6" />
                </A>
              </Show>
            </Show>
            {props.after}
          </div>

          {/* Floating tickets (Figma 124:6755 – 124:6809) + right light shape (124:6819).
            The two outer side tickets sit off-screen on phones, so they're only drawn from sm. */}
          <Deco class="h-[217px] w-[275.65px] left-[calc(50%-150px)] top-[-45px] scale-[0.4] sm:left-[calc(50%-273px)] sm:top-[-70px] sm:scale-[0.63] lg:left-[calc(50%-340px)] lg:top-[-115px] lg:scale-[0.8] xl:left-[calc(50%-423.3px)] xl:scale-100">
            <img src={ticketDeco1} alt="" class="size-full max-w-none blur-[8px]" />
          </Deco>
          <Deco class="h-[242px] w-[307.4px] left-[calc(50%+146px)] top-[-55px] scale-[0.4] sm:left-[calc(50%+302px)] sm:top-[-90px] sm:scale-[0.63] lg:left-[calc(50%+385px)] lg:top-[-141px] lg:scale-[0.8] xl:left-[calc(50%+481.7px)] xl:scale-100">
            <img src={ticketDeco1} alt="" class="size-full max-w-none -scale-y-100 rotate-180 blur-[8px]" />
          </Deco>
          <Deco class="hidden h-[151.52px] w-[191.76px] sm:block sm:left-[calc(50%-410px)] sm:top-[140px] sm:scale-[0.63] lg:left-[calc(50%-540px)] lg:top-[79.36px] lg:scale-[0.8] xl:left-[calc(50%-672.7px)] xl:scale-100">
            <div class="flex size-full items-center justify-center blur-[8px]">
              <img src={ticketDeco1} alt="" class="h-[150.04px] w-[190.6px] max-w-none shrink-0 rotate-[0.45deg]" />
            </div>
          </Deco>
          <Deco class="hidden h-[151.52px] w-[191.76px] sm:block sm:left-[calc(50%+410px)] sm:top-[140px] sm:scale-[0.63] lg:left-[calc(50%+540px)] lg:top-[79px] lg:scale-[0.8] xl:left-[calc(50%+649.9px)] xl:scale-100">
            <div class="flex size-full items-center justify-center blur-[8px]">
              <img src={ticketDeco1} alt="" class="h-[150.04px] w-[190.6px] max-w-none shrink-0 -scale-y-100 rotate-[179.55deg]" />
            </div>
          </Deco>
          <Deco class="h-[121px] w-[189px] left-[calc(50%-160px)] top-[72px] scale-[0.34] sm:left-[calc(50%-240px)] sm:top-[82px] sm:scale-[0.63] lg:left-[calc(50%-330px)] lg:top-[136px] lg:scale-[0.8] xl:left-[calc(50%-413.5px)] xl:scale-100">
            <img src={ticketDeco2} alt="" class="size-full max-w-none" />
          </Deco>
          <Deco class="h-[142.97px] w-[201.47px] left-[calc(50%+162px)] top-[64px] scale-[0.34] sm:left-[calc(50%+238px)] sm:top-[75px] sm:scale-[0.63] lg:left-[calc(50%+330px)] lg:top-[123px] lg:scale-[0.8] xl:left-[calc(50%+412.7px)] xl:scale-100">
            <div class="flex size-full items-center justify-center">
              <img src={ticketDeco3} alt="" class="h-[119.94px] w-[187.67px] max-w-none shrink-0 -scale-y-100 rotate-[-172.65deg]" />
            </div>
          </Deco>
          <Deco class="h-[551px] w-[572px] left-[calc(50%+180px)] top-[-10px] scale-50 sm:left-[calc(50%+380px)] sm:top-[-2px] sm:scale-[0.65] lg:left-[calc(50%+540px)] lg:top-[-2.64px] lg:scale-[0.85] xl:left-[calc(50%+723.18px)] xl:scale-100">
            <div class="flex size-full items-center justify-center">
              <div class="relative h-[446px] w-[404px] shrink-0 -scale-y-100 rotate-[-65.99deg] overflow-hidden">
                <img src={blurShape} alt="" class="absolute left-0 top-0 h-[188.42%] w-full max-w-none" />
              </div>
            </div>
          </Deco>
        </Container>
      </section>
    </Show>
  );
}

/** One decorative layer: a desktop-sized box positioned by its top-centre and scaled per breakpoint (pass size/position/scale classes). */
function Deco(props: { class: string; children: JSX.Element }) {
  return (
    <div aria-hidden="true" class={`pointer-events-none absolute origin-top -translate-x-1/2 ${props.class}`}>
      {props.children}
    </div>
  );
}
