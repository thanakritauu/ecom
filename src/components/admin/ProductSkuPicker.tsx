import { createEffect, createMemo, createSignal, createUniqueId, For, on, onCleanup, onMount, Show, untrack, type JSX } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { useAdminProducts, type AdminProduct, type AdminVariant } from "~/lib/adminProductStore";
import { Button } from "~/components/shared/Button";
import { ChevronIcon } from "~/components/shared/ChevronIcon";
import { SearchInput } from "~/components/admin/SearchInput";
import { Toggle } from "~/components/admin/Toggle";
import { Pagination } from "~/components/admin/Pagination";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { ProductQuickView } from "~/components/admin/products/ProductQuickView";
import { ImageIcon, CloseXIcon, SearchIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import type { ProductSkuRef } from "~/lib/productSkuRef";

export type ProductSkuLevel = "product" | "option";

/**
 * An extra column in the picked-products table (e.g. quantity, flash price).
 * `product` renders the cell on a product row, `sku` on an option (SKU)
 * sub-row. Both are called once per row (untracked, rows are keyed by id so
 * inputs keep focus): read live data inside the returned JSX.
 */
export type ProductSkuColumn = {
  key: string;
  label: string;
  required?: boolean;
  /** Minimum width on the desktop table (px, default 130). */
  minWidth?: number;
  /** Place after "สต๊อก" (default: before it, next to "ราคาเดิม"). */
  afterStock?: boolean;
  product?: (productId: string) => JSX.Element;
  sku?: (productId: string, variantId: string) => JSX.Element;
  /** Card layout only: skip this column on the product card (e.g. values set per SKU below it). */
  hideOnProductCard?: (productId: string) => boolean;
};

const PAGE_SIZES = [20, 50, 100];

const variantPrice = (p: AdminProduct, v: AdminVariant) => v.price ?? p.price;
const stockOf = (p: AdminProduct) => p.stockLeft ?? p.adminVariants.reduce((n, v) => n + v.stock, 0);
function priceRange(p: AdminProduct): string {
  const prices = p.adminVariants.length > 0 ? p.adminVariants.map((v) => variantPrice(p, v)) : [p.price];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatAdminCurrency(min) : `${formatAdminCurrency(min)} - ${formatAdminCurrency(max)}`;
}
const haystack = (p: AdminProduct) => `${p.id} ${p.name} ${p.sku} ${p.adminVariants.map((v) => `${v.sku} ${v.label}`).join(" ")}`.toLowerCase();

/**
 * The ONE product picker for the whole Admin (TikTok Shop seller center
 * pattern, owner request 2026-10-12):
 *
 * - Level radio for the whole list: "ระดับตัวเลือกสินค้า" (each product row
 *   expands to its SKUs with an on/off switch; all on is stored as
 *   `variantIds: []`, at least one stays on) or "ระดับสินค้า" (every pick is
 *   the whole product). Hidden with `levels="product"`.
 * - "N สินค้า" + search in the picked list + "เลือกสินค้า" (dialog with a
 *   tick list).
 * - "จัดการแบบเป็นชุด" bar (ticked rows: "ลบเป็นชุด", plus the caller's own
 *   `bulk` fields), a table on wide containers / cards on narrow ones,
 *   pagination over 20 rows.
 *
 * - `single`: one product only (radio in the dialog, no tick column or bulk bar).
 * - `reorderable`: up/down buttons in the actions column, for places where order shows.
 * - `fixed`: the list can't be changed (no เลือกสินค้า / ลบ), e.g. the flash-sale price editor.
 * - `level` + `onLevelChange`: the caller owns the level (else it is derived from the value).
 */
export function ProductSkuPicker(props: {
  value: ProductSkuRef[];
  onChange: (next: ProductSkuRef[]) => void;
  single?: boolean;
  reorderable?: boolean;
  disabled?: boolean;
  error?: string;
  levels?: "both" | "product";
  level?: ProductSkuLevel;
  onLevelChange?: (level: ProductSkuLevel) => void;
  levelHints?: Partial<Record<ProductSkuLevel, string>>;
  /** Info line shown under the radio for the current level. */
  levelNote?: Partial<Record<ProductSkuLevel, string>>;
  columns?: ProductSkuColumn[];
  /** Extra fields / buttons inside "จัดการแบบเป็นชุด" for the ticked product ids. */
  bulk?: (selectedIds: () => string[]) => JSX.Element;
  fixed?: boolean;
}) {
  const store = useAdminProducts();
  const uid = createUniqueId();
  let root: HTMLDivElement | undefined;

  // Table vs cards follows the picker's own width (it lives in forms, dialogs and drawers).
  const [width, setWidth] = createSignal(0);
  onMount(() => {
    if (!root || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0]?.contentRect.width ?? 0));
    ro.observe(root);
    onCleanup(() => ro.disconnect());
  });
  const columns = () => props.columns ?? [];
  const wide = () => width() >= 600 + columns().reduce((n, c) => n + (c.minWidth ?? 130), 0);
  const selectable = () => !props.single;
  const editable = () => !props.disabled && !props.fixed;

  // Level
  const [userLevel, setUserLevel] = createSignal<ProductSkuLevel>();
  const showLevels = () => props.levels !== "product";
  const level = (): ProductSkuLevel => {
    if (!showLevels()) return "product";
    return props.level ?? userLevel() ?? (props.value.some((r) => r.variantIds.length > 0) ? "option" : "product");
  };
  const [openRows, setOpenRows] = createSignal<Record<string, boolean>>({});
  const isOpen = (id: string) => openRows()[id] ?? level() === "option";
  const changeLevel = (next: ProductSkuLevel) => {
    setOpenRows({});
    if (props.onLevelChange) return props.onLevelChange(next);
    setUserLevel(next);
    if (next === "product" && props.value.some((r) => r.variantIds.length > 0)) props.onChange(props.value.map((r) => ({ ...r, variantIds: [] })));
  };

  // Search in the picked list + pagination
  const [searchOpen, setSearchOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const visibleIds = createMemo(() => {
    const q = query().trim().toLowerCase();
    const ids = props.value.map((r) => r.productId);
    if (!q) return ids;
    return ids.filter((id) => {
      const p = store.getById(id);
      return p ? haystack(p).includes(q) : false;
    });
  });
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const totalPages = () => Math.max(1, Math.ceil(visibleIds().length / pageSize()));
  const currentPage = () => Math.min(page(), totalPages());
  const pageIds = createMemo(() => visibleIds().slice((currentPage() - 1) * pageSize(), currentPage() * pageSize()));
  createEffect(on(query, () => setPage(1), { defer: true }));

  // Ticked rows (bulk)
  const [ticked, setTicked] = createSignal<Set<string>>(new Set());
  const selectedIds = createMemo(() => props.value.map((r) => r.productId).filter((id) => ticked().has(id)));
  const allTicked = () => visibleIds().length > 0 && visibleIds().every((id) => ticked().has(id));
  const tickAll = () => setTicked(allTicked() ? new Set<string>() : new Set(visibleIds()));
  const tick = (id: string, on: boolean) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  // Value helpers
  const refOf = (id: string) => props.value.find((r) => r.productId === id);
  const indexOf = (id: string) => props.value.findIndex((r) => r.productId === id);
  const patch = (id: string, variantIds: string[]) => props.onChange(props.value.map((r) => (r.productId === id ? { ...r, variantIds } : r)));
  const remove = (ids: string[]) => {
    const drop = new Set(ids);
    props.onChange(props.value.filter((r) => !drop.has(r.productId)));
    setTicked((prev) => new Set([...prev].filter((id) => !drop.has(id))));
  };
  const move = (id: string, delta: number) => {
    const from = indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= props.value.length) return;
    const next = [...props.value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    props.onChange(next);
  };
  const onIds = (id: string): string[] => {
    const all = store.getById(id)?.adminVariants.map((v) => v.id) ?? [];
    const picked = (refOf(id)?.variantIds ?? []).filter((v) => all.includes(v));
    return picked.length > 0 ? picked : all;
  };
  const isOn = (id: string, variantId: string) => onIds(id).includes(variantId);
  const setOn = (id: string, variantId: string, on: boolean) => {
    const all = store.getById(id)?.adminVariants.map((v) => v.id) ?? [];
    const current = onIds(id);
    const next = on ? [...current, variantId] : current.filter((v) => v !== variantId);
    if (next.length === 0) return;
    const ordered = all.filter((v) => next.includes(v));
    patch(id, ordered.length === all.length ? [] : ordered);
  };

  // Picker dialog
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const confirmPick = (ids: string[]) => {
    const kept = new Map(props.value.map((r) => [r.productId, r] as const));
    if (props.single) {
      props.onChange(ids[0] ? [kept.get(ids[0]) ?? { productId: ids[0], variantIds: [] }] : []);
      return;
    }
    const keep = new Set(ids);
    props.onChange([...props.value.filter((r) => keep.has(r.productId)), ...ids.filter((id) => !kept.has(id)).map((productId) => ({ productId, variantIds: [] }))]);
    setTicked((prev) => new Set([...prev].filter((id) => keep.has(id))));
  };

  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const quickViewProduct = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  // Desktop grid: [tick] name | ราคาเดิม | extras | สต๊อก | extras after stock | การดำเนินการ
  const beforeStock = () => columns().filter((c) => !c.afterStock);
  const afterStock = () => columns().filter((c) => c.afterStock);
  const gridTemplate = () =>
    [
      selectable() ? "28px" : "",
      "minmax(200px,2.2fr)",
      "minmax(96px,0.9fr)",
      ...beforeStock().map((c) => `minmax(${c.minWidth ?? 130}px,1.2fr)`),
      "64px",
      ...afterStock().map((c) => `minmax(${c.minWidth ?? 130}px,1fr)`),
      "96px",
    ]
      .filter(Boolean)
      .join(" ");

  const HEAD = "text-xs font-medium text-ink-gray";

  const Thumb = (p: { src?: string; class?: string }) => (
    <Show when={p.src} fallback={<span class={`flex shrink-0 items-center justify-center rounded-media bg-surface-gray ${p.class ?? "size-11"}`}><ImageIcon class="size-4 text-ink-placeholder" /></span>}>
      <img src={p.src} alt="" class={`shrink-0 rounded-media object-cover ${p.class ?? "size-11"}`} />
    </Show>
  );

  const NameCell = (p: { id: string }) => {
    const product = () => store.getById(p.id);
    return (
      <div class="flex min-w-0 items-start gap-3">
        <Thumb src={product()?.image} />
        <Show when={product()} fallback={<p class="text-sm text-ink-gray">ไม่พบสินค้านี้แล้ว</p>}>
          {(prod) => (
            <div class="min-w-0">
              <button type="button" onClick={() => setQuickViewId(p.id)} class="font-normal line-clamp-2 text-left text-sm leading-[1.75] text-ink lg:hover:text-brand-pink">
                {prod().name}
              </button>
              <p class="truncate text-xs text-ink-gray">ID: {prod().sku || prod().id}</p>
            </div>
          )}
        </Show>
      </div>
    );
  };

  const Actions = (p: { id: string }) => (
    <div class="flex items-center justify-end gap-0.5">
      <Show when={props.reorderable && !props.disabled && !query()}>
        <button type="button" disabled={indexOf(p.id) <= 0} onClick={() => move(p.id, -1)} aria-label="ย้ายขึ้น" class="flex size-9 items-center justify-center rounded-pill text-ink-gray disabled:opacity-30 lg:hover:bg-surface-pink">
          <ChevronIcon direction="up" class="size-5" />
        </button>
        <button
          type="button"
          disabled={indexOf(p.id) >= props.value.length - 1}
          onClick={() => move(p.id, 1)}
          aria-label="ย้ายลง"
          class="flex size-9 items-center justify-center rounded-pill text-ink-gray disabled:opacity-30 lg:hover:bg-surface-pink"
        >
          <ChevronIcon direction="down" class="size-5" />
        </button>
      </Show>
      <Show when={editable()}>
        <button type="button" onClick={() => remove([p.id])} aria-label={`ลบ ${store.getById(p.id)?.name ?? "สินค้า"}`} class="min-h-9 rounded-pill px-2 text-sm text-brand-pink lg:hover:underline">
          ลบ
        </button>
      </Show>
    </div>
  );

  const SkuToggle = (p: { id: string; variant: AdminVariant }) => {
    const last = () => isOn(p.id, p.variant.id) && onIds(p.id).length <= 1;
    return (
      <span title={last() ? "ต้องเปิดอย่างน้อย 1 SKU" : undefined}>
        <Toggle
          checked={isOn(p.id, p.variant.id)}
          disabled={props.disabled || last()}
          onLabel=""
          offLabel=""
          ariaLabel={`ใช้ ${p.variant.label}`}
          onChange={(on) => setOn(p.id, p.variant.id, on)}
        />
      </span>
    );
  };

  const VariantName = (p: { variant: AdminVariant }) => (
    <div class="flex min-w-0 items-center gap-2.5">
      <VariantThumb variant={p.variant} />
      <div class="min-w-0">
        <p class="truncate text-sm text-ink">{p.variant.label || "ตัวเลือก"}</p>
        <p class="truncate text-xs text-ink-gray">
          {p.variant.sku || "-"}
          <Show when={p.variant.soldOut || p.variant.stock <= 0}>
            <span class="text-system-red"> สินค้าหมด</span>
          </Show>
        </p>
      </div>
    </div>
  );

  /** "6 SKU  ยุบ / ขยาย" line under a product with options. */
  const SkuBar = (p: { id: string }) => {
    const product = () => store.getById(p.id);
    const count = () => product()?.adminVariants.length ?? 0;
    return (
      <Show when={count() > 0}>
        <div class="flex items-center justify-between gap-2 bg-surface-gray/40 px-3 py-1.5">
          <span class="text-xs text-ink-gray">
            {count()} SKU
            <Show when={level() === "option"}> เปิด {onIds(p.id).length}</Show>
          </span>
          <button
            type="button"
            aria-expanded={isOpen(p.id)}
            onClick={() => setOpenRows((m) => ({ ...m, [p.id]: !isOpen(p.id) }))}
            class="flex min-h-9 items-center gap-1 rounded-pill px-2 text-xs text-ink-gray lg:hover:text-ink"
          >
            {isOpen(p.id) ? "ยุบ" : "ขยาย"}
            <ChevronIcon direction={isOpen(p.id) ? "up" : "down"} class="size-4" />
          </button>
        </div>
      </Show>
    );
  };

  /** Desktop: one product row + its SKU sub-rows. */
  const TableRow = (p: { id: string }) => {
    const product = () => store.getById(p.id);
    const variants = () => product()?.adminVariants ?? [];
    return (
      <div class="border-t border-border first:border-t-0">
        <div class="grid items-start gap-3 px-3 py-3" style={{ "grid-template-columns": gridTemplate() }}>
          <Show when={selectable()}>
            <input type="checkbox" aria-label={`เลือก ${product()?.name ?? ""}`} checked={ticked().has(p.id)} disabled={props.disabled} onChange={(e) => tick(p.id, e.currentTarget.checked)} class="mt-3 size-4 rounded accent-brand-pink" />
          </Show>
          <NameCell id={p.id} />
          <span class="pt-2.5 text-right text-sm text-ink">{product() ? priceRange(product()!) : "-"}</span>
          <For each={beforeStock()}>{(c) => <div class="min-w-0">{c.product ? untrack(() => c.product!(p.id)) : null}</div>}</For>
          <span class="pt-2.5 text-right text-sm text-ink">{product() ? stockOf(product()!).toLocaleString("th-TH") : "-"}</span>
          <For each={afterStock()}>{(c) => <div class="min-w-0">{c.product ? untrack(() => c.product!(p.id)) : null}</div>}</For>
          <div class="pt-1">
            <Actions id={p.id} />
          </div>
        </div>
        <SkuBar id={p.id} />
        <Show when={isOpen(p.id)}>
          <For each={variants()}>
            {(variant) => (
              <div
                class="grid items-start gap-3 border-t border-border/60 px-3 py-2.5"
                classList={{ "bg-surface-gray/40": level() === "option" && !isOn(p.id, variant.id) }}
                style={{ "grid-template-columns": gridTemplate() }}
              >
                <Show when={selectable()}>
                  <span />
                </Show>
                <div class="pl-4">
                  <VariantName variant={variant} />
                </div>
                <span class="pt-2 text-right text-sm text-ink">{formatAdminCurrency(variantPrice(product()!, variant))}</span>
                <For each={beforeStock()}>{(c) => <div class="min-w-0">{c.sku ? untrack(() => c.sku!(p.id, variant.id)) : null}</div>}</For>
                <span class="pt-2 text-right text-sm text-ink">{variant.stock.toLocaleString("th-TH")}</span>
                <For each={afterStock()}>{(c) => <div class="min-w-0">{c.sku ? untrack(() => c.sku!(p.id, variant.id)) : null}</div>}</For>
                <div class="flex justify-end pt-1.5">
                  <Show when={level() === "option"}>
                    <SkuToggle id={p.id} variant={variant} />
                  </Show>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    );
  };

  /** Narrow containers: the same information as a stacked card. */
  const CardRow = (p: { id: string }) => {
    const product = () => store.getById(p.id);
    const variants = () => product()?.adminVariants ?? [];
    const Cell = (c: { label: string; required?: boolean; children: JSX.Element }) => (
      <div class="flex min-w-0 flex-col gap-1">
        <span class="text-xs text-ink-gray">
          {c.label}
          <Show when={c.required}>
            <span class="text-system-red"> *</span>
          </Show>
        </span>
        {c.children}
      </div>
    );
    return (
      <div class="overflow-hidden rounded-card border border-border">
        <div class="flex flex-col gap-3 p-3">
          <div class="flex items-start gap-3">
            <Show when={selectable()}>
              <input type="checkbox" aria-label={`เลือก ${product()?.name ?? ""}`} checked={ticked().has(p.id)} disabled={props.disabled} onChange={(e) => tick(p.id, e.currentTarget.checked)} class="mt-3 size-4 shrink-0 rounded accent-brand-pink" />
            </Show>
            <div class="min-w-0 flex-1">
              <NameCell id={p.id} />
            </div>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p class="text-sm text-ink-gray">
              ราคาเดิม <span class="text-ink">{product() ? priceRange(product()!) : "-"}</span>
              <span class="ml-3">สต๊อก <span class="text-ink">{product() ? stockOf(product()!).toLocaleString("th-TH") : "-"}</span></span>
            </p>
            <Actions id={p.id} />
          </div>
          <For each={columns().filter((c) => c.product)}>
            {(c) => (
              <Show when={!c.hideOnProductCard?.(p.id)}>
                <Cell label={c.label} required={c.required}>{untrack(() => c.product!(p.id))}</Cell>
              </Show>
            )}
          </For>
        </div>
        <SkuBar id={p.id} />
        <Show when={isOpen(p.id)}>
          <For each={variants()}>
            {(variant) => (
              <div class="flex flex-col gap-2.5 border-t border-border/60 px-3 py-3" classList={{ "bg-surface-gray/40": level() === "option" && !isOn(p.id, variant.id) }}>
                <div class="flex items-start justify-between gap-3">
                  <VariantName variant={variant} />
                  <Show when={level() === "option"}>
                    <SkuToggle id={p.id} variant={variant} />
                  </Show>
                </div>
                <p class="text-sm text-ink-gray">
                  ราคาเดิม <span class="text-ink">{formatAdminCurrency(variantPrice(product()!, variant))}</span>
                  <span class="ml-3">สต๊อก <span class="text-ink">{variant.stock.toLocaleString("th-TH")}</span></span>
                </p>
                <For each={columns().filter((c) => c.sku)}>{(c) => <Cell label={c.label} required={c.required}>{untrack(() => c.sku!(p.id, variant.id))}</Cell>}</For>
              </div>
            )}
          </For>
        </Show>
      </div>
    );
  };

  return (
    <div ref={root} class="flex min-w-0 flex-col gap-4">
      <Show when={showLevels()}>
        <div role="radiogroup" aria-label="ระดับการเลือก" class="flex flex-col gap-3">
          <For
            each={[
              { value: "option" as const, label: "ระดับตัวเลือกสินค้า", hint: props.levelHints?.option ?? "ตั้งค่าแยกแต่ละตัวเลือกสินค้า (SKU)" },
              { value: "product" as const, label: "ระดับสินค้า", hint: props.levelHints?.product ?? "ใช้กับทุกตัวเลือกของสินค้า" },
            ]}
          >
            {(o) => (
              <label class="flex cursor-pointer items-start gap-2.5" classList={{ "cursor-not-allowed opacity-60": !!props.disabled }}>
                <input type="radio" name={`${uid}-level`} checked={level() === o.value} disabled={props.disabled} onChange={() => changeLevel(o.value)} class="mt-1 size-4 shrink-0 accent-brand-pink" />
                <span class="flex min-w-0 flex-col">
                  <span class="text-sm font-medium text-ink">{o.label}</span>
                  <span class="text-xs text-ink-gray">{o.hint}</span>
                </span>
              </label>
            )}
          </For>
          <Show when={props.levelNote?.[level()]}>
            {(note) => <p class="rounded-card bg-info-soft px-3 py-2 text-xs text-ink">{note()}</p>}
          </Show>
        </div>
      </Show>

      <div class="flex items-center justify-between gap-2">
        <p class="text-sm text-ink">
          <span class="font-semibold text-brand-pink">{props.value.length}</span> สินค้า
        </p>
        <div class="flex items-center gap-2">
          <Show when={!props.single && props.value.length > 0}>
            <button
              type="button"
              aria-label="ค้นหาในสินค้าที่เลือก"
              aria-pressed={searchOpen()}
              onClick={() => {
                if (searchOpen()) setQuery("");
                setSearchOpen(!searchOpen());
              }}
              class="flex size-11 items-center justify-center rounded-card border text-ink-gray transition-colors duration-150 lg:hover:bg-surface-pink"
              classList={{ "border-brand-pink text-brand-pink": searchOpen(), "border-border": !searchOpen() }}
            >
              <SearchIcon class="size-4" />
            </button>
          </Show>
          <Show when={!props.fixed}>
            <Button type="button" variant="outline" size="sm" disabled={props.disabled} onClick={() => setDialogOpen(true)}>
              {props.single && props.value.length > 0 ? "เปลี่ยนสินค้า" : "เลือกสินค้า"}
            </Button>
          </Show>
        </div>
      </div>

      <Show when={searchOpen()}>
        <SearchInput value={query()} onInput={setQuery} placeholder="ค้นหาในสินค้าที่เลือก ชื่อ, SKU..." />
      </Show>

      <Show
        when={props.value.length > 0}
        fallback={
          <button
            type="button"
            disabled={props.disabled || props.fixed}
            onClick={() => setDialogOpen(true)}
            class="font-normal rounded-card border border-dashed border-border bg-surface-gray/40 p-5 text-center text-sm text-ink-gray lg:hover:border-brand-pink"
          >
            ยังไม่ได้เลือกสินค้า กด "เลือกสินค้า" เพื่อเพิ่ม
          </button>
        }
      >
        <Show when={selectable() && (editable() || props.bulk)}>
          <div class="flex flex-col gap-3 rounded-card bg-surface-gray/60 p-3">
            <p class="text-sm text-ink">
              <span class="font-medium">จัดการแบบเป็นชุด</span>
              <span class="ml-3 text-ink-gray">
                <span class="font-semibold text-brand-pink">{selectedIds().length}</span> รายการที่เลือก
              </span>
            </p>
            <div class="flex flex-wrap items-end gap-3">
              <Show when={props.bulk}>{(b) => <div class="min-w-0 flex-1">{untrack(() => b()(selectedIds))}</div>}</Show>
              <Show when={editable()}>
                <Button type="button" variant="outline" size="sm" class="ml-auto" disabled={selectedIds().length === 0} onClick={() => remove(selectedIds())}>
                  ลบเป็นชุด
                </Button>
              </Show>
            </div>
          </div>
        </Show>

        <Show when={visibleIds().length > 0} fallback={<p class="rounded-card bg-surface-gray/40 p-4 text-center text-sm text-ink-gray">ไม่พบสินค้าที่ค้นหา</p>}>
          <Show
            when={wide()}
            fallback={
              <div class="flex flex-col gap-3">
                <Show when={selectable() && props.value.length > 1}>
                  <label class="flex min-h-9 items-center gap-2 px-1 text-sm text-ink-gray">
                    <input type="checkbox" checked={allTicked()} disabled={props.disabled} onChange={tickAll} class="size-4 rounded accent-brand-pink" />
                    เลือกทั้งหมด
                  </label>
                </Show>
                <For each={pageIds()}>{(id) => <CardRow id={id} />}</For>
              </div>
            }
          >
            <div class="overflow-hidden rounded-card border border-border">
              <div class="grid items-center gap-3 bg-surface-gray/60 px-3 py-2.5" style={{ "grid-template-columns": gridTemplate() }}>
                <Show when={selectable()}>
                  <input type="checkbox" aria-label="เลือกทั้งหมด" checked={allTicked()} disabled={props.disabled} onChange={tickAll} class="size-4 rounded accent-brand-pink" />
                </Show>
                <span class={HEAD}>ชื่อสินค้า</span>
                <span class={`${HEAD} text-right`}>ราคาเดิม</span>
                <For each={beforeStock()}>
                  {(c) => (
                    <span class={HEAD}>
                      {c.label}
                      <Show when={c.required}>
                        <span class="text-system-red"> *</span>
                      </Show>
                    </span>
                  )}
                </For>
                <span class={`${HEAD} text-right`}>สต๊อก</span>
                <For each={afterStock()}>
                  {(c) => (
                    <span class={HEAD}>
                      {c.label}
                      <Show when={c.required}>
                        <span class="text-system-red"> *</span>
                      </Show>
                    </span>
                  )}
                </For>
                <span class={`${HEAD} text-right`}>การดำเนินการ</span>
              </div>
              <For each={pageIds()}>{(id) => <TableRow id={id} />}</For>
            </div>
          </Show>
        </Show>

        <Show when={visibleIds().length > 20}>
          <Pagination page={currentPage()} totalPages={totalPages()} pageSize={pageSize()} pageSizeOptions={PAGE_SIZES} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
        </Show>
      </Show>

      <Show when={props.error}>
        <p role="alert" class="text-sm text-system-red">
          {props.error}
        </p>
      </Show>

      <ProductPickDialog open={dialogOpen()} onOpenChange={setDialogOpen} single={props.single} picked={props.value.map((r) => r.productId)} onConfirm={confirmPick} />

      <QuickViewDrawer
        open={quickViewProduct() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewProduct()?.name ?? ""}
        subtitle={quickViewProduct()?.sku}
        onViewFull={() => {
          const id = quickViewId();
          if (id) window.open(`/admin/products/${id}`, "_blank", "noopener");
        }}
      >
        <Show when={quickViewProduct()}>{(p) => <ProductQuickView product={p()} />}</Show>
      </QuickViewDrawer>
    </div>
  );
}

/** "เลือกสินค้า" dialog: search + tick list (radio in single mode), confirm "ยืนยัน (N)". */
function ProductPickDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; single?: boolean; picked: string[]; onConfirm: (ids: string[]) => void }) {
  const store = useAdminProducts();
  const uid = createUniqueId();
  const [search, setSearch] = createSignal("");
  const [chosen, setChosen] = createSignal<string[]>([]);

  createEffect(
    on(
      () => props.open,
      (open) => {
        if (!open) return;
        setSearch("");
        setChosen([...untrack(() => props.picked)]);
      },
    ),
  );

  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    return q ? store.products().filter((p) => haystack(p).includes(q)) : store.products();
  });
  const chosenSet = createMemo(() => new Set(chosen()));
  const allChosen = () => filtered().length > 0 && filtered().every((p) => chosenSet().has(p.id));
  const toggle = (id: string) => {
    if (props.single) return setChosen([id]);
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  };
  const toggleAll = () => {
    const ids = filtered().map((p) => p.id);
    if (allChosen()) setChosen((c) => c.filter((id) => !ids.includes(id)));
    else setChosen((c) => [...c, ...ids.filter((id) => !c.includes(id))]);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-card bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
            <div class="flex items-start justify-between gap-3 px-5 pt-5">
              <div class="min-w-0">
                <Dialog.Title class="text-lg font-semibold text-ink">เลือกสินค้า</Dialog.Title>
                <Dialog.Description class="mt-0.5 text-sm text-ink-gray">{props.single ? "เลือกได้ 1 สินค้า" : "ติ๊กสินค้าที่ต้องการ แล้วกดยืนยัน"}</Dialog.Description>
              </div>
              <Dialog.CloseButton aria-label="ปิด" class="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink">
                <CloseXIcon class="size-5" />
              </Dialog.CloseButton>
            </div>

            <div class="flex flex-col gap-3 px-5 pt-4">
              <SearchInput value={search()} onInput={setSearch} placeholder="ค้นหาชื่อสินค้า, SKU..." />
              <div class="flex items-center justify-between gap-3 text-sm">
                <Show when={!props.single} fallback={<span />}>
                  <label class="flex min-h-9 items-center gap-2 text-ink-gray">
                    <input type="checkbox" checked={allChosen()} onChange={toggleAll} class="size-4 rounded accent-brand-pink" />
                    เลือกทั้งหมด
                  </label>
                </Show>
                <span class="text-ink-gray">
                  เลือกแล้ว <span class="font-semibold text-brand-pink">{chosen().length}</span>
                </span>
              </div>
            </div>

            <div class="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto border-y border-border">
              <Show when={filtered().length > 0} fallback={<p class="p-6 text-center text-sm text-ink-gray">ไม่พบสินค้าที่ค้นหา</p>}>
                <For each={filtered()}>
                  {(p) => (
                    <label
                      class="flex cursor-pointer items-start gap-3 border-b border-border/60 px-5 py-3 transition-colors duration-150 last:border-b-0 lg:hover:bg-surface-pink/30"
                      classList={{ "bg-surface-pink/30": chosenSet().has(p.id) }}
                    >
                      <input
                        type={props.single ? "radio" : "checkbox"}
                        name={props.single ? `${uid}-single` : undefined}
                        checked={chosenSet().has(p.id)}
                        onChange={() => toggle(p.id)}
                        class="mt-3.5 size-4 shrink-0 rounded accent-brand-pink"
                      />
                      <img src={p.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
                      <span class="flex min-w-0 flex-1 flex-col">
                        <span class="line-clamp-2 text-sm leading-[1.75] text-ink">{p.name}</span>
                        <span class="truncate text-xs text-ink-gray">
                          ID: {p.sku || p.id}
                          <Show when={p.adminVariants.length > 0}> ({p.adminVariants.length} SKU)</Show>
                        </span>
                      </span>
                      <span class="flex shrink-0 flex-col items-end text-right">
                        <span class="text-sm text-ink">{priceRange(p)}</span>
                        <span class="text-xs text-ink-gray">สต๊อก {stockOf(p).toLocaleString("th-TH")}</span>
                      </span>
                    </label>
                  )}
                </For>
              </Show>
            </div>

            <div class="flex gap-3 p-4">
              <Button type="button" variant="outline" class="flex-1" onClick={() => props.onOpenChange(false)}>
                ยกเลิก
              </Button>
              <Button
                type="button"
                variant="primary"
                class="flex-1"
                disabled={props.single && chosen().length === 0}
                onClick={() => {
                  props.onConfirm(chosen());
                  props.onOpenChange(false);
                }}
              >
                ยืนยัน ({chosen().length})
              </Button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

function VariantThumb(props: { variant: AdminVariant }) {
  const src = () => props.variant.images?.[0] ?? (props.variant.mode === "image" ? props.variant.swatchImage : undefined);
  return (
    <span class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-media border border-border bg-surface-gray/60">
      <Show
        when={src()}
        fallback={
          <Show when={props.variant.color} fallback={<ImageIcon class="size-4 text-ink-placeholder" />}>
            {(c) => <span class="size-6 rounded-pill" style={{ "background-color": c() }} />}
          </Show>
        }
      >
        {(s) => <img src={s()} alt="" class="size-full object-cover" />}
      </Show>
    </span>
  );
}

/** Short Thai summary of a scope list, e.g. "3 สินค้า (1 สินค้าเลือกเฉพาะ SKU)". */
export function skuRefsSummary(refs: ProductSkuRef[]): string {
  const partial = refs.filter((r) => r.variantIds.length > 0).length;
  return `${refs.length} สินค้า${partial > 0 ? ` (${partial} สินค้าเลือกเฉพาะ SKU)` : ""}`;
}

/** Read-only list of picked products (thumbnail, name, ทั้งสินค้า or the picked SKUs), same look as the picker rows. */
export function ProductSkuRefList(props: { refs: ProductSkuRef[]; empty?: string }) {
  const store = useAdminProducts();
  return (
    <Show when={props.refs.length > 0} fallback={<p class="text-sm text-ink-gray">{props.empty ?? "ยังไม่ได้เลือกสินค้า"}</p>}>
      <ul class="flex flex-col gap-3">
        <For each={props.refs}>
          {(ref) => {
            const product = () => store.getById(ref.productId);
            const labels = () => ref.variantIds.map((id) => product()?.adminVariants.find((v) => v.id === id)?.label ?? id);
            return (
              <li class="flex items-center gap-3">
                <Show when={product()} fallback={<span class="size-10 shrink-0 rounded-media bg-surface-gray" />}>
                  {(p) => <img src={p().image} alt="" class="size-10 shrink-0 rounded-media object-cover" />}
                </Show>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-ink">{product()?.name ?? "ไม่พบสินค้านี้แล้ว"}</p>
                  <p class="text-xs text-ink-gray">{ref.variantIds.length > 0 ? `เฉพาะ SKU: ${labels().join(", ")}` : "ทั้งสินค้า"}</p>
                </div>
              </li>
            );
          }}
        </For>
      </ul>
    </Show>
  );
}
