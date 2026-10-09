/**
 * Storefront banner standard (`ResponsiveBanner.tsx`'s `BANNER_ASPECT_CLASS`)
 * — three real crops, each shown whole in a box of its own ratio. Every
 * Admin banner upload slot/preview reads its hint + aspect from here so the
 * sizes Admin asks for are the sizes the storefront actually renders.
 */
export type BannerDevice = "desktop" | "tablet" | "mobile";

export const BANNER_DEVICE_SPECS: Record<BannerDevice, { label: string; size: string; ratio: string; aspectClass: string }> = {
  desktop: { label: "เดสก์ท็อป", size: "1920x640px", ratio: "3:1", aspectClass: "aspect-[3/1]" },
  tablet: { label: "แท็บเล็ต", size: "1024x768px", ratio: "4:3", aspectClass: "aspect-[4/3]" },
  mobile: { label: "มือถือ", size: "750x1000px", ratio: "3:4", aspectClass: "aspect-[3/4]" },
};

export function bannerSizeHint(device: BannerDevice): string {
  return `แนะนำ ${BANNER_DEVICE_SPECS[device].size} (${BANNER_DEVICE_SPECS[device].ratio})`;
}
