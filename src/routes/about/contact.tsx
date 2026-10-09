import { createSignal, For, Show } from "solid-js";
import { InfoCard, InfoPageShell } from "~/components/info/InfoPageShell";
import { Button } from "~/components/shared/Button";
import { FieldError, FieldLabel, fieldBorderClass, TextField } from "~/components/shared/TextField";
import { CONTACT, INFO_PAGES, SOCIAL_LINKS } from "~/lib/siteInfo";
import { EMAIL_PATTERN, focusFirstInvalid, PHONE_PATTERN } from "~/lib/validators";
import { pushToast } from "~/lib/toast";
import iconLine from "~/assets/icons/social-line.svg";

const TOPICS = ["สอบถามสินค้า", "คำสั่งซื้อและการจัดส่ง", "คืนสินค้า / เปลี่ยนสินค้า", "ติดต่อธุรกิจ", "อื่น ๆ"];

type Errors = Partial<Record<"name" | "email" | "phone" | "topic" | "message", string>>;

/**
 * ติดต่อเรา — contact channels from `siteInfo.ts` (same as the Footer) plus a
 * mock message form: no support backend exists, so a valid submit only
 * shows the success state + toast (same prototype status as the Footer's
 * newsletter form).
 */
export default function ContactPage() {
  const [name, setName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [phone, setPhone] = createSignal("");
  const [topic, setTopic] = createSignal("");
  const [message, setMessage] = createSignal("");
  const [errors, setErrors] = createSignal<Errors>({});
  const [sending, setSending] = createSignal(false);
  const [sent, setSent] = createSignal(false);
  let form: HTMLFormElement | undefined;

  const validate = (): Errors => {
    const e: Errors = {};
    if (!name().trim()) e.name = "กรุณากรอกชื่อ";
    if (!email().trim()) e.email = "กรุณากรอกอีเมล";
    else if (!EMAIL_PATTERN.test(email().trim())) e.email = "รูปแบบอีเมลไม่ถูกต้อง";
    if (phone().trim() && !PHONE_PATTERN.test(phone().trim())) e.phone = "รูปแบบเบอร์โทรไม่ถูกต้อง";
    if (!topic()) e.topic = "กรุณาเลือกหัวข้อ";
    if (message().trim().length < 10) e.message = "กรุณาพิมพ์ข้อความอย่างน้อย 10 ตัวอักษร";
    return e;
  };
  // Clears a field's error as soon as it's edited.
  const clear = (key: keyof Errors) => errors()[key] && setErrors((e) => ({ ...e, [key]: undefined }));

  const submit = async (ev: SubmitEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      queueMicrotask(() => focusFirstInvalid(form));
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 600));
    setSending(false);
    setSent(true);
    pushToast("ส่งข้อความเรียบร้อย", "success", "ทีมงานจะติดต่อกลับภายใน 1 วันทำการ");
  };

  const reset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setTopic("");
    setMessage("");
    setErrors({});
    setSent(false);
  };

  return (
    <InfoPageShell title={INFO_PAGES.contact.label} subtitle="มีคำถามหรือข้อเสนอแนะ ทีมงาน Charmiss ยินดีช่วยเหลือ">
      <InfoCard title="ช่องทางติดต่อ" id="contact-channels">
        <ul class="grid gap-3 sm:grid-cols-2">
          <ContactChannel label="LINE Official Account" value={CONTACT.lineId} href={SOCIAL_LINKS.line.href} external icon={<img src={iconLine} alt="" class="size-5" />} />
          <ContactChannel label="โทรศัพท์" value={CONTACT.phoneLabel} href={CONTACT.phoneHref} icon={<PhoneGlyph />} />
          <ContactChannel label="อีเมล" value={CONTACT.email} href={`mailto:${CONTACT.email}`} icon={<MailGlyph />} />
          <ContactChannel label="เวลาทำการ" value={CONTACT.hours} icon={<ClockGlyph />} />
        </ul>
        <div class="flex gap-3 rounded-card border border-surface-gray p-4">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-pill bg-surface-pink text-brand-pink">
            <PinGlyph />
          </span>
          <div class="flex min-w-0 flex-col gap-0.5">
            <span class="text-sm text-ink-gray">ที่อยู่บริษัท</span>
            <span class="leading-[1.75] text-ink">{CONTACT.address}</span>
          </div>
        </div>
      </InfoCard>

      <InfoCard title="ส่งข้อความถึงเรา" id="contact-form">
        <Show
          when={!sent()}
          fallback={
            <div class="flex flex-col items-center gap-3 py-6 text-center">
              <span class="flex size-14 items-center justify-center rounded-pill bg-surface-pink text-brand-pink">
                <MailGlyph class="size-7" />
              </span>
              <p class="text-lg font-bold text-ink">ได้รับข้อความของคุณแล้ว</p>
              <p class="text-sm leading-[1.75] text-ink-gray">ทีมงานจะติดต่อกลับทางอีเมล {email()} ภายใน 1 วันทำการ</p>
              <Button variant="outline" onClick={reset}>
                ส่งข้อความใหม่
              </Button>
            </div>
          }
        >
          <form ref={form} onSubmit={submit} novalidate class="flex flex-col gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <TextField
                label="ชื่อ - นามสกุล"
                required
                autocomplete="name"
                placeholder="ชื่อของคุณ"
                value={name()}
                error={errors().name}
                onInput={(e) => (setName(e.currentTarget.value), clear("name"))}
              />
              <TextField
                label="อีเมล"
                required
                type="email"
                inputmode="email"
                autocomplete="email"
                placeholder="name@example.com"
                value={email()}
                error={errors().email}
                onInput={(e) => (setEmail(e.currentTarget.value), clear("email"))}
              />
            </div>
            <TextField
              label="เบอร์โทรศัพท์ (ไม่บังคับ)"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="081-234-5678"
              value={phone()}
              error={errors().phone}
              onInput={(e) => (setPhone(e.currentTarget.value), clear("phone"))}
            />

            <fieldset class="flex flex-col gap-1.5">
              <legend class="mb-1.5 text-sm font-medium text-ink">
                หัวข้อ<span class="text-system-red" aria-hidden="true"> *</span>
              </legend>
              <div class="flex flex-wrap gap-2" role="radiogroup" aria-invalid={!!errors().topic} aria-describedby={errors().topic ? "contact-topic-error" : undefined} tabindex="-1">
                <For each={TOPICS}>
                  {(t) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={topic() === t}
                      onClick={() => (setTopic(t), clear("topic"))}
                      class={`min-h-[44px] rounded-pill border px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                        topic() === t ? "border-brand-pink bg-surface-pink text-brand-pink" : `bg-surface-card text-ink lg:hover:bg-surface-gray ${errors().topic ? "border-system-red" : "border-border"}`
                      }`}
                    >
                      {t}
                    </button>
                  )}
                </For>
              </div>
              <FieldError id="contact-topic-error" message={errors().topic} />
            </fieldset>

            <div class="flex flex-col gap-1.5">
              <FieldLabel for="contact-message" label="ข้อความ" required />
              <textarea
                id="contact-message"
                rows={5}
                placeholder="พิมพ์รายละเอียดที่ต้องการสอบถาม เช่น เลขคำสั่งซื้อ หรือชื่อสินค้า"
                aria-required="true"
                aria-invalid={!!errors().message}
                aria-describedby={errors().message ? "contact-message-error" : undefined}
                value={message()}
                onInput={(e) => (setMessage(e.currentTarget.value), clear("message"))}
                class={`min-h-[140px] w-full resize-y rounded-card border bg-surface-card px-4 py-2.5 text-base leading-[1.75] text-ink outline-none transition-colors duration-150 placeholder:text-ink-placeholder focus:border-brand-pink ${fieldBorderClass(errors().message)}`}
              />
              <FieldError id="contact-message-error" message={errors().message} />
            </div>

            <Button type="submit" loading={sending()} class="w-full sm:w-auto sm:self-end">
              ส่งข้อความ
            </Button>
          </form>
        </Show>
      </InfoCard>
    </InfoPageShell>
  );
}

function ContactChannel(props: { label: string; value: string; href?: string; external?: boolean; icon: any }) {
  const body = (
    <>
      <span class="flex size-10 shrink-0 items-center justify-center rounded-pill bg-surface-pink text-brand-pink">{props.icon}</span>
      <span class="flex min-w-0 flex-col gap-0.5">
        <span class="text-sm text-ink-gray">{props.label}</span>
        <span class="truncate font-medium text-ink">{props.value}</span>
      </span>
    </>
  );
  return (
    <li>
      <Show when={props.href} fallback={<div class="flex items-center gap-3 rounded-card border border-surface-gray p-4">{body}</div>}>
        <a href={props.href} target={props.external ? "_blank" : undefined} rel={props.external ? "noopener noreferrer" : undefined} class="flex items-center gap-3 rounded-card border border-surface-gray p-4 font-normal transition-colors duration-150 lg:hover:border-brand-pink">
          {body}
        </a>
      </Show>
    </li>
  );
}

const glyph = (d: string) => (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class={props.class ?? "size-5"} aria-hidden="true">
    <path d={d} />
  </svg>
);
const PhoneGlyph = glyph("M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2");
const MailGlyph = glyph("M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm0 0 9 6 9-6");
const ClockGlyph = glyph("M12 7v5l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z");
const PinGlyph = glyph("M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z");
