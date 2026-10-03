import * as XLSX from "xlsx";

/**
 * CMS Backoffice Polish §05-07 — Export Report / Export Excel, shared by
 * every Admin table. `value` always returns the plain display value (never
 * pre-formatted with currency symbols beyond what the table itself shows),
 * so a column reads the same in the export as it does on screen.
 */
export type ExportColumn<T> = { header: string; value: (row: T) => string | number };

function toRows<T>(columns: ExportColumn<T>[], rows: T[]): (string | number)[][] {
  return [columns.map((c) => c.header), ...rows.map((row) => columns.map((c) => c.value(row)))];
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** §06 — "Report": the current filtered/searched dataset, exported as CSV (UTF-8 BOM so Thai text opens correctly in Excel) — no backend report engine, generated entirely client-side. */
export function exportToReport<T>(filenameBase: string, columns: ExportColumn<T>[], rows: T[]) {
  const csv = "﻿" + toRows(columns, rows).map((r) => r.map(csvCell).join(",")).join("\r\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filenameBase}.csv`);
}

/** §07 — a real .xlsx workbook (via SheetJS), same current filtered dataset and columns as the Report export. */
export function exportToExcel<T>(filenameBase: string, columns: ExportColumn<T>[], rows: T[]) {
  const ws = XLSX.utils.aoa_to_sheet(toRows(columns, rows));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filenameBase}.xlsx`);
}
