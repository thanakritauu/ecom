import { createEffect, createSignal, For, Show, type JSX } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { TextField } from "~/components/shared/TextField";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { SingleImageUploader } from "~/components/admin/SingleImageUploader";
import { Toggle } from "~/components/admin/Toggle";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { DraftPublishActions } from "~/components/admin/DraftPublishActions";
import { ArrowDownIcon, ArrowUpIcon, CloseXIcon, MoreIcon, PlusIcon, ReviewsIcon } from "~/components/admin/icons";
import { TiktokClipCover } from "~/components/admin/reviews/TiktokClipCover";
import { useAdminProducts } from "~/lib/adminProductStore";
import { ProductSkuPicker } from "~/components/admin/ProductSkuPicker";
import { skuRefsFromProductIds, type ProductSkuRef } from "~/lib/productSkuRef";
import { parseTiktokUrl, tiktokClipPublishProblems, tiktokClipUrl, useAdminTiktokClips, type AdminTiktokClip } from "~/lib/adminTiktokClips";
import { pushToast } from "~/lib/toast";
import { FormErrorSummary } from "~/components/admin/FormErrorSummary";
import { clearFieldError, reportFormErrors, type FormErrors } from "~/lib/adminFormValidation";
import { scrollToFirstErrorIn } from "~/lib/adminDrawerScroll";

const CLIP_LABELS: Record<string, string> = { url: "ลิงก์คลิป TikTok", title: "ชื่อคลิป" };

/**
 * "คลิปรีวิว TikTok" — the clip rail at the top of every PDP (and Home's
 * #CharmissReviews). Order here is the rail's order; a clip linked to a
 * product shows first on that product's PDP, then the rest follow. The
 * storefront reads this list live (`storefrontTiktokClips.ts`).
 */
export default function AdminTiktokClipsPage() {
  const store = useAdminTiktokClips();
  const productsStore = useAdminProducts();
  const productName = (id: string) => productsStore.getById(id)?.name ?? id;

  const [editing, setEditing] = createSignal<AdminTiktokClip | "new" | null>(null);
  // Kept while the drawer animates closed, so its content doesn't vanish mid-animation.
  const [editorTarget, setEditorTarget] = createSignal<AdminTiktokClip | "new">("new");
  const [editorKey, setEditorKey] = createSignal(0);
  createEffect(() => {
    const target = editing();
    if (target) {
      setEditorTarget(target);
      setEditorKey((k) => k + 1);
    }
  });
  const [pendingDelete, setPendingDelete] = createSignal<AdminTiktokClip | null>(null);
  const [deleting, setDeleting] = createSignal(false);

  const draftCount = () => store.clips().filter((c) => c.draft).length;

  /** Draft-first: same checks as the editor's บันทึกและเผยแพร่; refuses with a toast naming what's missing. */
  const publish = (clip: AdminTiktokClip) => {
    const problems = tiktokClipPublishProblems(clip, store.clips());
    if (problems.length > 0) {
      pushToast(`เผยแพร่ "${clip.title || "คลิป"}" ไม่ได้`, "error", `ยังกรอกข้อมูลไม่ครบ: ${problems.join(", ")}`);
      return;
    }
    store.publishClip(clip.id);
    pushToast(`เผยแพร่ "${clip.title}" แล้ว`, "success");
  };

  const confirmDelete = async () => {
    const clip = pendingDelete();
    if (!clip) return;
    setDeleting(true);
    await store.removeClip(clip.id);
    setDeleting(false);
    setPendingDelete(null);
    pushToast(`ลบ "${clip.title || "คลิป"}" เรียบร้อยแล้ว`, "error");
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "รีวิวสินค้า", href: "/admin/reviews" }, { label: "คลิปรีวิว TikTok" }]} />
      <PageHeader
        title="คลิปรีวิว TikTok"
        description="จัดการคลิปที่แสดงในหน้าแรกและเหนือรีวิวในหน้าสินค้า คลิปที่ผูกกับสินค้าจะขึ้นก่อนในหน้าสินค้านั้น"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={() => setEditing("new")}>
              <PlusIcon class="size-4" />
              เพิ่มคลิป
            </Button>
          </div>
        }
      />

      <section class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
        <div class="flex flex-col gap-1">
          <h2 class="text-base font-semibold text-ink">ลำดับคลิป ({store.clips().length})</h2>
          <p class="text-xs text-ink-gray">
            หน้าร้านแสดงคลิปตามลำดับนี้ ใช้ปุ่มลูกศรเพื่อเลื่อนขึ้นหรือลง
            <Show when={draftCount() > 0}> แบบร่าง {draftCount()} คลิปยังไม่แสดงบนหน้าร้าน</Show>
          </p>
        </div>

        <Show
          when={store.clips().length > 0}
          fallback={<EmptyState icon={<ReviewsIcon />} title="ยังไม่มีคลิป" description="เริ่มเพิ่มคลิปแรกของคุณ" actionLabel="+ เพิ่มคลิป" onAction={() => setEditing("new")} />}
        >
          <ol class="flex flex-col gap-2">
            <For each={store.clips()}>
              {(clip, i) => (
                <li class="flex flex-col gap-3 rounded-card border border-border bg-surface-card p-3 sm:flex-row sm:items-center" classList={{ "opacity-60": !clip.active }}>
                  <div class="flex min-w-0 flex-1 items-center gap-3">
                    <span class="w-5 shrink-0 text-center text-sm font-semibold text-ink-gray">{i() + 1}</span>
                    <TiktokClipCover clip={clip} />
                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                      <p class="line-clamp-2 text-sm font-medium text-ink">{clip.title || "-"}</p>
                      <Show when={clip.videoId} fallback={<span class="text-xs text-ink-gray">ยังไม่ใส่ลิงก์คลิป</span>}>
                        <a href={tiktokClipUrl(clip)} target="_blank" rel="noopener noreferrer" class="truncate text-xs text-ink-gray hover:text-brand-pink">
                          @{clip.author} คลิป {clip.videoId}
                        </a>
                      </Show>
                      <p class="text-xs text-ink-gray">
                        <Show when={clip.productIds.length > 0} fallback={<span>ไม่ผูกสินค้า แสดงในหน้าแรกและต่อท้ายคลิปของสินค้าในทุกหน้าสินค้า</span>}>
                          {/* Mock catalog shows the same real product in several slots — list each name once. */}
                          ผูกกับ {clip.productIds.length} สินค้า: <span class="text-ink">{[...new Set(clip.productIds.map(productName))].join(", ")}</span>
                        </Show>
                      </p>
                    </div>
                  </div>
                  <div class="flex shrink-0 flex-wrap items-center justify-end gap-1">
                    {/* Draft-first: no แสดง / ไม่แสดง switch until the clip's first publish (row menu: เผยแพร่). */}
                    <Show
                      when={!clip.draft}
                      fallback={<StatusBadge tone="info" class="mr-1">แบบร่าง</StatusBadge>}
                    >
                      <Toggle
                        checked={clip.active}
                        onChange={(on) => {
                          store.setActive(clip.id, on);
                          pushToast(on ? "แสดงคลิปแล้ว" : "ซ่อนคลิปแล้ว", "success");
                        }}
                        onLabel="แสดง"
                        offLabel="ไม่แสดง"
                      />
                    </Show>
                    <IconButton label="เลื่อนขึ้น" disabled={i() === 0} onClick={() => store.move(i(), -1)}>
                      <ArrowUpIcon />
                    </IconButton>
                    <IconButton label="เลื่อนลง" disabled={i() === store.clips().length - 1} onClick={() => store.move(i(), 1)}>
                      <ArrowDownIcon />
                    </IconButton>
                    <ClipRowActionsMenu
                      name={clip.title || clip.videoId}
                      onEdit={() => setEditing(clip)}
                      onPublish={clip.draft ? () => publish(clip) : undefined}
                      onDelete={() => setPendingDelete(clip)}
                    />
                  </div>
                </li>
              )}
            </For>
          </ol>
        </Show>
      </section>

      <Show when={editorKey()} keyed>
        {(_key) => {
          const target = editorTarget();
          return (
            <ClipEditor
              open={editing() !== null}
              clip={target === "new" ? undefined : target}
              onClose={() => setEditing(null)}
              onSave={async (input) => {
                await store.saveClip(target === "new" ? null : target.id, input);
                pushToast(input.draft ? "บันทึกแบบร่างเรียบร้อยแล้ว" : target === "new" || target.draft ? "เผยแพร่คลิปเรียบร้อยแล้ว" : "บันทึกคลิปเรียบร้อยแล้ว", "success");
                setEditing(null);
              }}
            />
          );
        }}
      </Show>

      <ConfirmDialog
        open={pendingDelete() !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="ลบคลิป?"
        description={`คุณต้องการลบ "${pendingDelete()?.title ?? ""}" หรือไม่? คลิปจะหายจากหน้าแรกและหน้าสินค้า การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบคลิป"
        tone="danger"
        loading={deleting()}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

/**
 * Add/edit drawer — same right-side Kobalte drawer shell as QuickViewDrawer,
 * with the draft-first `DraftPublishActions` footer instead of "ดูรายละเอียด":
 * a new clip (or one still แบบร่าง) gets บันทึกแบบร่าง (title only) and
 * บันทึกและเผยแพร่; a published one gets บันทึกการเปลี่ยนแปลง + the แสดง Toggle.
 * `onSave` receives `draft` / `active` already set for the chosen button.
 */
export function ClipEditor(props: {
  open: boolean;
  clip?: AdminTiktokClip;
  /** New clip only: products ticked from the start (the product form passes its own product). */
  defaultProductIds?: string[];
  onClose: () => void;
  onSave: (input: Omit<AdminTiktokClip, "id">) => Promise<void>;
}) {
  const clipsStore = useAdminTiktokClips();
  let bodyRef: HTMLDivElement | undefined;
  const [url, setUrl] = createSignal(props.clip ? tiktokClipUrl(props.clip) : "");
  const [title, setTitle] = createSignal(props.clip?.title ?? "");
  const [coverUrl, setCoverUrl] = createSignal(props.clip?.coverUrl ?? "");
  const [products, setProducts] = createSignal<ProductSkuRef[]>(
    props.clip ? (props.clip.products ?? skuRefsFromProductIds(props.clip.productIds)) : skuRefsFromProductIds(props.defaultProductIds),
  );
  const [active, setActive] = createSignal(props.clip && !props.clip.draft ? props.clip.active : true);
  /** Creating, or the clip is still แบบร่าง. */
  const draftFlow = !props.clip || props.clip.draft === true;
  const [errors, setErrors] = createSignal<FormErrors>({});
  const clearError = (key: string) => setErrors((prev) => clearFieldError(prev, key));
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const parsed = () => parseTiktokUrl(url());

  /** draft = บันทึกแบบร่าง (title only; a typed link must still be a real TikTok link), publish = บันทึกและเผยแพร่, save = บันทึกการเปลี่ยนแปลง. */
  const submit = async (action: "draft" | "publish" | "save") => {
    const next: FormErrors = {};
    const p = parsed();
    if (!url().trim()) {
      if (action !== "draft") next.url = "กรุณากรอกลิงก์คลิป TikTok";
    }
    else if (!p) next.url = "ลิงก์ต้องเป็นแบบ tiktok.com/@ชื่อบัญชี/video/เลขคลิป";
    // The same clip twice would show twice in the rail.
    else if (clipsStore.clips().some((c) => c.videoId === p.videoId && c.id !== props.clip?.id)) next.url = "คลิปนี้อยู่ในรายการแล้ว";
    if (!title().trim()) next.title = "กรุณากรอกชื่อคลิป";
    setErrors(next);
    if (reportFormErrors(next, CLIP_LABELS)) {
      scrollToFirstErrorIn(bodyRef, next);
      return;
    }
    setSaving(true);
    setSubmitError(undefined);
    try {
      await props.onSave({
        author: p?.author ?? "",
        videoId: p?.videoId ?? "",
        title: title().trim(),
        coverUrl: coverUrl() || undefined,
        products: products(),
        productIds: products().map((r) => r.productId),
        active: action === "draft" ? false : action === "publish" ? true : active(),
        draft: action === "draft",
      });
    } catch {
      setSubmitError("บันทึกคลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && !saving() && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-y-0 right-0 z-50 flex w-full sm:w-[480px]">
          <Dialog.Content class="flex size-full flex-col overflow-hidden bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-drawer-in data-[closed]:animate-drawer-out">
            <div class="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
              <Dialog.Title class="truncate text-lg font-semibold text-ink">{props.clip ? "แก้ไขคลิป" : "เพิ่มคลิป"}</Dialog.Title>
              <Dialog.CloseButton aria-label="ปิด" class="flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink">
                <CloseXIcon />
              </Dialog.CloseButton>
            </div>

            <div ref={bodyRef} class="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
              <FormErrorSummary errors={errors()} labels={CLIP_LABELS} />
              <TextField
                label="ลิงก์คลิป TikTok"
                required
                value={url()}
                placeholder="https://www.tiktok.com/@charmiss.cosmetics/video/..."
                onInput={(e) => {
                  setUrl(e.currentTarget.value);
                  clearError("url");
                }}
                data-field="url"
                error={errors().url}
                disabled={saving()}
              />
              <Show when={parsed()}>{(p) => <p class="-mt-2 text-xs text-ink-gray">@{p().author} คลิป {p().videoId}</p>}</Show>
              <div class="flex flex-col gap-1.5">
                <TextField
                  label="ชื่อคลิป"
                  required
                  value={title()}
                  onInput={(e) => {
                    setTitle(e.currentTarget.value);
                    if (e.currentTarget.value.trim()) clearError("title");
                  }}
                  data-field="title"
                  error={errors().title} disabled={saving()} />
                <p class="text-xs text-ink-gray">แสดงบนการ์ดเมื่อไม่มีรูปปก และใช้อธิบายคลิปให้โปรแกรมอ่านหน้าจอ</p>
              </div>
              <div class="max-w-xs">
                <SingleImageUploader label="รูปปก" hint="ถ้าเว้นว่างจะใช้รูปปกจาก TikTok (แนวตั้ง 9:16)" value={coverUrl()} onChange={setCoverUrl} />
              </div>
              <Show
                when={!draftFlow}
                fallback={
                  <p class="text-xs text-ink-gray">
                    {props.clip ? "คลิปนี้ยังเป็นแบบร่าง ไม่แสดงบนหน้าร้าน" : "บันทึกแบบร่างไว้ก่อนได้ แล้วกด บันทึกและเผยแพร่ เมื่อข้อมูลครบ"}
                  </p>
                }
              >
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">แสดงบนหน้าร้าน</span>
                  <Toggle checked={active()} onChange={setActive} onLabel="แสดง" offLabel="ไม่แสดง" disabled={saving()} />
                  <span class="text-xs text-ink-gray">ถ้าปิด คลิปนี้จะไม่แสดงในหน้าแรกและหน้าสินค้า</span>
                </label>
              </Show>

              <div class="flex flex-col gap-2">
                <span class="text-sm font-medium text-ink">สินค้าที่ผูกกับคลิป</span>
                <p class="text-xs text-ink-gray">ผูกเฉพาะสินค้าที่อยู่ในคลิปจริง แล้วหน้าสินค้านั้นจะแสดงคลิปนี้ก่อน เลือก SKU ได้ถ้าคลิปรีวิวเฉพาะบางเฉด</p>
                <ProductSkuPicker value={products()} onChange={setProducts} disabled={saving()} />
              </div>
              <Show when={submitError()}>
                <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
                  {submitError()}
                </p>
              </Show>
            </div>

            <div class="flex shrink-0 gap-3 border-t border-border p-4" style={{ "padding-bottom": "max(1rem, env(safe-area-inset-bottom))" }}>
              <DraftPublishActions
                draft={draftFlow}
                saving={saving()}
                onCancel={props.onClose}
                onSaveDraft={() => void submit("draft")}
                onPublish={() => void submit("publish")}
                onSave={() => void submit("save")}
              />
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

const MENU_ITEM_CLASS =
  "flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink";

/** Same Kobalte dropdown shell as `ProductRowActionsMenu`. */
function ClipRowActionsMenu(props: { name: string; onEdit: () => void; onPublish?: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu placement="bottom-end" gutter={4}>
      <DropdownMenu.Trigger
        aria-label={`จัดการ ${props.name}`}
        class="flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink"
      >
        <MoreIcon class="size-5" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="z-50 w-48 rounded-card border border-border bg-surface-card p-2 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
          <DropdownMenu.Item onSelect={props.onEdit} class={MENU_ITEM_CLASS}>
            แก้ไขคลิป
          </DropdownMenu.Item>
          <Show when={props.onPublish}>
            <DropdownMenu.Item onSelect={() => props.onPublish?.()} class={MENU_ITEM_CLASS}>
              เผยแพร่
            </DropdownMenu.Item>
          </Show>
          <DropdownMenu.Separator class="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={props.onDelete}
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm font-medium text-system-red outline-none transition-colors duration-150 hover:bg-danger-soft data-[highlighted]:bg-danger-soft"
          >
            ลบคลิป
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );
}
