import { createSignal, For, Show } from "solid-js";
import { ChevronIcon } from "~/components/shared/ChevronIcon";
import { CloseXIcon, ImageIcon } from "~/components/admin/icons";
import { TextField } from "~/components/shared/TextField";
import {
  HERO_ASSET_TYPE_META,
  MAX_HERO_ASSETS,
  emptyHeroAsset,
  isValidYoutubeUrl,
  extractYoutubeVideoId,
  type HeroAsset,
  type HeroAssetType,
} from "~/lib/pageSections";
import { BANNER_DEVICE_SPECS } from "~/lib/adminBanners";

/** Which field of an image asset a file pick writes to — Desktop is `source`; Tablet/Mobile are the optional storefront crops (`HeroBanner.tsx` falls back to `source` when empty). */
type ImageSlot = "source" | "tabletSource" | "mobileSource";

/**
 * Hero Banner — Multi-Asset Support. Same native-file-browser + Object URL
 * convention as `ProductImageUploader.tsx`/`BannerUploader.tsx` (no mock
 * upload backend), generalized to a mixed list of up to `MAX_HERO_ASSETS`
 * image/video/YouTube items with add/remove/reorder — the multi-item pattern
 * `ProductImageUploader` already established, extended with a per-item type
 * instead of a flat `string[]`.
 *
 * Storefront sync — an image asset now also takes its own Tablet (1024×768,
 * 4:3) and Mobile (750×1000, 3:4) crops, the same three sizes the live hero
 * slides ship with; the thumbnail itself is the Desktop 3:1 crop.
 */
export function HeroAssetsEditor(props: { assets: HeroAsset[]; onChange: (assets: HeroAsset[]) => void }) {
  const [pendingUrls, setPendingUrls] = createSignal<Set<string>>(new Set());
  const [replaceIndex, setReplaceIndex] = createSignal<number | null>(null);
  const [replaceSlot, setReplaceSlot] = createSignal<ImageSlot>("source");
  let imageInputRef: HTMLInputElement | undefined;
  let videoInputRef: HTMLInputElement | undefined;

  const atLimit = () => props.assets.length >= MAX_HERO_ASSETS;

  const addAsset = (asset: HeroAsset) => {
    if (atLimit()) return;
    props.onChange([...props.assets, asset]);
  };

  const patchAt = (index: number, next: Partial<HeroAsset>) => {
    props.onChange(props.assets.map((a, i) => (i === index ? { ...a, ...next } : a)));
  };

  const removeAt = (index: number) => {
    const asset = props.assets[index];
    if (asset?.source?.startsWith("blob:")) URL.revokeObjectURL(asset.source);
    props.onChange(props.assets.filter((_, i) => i !== index));
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...props.assets];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    props.onChange(next);
  };

  const settle = (url: string) => {
    setTimeout(() => {
      setPendingUrls((set) => {
        const next = new Set(set);
        next.delete(url);
        return next;
      });
    }, 600);
  };

  const openFilePicker = (type: "image" | "video", index: number | null, slot: ImageSlot = "source") => {
    if (index === null && atLimit()) return;
    setReplaceIndex(index);
    setReplaceSlot(type === "image" ? slot : "source");
    const ref = type === "image" ? imageInputRef : videoInputRef;
    ref!.value = "";
    ref!.click();
  };

  const handleFileSelected = (type: "image" | "video") => (e: Event) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const index = replaceIndex();
    if (index !== null) {
      const slot = replaceSlot();
      const oldUrl = props.assets[index]?.[slot];
      patchAt(index, slot === "source" ? { type, source: url } : { [slot]: url });
      if (oldUrl?.startsWith("blob:")) URL.revokeObjectURL(oldUrl);
    } else {
      addAsset({ ...emptyHeroAsset(type), source: url });
    }
    setPendingUrls((set) => new Set([...set, url]));
    settle(url);
  };

  const addYoutube = () => addAsset(emptyHeroAsset("youtube"));

  const thumbClass =
    "group relative aspect-[3/1] w-60 shrink-0 overflow-hidden rounded-media border border-border bg-surface-gray/40 sm:w-72";

  return (
    <div class="flex flex-col gap-3">
      <input ref={imageInputRef} type="file" accept="image/*" class="hidden" onChange={handleFileSelected("image")} />
      <input ref={videoInputRef} type="file" accept="video/*" class="hidden" onChange={handleFileSelected("video")} />

      <div class="flex flex-wrap gap-3">
        <For each={props.assets}>
          {(asset, i) => {
            const youtubeId = () => (asset.type === "youtube" ? extractYoutubeVideoId(asset.source) : null);
            const youtubeError = () => asset.type === "youtube" && asset.source.trim() !== "" && !youtubeId();
            return (
              <div class="flex flex-col gap-1.5">
                <div class={thumbClass}>
                  <span class="absolute left-1.5 top-1.5 z-10 rounded-pill bg-ink/70 px-2 py-0.5 text-[10px] font-medium text-white">
                    {i() + 1}/{MAX_HERO_ASSETS} · {HERO_ASSET_TYPE_META[asset.type].label}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAt(i());
                    }}
                    aria-label="ลบ Asset"
                    class="absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-pill bg-ink/70 text-white"
                  >
                    <CloseXIcon class="size-2.5" />
                  </button>

                  <Show when={asset.type === "image"}>
                    <Show
                      when={asset.source}
                      fallback={
                        <button type="button" onClick={() => openFilePicker("image", i())} class="flex size-full flex-col items-center justify-center gap-1 text-ink-gray hover:text-brand-pink">
                          <ImageIcon class="size-5" />
                          <span class="text-xs">เลือกรูปภาพ</span>
                        </button>
                      }
                    >
                      <button type="button" onClick={() => openFilePicker("image", i())} aria-label="เปลี่ยนรูปภาพ" class="block size-full">
                        <img src={asset.source} alt="" class="size-full object-cover" classList={{ "opacity-40": pendingUrls().has(asset.source) }} />
                      </button>
                    </Show>
                  </Show>

                  <Show when={asset.type === "video"}>
                    <Show
                      when={asset.source}
                      fallback={
                        <button type="button" onClick={() => openFilePicker("video", i())} class="flex size-full flex-col items-center justify-center gap-1 text-ink-gray hover:text-brand-pink">
                          <span class="text-lg leading-none">▶</span>
                          <span class="text-xs">เลือกวิดีโอ</span>
                        </button>
                      }
                    >
                      <button type="button" onClick={() => openFilePicker("video", i())} aria-label="เปลี่ยนวิดีโอ" class="relative block size-full">
                        <video src={asset.source} class="size-full object-cover" classList={{ "opacity-40": pendingUrls().has(asset.source) }} muted />
                        <span class="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl text-white drop-shadow">▶</span>
                      </button>
                    </Show>
                  </Show>

                  <Show when={asset.type === "youtube"}>
                    <Show
                      when={youtubeId()}
                      fallback={
                        <div class="flex size-full flex-col items-center justify-center gap-1 px-2 text-center text-ink-gray">
                          <span class="text-lg leading-none">▶</span>
                          <span class="text-xs">วางลิงก์ YouTube ด้านล่าง</span>
                        </div>
                      }
                    >
                      {(id) => (
                        <img src={`https://img.youtube.com/vi/${id()}/mqdefault.jpg`} alt="" class="size-full object-cover" />
                      )}
                    </Show>
                  </Show>

                  <Show when={pendingUrls().has(asset.source)}>
                    <div class="absolute inset-0 flex items-center justify-center bg-ink/10" aria-hidden="true">
                      <span class="loading loading-spinner loading-sm text-white" />
                    </div>
                  </Show>

                  <div class="absolute bottom-1 left-1 z-10 flex gap-1">
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
                    <Show when={i() < props.assets.length - 1}>
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

                <Show when={asset.type === "youtube"}>
                  <TextField
                    label="ลิงก์ YouTube"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={asset.source}
                    onInput={(e) => patchAt(i(), { source: e.currentTarget.value })}
                    error={youtubeError() ? "ลิงก์ YouTube ไม่ถูกต้อง" : undefined}
                    class="w-60 sm:w-72"
                  />
                </Show>

                <Show when={asset.type === "image"}>
                  <div class="flex items-end gap-2">
                    <CropSlot
                      label={`${BANNER_DEVICE_SPECS.tablet.label} ${BANNER_DEVICE_SPECS.tablet.size}`}
                      src={asset.tabletSource}
                      class="aspect-[4/3] w-24"
                      onPick={() => openFilePicker("image", i(), "tabletSource")}
                      onClear={() => patchAt(i(), { tabletSource: undefined })}
                    />
                    <CropSlot
                      label={`${BANNER_DEVICE_SPECS.mobile.label} ${BANNER_DEVICE_SPECS.mobile.size}`}
                      src={asset.mobileSource}
                      class="aspect-[3/4] w-[54px]"
                      onPick={() => openFilePicker("image", i(), "mobileSource")}
                      onClear={() => patchAt(i(), { mobileSource: undefined })}
                    />
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={atLimit()}
          onClick={() => openFilePicker("image", null)}
          class="rounded-card border border-dashed border-border px-3 py-2 text-sm font-medium text-ink-gray transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-ink-gray"
        >
          + เพิ่มรูปภาพ
        </button>
        <button
          type="button"
          disabled={atLimit()}
          onClick={() => openFilePicker("video", null)}
          class="rounded-card border border-dashed border-border px-3 py-2 text-sm font-medium text-ink-gray transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-ink-gray"
        >
          + เพิ่มวิดีโอ
        </button>
        <button
          type="button"
          disabled={atLimit()}
          onClick={addYoutube}
          class="rounded-card border border-dashed border-border px-3 py-2 text-sm font-medium text-ink-gray transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-ink-gray"
        >
          + เพิ่ม YouTube
        </button>
      </div>

      <p class="text-xs text-ink-gray">
        {props.assets.length}/{MAX_HERO_ASSETS} รายการ — รองรับรูปภาพ วิดีโอ และ YouTube สูงสุด {MAX_HERO_ASSETS} รายการ · รูปภาพแนะนำ Desktop {BANNER_DEVICE_SPECS.desktop.size} (3:1),
        Tablet {BANNER_DEVICE_SPECS.tablet.size} (4:3), Mobile {BANNER_DEVICE_SPECS.mobile.size} (3:4) — ถ้าไม่ใส่ Tablet/Mobile จะใช้รูป Desktop แทน
      </p>
    </div>
  );
}

/** One optional Tablet/Mobile crop for an image asset — click to pick/replace, × to clear back to the Desktop fallback. */
function CropSlot(props: { label: string; src?: string; class: string; onPick: () => void; onClear: () => void }) {
  return (
    <div class="flex flex-col gap-1">
      <span class="text-[10px] leading-tight text-ink-gray">{props.label}</span>
      <div class={`relative shrink-0 overflow-hidden rounded-media border border-border bg-surface-gray/40 ${props.class}`}>
        <button type="button" onClick={props.onPick} aria-label={`เลือกรูป ${props.label}`} class="flex size-full items-center justify-center text-ink-gray hover:text-brand-pink">
          <Show when={props.src} fallback={<ImageIcon class="size-4" />}>
            <img src={props.src} alt="" class="size-full object-cover" />
          </Show>
        </button>
        <Show when={props.src}>
          <button
            type="button"
            onClick={props.onClear}
            aria-label={`ลบรูป ${props.label}`}
            class="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-pill bg-ink/70 text-white"
          >
            <CloseXIcon class="size-2" />
          </button>
        </Show>
      </div>
    </div>
  );
}

/** Only meaningful check the caller needs beyond `validateHeroAssets` (full save-time validation) — cheap enough to call on every keystroke to disable an obviously-broken preview. */
export function isCompleteHeroAsset(asset: HeroAsset): boolean {
  if (!asset.source.trim()) return false;
  if (asset.type === "youtube") return isValidYoutubeUrl(asset.source);
  return true;
}
