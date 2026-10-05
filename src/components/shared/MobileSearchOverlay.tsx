import { Dialog } from "@kobalte/core/dialog";
import { SearchBar } from "./SearchBar";

/**
 * Mobile/tablet search screen — full-screen white sheet: the search box (white
 * with a pink border so it reads clearly) + "ยกเลิก" on top, autocomplete
 * results scrolling underneath. Picking a result or submitting closes it.
 */
export function MobileSearchOverlay(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content class="fixed inset-0 z-50 flex flex-col bg-white outline-none">
          <Dialog.Title class="sr-only">ค้นหาสินค้า</Dialog.Title>
          <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 pt-4">
            <SearchBar
              tone="onLight"
              autofocus
              onNavigate={() => props.onOpenChange(false)}
              trailing={<Dialog.CloseButton class="flex min-h-[44px] shrink-0 items-center px-1 text-sm font-medium text-ink">ยกเลิก</Dialog.CloseButton>}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
