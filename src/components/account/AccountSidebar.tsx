import { A, useNavigate } from "@solidjs/router";
import { HeartIcon, UserIcon } from "../shared/icons";
import { useAuth } from "~/lib/auth";
import { useWishlist } from "~/lib/wishlist";
import { pushToast } from "~/lib/toast";
import { MOCK_ADDRESSES } from "~/lib/checkoutData";
import { MOCK_ORDERS } from "~/lib/accountData";

/**
 * Shared Account Navigation — every entry routes to a real path (no
 * `href="#"`), matching PART 14's ACTIVE/OUT_OF_SCOPE/ACTION status per item.
 * Only "ประวัติคำสั่งซื้อ" is ACTIVE (this page's own content, see
 * routes/account.tsx) since Figma node 159:20695 only shows this one section
 * built out — the rest point at real routes that fall through to the
 * existing catch-all's OutOfScopePage until their own Figma is provided.
 */
export function AccountSidebar() {
  const auth = useAuth();
  const wishlist = useWishlist();
  const navigate = useNavigate();

  const itemClass =
    "flex min-h-[44px] w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition-colors duration-150";

  const logout = () => {
    auth.logout(); // synchronous — Auth State is already cleared (and Header/this page already reactively guest) before the lines below run
    navigate("/account");
    pushToast("ออกจากระบบสำเร็จ", "success", "แล้วพบกันใหม่นะ 👋");
  };

  return (
    <nav aria-label="เมนูบัญชีของฉัน" class="flex w-full shrink-0 flex-col gap-1 rounded-card bg-white p-4 shadow-card lg:w-[264px]">
      <A href="/account" end class={itemClass} activeClass="bg-surface-pink text-brand-pink" inactiveClass="text-ink hover:bg-surface-gray">
        <DocumentIcon class="size-4 shrink-0" />
        <span class="flex-1 text-left">ประวัติคำสั่งซื้อ</span>
        <CountBadge count={MOCK_ORDERS.length} active />
      </A>

      <A href="/account/address" class={itemClass} activeClass="bg-surface-pink text-brand-pink" inactiveClass="text-ink hover:bg-surface-gray">
        <LocationIcon class="size-4 shrink-0" />
        <span class="flex-1 text-left">ที่อยู่จัดส่ง</span>
        <CountBadge count={MOCK_ADDRESSES.length} />
      </A>

      <A href="/wishlist" class={itemClass} activeClass="bg-surface-pink text-brand-pink" inactiveClass="text-ink hover:bg-surface-gray">
        <HeartIcon class="size-4 shrink-0" />
        <span class="flex-1 text-left">รายการโปรด</span>
        <CountBadge count={wishlist.count()} />
      </A>

      <A href="/account/points" class={itemClass} activeClass="bg-surface-pink text-brand-pink" inactiveClass="text-ink hover:bg-surface-gray">
        <PointsIcon class="size-4 shrink-0" />
        <span class="flex-1 text-left">คะแนนสะสม</span>
      </A>

      <A href="/account/profile" class={itemClass} activeClass="bg-surface-pink text-brand-pink" inactiveClass="text-ink hover:bg-surface-gray">
        <UserIcon class="size-4 shrink-0" />
        <span class="flex-1 text-left">ข้อมูลส่วนตัว</span>
      </A>

      <div class="my-1 h-px w-full bg-surface-gray" aria-hidden="true" />

      <button type="button" onClick={logout} class={`${itemClass} text-danger-strong hover:bg-danger-soft`}>
        <LogoutIcon class="size-4 shrink-0" />
        <span class="flex-1 text-left">ออกจากระบบ</span>
      </button>
    </nav>
  );
}

function CountBadge(props: { count: number; active?: boolean }) {
  return (
    <span
      class="flex size-6 shrink-0 items-center justify-center rounded-pill text-sm font-semibold"
      classList={{
        "bg-brand-pink text-white": props.active,
        "bg-surface-gray text-ink-gray": !props.active,
      }}
    >
      {props.count}
    </span>
  );
}

function DocumentIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M6 2.5h9l4.5 4.5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1Z" stroke-linejoin="round" />
      <path d="M14.5 2.5V7a1 1 0 0 0 1 1h4.5" stroke-linejoin="round" />
      <path d="M8 13h8M8 17h5" stroke-linecap="round" />
    </svg>
  );
}

function LocationIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M12 21.5s-7-6.1-7-11.8a7 7 0 0 1 14 0c0 5.7-7 11.8-7 11.8Z" stroke-linejoin="round" />
      <circle cx="12" cy="9.7" r="2.4" />
    </svg>
  );
}

function PointsIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path
        d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3 1.1-6.5-4.7-4.6 6.5-.9L12 2.5Z"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </svg>
  );
}

function LogoutIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M16 16.5 21 12l-5-4.5M21 12H9" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}
