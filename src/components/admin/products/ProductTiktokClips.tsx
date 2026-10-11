import { createMemo, createSignal, For, Show } from "solid-js";
import { Button } from "~/components/shared/Button";
import { SearchInput } from "~/components/admin/SearchInput";
import { CloseXIcon } from "~/components/admin/icons";
import { TiktokClipCover } from "~/components/admin/reviews/TiktokClipCover";
import { tiktokClipUrl, useAdminTiktokClips } from "~/lib/adminTiktokClips";

/**
 * Product form "คลิปรีวิว TikTok": which clips this product's PDP shows
 * first. The picked ids live in the form (`value`) and are written to the
 * clips when the product is saved (`setProductTiktokClips`), so a brand-new
 * product can link clips too. New clips are added on /admin/reviews/tiktok.
 */
export function ProductTiktokClips(props: { value: string[]; onChange: (clipIds: string[]) => void; disabled?: boolean }) {
  const store = useAdminTiktokClips();
  const [search, setSearch] = createSignal("");
  const [pickerOpen, setPickerOpen] = createSignal(false);

  const linked = createMemo(() => props.value.map((id) => store.getById(id)).filter((c) => !!c));
  const matches = createMemo(() => {
    const q = search().trim().toLowerCase();
    return store.clips().filter((c) => !q || `${c.title} ${c.author} ${c.videoId}`.toLowerCase().includes(q));
  });
  const toggle = (id: string, on: boolean) => props.onChange(on ? (props.value.includes(id) ? props.value : [...props.value, id]) : props.value.filter((x) => x !== id));

  return (
    <div class="flex flex-col gap-3">
      <p class="text-xs text-ink-gray">คลิปที่เลือกจะแสดงก่อนคลิปอื่นในหน้าสินค้านี้ บันทึกพร้อมสินค้า</p>

      <Show when={linked().length > 0} fallback={<p class="rounded-card border border-dashed border-border px-4 py-5 text-center text-sm text-ink-gray">ยังไม่ได้เลือกคลิป</p>}>
        <ul class="flex flex-col gap-2">
          <For each={linked()}>
            {(clip) => (
              <li class="flex items-center gap-3 rounded-card border border-border p-2.5" classList={{ "opacity-60": !clip!.active }}>
                <TiktokClipCover clip={clip!} class="w-12" />
                <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p class="line-clamp-2 text-sm font-medium leading-[1.75] text-ink">{clip!.title || "-"}</p>
                  <a href={tiktokClipUrl(clip!)} target="_blank" rel="noopener noreferrer" class="truncate text-xs text-ink-gray hover:text-brand-pink">
                    @{clip!.author}
                  </a>
                  <Show when={!clip!.active}>
                    <span class="text-xs text-ink-gray">{clip!.draft ? "แบบร่าง ยังไม่แสดงบนหน้าร้าน" : "ซ่อนอยู่ ไม่แสดงบนหน้าร้าน"}</span>
                  </Show>
                </div>
                <button
                  type="button"
                  aria-label={`นำคลิป ${clip!.title} ออก`}
                  title="นำออก"
                  disabled={props.disabled}
                  onClick={() => toggle(clip!.id, false)}
                  class="flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors hover:bg-surface-pink hover:text-system-red disabled:opacity-40"
                >
                  <CloseXIcon class="size-4" />
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <div class="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen((o) => !o)} disabled={props.disabled} aria-expanded={pickerOpen()}>
          {pickerOpen() ? "ปิดรายการคลิป" : "เลือกจากคลิปที่มี"}
        </Button>
      </div>

      <Show when={pickerOpen()}>
        <div class="flex flex-col gap-2">
          <SearchInput value={search()} onInput={setSearch} placeholder="ค้นหาชื่อคลิป, @ผู้สร้าง..." />
          <ul class="max-h-72 overflow-y-auto rounded-card border border-border">
            <For each={matches()} fallback={<li class="px-3 py-4 text-center text-sm text-ink-gray">ไม่พบคลิป</li>}>
              {(clip) => (
                <li class="border-b border-border last:border-0">
                  <label class="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-ink hover:bg-surface-pink/40">
                    <input
                      type="checkbox"
                      checked={props.value.includes(clip.id)}
                      disabled={props.disabled}
                      onChange={(e) => toggle(clip.id, e.currentTarget.checked)}
                      class="size-4 shrink-0 rounded accent-brand-pink"
                    />
                    <TiktokClipCover clip={clip} class="w-9" />
                    <span class="min-w-0 flex-1">
                      <span class="line-clamp-1 leading-[1.75]">{clip.title || "-"}</span>
                      <span class="block text-xs text-ink-gray">
                        @{clip.author}
                        {clip.draft ? " (แบบร่าง)" : clip.active ? "" : " (ซ่อนอยู่)"}
                      </span>
                    </span>
                  </label>
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>

    </div>
  );
}
