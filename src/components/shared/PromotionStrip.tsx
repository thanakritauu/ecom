import { createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import { useAuth } from "~/lib/auth";
import { UserIcon } from "./icons";
import deliveryIcon from "~/assets/icons/delivery.svg";
import { LanguageSwitcher } from "./LanguageSwitcher";
import promoBadge99 from "~/assets/images/promo/promo-strip-badge-99.png";

/**
 * CHARMISS CMS — ADMIN ONLY §3/§5 — the real purple "Promo strip" and pink
 * "Utility bar" from Header.tsx, extracted verbatim (same markup/classes/
 * assets/behavior) so Admin's Promotion Strip preview and Global Component
 * Preview can render the exact customer-facing component instead of a
 * look-alike. Header.tsx now imports these unchanged; both are self-
 * contained (own their own state/hooks) so they need zero props and behave
 * identically wherever mounted.
 */
export function PromoStrip() {
  // In-memory only, on purpose — must reappear on every fresh page load/
  // refresh (never persisted). See original comment history in Header.tsx.
  const [promoDismissed, setPromoDismissed] = createSignal(false);
  const dismissPromo = () => setPromoDismissed(true);

  return (
    <Show when={!promoDismissed()}>
      <div class="relative flex min-h-[40px] items-center justify-center bg-brand-purple px-4 py-2 text-white lg:h-10 lg:min-h-0 lg:py-0">
        <div class="flex min-w-0 max-w-full items-center gap-2 px-[60px] lg:px-10">
          <img src={promoBadge99} alt="" class="h-6 w-auto shrink-0" />
          <p class="min-w-0 truncate text-xs sm:text-sm">
            Charmiss MEGA SALE ลดสูงสุด 70% รับคูปองลดเพิ่ม 25%{" "}
            <a href="/promotions" class="font-bold underline">
              ช็อปเลย!
            </a>
          </p>
        </div>
        <button
          type="button"
          onClick={dismissPromo}
          aria-label="ปิดแบนเนอร์โปรโมชั่น"
          class="absolute right-4 top-1/2 flex min-h-11 min-w-11 shrink-0 -translate-y-1/2 items-center justify-center lg:min-h-0 lg:min-w-0 lg:size-6"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </Show>
  );
}

export function UtilityBar() {
  const auth = useAuth();
  return (
    <div class="hidden bg-surface-pink px-[150px] py-2 lg:flex lg:items-center lg:justify-between">
      <div class="flex items-center gap-2">
        <img src={deliveryIcon} alt="" class="size-6" />
        <p class="text-sm text-ink">จัดส่งฟรีทั่วประเทศ เมื่อซื้อครบ 990.- ของแท้จากเว็บไซต์อย่างเป็นทางการของ Charmiss</p>
      </div>
      <div class="flex items-center gap-6">
        <Show
          when={auth.isAuthenticated()}
          fallback={
            <button
              type="button"
              onClick={() => auth.openAuthModal()}
              class="flex items-center gap-1.5 whitespace-nowrap text-sm text-ink transition-colors duration-150 hover:text-brand-pink"
            >
              <UserIcon class="size-[18px] shrink-0" />
              เข้าสู่ระบบ / สมัครสมาชิก
            </button>
          }
        >
          <A href="/account" class="flex items-center gap-1.5 whitespace-nowrap text-sm text-ink transition-colors duration-150 hover:text-brand-pink">
            <UserIcon class="size-[18px] shrink-0" />
            {auth.user()?.name}
          </A>
        </Show>
        <LanguageSwitcher />
      </div>
    </div>
  );
}
