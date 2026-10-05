import { createSignal, Show } from "solid-js";
import { CloseXIcon, ImageIcon } from "~/components/admin/icons";
import { BANNER_DEVICE_SPECS, bannerSizeHint, type BannerDevice } from "~/lib/adminBanners";

/**
 * §9/§10/§11 — one Hero Banner *slot* (Desktop/Tablet/Mobile are three
 * independent instances of this, never sharing state). Same native-file-
 * browser + Object URL convention as `ProductImageUploader.tsx` — no mock
 * file picker, no fake server upload — just a single image instead of an
 * array, since a banner slot holds exactly one photo.
 */
/**
 * `device` (Storefront sync) — picks the storefront's own size hint and box
 * ratio for this slot (`BANNER_DEVICE_SPECS`: 3:1 / 4:3 / 3:4), so the slot
 * previews the crop exactly as `ResponsiveBanner` will show it. An explicit
 * `hint` still wins over the device default.
 */
export function BannerUploader(props: { label: string; hint?: string; device?: BannerDevice; value: string; onChange: (url: string) => void }) {
  const aspectClass = () => BANNER_DEVICE_SPECS[props.device ?? "desktop"].aspectClass;
  const hint = () => props.hint ?? (props.device ? bannerSizeHint(props.device) : undefined);
  const [pending, setPending] = createSignal(false);
  let fileInputRef: HTMLInputElement | undefined;

  const openPicker = () => {
    fileInputRef!.value = "";
    fileInputRef!.click();
  };

  const handleFileSelected = (e: Event) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    const oldUrl = props.value;
    const url = URL.createObjectURL(file);
    props.onChange(url);
    setPending(true);
    setTimeout(() => {
      setPending(false);
      if (oldUrl?.startsWith("blob:")) URL.revokeObjectURL(oldUrl);
    }, 600);
  };

  const remove = () => {
    if (props.value?.startsWith("blob:")) URL.revokeObjectURL(props.value);
    props.onChange("");
  };

  return (
    <div class="flex flex-col gap-2">
      <p class="text-sm font-medium text-ink">{props.label}</p>
      <Show when={hint()}>
        <p class="text-xs text-ink-gray">{hint()}</p>
      </Show>

      <input ref={fileInputRef} type="file" accept="image/*" class="hidden" onChange={handleFileSelected} />

      <Show
        when={props.value}
        fallback={
          <button
            type="button"
            onClick={openPicker}
            class={`flex ${aspectClass()} w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border text-ink-gray transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink`}
          >
            <ImageIcon class="size-6" />
            <span class="text-sm font-medium">ยังไม่มี Banner</span>
            <span class="px-2 text-center text-xs">อัปโหลด Banner เพื่อใช้เป็น Hero Image</span>
          </button>
        }
      >
        <div class={`group relative ${aspectClass()} w-full overflow-hidden rounded-card border border-border`}>
          <button type="button" onClick={openPicker} aria-label="เปลี่ยน Banner" class="block size-full">
            <img src={props.value} alt="" class="size-full object-cover" classList={{ "opacity-40": pending() }} />
          </button>
          <Show when={pending()}>
            <div class="absolute inset-0 flex items-center justify-center bg-ink/10" aria-hidden="true">
              <span class="loading loading-spinner loading-sm text-white" />
            </div>
          </Show>
          <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/60 py-1.5 text-center text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            เปลี่ยน Banner
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              remove();
            }}
            aria-label="ลบ Banner"
            class="absolute right-2 top-2 flex size-7 items-center justify-center rounded-pill bg-ink/70 text-white"
          >
            <CloseXIcon class="size-3" />
          </button>
        </div>
      </Show>
    </div>
  );
}
