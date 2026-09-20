import { Dialog } from "@kobalte/core/dialog";
import { createSignal, For, Show } from "solid-js";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { CloseXIcon, ImageIcon } from "~/components/admin/icons";
import type { PromotionPageBanners, PromotionPageProductRef } from "~/lib/adminContent";

type PreviewDevice = "desktop" | "mobile";

/**
 * Landing Page Architecture & Promotion Page Migration — was
 * `PromotionPagePreview.tsx`. Hero Banner → Title → Description → Product
 * Grid, close to the customer-facing shape without building an iframe or a
 * real page-builder. Mobile view falls back to the Desktop banner when no
 * Mobile Banner was uploaded rather than showing a broken image.
 */
function LandingPagePreviewContent(props: { banners: PromotionPageBanners; title: string; description: string; products: PromotionPageProductRef[]; device: PreviewDevice }) {
  const store = useAdminProducts();
  const bannerSrc = () => (props.device === "mobile" ? props.banners.mobile || props.banners.desktop : props.banners.desktop);

  return (
    <div class="flex flex-col" classList={{ "mx-auto w-full max-w-[360px]": props.device === "mobile" }}>
      <div class="aspect-[16/7] w-full overflow-hidden bg-surface-gray/60" classList={{ "aspect-[9/12]": props.device === "mobile" }}>
        <Show when={bannerSrc()} fallback={<div class="flex size-full items-center justify-center text-ink-placeholder"><ImageIcon class="size-8" /></div>}>
          <img src={bannerSrc()} alt="" class="size-full object-cover" />
        </Show>
      </div>

      <div class="flex flex-col gap-2 px-4 py-5 text-center">
        <h2 class="text-xl font-bold text-ink">{props.title || "Title"}</h2>
        <p class="text-sm text-ink-gray">{props.description || "Description"}</p>
      </div>

      <div class="grid gap-3 px-4 pb-5" classList={{ "grid-cols-2": props.device === "mobile", "grid-cols-4": props.device === "desktop" }}>
        <For each={props.products}>
          {(ref) => {
            const product = () => store.getById(ref.productId);
            return (
              <Show when={product()}>
                {(p) => (
                  <div class="flex flex-col gap-1.5">
                    <div class="aspect-square overflow-hidden rounded-media bg-surface-gray/60">
                      <img src={p().image} alt="" class="size-full object-cover" />
                    </div>
                    <p class="line-clamp-2 text-xs text-ink">{p().name}</p>
                    <p class="text-xs font-semibold text-brand-pink">{formatAdminCurrency(p().price)}</p>
                  </div>
                )}
              </Show>
            );
          }}
        </For>
      </div>

      <Show when={props.products.length === 0}>
        <p class="px-4 pb-5 text-center text-sm text-ink-gray">ยังไม่ได้เลือกสินค้า</p>
      </Show>
    </div>
  );
}

/** One Preview dialog reused by Create, Edit, and the Detail page, so "Preview หน้า" behaves identically everywhere it appears. */
export function LandingPagePreviewDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banners: PromotionPageBanners;
  title: string;
  description: string;
  products: PromotionPageProductRef[];
}) {
  const [device, setDevice] = createSignal<PreviewDevice>("desktop");

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-card bg-white shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
            <div class="flex shrink-0 items-center justify-between gap-3 border-b border-surface-gray px-5 py-4">
              <Dialog.Title class="text-lg font-semibold text-ink">Preview หน้า Landing Page</Dialog.Title>
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1 rounded-pill bg-surface-gray p-1">
                  <button
                    type="button"
                    onClick={() => setDevice("desktop")}
                    class={`min-h-9 rounded-pill px-3 text-sm font-medium transition-colors duration-150 ${device() === "desktop" ? "bg-white text-ink shadow-sm" : "text-ink-gray"}`}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevice("mobile")}
                    class={`min-h-9 rounded-pill px-3 text-sm font-medium transition-colors duration-150 ${device() === "mobile" ? "bg-white text-ink shadow-sm" : "text-ink-gray"}`}
                  >
                    Mobile
                  </button>
                </div>
                <Dialog.CloseButton aria-label="ปิด" class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink">
                  <CloseXIcon />
                </Dialog.CloseButton>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto bg-surface-gray/40 p-5">
              <div class="mx-auto overflow-hidden rounded-card bg-white shadow-card" classList={{ "max-w-3xl": device() === "desktop" }}>
                <LandingPagePreviewContent banners={props.banners} title={props.title} description={props.description} products={props.products} device={device()} />
              </div>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

export { LandingPagePreviewContent };
