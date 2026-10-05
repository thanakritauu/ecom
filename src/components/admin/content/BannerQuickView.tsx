import { Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { ImageIcon } from "~/components/admin/icons";
import { formatMarketingDate } from "~/lib/adminMarketing";
import { resolveHomepageDestinationHref } from "~/lib/adminHomepage";
import { useAdminDestinationLookups } from "~/lib/adminDestinationLookups";
import { BANNER_STATUS_META, BANNER_PLACEMENT_META, getBannerDevices, type Banner } from "~/lib/adminBanners";

const DEVICE_LABEL: Record<"desktop" | "tablet" | "mobile", string> = { desktop: "Desktop", tablet: "Tablet", mobile: "Mobile" };

/** §6 — Banner Quick View: the same reused `QuickViewDrawer` pattern `PromotionPageQuickView` already established, no new drawer shape. */
export function BannerQuickView(props: { banner: Banner }) {
  const b = () => props.banner;
  const lookups = useAdminDestinationLookups();

  const destinationHref = () => resolveHomepageDestinationHref(b().destination, lookups);

  const devices = () => getBannerDevices(b());

  return (
    <div class="flex flex-col gap-5">
      <div class="aspect-[3/1] w-full overflow-hidden rounded-card bg-surface-gray/60">
        <Show when={b().banners.desktop} fallback={<div class="flex size-full items-center justify-center text-ink-placeholder"><ImageIcon class="size-8" /></div>}>
          <img src={b().banners.desktop} alt="" class="size-full object-cover" />
        </Show>
      </div>

      <div>
        <p class="text-base font-semibold text-ink">{b().name}</p>
        <p class="text-sm text-ink-gray">{BANNER_PLACEMENT_META[b().placement].label}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={BANNER_STATUS_META[b().status].tone}>{BANNER_STATUS_META[b().status].label}</StatusBadge>
      </div>

      <div class="flex flex-col gap-1.5 rounded-card bg-surface-gray/60 p-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">Device</span>
          <span class="font-medium text-ink">{devices().length > 0 ? devices().map((d) => DEVICE_LABEL[d]).join(" / ") : "—"}</span>
        </div>
        <Show when={b().startDate && b().endDate}>
          <div class="flex items-center justify-between">
            <span class="text-ink-gray">เริ่ม</span>
            <span class="font-medium text-ink">{formatMarketingDate(b().startDate)} {b().startTime}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-ink-gray">สิ้นสุด</span>
            <span class="font-medium text-ink">{formatMarketingDate(b().endDate)} {b().endTime}</span>
          </div>
        </Show>
        <div class="flex items-center justify-between gap-3">
          <span class="text-ink-gray">Destination</span>
          <span class="truncate font-medium text-ink">{destinationHref() ?? "—"}</span>
        </div>
      </div>

      <div class="flex items-center justify-between text-xs text-ink-placeholder">
        <span>สร้างเมื่อ {b().createdAt}</span>
        <span>แก้ไขล่าสุด {b().updatedAt}</span>
      </div>
    </div>
  );
}
