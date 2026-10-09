import { Dialog } from "@kobalte/core/dialog";
import { createEffect, createSignal, For, Show } from "solid-js";
import { Button } from "~/components/shared/Button";
import { TextField } from "~/components/shared/TextField";
import type { AdminProduct } from "~/lib/adminProductStore";

export type StockEditValues = { stockLeft: number; variantStock: Record<string, number> };

const isValidStock = (raw: string) => raw.trim() !== "" && Number.isInteger(Number(raw)) && Number(raw) >= 0;

/**
 * Edits the stock the storefront actually reads: the product's `stockLeft`
 * (cart limit, "เหลือ X ชิ้นสุดท้าย", out of stock) and each option's stock
 * (an option at 0 can't be picked). Same modal shell as `ConfirmDialog`.
 */
export function StockEditDialog(props: {
  product: AdminProduct | undefined;
  onOpenChange: (open: boolean) => void;
  onSave: (values: StockEditValues) => Promise<void>;
}) {
  const [stock, setStock] = createSignal("");
  const [variantStock, setVariantStock] = createSignal<Record<string, string>>({});
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  createEffect(() => {
    const p = props.product;
    if (!p) return;
    setStock(String(p.stockLeft ?? 0));
    setVariantStock(Object.fromEntries(p.adminVariants.map((v) => [v.id, String(v.stock)])));
    setErrors({});
    setSubmitError(undefined);
  });

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const p = props.product;
    if (!p) return;
    const next: Record<string, string> = {};
    if (!isValidStock(stock())) next.stock = "กรุณากรอกจำนวนสต๊อกที่ถูกต้อง";
    for (const v of p.adminVariants) if (!isValidStock(variantStock()[v.id] ?? "")) next[v.id] = "กรุณากรอกจำนวนที่ถูกต้อง";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    setSubmitError(undefined);
    try {
      await props.onSave({
        stockLeft: Number(stock()),
        variantStock: Object.fromEntries(Object.entries(variantStock()).map(([id, raw]) => [id, Number(raw)])),
      });
    } catch {
      setSubmitError("บันทึกสต๊อกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={props.product !== undefined} onOpenChange={(open) => !saving() && props.onOpenChange(open)}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="flex max-h-[90vh] w-full max-w-md flex-col rounded-card bg-surface-card p-5 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
            <Dialog.Title class="text-lg font-semibold text-ink">แก้ไขสต๊อก</Dialog.Title>
            <Dialog.Description class="mt-1 truncate text-sm text-ink-gray">{props.product?.name ?? ""}</Dialog.Description>
            <form onSubmit={handleSubmit} class="mt-4 flex min-h-0 flex-col gap-4">
              <div class="flex min-h-0 flex-col gap-4 overflow-y-auto">
                <div class="flex flex-col gap-1.5">
                  <TextField label="สต๊อกสินค้า" required type="number" min="0" value={stock()} onInput={(e) => setStock(e.currentTarget.value)} error={errors().stock} disabled={saving()} />
                  <p class="text-xs text-ink-gray">จำนวนที่ลูกค้าสั่งได้ ถ้าเป็น 0 หน้าร้านจะขึ้นว่าสินค้าหมด</p>
                </div>
                <Show when={(props.product?.adminVariants.length ?? 0) > 0}>
                  <div class="flex flex-col gap-3">
                    <h3 class="text-sm font-semibold text-ink">สต๊อกตามตัวเลือก</h3>
                    <For each={props.product?.adminVariants ?? []}>
                      {(v) => (
                        <TextField
                          label={v.label || "ตัวเลือก"}
                          type="number"
                          min="0"
                          value={variantStock()[v.id] ?? ""}
                          onInput={(e) => {
                            const value = e.currentTarget.value;
                            setVariantStock((prev) => ({ ...prev, [v.id]: value }));
                          }}
                          error={errors()[v.id]}
                          disabled={saving()}
                        />
                      )}
                    </For>
                    <p class="text-xs text-ink-gray">ตัวเลือกที่สต๊อกเป็น 0 ลูกค้าจะเลือกไม่ได้</p>
                  </div>
                </Show>
              </div>
              <Show when={submitError()}>
                <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
                  {submitError()}
                </p>
              </Show>
              <div class="flex gap-3">
                <Button type="button" variant="outline" class="flex-1" onClick={() => props.onOpenChange(false)} disabled={saving()}>
                  ยกเลิก
                </Button>
                <Button type="submit" variant="primary" class="flex-1" loading={saving()}>
                  {saving() ? "กำลังบันทึก..." : "บันทึกสต๊อก"}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
