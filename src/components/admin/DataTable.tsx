import { For, type JSX } from "solid-js";

export type DataTableColumn<T> = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** Progressively drop less-essential columns on narrower desktop widths instead of shrinking every column. */
  hideBelowXl?: boolean;
  /** Overrides the plain-text header cell — used for the "Select All" checkbox header (Global Admin UX Rule #2), nothing else needs this. */
  renderHeader?: () => JSX.Element;
  render: (row: T) => JSX.Element;
};

const alignClass: Record<"left" | "right" | "center", string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/**
 * Generic table meant for reuse across every future list module (Orders,
 * Products, Customers, Inventory, Reviews — PART 16). Desktop renders an
 * actual `<table>`; mobile renders whatever card layout the caller supplies
 * via `renderMobileCard` instead of squeezing the same columns into an
 * unreadable strip (PART 13) — no server-side sort/filter/paginate, since
 * there's no backend to do that against.
 */
export function DataTable<T>(props: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  renderMobileCard: (row: T) => JSX.Element;
  onRowClick?: (row: T) => void;
}) {
  return (
    <>
      <div class="hidden overflow-x-auto rounded-card border border-surface-gray bg-white lg:block">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-surface-gray">
              <For each={props.columns}>
                {(col) => (
                  <th
                    class={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-placeholder ${alignClass[col.align ?? "left"]} ${col.hideBelowXl ? "hidden xl:table-cell" : ""}`}
                  >
                    {col.renderHeader ? col.renderHeader() : col.label}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={props.rows}>
              {(row) => (
                <tr
                  class={`border-b border-surface-gray last:border-0 ${props.onRowClick ? "cursor-pointer transition-colors duration-150 hover:bg-surface-pink/40" : ""}`}
                  onClick={() => props.onRowClick?.(row)}
                >
                  <For each={props.columns}>
                    {(col) => (
                      <td class={`px-4 py-3 align-middle ${alignClass[col.align ?? "left"]} ${col.hideBelowXl ? "hidden xl:table-cell" : ""}`}>
                        {col.render(row)}
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <div class="flex flex-col gap-3 lg:hidden">
        <For each={props.rows}>{(row) => props.renderMobileCard(row)}</For>
      </div>
    </>
  );
}
