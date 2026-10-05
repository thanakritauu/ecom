import { createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { TextField } from "~/components/shared/TextField";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { SearchInput } from "~/components/admin/SearchInput";
import { SingleImageUploader } from "~/components/admin/SingleImageUploader";
import { Toggle } from "~/components/admin/Toggle";
import { ArrowDownIcon, ArrowUpIcon, CloseXIcon, PlusIcon, ReviewsIcon, TrashIcon } from "~/components/admin/icons";
import { ReviewsTabs } from "~/components/admin/reviews/ReviewsTabs";
import { TiktokClipCover } from "~/components/admin/reviews/TiktokClipCover";
import { useAdminProducts } from "~/lib/adminProductStore";
import { parseTiktokUrl, tiktokClipUrl, useAdminTiktokClips, type AdminTiktokClip } from "~/lib/adminTiktokClips";
import { pushToast } from "~/lib/toast";

/**
 * "คลิปรีวิว TikTok" — the clip rail at the top of every PDP (and Home's
 * #CharmissReviews). Order here is the rail's order; a clip linked to a
 * product shows first on that product's PDP, then the rest follow. Seeded
 * from the storefront's `tiktokReviews.ts` (see `adminTiktokClips.ts`).
 */
export default function AdminTiktokClipsPage() {
  const store = useAdminTiktokClips();
  const productsStore = useAdminProducts();
  const productName = (id: string) => productsStore.getById(id)?.name ?? id;

  const [editing, setEditing] = createSignal<AdminTiktokClip | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = createSignal<AdminTiktokClip | null>(null);
  const [deleting, setDeleting] = createSignal(false);

  const confirmDelete = async () => {
    const clip = pendingDelete();
    if (!clip) return;
    setDeleting(true);
    await store.removeClip(clip.id);
    setDeleting(false);
    setPendingDelete(null);
    pushToast("ลบคลิปแล้ว", "error");
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "รีวิว", href: "/admin/reviews" }, { label: "คลิปรีวิว TikTok" }]} />
      <PageHeader
        title="คลิปรีวิว TikTok"
        description="คลิปที่แสดงด้านบนสุดของรีวิวในหน้าสินค้า (PDP) และหน้าแรก — คลิปที่ผูกกับสินค้าจะแสดงก่อนในหน้าสินค้านั้น"
        actions={
          <Button variant="primary" onClick={() => setEditing("new")}>
            <PlusIcon class="size-4" />
            เพิ่มคลิป
          </Button>
        }
      />
      <ReviewsTabs />

      <section class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-base font-semibold text-ink">ลำดับคลิป ({store.clips().length})</h2>
          <StatusBadge tone="warning">Mock — หน้าร้านยังอ่านรายการจาก tiktokReviews.ts</StatusBadge>
        </div>

        <Show
          when={store.clips().length > 0}
          fallback={<EmptyState icon={<ReviewsIcon />} title="ยังไม่มีคลิป" description="เพิ่มลิงก์คลิป TikTok เพื่อแสดงในหน้าสินค้า" actionLabel="เพิ่มคลิป" onAction={() => setEditing("new")} />}
        >
          <ol class="flex flex-col gap-2">
            <For each={store.clips()}>
              {(clip, i) => (
                <li class="flex flex-col gap-3 rounded-card border border-border bg-white p-3 sm:flex-row sm:items-center" classList={{ "opacity-60": !clip.active }}>
                  <div class="flex min-w-0 flex-1 items-center gap-3">
                    <span class="w-5 shrink-0 text-center text-sm font-semibold text-ink-gray">{i() + 1}</span>
                    <TiktokClipCover clip={clip} />
                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                      <p class="line-clamp-2 text-sm font-medium text-ink">{clip.title || "(ไม่มีชื่อคลิป)"}</p>
                      <a href={tiktokClipUrl(clip)} target="_blank" rel="noopener noreferrer" class="truncate text-xs text-ink-gray hover:text-brand-pink">
                        @{clip.author} · {clip.videoId}
                      </a>
                      <p class="text-xs text-ink-gray">
                        <Show when={clip.productIds.length > 0} fallback={<span>ไม่ผูกสินค้า — แสดงหลังคลิปที่ผูกกับสินค้าในทุก PDP และหน้าแรก</span>}>
                          {/* Mock catalog shows the same real product in several slots — list each name once, with every slot id. */}
                          ผูกกับ {clip.productIds.length} สินค้า: <span class="text-ink">{[...new Set(clip.productIds.map(productName))].join(", ")}</span> ({clip.productIds.join(", ")})
                        </Show>
                      </p>
                    </div>
                  </div>
                  <div class="flex shrink-0 flex-wrap items-center justify-end gap-1">
                    <Toggle checked={clip.active} onChange={(on) => store.setActive(clip.id, on)} onLabel="แสดง" offLabel="ซ่อน" />
                    <IconButton label="เลื่อนขึ้น" disabled={i() === 0} onClick={() => store.move(i(), -1)}>
                      <ArrowUpIcon />
                    </IconButton>
                    <IconButton label="เลื่อนลง" disabled={i() === store.clips().length - 1} onClick={() => store.move(i(), 1)}>
                      <ArrowDownIcon />
                    </IconButton>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditing(clip)}>
                      แก้ไข
                    </Button>
                    <IconButton label="ลบคลิป" onClick={() => setPendingDelete(clip)}>
                      <TrashIcon />
                    </IconButton>
                  </div>
                </li>
              )}
            </For>
          </ol>
        </Show>
      </section>

      <Show when={editing()}>
        {(target) => (
          <ClipEditor
            clip={target() === "new" ? undefined : (target() as AdminTiktokClip)}
            onClose={() => setEditing(null)}
            onSave={async (input) => {
              await store.saveClip(target() === "new" ? null : (target() as AdminTiktokClip).id, input);
              pushToast(target() === "new" ? "เพิ่มคลิปแล้ว" : "บันทึกคลิปแล้ว", "success");
              setEditing(null);
            }}
          />
        )}
      </Show>

      <ConfirmDialog
        open={pendingDelete() !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="ลบคลิปนี้?"
        description={`"${pendingDelete()?.title ?? ""}" จะไม่แสดงในหน้าสินค้าและหน้าแรกอีก`}
        confirmLabel="ลบคลิป"
        tone="danger"
        loading={deleting()}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

/** Add/edit drawer — same right-side Kobalte drawer shell as QuickViewDrawer, with Save/Cancel instead of "ดูรายละเอียด". */
function ClipEditor(props: {
  clip?: AdminTiktokClip;
  onClose: () => void;
  onSave: (input: Omit<AdminTiktokClip, "id">) => Promise<void>;
}) {
  const productsStore = useAdminProducts();
  const [url, setUrl] = createSignal(props.clip ? tiktokClipUrl(props.clip) : "");
  const [title, setTitle] = createSignal(props.clip?.title ?? "");
  const [coverUrl, setCoverUrl] = createSignal(props.clip?.coverUrl ?? "");
  const [productIds, setProductIds] = createSignal<string[]>(props.clip?.productIds ?? []);
  const [active, setActive] = createSignal(props.clip?.active ?? true);
  const [productSearch, setProductSearch] = createSignal("");
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);

  const parsed = () => parseTiktokUrl(url());
  const matchingProducts = createMemo(() => {
    const q = productSearch().trim().toLowerCase();
    return productsStore.products().filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.id.includes(q));
  });
  const toggleProduct = (id: string, on: boolean) =>
    setProductIds((list) => (on ? (list.includes(id) ? list : [...list, id]) : list.filter((x) => x !== id)));

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!parsed()) next.url = "ลิงก์ต้องอยู่ในรูปแบบ tiktok.com/@ชื่อบัญชี/video/เลขคลิป";
    if (!title().trim()) next.title = "กรุณากรอกชื่อคลิป";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      await props.onSave({ ...parsed()!, title: title().trim(), coverUrl: coverUrl() || undefined, productIds: productIds(), active: active() });
    } catch {
      pushToast("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving() && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in" />
        <div class="fixed inset-y-0 right-0 z-50 flex w-full sm:w-[480px]">
          <Dialog.Content class="flex size-full flex-col overflow-hidden bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-drawer-in">
            <div class="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
              <Dialog.Title class="truncate text-lg font-semibold text-ink">{props.clip ? "แก้ไขคลิป" : "เพิ่มคลิปรีวิว TikTok"}</Dialog.Title>
              <Dialog.CloseButton aria-label="ปิด" class="flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink">
                <CloseXIcon />
              </Dialog.CloseButton>
            </div>

            <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
              <TextField
                label="ลิงก์คลิป TikTok"
                required
                value={url()}
                placeholder="https://www.tiktok.com/@charmiss.cosmetics/video/…"
                onInput={(e) => setUrl(e.currentTarget.value)}
                error={errors().url}
                disabled={saving()}
              />
              <Show when={parsed()}>{(p) => <p class="-mt-2 text-xs text-ink-gray">@{p().author} · คลิป {p().videoId}</p>}</Show>
              <TextField label="ชื่อคลิป (ใช้เป็นคำอธิบายสำหรับผู้ใช้โปรแกรมอ่านหน้าจอ)" required value={title()} onInput={(e) => setTitle(e.currentTarget.value)} error={errors().title} disabled={saving()} />
              <div class="max-w-xs">
                <SingleImageUploader label="รูปปก" hint="เว้นว่าง = ใช้รูปปกจาก TikTok (แนวตั้ง 9:16)" value={coverUrl()} onChange={setCoverUrl} />
              </div>
              <div class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">การแสดงผล</span>
                <Toggle checked={active()} onChange={setActive} onLabel="แสดงบนหน้าร้าน" offLabel="ซ่อน" disabled={saving()} />
              </div>

              <div class="flex flex-col gap-2">
                <span class="text-sm font-medium text-ink">สินค้าที่ผูกกับคลิป ({productIds().length})</span>
                <p class="text-xs text-ink-gray">ผูกเฉพาะสินค้าที่ปรากฏในคลิปจริง — หน้าสินค้านั้นจะแสดงคลิปนี้ก่อน</p>
                <Show when={productIds().length > 0}>
                  <div class="flex flex-wrap gap-1.5">
                    <For each={productIds()}>
                      {(id) => (
                        <span class="inline-flex items-center gap-1 rounded-pill bg-surface-pink px-2.5 py-1 text-xs text-ink">
                          <span class="max-w-[220px] truncate">{productsStore.getById(id)?.name ?? id}</span>
                          <span class="shrink-0 text-ink-gray">· {id}</span>
                          <button type="button" aria-label="นำออก" onClick={() => toggleProduct(id, false)} class="text-ink-gray hover:text-system-red">
                            <CloseXIcon class="size-3.5" />
                          </button>
                        </span>
                      )}
                    </For>
                  </div>
                </Show>
                <SearchInput value={productSearch()} onInput={setProductSearch} placeholder="ค้นหาสินค้า / SKU" />
                <ul class="max-h-64 overflow-y-auto rounded-card border border-border">
                  <For each={matchingProducts()}>
                    {(p) => (
                      <li class="border-b border-border last:border-0">
                        <label class="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-ink hover:bg-surface-pink/40">
                          <input type="checkbox" checked={productIds().includes(p.id)} onChange={(e) => toggleProduct(p.id, e.currentTarget.checked)} class="size-4 shrink-0 accent-brand-pink" />
                          <img src={p.mainImage ?? p.image} alt="" class="size-9 shrink-0 rounded-media object-cover" />
                          <span class="min-w-0 flex-1">
                            <span class="line-clamp-1">{p.name}</span>
                            <span class="text-xs text-ink-gray">
                              {p.sku} · {p.id}
                            </span>
                          </span>
                        </label>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </div>

            <div class="flex shrink-0 gap-3 border-t border-border p-4" style={{ "padding-bottom": "max(1rem, env(safe-area-inset-bottom))" }}>
              <Button type="button" variant="outline" class="flex-1" onClick={props.onClose} disabled={saving()}>
                ยกเลิก
              </Button>
              <Button type="button" variant="primary" class="flex-1" loading={saving()} onClick={submit}>
                {saving() ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

function IconButton(props: { label: string; disabled?: boolean; onClick: () => void; children: JSX.Element }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
      class="flex size-9 items-center justify-center rounded-pill text-ink-gray transition-colors hover:bg-surface-pink hover:text-brand-pink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {props.children}
    </button>
  );
}
