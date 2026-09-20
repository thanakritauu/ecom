import { Dialog } from "@kobalte/core/dialog";
import { For, Show, createSignal } from "solid-js";
import type { Product } from "~/lib/types";
import { Button } from "./Button";
import { PriceDisplay } from "./PriceDisplay";

/**
 * Variant picker for products with more than one shade/size. Renders as a
 * bottom sheet on mobile (thumb-reachable, per the audit's mobile-UX notes)
 * and a centered dialog from `sm:` up. Kobalte's Dialog gives us focus trap
 * + Escape-to-close + scroll lock for free.
 */
export function QuickAddSheet(props: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (variantId: string) => Promise<void>;
}) {
  const [selected, setSelected] = createSignal<string | null>(null);
  const [status, setStatus] = createSignal<"idle" | "loading" | "error">("idle");

  const confirm = async () => {
    const variantId = selected();
    if (!variantId) return;
    setStatus("loading");
    try {
      await props.onConfirm(variantId);
      setStatus("idle");
      setSelected(null);
      props.onOpenChange(false);
    } catch {
      setStatus("error");
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 data-[expanded]:animate-toast-in" />
        <div class="fixed inset-x-0 bottom-0 z-50 flex justify-center sm:inset-0 sm:items-center">
          <Dialog.Content class="flex w-full max-w-[420px] flex-col gap-5 rounded-t-card bg-white p-6 shadow-card sm:rounded-card">
            <div class="mx-auto -mt-2 mb-1 h-1 w-10 rounded-pill bg-surface-gray sm:hidden" aria-hidden="true" />
            <div class="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title class="text-lg font-medium text-ink">{props.product.name}</Dialog.Title>
                <div class="mt-1">
                  <PriceDisplay
                    price={props.product.price}
                    compareAtPrice={props.product.compareAtPrice}
                    size="sm"
                  />
                </div>
              </div>
              <Dialog.CloseButton class="flex size-11 shrink-0 items-center justify-center rounded-pill text-2xl text-ink-gray hover:bg-surface-pink">
                <span aria-hidden="true">×</span>
                <span class="sr-only">ปิด</span>
              </Dialog.CloseButton>
            </div>

            <Dialog.Description class="text-sm text-ink-gray">เลือกตัวเลือกสินค้า</Dialog.Description>

            <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="ตัวเลือกสินค้า">
              <For each={props.product.variants}>
                {(variant) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected() === variant.id}
                    onClick={() => setSelected(variant.id)}
                    class={`flex min-h-[44px] items-center gap-2 rounded-pill border px-4 py-2 text-sm font-medium transition-colors duration-250 ${
                      selected() === variant.id
                        ? "border-brand-pink bg-brand-pink text-white"
                        : "border-surface-gray bg-white text-ink hover:border-brand-pink"
                    }`}
                  >
                    <span
                      class="size-4 shrink-0 rounded-full border border-black/10"
                      style={{ "background-color": variant.color }}
                      aria-hidden="true"
                    />
                    {variant.label}
                  </button>
                )}
              </For>
            </div>

            <Show when={status() === "error"}>
              <p class="text-sm text-system-red" role="alert">
                เพิ่มลงตะกร้าไม่สำเร็จ กรุณาลองอีกครั้ง
              </p>
            </Show>

            <Button
              variant="primary"
              size="lg"
              class="w-full"
              disabled={!selected()}
              loading={status() === "loading"}
              onClick={confirm}
            >
              {status() === "error" ? "ลองอีกครั้ง" : "เพิ่มลงตะกร้า"}
            </Button>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
