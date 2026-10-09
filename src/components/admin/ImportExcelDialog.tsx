import { Dialog } from "@kobalte/core/dialog";
import { createSignal, For, Show } from "solid-js";
import * as XLSX from "xlsx";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { CloseXIcon, UploadIcon, CheckCircleIcon, WarningTriangleIcon, ErrorCircleIcon, DownloadIcon } from "~/components/admin/icons";
import { pushToast } from "~/lib/toast";

export type ImportRowStatus = "ready" | "warning" | "error";
export type ImportRowResult<T> = { row: number; data: T; status: ImportRowStatus; messages: string[]; preview: Record<string, string> };

/**
 * CMS Backoffice Polish §08-11 — generic Import Excel flow, reused by every
 * Admin module that needs it: native file picker → read the workbook →
 * caller-supplied `parseRow` validates each record (Prototype simulation —
 * everything happens client-side, no backend) → Preview table with
 * Ready/Warning/Failed counts → Confirm writes only the valid rows into the
 * caller's own store via `onConfirm`.
 */
export function ImportExcelDialog<T>(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Column headers the template file offers and the preview table shows, in order. */
  templateColumns: { key: string; label: string }[];
  /** Turns one raw spreadsheet row (header → cell text) into a validated result. Never throws — validation failures are reported as `status: "error"`. */
  parseRow: (raw: Record<string, string>, rowIndex: number) => ImportRowResult<T>;
  /** Only rows with status "ready" or "warning" are passed here — never "error" rows. */
  onConfirm: (rows: T[]) => Promise<void>;
}) {
  const [results, setResults] = createSignal<ImportRowResult<T>[]>([]);
  const [fileName, setFileName] = createSignal<string>();
  const [parsing, setParsing] = createSignal(false);
  const [importing, setImporting] = createSignal(false);
  let fileInputRef: HTMLInputElement | undefined;

  const reset = () => {
    setResults([]);
    setFileName(undefined);
    if (fileInputRef) fileInputRef.value = "";
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([props.templateColumns.map((c) => c.label)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "import-template.xlsx");
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
      const parsed = rows.map((raw, i) => props.parseRow(raw, i + 2)); // +2: header row is 1, data starts at 2 like a real spreadsheet
      setResults(parsed);
    } catch {
      pushToast("อ่านไฟล์นี้ไม่ได้ กรุณาใช้ไฟล์ .xlsx, .xls หรือ .csv", "error");
      reset();
    } finally {
      setParsing(false);
    }
  };

  const readyCount = () => results().filter((r) => r.status === "ready").length;
  const warningCount = () => results().filter((r) => r.status === "warning").length;
  const errorCount = () => results().filter((r) => r.status === "error").length;

  const confirmImport = async () => {
    const importable = results().filter((r) => r.status !== "error");
    setImporting(true);
    try {
      await props.onConfirm(importable.map((r) => r.data));
      pushToast(`นำเข้า ${importable.length.toLocaleString("th-TH")} รายการเรียบร้อยแล้ว`, "success");
      reset();
      props.onOpenChange(false);
    } catch {
      pushToast("นำเข้าข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setImporting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) reset();
    props.onOpenChange(open);
  };

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-card bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
            <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
              <Dialog.Title class="text-lg font-semibold text-ink">{props.title}</Dialog.Title>
              <Dialog.CloseButton aria-label="ปิด" class="flex size-11 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink">
                <CloseXIcon />
              </Dialog.CloseButton>
            </div>

            <div class="flex-1 overflow-y-auto p-5">
              <Show when={props.description}>
                <p class="mb-4 text-sm text-ink-gray">{props.description}</p>
              </Show>

              <Show
                when={results().length > 0}
                fallback={
                  <div class="flex flex-col items-center gap-4 rounded-card border-2 border-dashed border-border px-6 py-10 text-center">
                    <UploadIcon class="size-8 text-ink-placeholder" />
                    <div>
                      <p class="text-sm font-medium text-ink">เลือกไฟล์ Excel หรือ CSV ที่ต้องการนำเข้า</p>
                      <p class="mt-1 text-xs text-ink-gray">รองรับไฟล์ .xlsx, .xls และ .csv ดาวน์โหลดเทมเพลตเพื่อดูหัวคอลัมน์ที่ต้องใช้</p>
                    </div>
                    <div class="flex flex-wrap items-center justify-center gap-3">
                      <Button type="button" variant="primary" loading={parsing()} onClick={() => fileInputRef?.click()}>
                        <UploadIcon class="size-4" /> เลือกไฟล์
                      </Button>
                      <Button type="button" variant="outline" onClick={downloadTemplate}>
                        <DownloadIcon class="size-4" /> ดาวน์โหลดเทมเพลต
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      class="hidden"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        if (file) handleFile(file);
                      }}
                    />
                  </div>
                }
              >
                <div class="flex flex-col gap-4">
                  <div class="flex flex-wrap items-center justify-between gap-2 rounded-card bg-surface-gray/60 px-4 py-3 text-sm">
                    <span class="font-medium text-ink">ไฟล์ "{fileName()}" มี {results().length} รายการ</span>
                    <button type="button" onClick={reset} class="min-h-11 font-medium text-brand-pink hover:underline">
                      เลือกไฟล์ใหม่
                    </button>
                  </div>

                  <div class="grid grid-cols-3 gap-3">
                    <div class="flex items-center gap-2 rounded-card bg-success-soft px-3 py-2.5">
                      <CheckCircleIcon class="size-4 shrink-0 text-success" />
                      <div>
                        <p class="text-sm font-semibold text-ink">{readyCount()}</p>
                        <p class="text-xs text-ink-gray">พร้อมนำเข้า</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 rounded-card bg-warning-soft px-3 py-2.5">
                      <WarningTriangleIcon class="size-4 shrink-0 text-system-yellow" />
                      <div>
                        <p class="text-sm font-semibold text-ink">{warningCount()}</p>
                        <p class="text-xs text-ink-gray">นำเข้าได้ แต่ควรตรวจสอบ</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 rounded-card bg-danger-soft px-3 py-2.5">
                      <ErrorCircleIcon class="size-4 shrink-0 text-system-red" />
                      <div>
                        <p class="text-sm font-semibold text-ink">{errorCount()}</p>
                        <p class="text-xs text-ink-gray">ข้อมูลไม่ถูกต้อง จะไม่นำเข้า</p>
                      </div>
                    </div>
                  </div>

                  <div class="max-h-80 overflow-auto rounded-card border border-border">
                    <table class="w-full min-w-[480px] text-left text-sm">
                      <thead class="sticky top-0 bg-surface-card text-xs font-semibold uppercase tracking-wide text-ink-placeholder">
                        <tr>
                          <th class="px-3 py-2">แถว</th>
                          <For each={props.templateColumns}>{(c) => <th class="px-3 py-2">{c.label}</th>}</For>
                          <th class="px-3 py-2">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={results()}>
                          {(r) => (
                            <tr class="border-t border-border">
                              <td class="px-3 py-2 text-ink-gray">{r.row}</td>
                              <For each={props.templateColumns}>{(c) => <td class="px-3 py-2 text-ink">{r.preview[c.key] ?? ""}</td>}</For>
                              <td class="px-3 py-2">
                                <StatusBadge tone={r.status === "ready" ? "success" : r.status === "warning" ? "warning" : "danger"}>
                                  {r.status === "ready" ? "พร้อมนำเข้า" : r.status === "warning" ? "ควรตรวจสอบ" : "ไม่นำเข้า"}
                                </StatusBadge>
                                <Show when={r.messages.length > 0}>
                                  <p class="mt-1 text-xs text-ink-gray">{r.messages.join(", ")}</p>
                                </Show>
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </div>
              </Show>
            </div>

            <Show when={results().length > 0}>
              <div class="flex shrink-0 justify-end gap-3 border-t border-border p-4">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  ยกเลิก
                </Button>
                <Button type="button" variant="primary" loading={importing()} disabled={readyCount() + warningCount() === 0} onClick={confirmImport}>
                  นำเข้า {readyCount() + warningCount()} รายการ
                </Button>
              </div>
            </Show>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
