import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { ChevronDownIcon, CloseXIcon } from "~/components/admin/icons";
import { IconImageUploader } from "~/components/admin/IconImageUploader";
import {
  NAVIGATION_TARGET_TYPES,
  NAVIGATION_TARGET_TYPE_LABELS,
  targetRequiresId,
  targetRequiresExternalUrl,
  collectDescendantIds,
  type NavigationItem,
  type NavigationItemFormValues,
  type NavigationTargetType,
} from "~/lib/adminNavigation";
import { LANDING_PAGE_STATUS_META, type LandingPage } from "~/lib/adminContent";
import type { AdminCategory } from "~/lib/adminCategories";
import type { ProductCollection } from "~/lib/adminCollections";
import type { AdminProduct } from "~/lib/adminProductStore";

/** Empty string is a valid, explicit "no icon" state (§9) — never omitted/undefined, so a saved item can't accidentally fall back to some default icon later. */
const NO_ICON_KEY = "";

/**
 * Navigation Architecture — one reusable Create/Edit drawer for every
 * `NavigationItem`, same slide-in-from-right shell `QuickViewDrawer.tsx`
 * already established (Kobalte Dialog, same width/animation classes) but
 * with a real form footer (Cancel/Save) instead of QuickViewDrawer's fixed
 * "ดูรายละเอียดทั้งหมด" button — so it isn't reused as-is, a small
 * purpose-built sibling instead of bending that component's contract.
 *
 * Target selectors are populated straight from each entity's own Admin
 * store (`pages`/`categories`/`collections`/`products` props) — Navigation
 * never stores a copy of the target's data, only its id (§5/§33).
 */
export function NavigationItemFormDrawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: NavigationItem;
  items: NavigationItem[];
  pages: LandingPage[];
  categories: AdminCategory[];
  collections: ProductCollection[];
  products: AdminProduct[];
  saving: boolean;
  onSubmit: (values: NavigationItemFormValues) => void;
  /** REAL-TIME LIVE PREVIEW SYSTEM §17 — fires on every field change while open, so a parent page's own live preview (e.g. the Navigation Fixed Bottom Preview) can reflect this drawer's in-progress, unsaved edit immediately — no Save required. */
  onLiveChange?: (values: NavigationItemFormValues) => void;
}) {
  const [label, setLabel] = createSignal(props.initial?.label ?? "");
  const [icon, setIcon] = createSignal(props.initial?.icon ?? NO_ICON_KEY);
  const [targetType, setTargetType] = createSignal<NavigationTargetType>(props.initial?.targetType ?? "promotion_page");
  const [targetId, setTargetId] = createSignal(props.initial?.targetId ?? "");
  const [externalUrl, setExternalUrl] = createSignal(props.initial?.externalUrl ?? "");
  const [parentId, setParentId] = createSignal(props.initial?.parentId ?? "");
  const [visible, setVisible] = createSignal(props.initial?.visible ?? true);
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  /** Re-seed every field whenever the drawer opens for a (possibly different) item, so switching from editing one item to another — or to Create — never leaks the previous item's values. */
  createEffect(() => {
    if (!props.open) return;
    setLabel(props.initial?.label ?? "");
    setIcon(props.initial?.icon ?? NO_ICON_KEY);
    setTargetType(props.initial?.targetType ?? "promotion_page");
    setTargetId(props.initial?.targetId ?? "");
    setExternalUrl(props.initial?.externalUrl ?? "");
    setParentId(props.initial?.parentId ?? "");
    setVisible(props.initial?.visible ?? true);
    setErrors({});
  });

  /** §11/§12 — an item can never become its own parent nor a descendant's parent (a circular menu tree). */
  const excludedParentIds = createMemo(() => {
    if (!props.initial) return new Set<string>();
    return new Set([props.initial.id, ...collectDescendantIds(props.items, props.initial.id)]);
  });
  const parentOptions = createMemo(() =>
    props.items.filter((i) => !excludedParentIds().has(i.id)).sort((a, b) => a.order - b.order),
  );

  const targetOptions = createMemo((): { value: string; label: string }[] => {
    switch (targetType()) {
      case "promotion_page":
        return props.pages.map((p) => ({ value: p.id, label: `${p.name} · ${LANDING_PAGE_STATUS_META[p.status].label}` }));
      case "category":
        return props.categories.map((c) => ({ value: c.id, label: c.name }));
      case "collection":
        return props.collections.map((c) => ({ value: c.id, label: c.name }));
      case "product":
        return props.products.map((p) => ({ value: p.id, label: p.name }));
      default:
        return [];
    }
  });

  const needsTarget = () => targetRequiresId(targetType());
  const needsUrl = () => targetRequiresExternalUrl(targetType());

  /** REAL-TIME LIVE PREVIEW SYSTEM §17 — reports the current in-progress values upward on every change, while open, so the parent's live preview stays in sync without requiring Save. */
  createEffect(() => {
    if (!props.open) return;
    props.onLiveChange?.({
      label: label().trim(),
      icon: icon(),
      order: props.initial?.order ?? 0,
      visible: visible(),
      parentId: parentId() || undefined,
      targetType: targetType(),
      targetId: needsTarget() ? targetId() : undefined,
      externalUrl: needsUrl() ? externalUrl().trim() : undefined,
    });
  });

  const handleTargetTypeChange = (next: NavigationTargetType) => {
    setTargetType(next);
    setTargetId("");
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!label().trim()) next.label = "กรุณากรอกชื่อเมนู";
    if (needsTarget() && !targetId()) next.targetId = "กรุณาเลือกปลายทาง";
    if (needsUrl() && !externalUrl().trim()) next.externalUrl = "กรุณากรอก URL";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!validate()) return;
    props.onSubmit({
      label: label().trim(),
      icon: icon(),
      order: props.initial?.order ?? 0,
      visible: visible(),
      parentId: parentId() || undefined,
      targetType: targetType(),
      targetId: needsTarget() ? targetId() : undefined,
      externalUrl: needsUrl() ? externalUrl().trim() : undefined,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-y-0 right-0 z-50 flex w-full sm:w-[480px]">
          <Dialog.Content class="flex size-full flex-col overflow-hidden bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-drawer-in data-[closed]:animate-drawer-out">
            <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
              <Dialog.Title class="text-lg font-semibold text-ink">
                {props.mode === "create" ? "เพิ่มเมนู" : "แก้ไขเมนู"}
              </Dialog.Title>
              <Dialog.CloseButton
                aria-label="ปิด"
                class="flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink"
              >
                <CloseXIcon />
              </Dialog.CloseButton>
            </div>

            <form onSubmit={handleSubmit} class="flex flex-1 flex-col overflow-hidden">
              <div class="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
                <TextField
                  label="ชื่อเมนู (Label)"
                  required
                  value={label()}
                  onInput={(e) => setLabel(e.currentTarget.value)}
                  error={errors().label}
                  placeholder="เช่น ลิป, โปรโมชั่น, ดูสินค้าทั้งหมด"
                  disabled={props.saving}
                />

                <div class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">ไอคอน (ไม่บังคับ)</span>
                  <IconImageUploader value={icon()} onChange={setIcon} disabled={props.saving} />
                </div>

                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">
                    ประเภทปลายทาง (Target Type)<span class="text-system-red"> *</span>
                  </span>
                  <div class="relative">
                    <select
                      value={targetType()}
                      disabled={props.saving}
                      onChange={(e) => handleTargetTypeChange(e.currentTarget.value as NavigationTargetType)}
                      class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                    >
                      <For each={NAVIGATION_TARGET_TYPES}>{(t) => <option value={t}>{NAVIGATION_TARGET_TYPE_LABELS[t]}</option>}</For>
                    </select>
                    <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
                  </div>
                </label>

                <Show when={needsTarget()}>
                  <label class="flex flex-col gap-1.5">
                    <span class="text-sm font-medium text-ink">
                      ปลายทาง (Target)<span class="text-system-red"> *</span>
                    </span>
                    <div class="relative">
                      <select
                        value={targetId()}
                        disabled={props.saving}
                        onChange={(e) => setTargetId(e.currentTarget.value)}
                        class={`h-11 w-full appearance-none rounded-card border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray ${
                          errors().targetId ? "border-system-red" : "border-border"
                        }`}
                      >
                        <option value="">— เลือกปลายทาง —</option>
                        <For each={targetOptions()}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
                      </select>
                      <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
                    </div>
                    <Show when={errors().targetId}>
                      <p class="text-sm text-system-red">{errors().targetId}</p>
                    </Show>
                    <Show when={targetOptions().length === 0}>
                      <p class="text-sm text-ink-gray">ยังไม่มี{NAVIGATION_TARGET_TYPE_LABELS[targetType()]}ให้เลือก</p>
                    </Show>
                  </label>
                </Show>

                <Show when={needsUrl()}>
                  <TextField
                    label="URL ภายนอก"
                    required
                    value={externalUrl()}
                    onInput={(e) => setExternalUrl(e.currentTarget.value)}
                    error={errors().externalUrl}
                    placeholder="https://..."
                    disabled={props.saving}
                  />
                </Show>

                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">เมนูหลัก (Parent Menu)</span>
                  <div class="relative">
                    <select
                      value={parentId()}
                      disabled={props.saving}
                      onChange={(e) => setParentId(e.currentTarget.value)}
                      class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                    >
                      <option value="">ไม่มี (เมนูระดับบนสุด)</option>
                      <For each={parentOptions()}>{(item) => <option value={item.id}>{item.label}</option>}</For>
                    </select>
                    <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
                  </div>
                </label>

                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visible()}
                    onChange={(e) => setVisible(e.currentTarget.checked)}
                    disabled={props.saving}
                    class="size-4 rounded accent-brand-pink"
                  />
                  <span class="text-sm font-medium text-ink">แสดงเมนูนี้บนหน้าเว็บไซต์</span>
                </label>
              </div>

              <div
                class="flex shrink-0 gap-3 border-t border-border p-4"
                style={{ "padding-bottom": "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <Button type="button" variant="outline" class="flex-1" onClick={() => props.onOpenChange(false)} disabled={props.saving}>
                  ยกเลิก
                </Button>
                <Button type="submit" variant="primary" class="flex-1" loading={props.saving}>
                  บันทึก
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
