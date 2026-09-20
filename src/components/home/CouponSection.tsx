import { createSignal, For } from "solid-js";
import { Container } from "../shared/Container";
import { Button } from "../shared/Button";
import { CouponCard, type Coupon } from "../shared/CouponCard";
import { pushToast } from "~/lib/toast";
import glowEllipse from "~/assets/icons/coupon-glow-ellipse.svg";

const coupons: Coupon[] = Array.from({ length: 6 }).map((_, i) => ({
  id: `coupon-${i + 1}`,
  amountLabel: "ลด ฿100.00",
  minSpendLabel: "ขั้นต่ำ ฿2,000",
  expiryLabel: "หมดอายุ 11 ก.ย.",
}));

async function simulateCollect() {
  await new Promise((resolve) => setTimeout(resolve, 350 + Math.random() * 250));
  if (Math.random() < 0.05) throw new Error("COLLECT_FAILED");
}

export function CouponSection() {
  const [collected, setCollected] = createSignal<Set<string>>(new Set());

  const collectOne = async (id: string) => {
    await simulateCollect();
    setCollected((prev) => new Set(prev).add(id));
    pushToast("เก็บคูปองสำเร็จ");
  };

  const collectAll = async () => {
    const remaining = coupons.filter((c) => !collected().has(c.id));
    await Promise.allSettled(remaining.map((c) => collectOne(c.id)));
  };

  return (
    <section
      aria-labelledby="coupon-heading"
      class="relative overflow-hidden rounded-t-[40px] bg-brand-purple py-16 lg:py-20"
    >
      <img
        src={glowEllipse}
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute left-1/2 top-[-45%] w-[160%] max-w-none -translate-x-1/2 opacity-70"
      />
      <Container width="wide" class="relative flex flex-col items-center gap-6">
        <div class="flex flex-col items-center gap-1 text-center">
          <h2 id="coupon-heading" class="text-3xl font-bold text-white lg:text-[40px]">
            คูปองส่วนลด
          </h2>
          <p class="text-2xl font-bold text-white lg:text-3xl">ลดทั้งเว็บ!</p>
        </div>

        <div class="scroll-rail w-full md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
          <For each={coupons}>
            {(coupon) => (
              <div class="w-[85%] max-w-[369px] shrink-0 rounded-2xl bg-white shadow-card md:w-auto md:max-w-none">
                <CouponCard
                  coupon={coupon}
                  collected={collected().has(coupon.id)}
                  onCollect={() => collectOne(coupon.id)}
                />
              </div>
            )}
          </For>
        </div>

        <Button variant="white" size="lg" class="w-full" onClick={collectAll}>
          เก็บคูปองทั้งหมด
        </Button>
      </Container>
    </section>
  );
}
