import { Dialog } from "@kobalte/core/dialog";
import { SearchBar } from "./SearchBar";

export function MobileSearchOverlay(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40" />
        <div class="fixed inset-x-0 top-0 z-50">
          <Dialog.Content class="flex items-center gap-3 bg-white p-4 shadow-card">
            <div class="flex-1">
              <Dialog.Title class="sr-only">ค้นหาสินค้า</Dialog.Title>
              <SearchBar tone="onLight" autofocus onSubmit={() => props.onOpenChange(false)} />
            </div>
            <Dialog.CloseButton class="flex min-h-[44px] shrink-0 items-center px-2 text-sm font-medium text-ink">
              ยกเลิก
            </Dialog.CloseButton>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
