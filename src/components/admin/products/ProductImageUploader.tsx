import { createSignal, For, Show } from "solid-js";
import { CloseXIcon, ImageIcon } from "~/components/admin/icons";

/**
 * Final UI & Regression Overrides #1 — every "add/upload/replace image"
 * action in Admin opens the User's real OS file browser (`<input
 * type="file" accept="image/*">`), never a mock library/modal. There is no
 * upload backend in this prototype, so a selected file becomes an Object
 * URL (`URL.createObjectURL`) instead of a server response — the UX
 * (Browse → Select → Preview → Save) reads the same as a real upload; only
 * the storage step underneath is swapped out. One component, reused as-is
 * for both Product Gallery and every Variant's own images, so both surfaces
 * behave identically by construction.
 */
export function ProductImageUploader(props: { images: string[]; onChange: (images: string[]) => void }) {
  const [pendingUrls, setPendingUrls] = createSignal<Set<string>>(new Set());
  const [replaceIndex, setReplaceIndex] = createSignal<number | null>(null);
  let fileInputRef: HTMLInputElement | undefined;

  const openAddPicker = () => {
    setReplaceIndex(null);
    fileInputRef!.value = "";
    fileInputRef!.click();
  };

  const openReplacePicker = (index: number) => {
    setReplaceIndex(index);
    fileInputRef!.value = "";
    fileInputRef!.click();
  };

  const settle = (url: string) => {
    // Brief "uploading" beat so this reads like a real upload completing,
    // not an instant local-only swap — matches the Browse → Select →
    // Preview → Upload/Save flow the spec calls for.
    setTimeout(() => {
      setPendingUrls((set) => {
        const next = new Set(set);
        next.delete(url);
        return next;
      });
    }, 600);
  };

  const handleFilesSelected = (e: Event) => {
    const files = Array.from((e.currentTarget as HTMLInputElement).files ?? []);
    if (files.length === 0) return;
    const urls = files.map((file) => URL.createObjectURL(file));

    if (replaceIndex() !== null) {
      const oldUrl = props.images[replaceIndex()!];
      const next = [...props.images];
      next[replaceIndex()!] = urls[0];
      props.onChange(next);
      if (oldUrl?.startsWith("blob:")) URL.revokeObjectURL(oldUrl);
    } else {
      props.onChange([...props.images, ...urls]);
    }

    setPendingUrls((set) => new Set([...set, ...urls]));
    urls.forEach(settle);
  };

  const removeAt = (index: number) => {
    const url = props.images[index];
    props.onChange(props.images.filter((_, i) => i !== index));
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...props.images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    props.onChange(next);
  };

  return (
    <div class="flex flex-col gap-3">
      {/* Hidden native file input — every Browse/Add/Replace action below
          just calls `.click()` on this one; the OS file browser is what
          actually opens. */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple={replaceIndex() === null} class="hidden" onChange={handleFilesSelected} />

      <div class="flex flex-wrap gap-3">
        <For each={props.images}>
          {(src, i) => (
            <div class="group relative size-20 shrink-0 overflow-hidden rounded-media border border-surface-gray sm:size-24">
              <button
                type="button"
                onClick={() => openReplacePicker(i())}
                aria-label="เปลี่ยนรูปภาพ"
                class="block size-full"
              >
                <img src={src} alt="" class="size-full object-cover" classList={{ "opacity-40": pendingUrls().has(src) }} />
              </button>
              <Show when={pendingUrls().has(src)}>
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
                  removeAt(i());
                }}
                aria-label="ลบรูปภาพ"
                class="absolute right-1 top-1 flex size-6 items-center justify-center rounded-pill bg-ink/70 text-white"
              >
                <CloseXIcon class="size-2.5" />
              </button>
              <div class="absolute bottom-1 left-1 flex gap-1">
                <Show when={i() > 0}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      move(i(), -1);
                    }}
                    aria-label="ย้ายไปทางซ้าย"
                    class="flex size-6 items-center justify-center rounded-pill bg-ink/70 text-xs text-white"
                  >
                    ‹
                  </button>
                </Show>
                <Show when={i() < props.images.length - 1}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      move(i(), 1);
                    }}
                    aria-label="ย้ายไปทางขวา"
                    class="flex size-6 items-center justify-center rounded-pill bg-ink/70 text-xs text-white"
                  >
                    ›
                  </button>
                </Show>
              </div>
            </div>
          )}
        </For>

        <button
          type="button"
          onClick={openAddPicker}
          class="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-media border border-dashed border-surface-gray text-ink-gray transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink sm:size-24"
        >
          <ImageIcon class="size-5" />
          <span class="text-xs">เพิ่มรูป</span>
        </button>
      </div>
    </div>
  );
}
