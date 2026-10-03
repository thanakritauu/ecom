import { createSignal, Show } from "solid-js";
import { CloseXIcon, ImageIcon } from "./icons";

/**
 * A single square thumbnail/logo image slot — Category & Brand Management's
 * equivalent of `content/BannerUploader.tsx` (same native
 * `<input type="file" accept="image/*">` + Object URL convention, no mock
 * file picker), just square instead of a 16:7 banner crop, since a category
 * or brand thumbnail is a small square image, not a wide hero.
 */
export function SingleImageUploader(props: { label: string; hint?: string; value: string; onChange: (url: string) => void }) {
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
      <Show when={props.hint}>
        <p class="text-xs text-ink-gray">{props.hint}</p>
      </Show>

      <input ref={fileInputRef} type="file" accept="image/*" class="hidden" onChange={handleFileSelected} />

      <Show
        when={props.value}
        fallback={
          <button
            type="button"
            onClick={openPicker}
            class="flex size-24 flex-col items-center justify-center gap-1 rounded-media border border-dashed border-border text-ink-gray transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink"
          >
            <ImageIcon class="size-5" />
            <span class="text-xs">เพิ่มรูป</span>
          </button>
        }
      >
        <div class="group relative size-24 overflow-hidden rounded-media border border-border">
          <button type="button" onClick={openPicker} aria-label="เปลี่ยนรูปภาพ" class="block size-full">
            <img src={props.value} alt="" class="size-full object-cover" classList={{ "opacity-40": pending() }} />
          </button>
          <Show when={pending()}>
            <div class="absolute inset-0 flex items-center justify-center bg-ink/10" aria-hidden="true">
              <span class="loading loading-spinner loading-sm text-white" />
            </div>
          </Show>
          <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/60 py-1 text-center text-[10px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            เปลี่ยนรูป
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              remove();
            }}
            aria-label="ลบรูปภาพ"
            class="absolute right-1 top-1 flex size-6 items-center justify-center rounded-pill bg-ink/70 text-white"
          >
            <CloseXIcon class="size-2.5" />
          </button>
        </div>
      </Show>
    </div>
  );
}
