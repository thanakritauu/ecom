import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";
import {
  buildMockPromotionStripState,
  readStoredPromotionStrip,
  PROMOTION_STRIP_CHANGED_EVENT,
  PROMOTION_STRIP_STORAGE_KEY,
  type PromotionStripState,
} from "./adminNotificationBar";

/**
 * The top bars as Admin last saved them. SSR and the first client paint use
 * the seed (no hydration mismatch); the saved copy is read on mount and again
 * whenever Admin saves (other tab: `storage`, same tab: the change event).
 */
export function useStorefrontPromotionStrip(): Accessor<PromotionStripState> {
  const [state, setState] = createSignal<PromotionStripState>(buildMockPromotionStripState());
  onMount(() => {
    const refresh = () => setState(readStoredPromotionStrip());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === PROMOTION_STRIP_STORAGE_KEY) refresh();
    };
    refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(PROMOTION_STRIP_CHANGED_EVENT, refresh);
    onCleanup(() => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PROMOTION_STRIP_CHANGED_EVENT, refresh);
    });
  });
  return state;
}
