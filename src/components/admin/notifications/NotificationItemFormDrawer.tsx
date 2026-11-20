import { createEffect, createSignal, For, Show } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { CloseXIcon } from "~/components/admin/icons";
import { IconImageUploader } from "~/components/admin/IconImageUploader";
import { isStripColor, STRIP_COLOR_PRESETS, stripTone, type PromotionStripContent } from "~/lib/adminNotificationBar";
import { CheckIcon } from "~/components/shared/icons";
import { FormErrorSummary } from "~/components/admin/FormErrorSummary";
import { clearFieldError, reportFormErrors, type FormErrors } from "~/lib/adminFormValidation";
import { scrollToFirstErrorIn } from "~/lib/adminDrawerScroll";

const LABELS: Record<string, string> = { text: "ข้อความ", linkUrl: "ลิงก์ปลายทาง", bgColor: "สีแถบ" };

/** Edits one top bar (icon, text, link, colour). The first bar's on/off lives on the page. */
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
  const [bgColor, setBgColor] = createSignal(props.initial.bgColor);
  /** The hex box while typing (may be half a colour); `bgColor` takes it once it's a full `#rrggbb`. */
  const [hexDraft, setHexDraft] = createSignal(props.initial.bgColor);
  const pickColor = (hex: string) => {
    setBgColor(hex.toLowerCase());
    setHexDraft(hex.toLowerCase());
    clearError("bgColor");
  };
  const isPreset = () => STRIP_COLOR_PRESETS.some((c) => c.value === bgColor());
  const [errors, setErrors] = createSignal<FormErrors>({});
  const clearError = (key: string) => setErrors((prev) => clearFieldError(prev, key));
  let bodyRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (!props.open) return;
    setIcon(props.initial.icon);
    setText(props.initial.text);
    setLinkLabel(props.initial.linkLabel ?? "");
    setLinkUrl(props.initial.linkUrl ?? "");
    setBgColor(props.initial.bgColor);
    setHexDraft(props.initial.bgColor);
    setErrors({});
  });

  const title = () => (props.variant === "purple" ? "แก้ไขแถบประกาศที่ 1" : "แก้ไขแถบประกาศที่ 2");

  const validate = () => {
    const next: FormErrors = {};
    if (!text().trim()) next.text = "กรุณากรอกข้อความ";
    if (!isStripColor(hexDraft().trim())) next.bgColor = "กรุณากรอกรหัสสีให้ครบ 6 หลัก เช่น #7650ff";
    const url = linkUrl().trim();
    if (linkLabel().trim() && !url) next.linkUrl = "กรุณากรอกลิงก์ปลายทาง";
    else if (linkLabel().trim() && !url.startsWith("/") && !/^https?:\/\/\S+$/i.test(url)) next.linkUrl = "ลิงก์ต้องขึ้นต้นด้วย / หรือ https://";
    setErrors(next);
    if (!reportFormErrors(next, LABELS)) return true;
    scrollToFirstErrorIn(bodyRef, next);
    return false;
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!validate()) return;
    props.onSubmit({
      icon: icon(),
      text: text().trim(),
      linkLabel: linkLabel().trim() || undefined,
      linkUrl: linkLabel().trim() ? linkUrl().trim() : undefined,
      bgColor: bgColor(),
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-y-0 right-0 z-50 flex w-full sm:w-[480px]">
          <Dialog.Content class="flex size-full flex-col overflow-hidden bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-drawer-in data-[closed]:animate-drawer-out">
            <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
              <Dialog.Title class="text-base font-semibold text-ink">{title()}</Dialog.Title>
              <Dialog.CloseButton
                aria-label="ปิด"
                class="flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink"
              >
                <CloseXIcon />
              </Dialog.CloseButton>
            </div>

            <form onSubmit={handleSubmit} noValidate class="flex flex-1 flex-col overflow-hidden">
              <div ref={bodyRef} class="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
                <FormErrorSummary errors={errors()} labels={LABELS} />
                <div class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">ไอคอน</span>
                  <IconImageUploader value={icon()} onChange={setIcon} disabled={props.saving} />
                  <span class="text-xs text-ink-gray">ไม่ใส่ก็ได้ แถบจะแสดงเฉพาะข้อความ</span>
                </div>

                <label data-field="text" class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">
                    ข้อความ<span class="text-system-red"> *</span>
                  </span>
                  <textarea
                    value={text()}
                    disabled={props.saving}
                    placeholder="เช่น ลดสูงสุด 70% รับคูปองลดเพิ่ม 25%"
                    aria-invalid={errors().text ? true : undefined}
                    onInput={(e) => {
                      setText(e.currentTarget.value);
                      if (e.currentTarget.value.trim()) clearError("text");
                    }}
                    rows={3}
                    class={`rounded-card border bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray ${
                      errors().text ? "border-system-red" : "border-border"
                    }`}
                  />
                  <Show when={errors().text}>
                    <p class="text-sm text-system-red">{errors().text}</p>
                  </Show>
                </label>

                <div data-field="bgColor" class="flex flex-col gap-2">
                  <span class="text-sm font-medium text-ink">
                    สีแถบ<span class="text-system-red"> *</span>
                  </span>
                  <div class="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="สีแถบ">
                    <For each={STRIP_COLOR_PRESETS}>
                      {(c) => (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={bgColor() === c.value}
                          aria-label={c.label}
                          title={c.label}
                          disabled={props.saving}
                          onClick={() => pickColor(c.value)}
                          style={{ "background-color": c.value }}
                          class="flex size-9 items-center justify-center rounded-pill ring-1 ring-inset ring-border transition-shadow duration-150 disabled:cursor-not-allowed"
                          classList={{ "outline outline-2 outline-offset-2 outline-brand-pink": bgColor() === c.value }}
                        >
                          <Show when={bgColor() === c.value}>
                            <CheckIcon class={`size-4 ${stripTone(c.value) === "dark" ? "text-white" : "text-ink"}`} />
                          </Show>
                        </button>
                      )}
                    </For>
                  </div>
                  {/* Any other colour: the system picker, or a hex typed in. */}
                  <div class="flex items-center gap-2">
                    <label
                      class="relative flex size-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-pill ring-1 ring-inset ring-border"
                      classList={{ "outline outline-2 outline-offset-2 outline-brand-pink": !isPreset() }}
                      style={{ "background-color": bgColor() }}
                      title="เลือกสีเอง"
                    >
                      <input
                        type="color"
                        value={bgColor()}
                        disabled={props.saving}
                        onInput={(e) => pickColor(e.currentTarget.value)}
                        aria-label="เลือกสีเอง"
                        class="absolute inset-0 size-full cursor-pointer opacity-0"
                      />
                    </label>
                    <div class="min-w-0 flex-1">
                      <TextField
                        label="กำหนดเอง"
                        value={hexDraft()}
                        disabled={props.saving}
                        placeholder="#7650ff"
                        maxLength={7}
                        onInput={(e) => {
                          const v = e.currentTarget.value.trim();
                          setHexDraft(v);
                          if (isStripColor(v)) pickColor(v);
                        }}
                        error={errors().bgColor}
                      />
                    </div>
                  </div>
                  {/* How it reads: text turns white on a dark colour, dark on a light one. */}
                  <div
                    class="flex min-h-10 items-center justify-center rounded-card px-4 py-2 text-center text-xs ring-1 ring-inset ring-border sm:text-sm"
                    classList={{ "text-white": stripTone(bgColor()) === "dark", "text-ink": stripTone(bgColor()) === "light" }}
                    style={{ "background-color": bgColor() }}
                  >
                    <span class="line-clamp-2">
                      {text().trim() || "ตัวอย่างข้อความบนแถบ"}
                      <Show when={linkLabel().trim()}>
                        {" "}
                        <span class="font-bold underline">{linkLabel().trim()}</span>
                      </Show>
                    </span>
                  </div>
                  <span class="text-xs text-ink-gray">สีตัวอักษรปรับเป็นขาวหรือเข้มให้อ่านง่ายอัตโนมัติ</span>
                </div>

                <TextField
                  label="ข้อความลิงก์"
                  value={linkLabel()}
                  onInput={(e) => {
                    setLinkLabel(e.currentTarget.value);
                    if (!e.currentTarget.value.trim()) clearError("linkUrl");
                  }}
                  placeholder="เช่น ช็อปเลย"
                  disabled={props.saving}
                />

                <Show when={linkLabel().trim()}>
                  <TextField
                    label="ลิงก์ปลายทาง"
                    required
                    value={linkUrl()}
                    onInput={(e) => {
                      setLinkUrl(e.currentTarget.value);
                      clearError("linkUrl");
                    }}
                    data-field="linkUrl"
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
                  {props.saving ? "กำลังบันทึก..." : "บันทึกแถบประกาศ"}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
