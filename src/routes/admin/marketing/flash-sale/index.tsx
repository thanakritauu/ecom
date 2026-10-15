import { Navigate } from "@solidjs/router";
import { marketingHubListHref } from "~/lib/adminMarketing";

/** Flash sale campaigns are listed in the marketing hub's จัดการโปรโมชั่น, filtered to แฟลชเซล. */
export default function AdminFlashSaleListRedirect() {
  return <Navigate href={marketingHubListHref("flash_sale")} />;
}
