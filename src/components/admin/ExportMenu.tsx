import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { DownloadIcon, FileSpreadsheetIcon } from "./icons";
import { exportToExcel, exportToReport, type ExportColumn } from "~/lib/adminExport";
import { pushToast } from "~/lib/toast";

/**
 * CMS Backoffice Polish §05-07 — every Admin table with a Data Table gets
 * this same Export button (Report/CSV or Excel/.xlsx), exporting exactly the
 * rows the caller currently has on screen — already filtered/searched, per
 * §06 — never the whole unfiltered dataset.
 */
export function ExportMenu<T>(props: { filenameBase: string; columns: ExportColumn<T>[]; rows: T[] }) {
  const handle = (kind: "report" | "excel") => {
    if (props.rows.length === 0) {
      pushToast("ไม่มีข้อมูลให้ Export ตามตัวกรองปัจจุบัน", "info");
      return;
    }
    if (kind === "report") exportToReport(props.filenameBase, props.columns, props.rows);
    else exportToExcel(props.filenameBase, props.columns, props.rows);
    pushToast(`Export ${props.rows.length} รายการสำเร็จ`, "success");
  };

  return (
    <DropdownMenu placement="bottom-end" gutter={8}>
      <DropdownMenu.Trigger class="flex min-h-11 shrink-0 items-center gap-2 rounded-pill border border-border bg-surface-card px-4 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-gray/50">
        <DownloadIcon class="size-4" /> Export
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="z-50 w-56 rounded-card border border-border bg-surface-card p-2 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
          <DropdownMenu.Item
            onSelect={() => handle("report")}
            class="flex min-h-11 cursor-pointer items-center gap-2 rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
          >
            <DownloadIcon class="size-4 text-ink-gray" /> Export Report (CSV)
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => handle("excel")}
            class="flex min-h-11 cursor-pointer items-center gap-2 rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink"
          >
            <FileSpreadsheetIcon class="size-4 text-ink-gray" /> Export Excel (.xlsx)
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );
}
