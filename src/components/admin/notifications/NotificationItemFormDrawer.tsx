import { createEffect, createSignal, Show } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { CloseXIcon } from "~/components/admin/icons";
import { IconImageUploader } from "~/components/admin/IconImageUploader";
import type { PromotionStripContent } from "~/lib/adminNotificationBar";

/**
 * §03/§07 — edits ONE fixed strip's content only (Icon/Text/Link) — no
 * Order, no create/delete, since there are always exactly two strips
 * (`variant` says which). The purple strip's on/off Toggle lives on the
 * page itself, not in here, since "enable/disable" and "edit content" are
 * different actions.
 */
export function NotificationItemFormDrawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: "purple" | "pink";
  initial: PromotionStripContent;
  saving: boolean;
  onSubmit: (values: PromotionStripContent) => void;
}) {
  const [icon, setIcon] = createSignal(props.initial.icon);
  const [text, setText] = createSignal(props.initial.text);
  const [linkLabel, setLinkLabel] = createSignal(props.initial.linkLabel ?? "");
  const [linkUrl, setLinkUrl] = createSignal(props.initial.linkUrl ?? "");
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  createEffect(() => {
    if (!props.open) return;
    setIcon(props.initial.icon);
    setText(props.initial.text);
    setLinkLabel(props.initial.linkLabel ?? "");
    setLinkUrl(props.initial.linkUrl ?? "");
    setErrors({});
  });

  const title = () => (props.variant === "purple" ? "แก้ไขแถบสีม่วง" : "แก้ไขแถบสีชมพูอ่อน");

  const validate = () => {
    const next: Record<string, string> = {};
    if (!text().trim()) next.text = "กรุณากรอกข้อความ";
    if (linkLabel().trim() && !linkUrl().trim()) next.linkUrl = "กรุณากรอก URL ปลายทางของลิงก์";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!validate()) return;
    props.onSubmit({
      icon: icon(),
      text: text().trim(),
      linkLabel: linkLabel().trim() || undefined,
      linkUrl: linkLabel().trim() ? linkUrl().trim() : undefined,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-y-0 right-0 z-50 flex w-full sm:w-[480px]">
          <Dialog.Content class="flex size-full flex-col overflow-hidden bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-drawer-in data-[closed]:animate-drawer-out">
            <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
              <Dialog.Title class="text-lg font-semibold text-ink">{title()}</Dialog.Title>
              <Dialog.CloseButton
                aria-label="ปิด"
                class="flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink"
              >
                <CloseXIcon />
              </Dialog.CloseButton>
            </div>

            <form onSubmit={handleSubmit} class="flex flex-1 flex-col overflow-hidden">
              <div class="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
                <div class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">ไอคอน (ไม่บังคับ)</span>
                  <IconImageUploader value={icon()} onChange={setIcon} disabled={props.saving} />
                </div>

                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">
                    ข้อความ<span class="text-system-red"> *</span>
                  </span>
                  <textarea
                    value={text()}
                    disabled={props.saving}
                    placeholder="เช่น Charmiss MEGA SALE ลดสูงสุด 70%"
                    onInput={(e) => setText(e.currentTarget.value)}
                    rows={3}
                    class={`rounded-card border bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray ${
                      errors().text ? "border-system-red" : "border-border"
                    }`}
                  />
                  <Show when={errors().text}>
                    <p class="text-sm text-system-red">{errors().text}</p>
                  </Show>
                </label>

                <TextField
                  label="ข้อความลิงก์ (ไม่บังคับ)"
                  value={linkLabel()}
                  onInput={(e) => setLinkLabel(e.currentTarget.value)}
                  placeholder="เช่น ช็อปเลย!"
                  disabled={props.saving}
                />

                <Show when={linkLabel().trim()}>
                  <TextField
                    label="URL ปลายทาง"
                    required
                    value={linkUrl()}
                    onInput={(e) => setLinkUrl(e.currentTarget.value)}
                    error={errors().linkUrl}
                    placeholder="/promotion/promotions"
                    disabled={props.saving}
                  />
                </Show>
              </div>

              <div class="flex shrink-0 gap-3 border-t border-border p-4" style={{ "padding-bottom": "max(1rem, env(safe-area-inset-bottom))" }}>
                <Button type="button" variant="outline" class="flex-1" onClick={() => props.onOpenChange(false)} disabled={props.saving}>
                  ยกเลิก
                </Button>
                <Button type="submit" variant="primary" class="flex-1" loading={props.saving}>
                  บันทึก
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
