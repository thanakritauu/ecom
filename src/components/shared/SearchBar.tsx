import { createMemo, createSignal, createUniqueId, For, Show, type JSX } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useProductCatalog } from "~/lib/productCatalog";
import { useCategoryContent } from "~/lib/categoryContent";
import { highlightSegments, matchesSearch, searchProducts } from "~/lib/productSearch";
import type { Product } from "~/lib/types";
import { CloseIcon } from "./icons";

const MAX_PRODUCTS = 8;
const MAX_CATEGORIES = 3;

type Suggestion = { kind: "category"; label: string; href: string } | { kind: "product"; product: Product; href: string };

const productHref = (p: Product) => `/product/${p.slug}${p.stockLeft !== undefined && p.stockLeft <= 0 ? "/out-of-stock" : ""}`;

/**
 * Autocomplete product search (ARIA combobox). Typing lists matching
 * categories, then products as horizontal rows (photo + name, typed words in
 * bold); Enter / "ดูผลการค้นหาทั้งหมด" opens `/products?search=`, which lists
 * the same matches (`~/lib/productSearch`).
 *
 * - `tone="onDark"` — Desktop header: translucent box on the pink bar, results
 *   in a dropdown under it.
 * - `tone="onLight"` — Mobile search screen: a white box with a pink border so
 *   it stands out on the white screen, results listed in the page below it.
 */
export function SearchBar(props: {
  tone?: "onDark" | "onLight";
  placeholder?: string;
  autofocus?: boolean;
  /** Called after any navigation (pick a result / submit) — the mobile screen closes itself with it. */
  onNavigate?: () => void;
  /** Rendered beside the box (the mobile screen's "ยกเลิก"), so results below still use the full width. */
  trailing?: JSX.Element;
}) {
  const dark = () => props.tone !== "onLight";
  const navigate = useNavigate();
  const catalog = useProductCatalog();
  const categoryContent = useCategoryContent();
  const listboxId = createUniqueId();
  const [query, setQuery] = createSignal("");
  const [open, setOpen] = createSignal(false);
  const [active, setActive] = createSignal(-1);
  let inputRef: HTMLInputElement | undefined;

  const trimmed = () => query().trim();
  const productMatches = createMemo(() => searchProducts(catalog.products(), query()));
  const categoryMatches = createMemo(() =>
    trimmed()
      ? categoryContent
          .categories()
          .filter((c) => c.status === "active" && matchesSearch(c.name, query()))
          .slice(0, MAX_CATEGORIES)
      : [],
  );
  const suggestions = createMemo<Suggestion[]>(() => [
    ...categoryMatches().map((c) => ({ kind: "category" as const, label: c.name, href: `/${c.slug}` })),
    // One row per product name — the mock catalog repeats some SKUs under several ids.
    ...productMatches()
      .filter((p, i, list) => list.findIndex((o) => o.name === p.name) === i)
      .slice(0, MAX_PRODUCTS)
      .map((p) => ({ kind: "product" as const, product: p, href: productHref(p) })),
  ]);
  const resultsHref = () => `/products?search=${encodeURIComponent(trimmed())}`;
  // The mobile screen always shows its list; the desktop dropdown only while focused with something typed.
  const panelVisible = () => !!trimmed() && (open() || !dark());

  const go = (href: string) => {
    setOpen(false);
    setActive(-1);
    inputRef?.blur();
    navigate(href);
    props.onNavigate?.();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const count = suggestions().length;
    if (e.key === "ArrowDown" && count) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % count);
    } else if (e.key === "ArrowUp" && count) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? count - 1 : i - 1));
    } else if (e.key === "Escape" && dark() && open()) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  const optionId = (i: number) => `${listboxId}-opt-${i}`;

  return (
    <div
      class="relative w-full"
      onFocusOut={(e) => {
        // Focus moving to a result row (inside this wrapper) keeps the dropdown open.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div class="flex items-center gap-3">
        <form
          role="search"
          class="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-pill px-[18px] py-2"
          classList={{
            "bg-white/30": dark(),
            "border-[1.5px] border-brand-pink bg-white shadow-[0_2px_8px_rgba(244,44,88,0.12)]": !dark(),
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const pick = suggestions()[active()];
            if (pick) go(pick.href);
            else if (trimmed()) go(resultsHref());
          }}
        >
          <svg
            viewBox="0 0 24 24"
            class="size-6 shrink-0"
            classList={{ "text-white": dark(), "text-brand-pink": !dark() }}
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" stroke-linecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            inputmode="search"
            enterkeyhint="search"
            name="q"
            autocomplete="off"
            autofocus={props.autofocus}
            role="combobox"
            aria-expanded={panelVisible()}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={active() >= 0 ? optionId(active()) : undefined}
            aria-label="ค้นหาสินค้า หรือหมวดหมู่"
            placeholder={props.placeholder ?? "ค้นหาสินค้า หรือหมวดหมู่"}
            value={query()}
            onInput={(e) => {
              setQuery(e.currentTarget.value);
              setActive(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            class="min-w-0 flex-1 bg-transparent text-sm outline-none"
            classList={{
              "text-white placeholder:text-white": dark(),
              "text-ink placeholder:text-ink-placeholder": !dark(),
            }}
          />
          <Show when={query()}>
            <button
              type="button"
              aria-label="ล้างคำค้นหา"
              onClick={() => {
                setQuery("");
                setActive(-1);
                inputRef?.focus();
              }}
              class="-mr-2 flex size-8 shrink-0 items-center justify-center rounded-pill"
              classList={{ "text-white": dark(), "text-ink-gray": !dark() }}
            >
              <CloseIcon />
            </button>
          </Show>
        </form>
        {props.trailing}
      </div>

      <Show when={panelVisible()}>
        <div
          class="flex flex-col overflow-hidden bg-white"
          classList={{
            "absolute left-0 top-full z-50 mt-2 w-full min-w-[min(400px,90vw)] max-h-[min(70vh,560px)] rounded-card shadow-[0_8px_28px_rgba(90,106,133,0.22)]": dark(),
            "mt-3": !dark(),
          }}
        >
          <Show
            when={suggestions().length > 0}
            fallback={
              <div class="flex flex-col items-center gap-1 px-4 py-8 text-center">
                <p class="text-sm font-medium text-ink">ไม่พบสินค้าที่ตรงกับ “{trimmed()}”</p>
                <p class="text-xs text-ink-gray">ลองค้นหาด้วยชื่อสินค้าหรือคำอื่น</p>
              </div>
            }
          >
            <ul id={listboxId} role="listbox" aria-label="ผลการค้นหา" class="flex-1 overflow-y-auto py-2">
              <For each={suggestions()}>
                {(s, i) => (
                  <li role="presentation">
                    <a
                      id={optionId(i())}
                      role="option"
                      aria-selected={active() === i()}
                      href={s.href}
                      tabindex="-1"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        go(s.href);
                      }}
                      onMouseEnter={() => setActive(i())}
                      class="flex items-center gap-3 px-4 py-2 font-normal transition-colors duration-150"
                      classList={{ "bg-surface-pink": active() === i() }}
                    >
                      <Show
                        when={s.kind === "product" ? s : undefined}
                        fallback={
                          <>
                            <span class="flex size-12 shrink-0 items-center justify-center rounded-media bg-surface-pink text-brand-pink">
                              <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                                <rect x="4" y="4" width="7" height="7" rx="1.5" />
                                <rect x="13" y="4" width="7" height="7" rx="1.5" />
                                <rect x="4" y="13" width="7" height="7" rx="1.5" />
                                <rect x="13" y="13" width="7" height="7" rx="1.5" />
                              </svg>
                            </span>
                            <span class="flex min-w-0 flex-1 flex-col">
                              <span class="text-sm leading-[1.75] text-ink">
                                <Highlighted text={(s as { label: string }).label} query={query()} />
                              </span>
                              <span class="text-xs text-ink-gray">หมวดหมู่</span>
                            </span>
                          </>
                        }
                      >
                        {(p) => (
                          <>
                            <img
                              src={p().product.image}
                              alt=""
                              loading="lazy"
                              class="size-12 shrink-0 rounded-media border border-border bg-white object-cover"
                            />
                            <span class="flex min-w-0 flex-1 flex-col">
                              <span class="line-clamp-2 text-sm leading-[1.75] text-ink">
                                <Highlighted text={p().product.name} query={query()} />
                              </span>
                              <Show when={p().product.stockLeft !== undefined && p().product.stockLeft! <= 0}>
                                <span class="text-xs text-ink-gray">สินค้าหมด</span>
                              </Show>
                            </span>
                          </>
                        )}
                      </Show>
                    </a>
                  </li>
                )}
              </For>
            </ul>
            <Show when={productMatches().length > 0}>
              <a
                href={resultsHref()}
                tabindex="-1"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  go(resultsHref());
                }}
                class="flex min-h-[48px] shrink-0 items-center justify-center border-t border-surface-gray px-4 text-sm font-medium text-brand-pink transition-colors duration-150 lg:hover:bg-surface-pink"
              >
                ดูผลการค้นหาทั้งหมด ({productMatches().length})
              </a>
            </Show>
          </Show>
        </div>
      </Show>
    </div>
  );
}

function Highlighted(props: { text: string; query: string }) {
  return (
    <For each={highlightSegments(props.text, props.query)}>
      {(seg) => (seg.match ? <strong class="font-semibold text-brand-pink">{seg.text}</strong> : <>{seg.text}</>)}
    </For>
  );
}
