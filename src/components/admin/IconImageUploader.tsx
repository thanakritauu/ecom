import { createSignal, Show } from "solid-js";
import { CloseXIcon, PlusIcon, WarningTriangleIcon } from "./icons";
import { NavIcon } from "~/components/shared/NavIcon";
import { isImageIconSrc } from "~/lib/promotionNavIcons";

const RECOMMENDED_SIZE = 64;
const RATIO_TOLERANCE = 0.05;

/**
 * CMS Dashboard & Admin UX Refinement §10-12/§17 — the one reusable "upload
 * a small square icon" control, used by both Navigation Icon and
 * Notification Icon. Native `<input type="file" accept="image/*">` (never a
 * fake file browser), 1:1 + ≥64×64px client-side validation shown as a
 * dismissable warning (not a hard block — this is a prototype, no real
 * server-side resize exists), Replace (click the thumbnail again) and
 * Remove.
 *
 * Storefront sync — `value` may also be a preset artwork key ("glow",
 * "flashsale", ... from `PROMOTION_NAV_ICON_OPTIONS`) rather than an image
 * URL; the thumbnail renders through the same `NavIcon` the storefront uses,
 * never as a broken `<img src="glow">`, and Remove just clears the key.
 */
export function IconImageUploader(props: { value: string; onChange: (url: string) => void; disabled?: boolean }) {
  const [warning, setWarning] = createSignal<string>();
  let fileInputRef: HTMLInputElement | undefined;

  const openPicker = () => {
    fileInputRef!.value = "";
    fileInputRef!.click();
  };

  const validateDimensions = (url: string) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const ratio = w / h;
      const messages: string[] = [];
      if (Math.abs(ratio - 1) > RATIO_TOLERANCE) messages.push(`อัตราส่วนภาพคือ ${w}×${h}px ไม่ใช่ 1:1`);
      if (w < RECOMMENDED_SIZE || h < RECOMMENDED_SIZE) messages.push(`ขนาดภาพเล็กกว่าที่แนะนำ (${RECOMMENDED_SIZE}×${RECOMMENDED_SIZE}px)`);
      setWarning(messages.length > 0 ? messages.join(" · ") : undefined);
    };
    img.src = url;
  };

  const handleFileSelected = (e: Event) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    const oldUrl = props.value;
    const url = URL.createObjectURL(file);
    props.onChange(url);
    validateDimensions(url);
    if (oldUrl?.startsWith("blob:")) URL.revokeObjectURL(oldUrl);
  };

  const remove = () => {
    if (props.value?.startsWith("blob:")) URL.revokeObjectURL(props.value);
    props.onChange("");
    setWarning(undefined);
  };

  return (
    <div class="flex flex-col gap-2">
      <input ref={fileInputRef} type="file" accept="image/*" class="hidden" onChange={handleFileSelected} disabled={props.disabled} />

      <div class="flex items-center gap-3">
        <Show
          when={props.value}
          fallback={
            <button
              type="button"
              onClick={openPicker}
              disabled={props.disabled}
              class="flex size-16 flex-col items-center justify-center gap-1 rounded-media border border-dashed border-border text-ink-gray transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusIcon class="size-4" />
              <span class="text-[10px]">อัปโหลด</span>
            </button>
          }
        >
          <div class="group relative size-16 shrink-0 overflow-hidden rounded-media border border-border">
            <button type="button" onClick={openPicker} aria-label="เปลี่ยนไอคอน" disabled={props.disabled} class="flex size-full items-center justify-center">
              <Show when={isImageIconSrc(props.value)} fallback={<NavIcon icon={props.value} class="size-8" />}>
                <img src={props.value} alt="" class="size-full object-cover" />
              </Show>
            </button>
            <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/60 py-0.5 text-center text-[9px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              เปลี่ยน
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove();
              }}
              aria-label="ลบไอคอน"
              class="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-pill bg-ink/70 text-white"
            >
              <CloseXIcon class="size-2" />
            </button>
          </div>
        </Show>

        <div class="flex flex-col gap-1 text-xs text-ink-gray">
          <p>อัตราส่วน 1:1 — แนะนำ {RECOMMENDED_SIZE}×{RECOMMENDED_SIZE}px</p>
          <Show when={warning()}>
            <p class="flex items-center gap-1 text-system-yellow">
              <WarningTriangleIcon class="size-3.5 shrink-0" /> {warning()}
            </p>
          </Show>
        </div>
      </div>
    </div>
  );
}
