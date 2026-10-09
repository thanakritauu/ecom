import { MediaUploader } from "~/components/admin/MediaUploader";
import { BANNER_DEVICE_SPECS, bannerSizeHint, type BannerDevice } from "~/lib/adminBanners";
import type { MediaValue } from "~/lib/media";

/**
 * §9/§10/§11 — one banner *slot* (Desktop/Tablet/Mobile are three
 * independent instances of this, never sharing state). A thin wrapper over
 * the shared `MediaUploader` that adds the storefront banner standard:
 * `device` picks the size hint and box ratio (`BANNER_DEVICE_SPECS`: 3:1 /
 * 4:3 / 3:4) so the slot previews the crop exactly as `ResponsiveBanner`
 * shows it. An explicit `hint` still wins over the device default.
 *
 * Image-only by default (plain string in/out, as before). Pass `allowVideo`
 * to let this slot also take an MP4 video; the value is then a `MediaValue`.
 */
type BannerUploaderBase = { label: string; hint?: string; device?: BannerDevice };
type ImageOnlyProps = BannerUploaderBase & { allowVideo?: false; value: string; onChange: (url: string) => void };
type MediaProps = BannerUploaderBase & { allowVideo: true; value: MediaValue; onChange: (value: MediaValue) => void };

export function BannerUploader(props: ImageOnlyProps | MediaProps) {
  const device = () => props.device ?? "desktop";
  const hint = () => props.hint ?? (props.device ? bannerSizeHint(props.device) : undefined);
  return (
    <MediaUploader
      label={props.label}
      hint={hint()}
      value={props.value}
      onChange={(v) => (props.onChange as (value: MediaValue) => void)(v)}
      allowVideo={!!props.allowVideo}
      aspectClass={BANNER_DEVICE_SPECS[device()].aspectClass}
      emptyLabel={props.allowVideo ? "เลือกรูปหรือวิดีโอแบนเนอร์" : "เลือกรูปแบนเนอร์"}
      posterAspectClass={BANNER_DEVICE_SPECS[device()].aspectClass}
    />
  );
}
