import { createSignal, For, Show } from "solid-js";
import { ChevronIcon } from "~/components/shared/ChevronIcon";
import { CloseXIcon } from "~/components/admin/icons";
import { TextField } from "~/components/shared/TextField";
import { MediaUploader, VideoOptionsFields } from "~/components/admin/MediaUploader";
import {
  HERO_ASSET_TYPE_META,
  MAX_HERO_ASSETS,
  emptyHeroAsset,
  heroAssetDesktopMedia,
  isValidYoutubeUrl,
  extractYoutubeVideoId,
  withHeroAssetDesktopMedia,
  type HeroAsset,
} from "~/lib/pageSections";
import { BANNER_DEVICE_SPECS } from "~/lib/adminBanners";
import { asVideo, mediaAccept, prepareMediaFile, revokeMedia, VIDEO_RULE_HINT } from "~/lib/media";

/**
 * Hero Banner — Multi-Asset Support. A mixed list of up to `MAX_HERO_ASSETS`
 * slides with add/remove/reorder. An image/video slide has three crops
 * (Desktop 3:1, Tablet 4:3, Mobile 3:4), each its own `MediaUploader` that
 * takes an image or an MP4 video; Tablet/Mobile are optional and fall back
 * to Desktop on the storefront (`HeroBanner.tsx`). The slide's `type`
 * follows its Desktop file. YouTube slides keep their URL field.
 */
export function HeroAssetsEditor(props: { assets: HeroAsset[]; onChange: (assets: HeroAsset[]) => void }) {
  const [addError, setAddError] = createSignal<string>();
  const [cropErrors, setCropErrors] = createSignal<Record<string, string | undefined>>({});
  let addInputRef: HTMLInputElement | undefined;

  const atLimit = () => props.assets.length >= MAX_HERO_ASSETS;

  const addAsset = (asset: HeroAsset) => {
    if (atLimit()) return;
    props.onChange([...props.assets, asset]);
  };

  const patchAt = (index: number, next: Partial<HeroAsset>) => {
    props.onChange(props.assets.map((a, i) => (i === index ? { ...a, ...next } : a)));
  };

  const replaceAt = (index: number, asset: HeroAsset) => {
    props.onChange(props.assets.map((a, i) => (i === index ? asset : a)));
  };

  const removeAt = (index: number) => {
    const asset = props.assets[index];
    if (asset && asset.type !== "youtube") {
      revokeMedia(heroAssetDesktopMedia(asset));
      revokeMedia(asset.tabletSource);
      revokeMedia(asset.mobileSource);
    }
    props.onChange(props.assets.filter((_, i) => i !== index));
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...props.assets];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    props.onChange(next);
  };

  const openAddPicker = () => {
    if (atLimit()) return;
    addInputRef!.value = "";
    addInputRef!.click();
  };

  const onAddPicked = async (e: Event) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    setAddError(undefined);
    const result = await prepareMediaFile(file, { allowVideo: true });
    if (!result.ok) {
      setAddError(result.error);
      return;
    }
    addAsset(withHeroAssetDesktopMedia(emptyHeroAsset("image"), result.value));
  };

  const addYoutube = () => addAsset(emptyHeroAsset("youtube"));

  const setCropError = (key: string, message: string | undefined) => setCropErrors((prev) => ({ ...prev, [key]: message }));

  const addButtonClass =
    "rounded-card border border-dashed border-border px-3 py-2 text-sm font-medium text-ink-gray transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-ink-gray";
  const overlayButtonClass = "flex size-6 items-center justify-center rounded-pill bg-ink/70 text-xs text-white";

  return (
    <div class="flex flex-col gap-3">
      <input ref={addInputRef} type="file" accept={mediaAccept(true)} class="hidden" onChange={onAddPicked} />

      <div class="flex flex-wrap gap-4">
        <For each={props.assets}>
          {(asset, i) => {
            const youtubeId = () => (asset.type === "youtube" ? extractYoutubeVideoId(asset.source) : null);
            const youtubeError = () => asset.type === "youtube" && asset.source.trim() !== "" && !youtubeId();
            const desktopMedia = () => heroAssetDesktopMedia(asset);
            const tabletKey = () => `${asset.id}-tablet`;
            const mobileKey = () => `${asset.id}-mobile`;

            /** Badge, remove-slide ×, and reorder arrows drawn over the Desktop tile. */
            const overlay = () => (
              <>
                <span class="pointer-events-none absolute left-1.5 top-1.5 z-10 rounded-pill bg-ink/70 px-2 py-0.5 text-[10px] font-medium text-white">
                  {i() + 1}/{MAX_HERO_ASSETS} {HERO_ASSET_TYPE_META[asset.type].label}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(i());
                  }}
                  aria-label="ลบรายการนี้"
                  class="absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-pill bg-ink/70 text-white"
                >
                  <CloseXIcon class="size-2.5" />
                </button>
                <div class="absolute bottom-1 left-1 z-10 flex gap-1">
                  <Show when={i() > 0}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        move(i(), -1);
                      }}
                      aria-label="ย้ายไปทางซ้าย"
                      class={overlayButtonClass}
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
                      class={overlayButtonClass}
                    >
                      <ChevronIcon direction="right" class="size-4" />
                    </button>
                  </Show>
                </div>
              </>
            );

            return (
              <div class="flex w-60 flex-col gap-2 sm:w-72">
                <Show
                  when={asset.type === "youtube"}
                  fallback={
                    <>
                      <MediaUploader
                        value={desktopMedia()}
                        onChange={(media) => replaceAt(i(), withHeroAssetDesktopMedia(asset, media))}
                        aspectClass="aspect-[3/1]"
                        hideHints
                        hideRemove
                        showVideoBadge={false}
                        showVideoOptions={false}
                        emptyLabel="เลือกรูปหรือวิดีโอ"
                        overlay={overlay()}
                      />
                      <Show when={asVideo(desktopMedia())}>
                        {(video) => (
                          <VideoOptionsFields
                            title={`วิดีโอ ${BANNER_DEVICE_SPECS.desktop.label}`}
                            value={video()}
                            onChange={(media) => replaceAt(i(), withHeroAssetDesktopMedia(asset, media))}
                            posterAspectClass="aspect-[3/1]"
                          />
                        )}
                      </Show>
                      <div class="flex items-end gap-2">
                        <MediaUploader
                          compact
                          label={`${BANNER_DEVICE_SPECS.tablet.label} ${BANNER_DEVICE_SPECS.tablet.size}`}
                          ariaLabel={`เลือกไฟล์ ${BANNER_DEVICE_SPECS.tablet.label}`}
                          value={asset.tabletSource ?? ""}
                          onChange={(media) => patchAt(i(), { tabletSource: media || undefined })}
                          aspectClass="aspect-[4/3]"
                          boxClass="w-24"
                          onError={(message) => setCropError(tabletKey(), message)}
                        />
                        <MediaUploader
                          compact
                          label={`${BANNER_DEVICE_SPECS.mobile.label} ${BANNER_DEVICE_SPECS.mobile.size}`}
                          ariaLabel={`เลือกไฟล์ ${BANNER_DEVICE_SPECS.mobile.label}`}
                          value={asset.mobileSource ?? ""}
                          onChange={(media) => patchAt(i(), { mobileSource: media || undefined })}
                          aspectClass="aspect-[3/4]"
                          boxClass="w-[54px]"
                          onError={(message) => setCropError(mobileKey(), message)}
                        />
                      </div>
                      <For each={[cropErrors()[tabletKey()], cropErrors()[mobileKey()]].filter(Boolean)}>
                        {(message) => (
                          <p class="text-xs text-system-red" role="alert">
                            {message}
                          </p>
                        )}
                      </For>
                      <Show when={asVideo(asset.tabletSource)}>
                        {(video) => (
                          <VideoOptionsFields
                            title={`วิดีโอ ${BANNER_DEVICE_SPECS.tablet.label}`}
                            value={video()}
                            onChange={(media) => patchAt(i(), { tabletSource: media })}
                            posterAspectClass="aspect-[4/3]"
                          />
                        )}
                      </Show>
                      <Show when={asVideo(asset.mobileSource)}>
                        {(video) => (
                          <VideoOptionsFields
                            title={`วิดีโอ ${BANNER_DEVICE_SPECS.mobile.label}`}
                            value={video()}
                            onChange={(media) => patchAt(i(), { mobileSource: media })}
                            posterAspectClass="aspect-[3/4]"
                          />
                        )}
                      </Show>
                    </>
                  }
                >
                  <div class="group relative aspect-[3/1] w-full shrink-0 overflow-hidden rounded-media border border-border bg-surface-gray/60">
                    <Show
                      when={youtubeId()}
                      fallback={
                        <div class="flex size-full flex-col items-center justify-center gap-1 px-2 text-center text-ink-gray">
                          <span class="text-xs">วางลิงก์ YouTube ด้านล่าง</span>
                        </div>
                      }
                    >
                      {(id) => <img src={`https://img.youtube.com/vi/${id()}/mqdefault.jpg`} alt="" class="size-full object-cover" />}
                    </Show>
                    {overlay()}
                  </div>
                  <TextField
                    label="ลิงก์ YouTube"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={asset.source}
                    onInput={(e) => patchAt(i(), { source: e.currentTarget.value })}
                    error={youtubeError() ? "ลิงก์ YouTube ไม่ถูกต้อง" : undefined}
                  />
                </Show>
              </div>
            );
          }}
        </For>
      </div>

      <div class="flex flex-wrap gap-2">
        <button type="button" disabled={atLimit()} onClick={openAddPicker} class={addButtonClass}>
          + เพิ่มรูปภาพหรือวิดีโอ
        </button>
        <button type="button" disabled={atLimit()} onClick={addYoutube} class={addButtonClass}>
          + เพิ่ม YouTube
        </button>
      </div>
      <Show when={addError()}>
        <p class="text-xs text-system-red" role="alert">
          {addError()}
        </p>
      </Show>

      <p class="text-xs text-ink-gray">
        ใส่แล้ว {props.assets.length}/{MAX_HERO_ASSETS} รายการ ขนาดรูปแนะนำ เดสก์ท็อป {BANNER_DEVICE_SPECS.desktop.size} (3:1), แท็บเล็ต {BANNER_DEVICE_SPECS.tablet.size} (4:3),
        มือถือ {BANNER_DEVICE_SPECS.mobile.size} (3:4) ถ้าไม่ใส่ขนาดแท็บเล็ตหรือมือถือ ระบบจะใช้ไฟล์เดสก์ท็อปแทน
      </p>
      <p class="text-xs text-ink-gray">{VIDEO_RULE_HINT}</p>
    </div>
  );
}

/** Only meaningful check the caller needs beyond `validateHeroAssets` (full save-time validation) — cheap enough to call on every keystroke to disable an obviously-broken preview. */
export function isCompleteHeroAsset(asset: HeroAsset): boolean {
  if (!asset.source.trim()) return false;
  if (asset.type === "youtube") return isValidYoutubeUrl(asset.source);
  if (asset.type === "video") return !!asset.poster;
  return true;
}
