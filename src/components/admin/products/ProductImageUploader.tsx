import { createSignal, For, Show } from "solid-js";
import { ChevronIcon } from "~/components/shared/ChevronIcon";
import { CloseXIcon, ImageIcon, StarIcon } from "~/components/admin/icons";

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
 *
 * CMS + Frontend Final Refinement §8 — `maxImages` and `mainImage`/
 * `onSetMain` are both optional and additive: Variant Images (no `maxImages`,
 * no `mainImage`) keeps behaving exactly as before (uncapped, no pin
 * affordance); only the Product Gallery call site opts into a 10-image cap
 * and the "ตั้งเป็นรูปหลัก" (Set as Main Photo) pin.
 */
export function ProductImageUploader(props: {
  images: string[];
  onChange: (images: string[]) => void;
  /** Caps how many images a single "Add" action may bring in at once — replace (single-slot) is never capped by this. */
  maxImages?: number;
  /** The current Main Photo's URL, if the caller tracks one explicitly. */
  mainImage?: string;
  onSetMain?: (url: string) => void;
}) {
  const [pendingUrls, setPendingUrls] = createSignal<Set<string>>(new Set());
  const [replaceIndex, setReplaceIndex] = createSignal<number | null>(null);
  let fileInputRef: HTMLInputElement | undefined;

  const atLimit = () => props.maxImages !== undefined && props.images.length >= props.maxImages;

  const openAddPicker = () => {
    if (atLimit()) return;
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

    if (replaceIndex() !== null) {
      const url = URL.createObjectURL(files[0]);
      const oldUrl = props.images[replaceIndex()!];
      const next = [...props.images];
      next[replaceIndex()!] = url;
      props.onChange(next);
      if (oldUrl?.startsWith("blob:")) URL.revokeObjectURL(oldUrl);
      setPendingUrls((set) => new Set([...set, url]));
      settle(url);
      return;
    }

    // §8 — a single Add action never brings in more than the room left under `maxImages` (when set); this is a UI guard, not a silent truncation of already-saved images.
    const room = props.maxImages !== undefined ? Math.max(0, props.maxImages - props.images.length) : files.length;
    const accepted = files.slice(0, room);
    if (accepted.length === 0) return;
    const urls = accepted.map((file) => URL.createObjectURL(file));
    props.onChange([...props.images, ...urls]);
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
          {(src, i) => {
            const isMain = () => props.mainImage !== undefined && props.mainImage === src;
            return (
              <div class="group relative size-20 shrink-0 overflow-hidden rounded-media border sm:size-24" classList={{ "border-brand-pink": isMain(), "border-border": !isMain() }}>
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

                {/* §8 — Main Photo pin: a persistent "รูปหลัก" badge on whichever image is main, a one-click "ตั้งเป็นรูปหลัก" affordance on every other image (revealed on hover, same convention as "เปลี่ยนรูป"). Only rendered when the caller opted in via `mainImage`/`onSetMain` (Product Gallery) — Variant Images passes neither, so this block never renders there. */}
                <Show when={props.onSetMain}>
                  {(onSetMain) => (
                    <Show
                      when={isMain()}
                      fallback={
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetMain()(src);
                          }}
                          aria-label="ตั้งเป็นรูปหลัก"
                          class="absolute left-1 top-1 flex size-6 items-center justify-center rounded-pill bg-ink/70 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                        >
                          <StarIcon class="size-3" />
                        </button>
                      }
                    >
                      <span class="absolute left-1 top-1 flex items-center gap-1 rounded-pill bg-brand-pink px-2 py-0.5 text-[10px] font-semibold text-white">
                        <StarIcon class="size-3" filled /> รูปหลัก
                      </span>
                    </Show>
                  )}
                </Show>

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
                      <ChevronIcon direction="left" class="size-4" />
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
                      <ChevronIcon direction="right" class="size-4" />
                    </button>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>

        <button
          type="button"
          onClick={openAddPicker}
          disabled={atLimit()}
          class="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-media border border-dashed border-border text-ink-gray transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-ink-gray sm:size-24"
        >
          <ImageIcon class="size-5" />
          <span class="text-xs">เพิ่มรูป</span>
        </button>
      </div>

      <Show when={props.maxImages !== undefined}>
        <p class="text-xs text-ink-gray">
          {props.images.length}/{props.maxImages} รูป — เพิ่มได้ครั้งละสูงสุด {props.maxImages} รูป
        </p>
      </Show>
    </div>
  );
}
