import { createSignal, For, Show, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Container } from "../shared/Container";
import { EmptyState } from "../shared/EmptyState";
import { TagIcon } from "../shared/icons";
import { Button } from "../shared/Button";
import { CouponCard, couponTicket } from "../shared/CouponCard";
import { pushToast } from "~/lib/toast";
import { useStorefrontPromotions } from "~/lib/storefrontPromotions";
import glowEllipse from "~/assets/icons/coupon-glow-ellipse.svg";
import blurShape from "~/assets/images/coupon/blur-shape.png";
import ticketDeco1 from "~/assets/images/coupon/coupon-ticket-deco-1.svg";
import ticketDeco2 from "~/assets/images/coupon/coupon-ticket-deco-2.svg";
import ticketDeco3 from "~/assets/images/coupon/coupon-ticket-deco-3.svg";

async function simulateCollect() {
  await new Promise((resolve) => setTimeout(resolve, 350 + Math.random() * 250));
  if (Math.random() < 0.05) throw new Error("COLLECT_FAILED");
}

/**
 * `page` = the /coupons page (nav menu "คูปอง"): same purple and yellow artwork,
 * but every live coupon (the ones on Home and the ones offered at Checkout),
 * an h1, a wrapping grid instead of the sideways rail, and an empty state
 * instead of hiding the section.
 */
export function CouponSection(props: { page?: boolean; /** Home heading override from the page's section settings; empty = "คูปองส่วนลด". */ title?: string; /** Extra content under the coupons, on the purple (the page's "วิธีใช้คูปอง" box). */ after?: JSX.Element }) {
  /** Home: the coupons Admin shows on Home (switched on, inside their dates), one ticket per code, the same ticket Checkout's picker uses. */
  const { homeCoupons, checkoutCoupons } = useStorefrontPromotions();
  const coupons = () => {
    if (!props.page) return homeCoupons().map(couponTicket);
    const byCode = new Map([...homeCoupons(), ...checkoutCoupons()].map((c) => [c.code, c] as const));
    return [...byCode.values()].map(couponTicket);
  };
  const [collected, setCollected] = createSignal<Set<string>>(new Set());

  const collect = async (id: string) => {
    await simulateCollect();
    setCollected((prev) => new Set(prev).add(id));
  };

  const collectOne = async (id: string) => {
    await collect(id);
    pushToast("เก็บคูปองสำเร็จ");
  };

  // One toast for the whole batch, never one per coupon.
  const collectAll = async () => {
    const remaining = coupons().filter((c) => !collected().has(c.id));
    const results = await Promise.allSettled(remaining.map((c) => collect(c.id)));
    if (results.every((r) => r.status === "fulfilled")) pushToast("เก็บคูปองทั้งหมดสำเร็จ");
    else pushToast("เก็บคูปองบางใบไม่สำเร็จ ลองอีกครั้ง", "error");
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
    <Show when={props.page || coupons().length > 0}>
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
          <div class="relative mb-9 flex flex-col items-center text-center sm:mb-[52px] lg:mb-[75px]">
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
            {/* Phone/tablet rail gets vertical room so the ticket shadows aren't clipped by its overflow; the three tickets sit in one row from lg. */}
            <Show
              when={coupons().length > 0}
              fallback={
                <div class="rounded-card bg-white p-6">
                  <EmptyState size="compact" icon={TagIcon} title="ยังไม่มีคูปองในตอนนี้" description="คูปองใหม่จะขึ้นที่หน้านี้ แวะมาดูอีกครั้งนะ" />
                </div>
              }
            >
              <Show
                when={props.page}
                fallback={
                  <div class="scroll-rail -mb-4 -mt-2 pb-4 !pr-0 pt-2 xl:mx-0 xl:w-full xl:grid xl:grid-cols-3 xl:overflow-visible xl:m-0 xl:!p-0">
                    <For each={coupons()}>
                      {(coupon) => (
                        // Sideways rail until xl: three across only once each ticket gets its full ~350px (narrower squeezes the button).
                        <div class="w-[88%] min-w-[330px] max-w-[369px] shrink-0 xl:w-auto xl:min-w-0 xl:max-w-none">
                          <CouponCard coupon={coupon} collected={collected().has(coupon.id)} onCollect={() => collectOne(coupon.id)} />
                        </div>
                      )}
                    </For>
                  </div>
                }
              >
                {/* Page: every coupon visible at once; as many columns as fit with each ticket at least 330px wide (1 on phones, up to 3). */}
                <div class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,330px),1fr))] gap-x-4 gap-y-6">
                  <For each={coupons()}>
                    {(coupon) => <CouponCard coupon={coupon} collected={collected().has(coupon.id)} onCollect={() => collectOne(coupon.id)} />}
                  </For>
                </div>
              </Show>

              <Button variant="white" class="w-full !px-8 !py-2 !text-lg !font-medium !leading-[normal] sm:!text-xl sm:!leading-[normal]" onClick={collectAll}>
                เก็บคูปองทั้งหมด
              </Button>
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
