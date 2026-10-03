import { createSignal, For, Show } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { Button } from "~/components/shared/Button";
import { SearchInput } from "~/components/admin/SearchInput";
import { CloseXIcon, ImageIcon } from "~/components/admin/icons";
import { useAdminBanners } from "~/lib/adminBannerStore";
import { BANNER_PLACEMENT_META } from "~/lib/adminBanners";

type HomepageBannersLike = { desktop: string; tablet: string; mobile: string };

/**
 * §10.6 "Banner Integration" — lets a Homepage section or Campaign reuse an
 * already-uploaded Banner's images instead of uploading the same creative
 * again. This copies the chosen Banner's `{desktop,tablet,mobile}` URLs into
 * the caller's own banner fields once, on selection — a lightweight "pick
 * from library" convenience, not a live cross-entity reference (the Banner
 * itself stays the single place that image was originally uploaded; nothing
 * here duplicates the *upload*, only reuses the resulting URL string the
 * same way copy-pasting an existing asset link would).
 */
export function BannerLibraryPicker(props: { onSelect: (banners: HomepageBannersLike) => void }) {
  const store = useAdminBanners();
  const [open, setOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");

  const filtered = () => {
    const q = search().trim().toLowerCase();
    const list = store.banners();
    if (!q) return list;
    return list.filter((b) => `${b.name} ${b.id}`.toLowerCase().includes(q));
  };

  const choose = (banners: HomepageBannersLike) => {
    props.onSelect(banners);
    setOpen(false);
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        เลือกจาก Banner ที่มีอยู่
      </Button>

      <Dialog open={open()} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Dialog.Content class="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-card bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
              <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
                <Dialog.Title class="text-lg font-semibold text-ink">เลือก Banner</Dialog.Title>
                <Dialog.CloseButton aria-label="ปิด" class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink">
                  <CloseXIcon />
                </Dialog.CloseButton>
              </div>
              <div class="flex flex-col gap-3 border-b border-border p-4">
                <SearchInput value={search()} onInput={setSearch} placeholder="ค้นหา Banner..." />
              </div>
              <div class="flex-1 overflow-y-auto p-3">
                <Show when={filtered().length > 0} fallback={<p class="p-6 text-center text-sm text-ink-gray">ไม่พบ Banner</p>}>
                  <div class="flex flex-col gap-1">
                    <For each={filtered()}>
                      {(banner) => (
                        <button
                          type="button"
                          onClick={() => choose(banner.banners)}
                          class="font-normal flex items-center gap-3 rounded-card p-2 text-left transition-colors duration-150 hover:bg-surface-pink/30"
                        >
                          <div class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
                            <Show when={banner.banners.desktop} fallback={<ImageIcon class="size-4" />}>
                              <img src={banner.banners.desktop} alt="" class="size-full object-cover" />
                            </Show>
                          </div>
                          <div class="min-w-0 flex-1">
                            <p class="truncate text-sm font-medium text-ink">{banner.name}</p>
                            <p class="truncate text-xs text-ink-gray">{BANNER_PLACEMENT_META[banner.placement].label}</p>
                          </div>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog>
    </>
  );
}
