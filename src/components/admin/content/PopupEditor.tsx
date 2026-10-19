import { createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { Button } from "~/components/shared/Button";
import { TextField } from "~/components/shared/TextField";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { DraftPublishActions } from "~/components/admin/DraftPublishActions";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { SelectField } from "~/components/admin/SelectField";
import { AudienceField, audienceError, fromAudienceDraft, toAudienceDraft } from "~/components/admin/marketing/MarketingFormBlocks";
import { MediaUploader } from "~/components/admin/MediaUploader";
import { StatusBadge, type StatusTone } from "~/components/admin/StatusBadge";
import { Toggle } from "~/components/admin/Toggle";
import { NeverAgainCheckbox, PromoPopupCard } from "~/components/home/PromoPopup";
import { formatOrderDateLabel } from "~/lib/adminOrders";
import {
  buildDefaultPromoPopup,
  newPromoPopupId,
  newPromoPopupKey,
  readStoredPromoPopups,
  saveStoredPromoPopups,
  type PromoPopupRecord,
  PROMO_POPUP_MEDIA_SIZE,
  normalizePopupPath,
  promoPopupFingerprint,
  promoPopupMediaValue,
  withPromoPopupMediaValue,
  type PromoPopupContent,
} from "~/lib/promoPopup";
import { pushToast } from "~/lib/toast";
import { FormErrorSummary } from "~/components/admin/FormErrorSummary";
import { reportFormErrors, type FormErrors } from "~/lib/adminFormValidation";
import { PlusIcon } from "~/components/admin/icons";
import { CloseIcon } from "~/components/shared/icons";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { promotionPageHref } from "~/lib/adminContent";
import { categoryStorefrontHref, STOREFRONT_CATEGORY_ROUTE_SLUGS } from "~/lib/adminCategories";

/**
 * Create / edit one storefront popup (one row of the list the storefront
 * `PromoPopup` reads live). Draft-first: a new popup, or one still in แบบร่าง,
 * saves as a draft (name only) or publishes (full checks); a published one
 * saves changes and has the แสดง / ไม่แสดง switch. Changing what customers see
 * gives the popup a new id, so it shows again even to people who ticked
 * "ไม่ต้องแสดงอีก" on the old one.
 */
type LiveStatus = { label: string; tone: StatusTone };

export function popupLiveStatus(c: PromoPopupRecord, now: number = Date.now()): LiveStatus {
  if (c.draft) return { label: "แบบร่าง", tone: "info" };
  if (!c.enabled) return { label: "ปิดอยู่", tone: "neutral" };
  const start = c.startsAt ? new Date(c.startsAt).getTime() : NaN;
  const end = c.endsAt ? new Date(c.endsAt).getTime() : NaN;
  if (!Number.isNaN(start) && now < start) return { label: "รอเริ่มแสดง", tone: "warning" };
  if (!Number.isNaN(end) && now > end) return { label: "หมดเวลาแล้ว", tone: "danger" };
  return { label: "กำลังแสดง", tone: "success" };
}

const LABELS: Record<string, string> = {
  name: "ชื่อ Popup",
  pages: "หน้าที่แสดง Popup",
  media: "รูปภาพหรือวิดีโอ",
  title: "หัวข้อ",
  ctaLabel: "ข้อความบนปุ่ม",
  ctaUrl: "ลิงก์ของปุ่ม",
  audience: "กลุ่มลูกค้า",
  endsAt: "สิ้นสุด",
};

const stripMeta = (c: PromoPopupRecord) => JSON.stringify({ ...c, id: undefined, updatedAt: undefined });
const isValidHref = (href: string) => /^(\/|https?:\/\/)\S*$/.test(href.trim());

const cloneRecord = (r: PromoPopupRecord): PromoPopupRecord => ({ ...r, media: { ...r.media }, pages: [...r.pages] });

export function PopupEditor(props: { initial?: PromoPopupRecord; onCancel: () => void; onSaved: (record: PromoPopupRecord) => void }) {
  const blank = (): PromoPopupRecord => ({ ...buildDefaultPromoPopup(), id: newPromoPopupId(), key: newPromoPopupKey(), name: "", title: "", description: "", ctaLabel: "", draft: true, updatedAt: undefined });
  const [saved, setSaved] = createSignal<PromoPopupRecord>(props.initial ? cloneRecord(props.initial) : blank());
  const [draft, setDraft] = createSignal<PromoPopupRecord>(cloneRecord(saved()));
  const draftFlow = !props.initial || !!props.initial.draft;
  const [saving, setSaving] = createSignal(false);
  const [showErrors, setShowErrors] = createSignal<"draft" | "full" | false>(false);
  const [previewChecked, setPreviewChecked] = createSignal(false);
  const [pageInput, setPageInput] = createSignal("");
  const [pageInputError, setPageInputError] = createSignal<string>();
  const content = useAdminContent();
  const categories = useAdminCategories();

  /** Every storefront page that exists today, for the picker. Typed URLs cover anything else. */
  const pageOptions = createMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "/", label: "หน้าแรก" },
      { value: "/products", label: "สินค้าทั้งหมด" },
      { value: "/coupons", label: "คูปองส่วนลด" },
      { value: "/promotion/*", label: "หน้าแคมเปญทุกหน้า" },
    ];
    for (const c of categories.categories()) {
      if (STOREFRONT_CATEGORY_ROUTE_SLUGS.includes(c.slug)) opts.push({ value: categoryStorefrontHref(c.slug), label: `หมวดหมู่ ${c.name}` });
    }
    for (const p of content.pages()) {
      if (!p.isHomepage && p.slug) opts.push({ value: promotionPageHref(p), label: `หน้าแคมเปญ ${p.title || p.slug}` });
    }
    return opts;
  });
  const pageLabel = (path: string) => pageOptions().find((o) => o.value === path)?.label;
  const addPage = (raw: string) => {
    const path = normalizePopupPath(raw);
    if (!path) return;
    if (path.startsWith("/admin")) {
      setPageInputError("ใส่ได้เฉพาะหน้าร้าน");
      return;
    }
    setPageInputError(undefined);
    setPageInput("");
    setDraft((d) => (d.pages.includes(path) ? d : { ...d, pages: [...d.pages, path] }));
  };

  const set = <K extends keyof PromoPopupRecord>(key: K, value: PromoPopupRecord[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setMedia = (patch: Partial<PromoPopupContent["media"]>) => setDraft((d) => ({ ...d, media: { ...d.media, ...patch } }));

  const dirty = createMemo(() => stripMeta(draft()) !== stripMeta(saved()));
  const contentChanged = createMemo(() => promoPopupFingerprint(draft()) !== promoPopupFingerprint(saved()));

  const errors = createMemo(() => {
    const d = draft();
    const e: FormErrors = {};
    if (!d.name.trim()) e.name = "กรุณาตั้งชื่อ Popup";
    if (d.pages.length === 0) e.pages = "กรุณาเลือกอย่างน้อย 1 หน้า";
    if (!d.media.src) e.media = "กรุณาอัปโหลดรูปภาพหรือวิดีโอ";
    else if (d.media.type === "video" && !d.media.poster) e.media = "วิดีโอต้องมีภาพปก กรุณาอัปโหลดภาพปกวิดีโอ";
    if (!d.title.trim()) e.title = "กรุณากรอกหัวข้อ";
    if (!d.ctaLabel.trim()) e.ctaLabel = "กรุณากรอกข้อความบนปุ่ม";
    if (d.ctaUrl?.trim() && !isValidHref(d.ctaUrl)) e.ctaUrl = "ลิงก์ต้องขึ้นต้นด้วย / หรือ https://";
    // ลูกค้าเก่า / เฉพาะระดับ are signed-in members, and an empty link is a sign-up offer members never see.
    else if (!d.ctaUrl?.trim() && (d.audience?.kind === "returning" || d.audience?.kind === "tiers"))
      e.ctaUrl = "กลุ่มลูกค้านี้เป็นสมาชิกที่เข้าสู่ระบบแล้ว กรุณากรอกลิงก์ของปุ่ม";
    const audienceProblem = audienceError(toAudienceDraft(d.audience));
    if (audienceProblem) e.audience = audienceProblem;
    if (d.startsAt && d.endsAt && new Date(d.endsAt).getTime() <= new Date(d.startsAt).getTime()) e.endsAt = "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม";
    return e;
  });
  // A draft only needs its name (plus a valid schedule); publishing needs everything.
  const draftErrors = (e: FormErrors): FormErrors => Object.fromEntries(Object.entries(e).filter(([k]) => k === "name" || k === "endsAt"));
  // Shown only after a save attempt; being a memo, each one disappears as soon as it's fixed.
  const shownErrors = createMemo<FormErrors>(() => (showErrors() === "full" ? errors() : showErrors() === "draft" ? draftErrors(errors()) : {}));
  const err = (key: string) => shownErrors()[key];

  const status = createMemo(() => popupLiveStatus(draft()));

  const save = async (mode: "draft" | "publish" | "save") => {
    const level = mode === "draft" ? "draft" : "full";
    setShowErrors(level);
    if (reportFormErrors(level === "draft" ? draftErrors(errors()) : errors(), LABELS)) return;
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
      const d = draft();
      const changed = !!props.initial && !props.initial.draft && contentChanged();
      const next: PromoPopupRecord = {
        ...d,
        id: changed ? newPromoPopupId() : saved().id,
        name: d.name.trim(),
        draft: mode === "draft" ? true : undefined,
        // Publishing turns it on; after that the switch decides.
        enabled: mode === "publish" ? true : d.enabled,
        title: d.title.trim(),
        description: d.description.trim(),
        condition: d.condition?.trim() || undefined,
        ctaLabel: d.ctaLabel.trim(),
        ctaUrl: d.ctaUrl?.trim() || undefined,
        media: { ...d.media, alt: d.media.alt.trim() },
        pages: [...d.pages],
        startsAt: d.startsAt || undefined,
        endsAt: d.endsAt || undefined,
        updatedAt: formatOrderDateLabel(new Date().toISOString()),
      };
      const list = readStoredPromoPopups();
      const at = list.findIndex((p) => p.key === next.key);
      saveStoredPromoPopups(at >= 0 ? list.map((p, i) => (i === at ? next : p)) : [...list, next]);
      setSaved(next);
      setDraft(cloneRecord(next));
      setShowErrors(false);
      pushToast(
        mode === "draft"
          ? "บันทึกแบบร่างแล้ว ยังไม่แสดงบนหน้าร้าน"
          : mode === "publish"
            ? "เผยแพร่ Popup แล้ว"
            : changed
              ? "บันทึกแล้ว ลูกค้าที่เคยกดไม่ต้องแสดงอีกจะเห็น Popup ใหม่นี้"
              : "บันทึก Popup เรียบร้อยแล้ว",
        "success",
      );
      props.onSaved(next);
    } catch {
      pushToast("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSaving(false);
    }
  };

  const form = (
    <>
      <FormErrorSummary errors={shownErrors()} labels={LABELS} />
      <Section title="ชื่อ Popup" required field="name">
        <TextField
          label="ชื่อที่ใช้ในหลังบ้าน"
          required
          placeholder="เช่น สมาชิกใหม่รับส่วนลด"
          value={draft().name}
          error={err("name")}
          disabled={saving()}
          onInput={(e) => set("name", e.currentTarget.value)}
        />
        <p class="-mt-2 text-xs text-ink-gray">ลูกค้าไม่เห็นชื่อนี้ ใช้แยก Popup ในรายการ</p>
      </Section>
      <Section title="รูปภาพหรือวิดีโอ" required field="media">
        <MediaUploader
          label="รูปหรือวิดีโอด้านบนของ Popup"
          hint={`ขนาด ${PROMO_POPUP_MEDIA_SIZE.width}x${PROMO_POPUP_MEDIA_SIZE.height}px (${PROMO_POPUP_MEDIA_SIZE.ratio}) ถ้าสัดส่วนไม่ตรง ระบบจะครอปตรงกลางให้เต็มกรอบ`}
          value={promoPopupMediaValue(draft().media)}
          onChange={(v) => setDraft((d) => ({ ...d, media: withPromoPopupMediaValue(d.media, v) }))}
          aspectClass="aspect-[16/10]"
          boxClass="w-full max-w-sm"
          posterAspectClass="aspect-[16/10]"
          disabled={saving()}
        />
        <Show when={err("media")}>
          <p class="-mt-2 text-sm text-system-red">{err("media")}</p>
        </Show>
        <TextField label="คำอธิบายรูป" value={draft().media.alt} disabled={saving()} onInput={(e) => setMedia({ alt: e.currentTarget.value })} />
        <p class="-mt-2 text-xs text-ink-gray">คำอธิบายรูปใช้กับโปรแกรมอ่านหน้าจอ ไม่แสดงบนหน้าร้าน</p>
      </Section>

      <Section title="ข้อความ">
        <TextField label="หัวข้อ" required value={draft().title} data-field="title" error={err("title")} disabled={saving()} onInput={(e) => set("title", e.currentTarget.value)} />
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-ink">รายละเอียด</span>
          <textarea
            value={draft().description}
            disabled={saving()}
            rows={3}
            onInput={(e) => set("description", e.currentTarget.value)}
            class="rounded-card border border-border bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
          />
          <span class="text-xs text-ink-gray">กด Enter เพื่อขึ้นบรรทัดใหม่</span>
        </label>
        <TextField
          label="เงื่อนไข"
          placeholder="เช่น ใช้โค้ด SAVE100 ขั้นต่ำ ฿2,000"
          value={draft().condition ?? ""}
          disabled={saving()}
          onInput={(e) => set("condition", e.currentTarget.value)}
        />
        <p class="-mt-2 text-xs text-ink-gray">แสดงเป็นป้ายสีชมพูใต้รายละเอียด เว้นว่างได้</p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="ข้อความบนปุ่ม" required value={draft().ctaLabel} data-field="ctaLabel" error={err("ctaLabel")} disabled={saving()} onInput={(e) => set("ctaLabel", e.currentTarget.value)} />
          <TextField
            label="ลิงก์ของปุ่ม"
            placeholder="/promotion/promotions"
            value={draft().ctaUrl ?? ""}
            data-field="ctaUrl"
            error={err("ctaUrl")}
            disabled={saving()}
            onInput={(e) => set("ctaUrl", e.currentTarget.value)}
          />
        </div>
        <p class="-mt-2 text-xs text-ink-gray">เว้นลิงก์ว่างได้ ปุ่มจะเปิดหน้าต่างสมัครสมาชิก / เข้าสู่ระบบ และสมาชิกที่เข้าสู่ระบบแล้วจะไม่เห็น Popup นี้</p>
      </Section>

      <Section title="ช่วงเวลาแสดง">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DateTimeField label="เริ่มแสดง" value={draft().startsAt ?? ""} disabled={saving()} onChange={(v) => set("startsAt", v || undefined)} />
          <DateTimeField label="สิ้นสุด" field="endsAt" value={draft().endsAt ?? ""} disabled={saving()} error={err("endsAt")} onChange={(v) => set("endsAt", v || undefined)} />
        </div>
        <p class="text-xs text-ink-gray">เว้นว่างได้ ถ้าไม่ระบุจะแสดงตลอดเวลาที่เปิดอยู่</p>
      </Section>

      <Section title="การแสดงผล">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <Show
            when={!draftFlow}
            fallback={<p class="text-sm text-ink-gray">{props.initial ? "Popup นี้ยังเป็นแบบร่าง ไม่แสดงบนหน้าร้าน" : "บันทึกแบบร่างไว้ก่อนได้ แล้วกด บันทึกและเผยแพร่ เมื่อข้อมูลครบ"}</p>}
          >
            <Toggle checked={draft().enabled} onChange={(v) => set("enabled", v)} onLabel="แสดง" offLabel="ไม่แสดง" disabled={saving()} />
          </Show>
          <StatusBadge tone={status().tone}>{status().label}</StatusBadge>
        </div>
        <p class="-mt-2 text-xs text-ink-gray">
          ขึ้นวันละ 1 ครั้ง ตอนลูกค้าเปิดหน้าที่เลือกไว้ครั้งแรกของวัน ปิดแล้วจะขึ้นอีกครั้งในการเข้าเว็บวันถัดไป ถ้าติ๊ก "ไม่ต้องแสดงอีก" ลูกค้าคนนั้นจะไม่เห็น Popup นี้อีก
        </p>
        {/* Same กลุ่มลูกค้า field as promotions, coupons and flash sales. */}
        <AudienceField
          value={toAudienceDraft(draft().audience)}
          onChange={(next) => set("audience", fromAudienceDraft(next))}
          error={err("audience")}
          disabled={saving()}
        />
      </Section>

      <Section title="หน้าที่แสดง Popup" required field="pages">
        {/* Picked pages as chips; × takes one off. */}
        <Show when={draft().pages.length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่ได้เลือกหน้า</p>}>
          <ul class="flex flex-wrap gap-2">
            <For each={draft().pages}>
              {(path) => (
                <li
                  title={path}
                  class="flex min-h-9 max-w-full items-center gap-1 rounded-pill border border-brand-pink/30 bg-surface-pink py-1 pl-3 pr-1 text-sm font-medium text-brand-pink"
                >
                  <span class="truncate">{pageLabel(path) ?? path}</span>
                  <button
                    type="button"
                    aria-label={`เอา ${pageLabel(path) ?? path} ออก`}
                    disabled={saving()}
                    onClick={() => set("pages", draft().pages.filter((p) => p !== path))}
                    class="flex size-7 shrink-0 items-center justify-center rounded-pill transition-colors duration-150 hover:bg-brand-pink/10 disabled:opacity-40"
                  >
                    <CloseIcon class="size-3.5" />
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <Show when={err("pages")}>
          <p class="-mt-2 text-sm text-system-red">{err("pages")}</p>
        </Show>
        <SelectField
          label="เลือกหน้า"
          value=""
          placeholder="เลือกหน้าที่จะเพิ่ม"
          options={pageOptions().filter((o) => !draft().pages.includes(o.value))}
          onChange={(v) => v && addPage(v)}
          disabled={saving()}
        />
        <div class="flex flex-col gap-1.5">
          <div class="flex items-end gap-2">
            <div class="min-w-0 flex-1">
              <TextField
                label="หรือกรอกลิงก์ / slug"
                placeholder="/promotion/9-9-beauty-sale"
                value={pageInput()}
                error={pageInputError()}
                disabled={saving()}
                onInput={(e) => setPageInput(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPage(pageInput());
                  }
                }}
              />
            </div>
            <Button type="button" variant="outline" onClick={() => addPage(pageInput())} disabled={saving() || !pageInput().trim()}>
              <PlusIcon class="size-4" />
              เพิ่ม
            </Button>
          </div>
          <span class="text-xs text-ink-gray">วางลิงก์เต็มหรือ slug ก็ได้ ใส่ * ท้ายลิงก์เพื่อแสดงทุกหน้าที่อยู่ใต้ลิงก์นั้น เช่น /promotion/*</span>
        </div>
      </Section>

      <Show when={dirty() && contentChanged() && !draftFlow}>
        <p class="rounded-card bg-surface-pink px-4 py-3 text-sm text-ink">เมื่อบันทึก ลูกค้าที่เคยกด "ไม่ต้องแสดงอีก" จะเห็น Popup นี้อีกครั้ง</p>
      </Show>
    </>
  );

  const preview = (
    <div class="flex flex-col items-center gap-3 bg-ink/60 p-4">
      <PromoPopupCard content={draft()} compact />
      <NeverAgainCheckbox checked={previewChecked()} onChange={setPreviewChecked} />
    </div>
  );

  return (
    <div class="flex flex-col gap-6">
      <Show when={saved().updatedAt}>
        <p class="-mt-4 text-xs text-ink-gray">แก้ไขล่าสุด {saved().updatedAt}</p>
      </Show>

      <AdminFormPreviewLayout form={form} preview={preview} />

      <AdminFloatingBar>
        <DraftPublishActions
          draft={draftFlow}
          saving={saving()}
          onCancel={props.onCancel}
          onSaveDraft={() => void save("draft")}
          onPublish={() => void save("publish")}
          onSave={() => void save("save")}
        />
      </AdminFloatingBar>
      <div class="h-16" aria-hidden="true" />
    </div>
  );
}

function Section(props: { title: string; required?: boolean; field?: string; children: JSX.Element }) {
  return (
    <section data-field={props.field} class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">
        {props.title}
        <Show when={props.required}>
          <span class="text-system-red" aria-hidden="true">
            {" "}
            *
          </span>
        </Show>
      </h2>
      {props.children}
    </section>
  );
}

function DateTimeField(props: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; error?: string; field?: string }) {
  return (
    <label data-field={props.field} class="flex flex-col gap-1.5">
      <span class="text-sm font-medium text-ink">{props.label}</span>
      <div class="flex gap-2">
        <input
          type="datetime-local"
          value={props.value}
          disabled={props.disabled}
          aria-invalid={props.error ? true : undefined}
          onInput={(e) => props.onChange(e.currentTarget.value)}
          class={`h-11 min-w-0 flex-1 rounded-card border bg-surface-card px-4 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray ${props.error ? "border-system-red" : "border-border"}`}
        />
        <Show when={props.value}>
          <Button type="button" variant="outline" size="sm" onClick={() => props.onChange("")} disabled={props.disabled}>
            ล้าง
          </Button>
        </Show>
      </div>
      <Show when={props.error}>
        <p class="text-sm text-system-red">{props.error}</p>
      </Show>
    </label>
  );
}
