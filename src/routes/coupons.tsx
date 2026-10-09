import { createSignal, For, Show } from "solid-js";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { ChevronIcon } from "~/components/shared/ChevronIcon";
import { CouponSection } from "~/components/home/CouponSection";

const HOW_TO_STEPS = [
  { title: "เก็บคูปอง", body: 'กด "เก็บเลย" ที่คูปองที่ต้องการ หรือ "เก็บคูปองทั้งหมด"' },
  { title: "เลือกสินค้าลงตะกร้า", body: "ซื้อให้ถึงยอดขั้นต่ำที่ระบุบนคูปอง" },
  { title: "ใช้ที่หน้าชำระเงิน", body: 'กด "เลือกคูปอง" แล้วเลือกคูปอง หรือพิมพ์โค้ดส่วนลด ระบบจะหักส่วนลดให้ทันที' },
];

/**
 * คูปอง (nav menu "คูปอง", target type `coupon_page`): Home's purple and
 * yellow coupon section is the whole page, purple down to the Footer, so
 * the coupons lead. "วิธีใช้คูปอง" is a small box under them, open by default, folds on tap.
 */
export default function CouponsPage() {
  return (
    <>
      <Header />
      <main class="flex flex-col overflow-x-hidden">
        <CouponSection page after={<HowToBox />} />
      </main>
      <Footer />
    </>
  );
}

function HowToBox() {
  const [open, setOpen] = createSignal(true);
  return (
    <div class="mx-auto mt-2 w-full max-w-[560px] rounded-card border border-white/30 bg-white/15 text-white">
      <button
        type="button"
        aria-expanded={open()}
        aria-controls="coupon-how-to"
        onClick={() => setOpen((v) => !v)}
        class="flex min-h-11 w-full items-center justify-between gap-3 px-5 py-3 text-left text-base font-medium"
      >
        วิธีใช้คูปอง
        <ChevronIcon direction="down" class={`size-6 shrink-0 transition-transform duration-200 ${open() ? "rotate-180" : ""}`} />
      </button>
      <Show when={open()}>
        <ol id="coupon-how-to" class="flex flex-col gap-3 px-5 pb-5">
          <For each={HOW_TO_STEPS}>
            {(step, i) => (
              <li class="flex gap-3">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-pill bg-white text-sm font-semibold text-[#7650ff]">{i() + 1}</span>
                <div class="flex min-w-0 flex-col pt-0.5 leading-[1.75]">
                  <span class="text-sm font-semibold">{step.title}</span>
                  <span class="text-sm text-white/85">{step.body}</span>
                </div>
              </li>
            )}
          </For>
        </ol>
      </Show>
    </div>
  );
}
