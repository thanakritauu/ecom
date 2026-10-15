import { Navigate } from "@solidjs/router";
import { marketingHubListHref } from "~/lib/adminMarketing";

/** Coupons now live in the marketing hub's list ("จัดการโปรโมชั่น"), filtered to coupons. */
export default function AdminCouponListRedirect() {
  return <Navigate href={marketingHubListHref("coupons")} />;
}
