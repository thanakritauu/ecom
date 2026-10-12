import { createSignal, For, onMount, Show } from "solid-js";
import { A } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "~/components/admin/icons";
import { popupLiveStatus } from "~/components/admin/content/PopupEditor";
import { readStoredPromoPopups, saveStoredPromoPopups, type PromoPopupRecord } from "~/lib/promoPopup";
import { pushToast } from "~/lib/toast";

/** Friendly names for the common pages; anything else shows as its link. */
const PAGE_NAMES: Record<string, string> = { "/": "หน้าแรก", "/products": "สินค้าทั้งหมด", "/coupons": "คูปองส่วนลด", "/promotion/*": "หน้าแคมเปญทุกหน้า" };
const pageName = (path: string) => PAGE_NAMES[path] ?? path;

const iconButtonClass =
  "flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink disabled:cursor-not-allowed disabled:opacity-30";

/**
 * All storefront popups, in priority order: on a page where several may
 * show, the storefront opens only the highest one (see `PromoPopup.tsx`).
 * Up / down sets that order.
 */
export default function AdminPromoPopupListPage() {
  const [popups, setPopups] = createSignal<PromoPopupRecord[]>([]);
  const [confirmDelete, setConfirmDelete] = createSignal<PromoPopupRecord | null>(null);
  onMount(() => setPopups(readStoredPromoPopups()));

  const persist = (next: PromoPopupRecord[]) => {
    setPopups(next);
    saveStoredPromoPopups(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    const next = [...popups()];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    persist(next);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "Popup" }]} />
      <PageHeader
        title="Popup"
        description="หน้าต่างโปรโมชั่นที่ขึ้นเมื่อลูกค้าเปิดหน้าที่เลือกไว้ ถ้าหลาย Popup อยู่หน้าเดียวกัน จะแสดงอันที่อยู่บนสุดก่อน"
        actions={
          <Button href="/admin/content/popup/new" variant="primary">
            <PlusIcon class="size-4" />
            เพิ่ม Popup
          </Button>
        }
      />

      <section class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
        <h2 class="text-base font-semibold text-ink">ลำดับการแสดง ({popups().length})</h2>
        <Show when={popups().length > 0} fallback={<p class="py-6 text-center text-sm text-ink-gray">ยังไม่มี Popup กด เพิ่ม Popup เพื่อสร้างอันแรก</p>}>
          <ul class="flex flex-col divide-y divide-border">
            <For each={popups()}>
              {(p, i) => {
                const status = () => popupLiveStatus(p);
                return (
                  <li class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div class="flex shrink-0 flex-col">
                      <button type="button" aria-label="เลื่อนขึ้น" disabled={i() === 0} onClick={() => move(i(), -1)} class={iconButtonClass}>
                        <ArrowUpIcon class="size-4" />
                      </button>
                      <button type="button" aria-label="เลื่อนลง" disabled={i() === popups().length - 1} onClick={() => move(i(), 1)} class={iconButtonClass}>
                        <ArrowDownIcon class="size-4" />
                      </button>
                    </div>
                    <Show when={p.media.type === "video" ? p.media.poster : p.media.src}>
                      {(src) => <img src={src()} alt="" class="hidden aspect-[16/10] w-20 shrink-0 rounded-media object-cover sm:block" />}
                    </Show>
                    <A href={`/admin/content/popup/${p.key}`} class="flex min-w-0 flex-1 flex-col gap-1 font-normal">
                      <span class="flex flex-wrap items-center gap-2">
                        <span class="truncate text-sm font-semibold text-ink">{p.name}</span>
                        <StatusBadge tone={status().tone}>{status().label}</StatusBadge>
                      </span>
                      <span class="truncate text-xs text-ink-gray">{p.title || "-"}</span>
                      <span class="truncate text-xs text-ink-gray">แสดงที่ {p.pages.length > 0 ? p.pages.map(pageName).join(", ") : "-"}</span>
                    </A>
                    <button
                      type="button"
                      aria-label={`ลบ ${p.name}`}
                      onClick={() => setConfirmDelete(p)}
                      class={`${iconButtonClass} hover:!bg-danger-soft hover:text-system-red`}
                    >
                      <TrashIcon class="size-4" />
                    </button>
                  </li>
                );
              }}
            </For>
          </ul>
        </Show>
      </section>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบ Popup?"
        description={`คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบ Popup"
        tone="danger"
        onConfirm={() => {
          const target = confirmDelete();
          if (target) persist(popups().filter((p) => p.key !== target.key));
          setConfirmDelete(null);
          pushToast("ลบ Popup แล้ว", "success");
        }}
      />
    </div>
  );
}
