import { createEffect, createSignal, For, on, Show } from "solid-js";
import type { Order } from "~/lib/types";
import { getOrderReviews, orderItemKey, reviewableItems, saveOrderReviews } from "~/lib/orderHistory";
import { pushToast } from "~/lib/toast";
import starGold from "~/assets/icons/star-gold-4.svg";
import { Button } from "../shared/Button";
import { SheetModal } from "../shared/SheetModal";

const MAX_REVIEW_CHARS = 500;
const RATING_LABELS = ["แย่มาก", "ไม่ค่อยดี", "พอใช้", "ดี", "ดีมาก"];

/**
 * "รีวิว" on a delivered order — one block per item (free gift skipped):
 * a required 1–5 star rating and an optional comment. Mock save via
 * `saveOrderReviews`; the order card then shows "รีวิวแล้ว".
 */
export function OrderReviewDialog(props: { order: Order; open: boolean; onOpenChange: (open: boolean) => void }) {
  const items = () => reviewableItems(props.order);
  const [ratings, setRatings] = createSignal<Record<string, number>>({});
  const [texts, setTexts] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);

  // Fresh form each time it opens, prefilled with anything already saved.
  createEffect(
    on(
      () => props.open,
      (open) => {
        if (!open) return;
        const saved = getOrderReviews(props.order.id);
        setRatings(Object.fromEntries(Object.entries(saved).map(([k, r]) => [k, r.rating])));
        setTexts(Object.fromEntries(Object.entries(saved).map(([k, r]) => [k, r.text])));
      },
    ),
  );

  const missing = () => items().filter((item) => !ratings()[orderItemKey(item)]).length;

  const submit = async () => {
    if (missing() > 0 || saving()) return;
    setSaving(true);
    try {
      await saveOrderReviews(
        props.order.id,
        Object.fromEntries(items().map((item) => [orderItemKey(item), { rating: ratings()[orderItemKey(item)], text: (texts()[orderItemKey(item)] ?? "").trim() }])),
      );
      pushToast("ส่งรีวิวเรียบร้อย", "success", "ขอบคุณที่แบ่งปันความคิดเห็นกับเรา");
      props.onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetModal
      open={props.open}
      onOpenChange={(open) => !saving() && props.onOpenChange(open)}
      height="auto"
      title="รีวิวสินค้า"
      description={`คำสั่งซื้อ ${props.order.id}`}
      footer={
        <>
          <Button type="button" variant="primary" size="lg" class="w-full" loading={saving()} disabled={missing() > 0} onClick={submit}>
            {saving() ? "กำลังส่งรีวิว..." : "ส่งรีวิว"}
          </Button>
          <Show when={missing() > 0}>
            <p class="text-center text-xs text-ink-gray">ให้คะแนนสินค้าให้ครบทุกรายการก่อนส่งรีวิว</p>
          </Show>
        </>
      }
    >
      <For each={items()}>
        {(item, i) => {
          const key = orderItemKey(item);
          const rating = () => ratings()[key] ?? 0;
          const text = () => texts()[key] ?? "";
          return (
            <section class="flex flex-col gap-3" classList={{ "border-t border-surface-gray pt-5": i() > 0 }} aria-label={`รีวิว ${item.name}`}>
              <div class="flex items-center gap-3">
                <img src={item.image} alt="" loading="lazy" class="size-[60px] shrink-0 rounded-2xl border border-surface-gray object-cover" />
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-2 text-sm font-medium leading-[1.75] text-ink">{item.name}</p>
                  <p class="text-xs text-ink-gray">{item.variantLabel}</p>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <p class="text-sm font-medium text-ink">
                  ให้คะแนนสินค้า <span class="text-system-red">*</span>
                </p>
                <div class="flex items-center gap-2">
                  <div role="radiogroup" aria-label={`คะแนน ${item.name}`} class="-ml-1.5 flex">
                    <For each={[1, 2, 3, 4, 5]}>
                      {(star) => (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={rating() === star}
                          aria-label={`${star} ดาว`}
                          disabled={saving()}
                          onClick={() => setRatings((r) => ({ ...r, [key]: star }))}
                          class="flex size-11 items-center justify-center rounded-pill transition-transform duration-150 active:scale-90"
                        >
                          <img src={starGold} alt="" class="size-7" classList={{ "opacity-25 grayscale": star > rating() }} />
                        </button>
                      )}
                    </For>
                  </div>
                  <Show when={rating() > 0}>
                    <span class="text-sm text-ink-gray">{RATING_LABELS[rating() - 1]}</span>
                  </Show>
                </div>
              </div>

              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">
                  ความคิดเห็น <span class="text-ink-gray">(ไม่บังคับ)</span>
                </span>
                <textarea
                  rows={3}
                  maxlength={MAX_REVIEW_CHARS}
                  value={text()}
                  disabled={saving()}
                  onInput={(e) => setTexts((t) => ({ ...t, [key]: e.currentTarget.value }))}
                  placeholder="เล่าให้เพื่อน ๆ ฟังหน่อย เนื้อสัมผัส สี กลิ่น ใช้แล้วเป็นอย่างไร"
                  class="rounded-card border border-border bg-surface-card px-4 py-3 text-base leading-[1.75] text-ink outline-none placeholder:text-ink-placeholder focus:border-brand-pink"
                />
                <span class="self-end text-xs text-ink-gray">
                  {text().length}/{MAX_REVIEW_CHARS}
                </span>
              </label>
            </section>
          );
        }}
      </For>
    </SheetModal>
  );
}
