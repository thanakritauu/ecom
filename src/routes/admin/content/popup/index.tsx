import { createMemo, createSignal, For, onMount, Show, type JSX } from "solid-js";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { TextField } from "~/components/shared/TextField";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { SelectField } from "~/components/admin/SelectField";
import { MediaUploader } from "~/components/admin/MediaUploader";
import { StatusBadge, type StatusTone } from "~/components/admin/StatusBadge";
import { Toggle } from "~/components/admin/Toggle";
import { NeverAgainCheckbox, PromoPopupCard } from "~/components/home/PromoPopup";
import { formatOrderDateLabel } from "~/lib/adminOrders";
import {
  buildDefaultPromoPopup,
  newPromoPopupId,
  PROMO_POPUP_AUDIENCE_META,
  PROMO_POPUP_MEDIA_SIZE,
  normalizePopupPath,
  promoPopupFingerprint,
  readStoredPromoPopup,
  saveStoredPromoPopup,
  promoPopupMediaValue,
  withPromoPopupMediaValue,
  type PromoPopupAudience,
  type PromoPopupContent,
} from "~/lib/promoPopup";
import { pushToast } from "~/lib/toast";
import { PlusIcon, TrashIcon } from "~/components/admin/icons";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { promotionPageHref } from "~/lib/adminContent";
import { categoryStorefrontHref, STOREFRONT_CATEGORY_ROUTE_SLUGS } from "~/lib/adminCategories";

/**
 * Storefront popup editor. Saves to the store the storefront `PromoPopup`
 * reads live. Changing what customers see gives the popup a new id, so it
 * shows again even to people who ticked "ไม่ต้องแสดงอีก" on the old one.
 */
const iconButtonClass =
  "flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink disabled:cursor-not-allowed disabled:opacity-30";

type LiveStatus = { label: string; tone: StatusTone };

function liveStatus(c: PromoPopupContent, now: number): LiveStatus {
  if (!c.enabled) return { label: "ปิดอยู่", tone: "neutral" };
  const start = c.startsAt ? new Date(c.startsAt).getTime() : NaN;
  const end = c.endsAt ? new Date(c.endsAt).getTime() : NaN;
  if (!Number.isNaN(start) && now < start) return { label: "รอเริ่มแสดง", tone: "warning" };
  if (!Number.isNaN(end) && now > end) return { label: "หมดเวลาแล้ว", tone: "danger" };
  return { label: "กำลังแสดง", tone: "success" };
}

const stripMeta = (c: PromoPopupContent) => JSON.stringify({ ...c, id: undefined, updatedAt: undefined });
const isValidHref = (href: string) => /^(\/|https?:\/\/)\S*$/.test(href.trim());

export default function AdminPromoPopupPage() {
  const [saved, setSaved] = createSignal<PromoPopupContent>(buildDefaultPromoPopup());
  const [draft, setDraft] = createSignal<PromoPopupContent>(buildDefaultPromoPopup());
  const [saving, setSaving] = createSignal(false);
  const [showErrors, setShowErrors] = createSignal(false);
  const [confirmReset, setConfirmReset] = createSignal(false);
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

  onMount(() => {
    const stored = readStoredPromoPopup();
    setSaved(stored);
    setDraft({ ...stored, media: { ...stored.media }, pages: [...stored.pages] });
  });

  const set = <K extends keyof PromoPopupContent>(key: K, value: PromoPopupContent[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setMedia = (patch: Partial<PromoPopupContent["media"]>) => setDraft((d) => ({ ...d, media: { ...d.media, ...patch } }));

  const dirty = createMemo(() => stripMeta(draft()) !== stripMeta(saved()));
  const isDefault = createMemo(() => stripMeta(draft()) === stripMeta(buildDefaultPromoPopup()));
  const contentChanged = createMemo(() => promoPopupFingerprint(draft()) !== promoPopupFingerprint(saved()));

  const errors = createMemo(() => {
    const d = draft();
    const e: Record<string, string> = {};
    if (d.pages.length === 0) e.pages = "กรุณาเลือกอย่างน้อย 1 หน้า";
    if (!d.media.src) e.media = "กรุณาอัปโหลดรูปภาพหรือวิดีโอ";
    else if (d.media.type === "video" && !d.media.poster) e.media = "วิดีโอต้องมีภาพปก กรุณาอัปโหลดภาพปกวิดีโอ";
    if (!d.title.trim()) e.title = "กรุณากรอกหัวข้อ";
    if (!d.ctaLabel.trim()) e.ctaLabel = "กรุณากรอกข้อความบนปุ่ม";
    if (d.audience === "everyone") {
      if (!d.ctaUrl?.trim()) e.ctaUrl = "กรุณากรอกลิงก์ของปุ่ม";
      else if (!isValidHref(d.ctaUrl)) e.ctaUrl = "ลิงก์ต้องขึ้นต้นด้วย / หรือ https://";
    }
    if (d.startsAt && d.endsAt && new Date(d.endsAt).getTime() <= new Date(d.startsAt).getTime()) e.endsAt = "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม";
    return e;
  });
  const err = (key: string) => (showErrors() ? errors()[key] : undefined);

  const status = createMemo(() => liveStatus(draft(), Date.now()));

  const save = async () => {
    setShowErrors(true);
    if (Object.keys(errors()).length > 0) {
      pushToast("กรุณาตรวจสอบข้อมูลที่ยังไม่ครบ", "error");
      return;
    }
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
      const d = draft();
      const changed = contentChanged();
      const next: PromoPopupContent = {
        ...d,
        id: changed ? newPromoPopupId() : saved().id,
        title: d.title.trim(),
        description: d.description.trim(),
        condition: d.condition?.trim() || undefined,
        ctaLabel: d.ctaLabel.trim(),
        ctaUrl: d.audience === "everyone" ? d.ctaUrl?.trim() : undefined,
        media: { ...d.media, alt: d.media.alt.trim() },
        pages: [...d.pages],
        startsAt: d.startsAt || undefined,
        endsAt: d.endsAt || undefined,
        updatedAt: formatOrderDateLabel(new Date().toISOString()),
      };
      saveStoredPromoPopup(next);
      setSaved(next);
      setDraft({ ...next, media: { ...next.media }, pages: [...next.pages] });
      setShowErrors(false);
      pushToast(changed ? "บันทึกแล้ว ลูกค้าที่เคยกดไม่ต้องแสดงอีกจะเห็น Popup ใหม่นี้" : "บันทึก Popup เรียบร้อยแล้ว", "success");
    } catch {
      pushToast("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft({ ...saved(), media: { ...saved().media }, pages: [...saved().pages] });
    setShowErrors(false);
  };

  const form = (
    <>
      <Section title="การแสดงผล">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <Toggle checked={draft().enabled} onChange={(v) => set("enabled", v)} onLabel="แสดง" offLabel="ไม่แสดง" disabled={saving()} />
          <StatusBadge tone={status().tone}>{status().label}</StatusBadge>
        </div>
        <p class="-mt-2 text-xs text-ink-gray">
          ขึ้นวันละ 1 ครั้ง ตอนลูกค้าเปิดหน้าที่เลือกไว้ครั้งแรกของวัน ปิดแล้วจะขึ้นอีกครั้งในการเข้าเว็บวันถัดไป ถ้าติ๊ก "ไม่ต้องแสดงอีก" ลูกค้าคนนั้นจะไม่เห็น Popup นี้อีก
        </p>
        <SelectField
          label="ใครเห็น Popup นี้"
          value={draft().audience}
          options={(Object.keys(PROMO_POPUP_AUDIENCE_META) as PromoPopupAudience[]).map((value) => ({ value, label: PROMO_POPUP_AUDIENCE_META[value].label }))}
          onChange={(v) => set("audience", v as PromoPopupAudience)}
          disabled={saving()}
          hint={PROMO_POPUP_AUDIENCE_META[draft().audience].hint}
        />
      </Section>

      <Section title="หน้าที่แสดง Popup">
        <Show when={draft().pages.length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่ได้เลือกหน้า</p>}>
          <ul class="flex flex-col divide-y divide-border">
            <For each={draft().pages}>
              {(path) => (
                <li class="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <div class="flex min-w-0 flex-1 flex-col">
                    <span class="truncate text-sm font-medium text-ink">{pageLabel(path) ?? "ลิงก์ที่กรอกเอง"}</span>
                    <span class="truncate text-xs text-ink-gray">{path}</span>
                  </div>
                  <button
                    type="button"
                    aria-label={`เอา ${path} ออก`}
                    disabled={saving()}
                    onClick={() => set("pages", draft().pages.filter((p) => p !== path))}
                    class={`${iconButtonClass} hover:!bg-danger-soft hover:text-system-red`}
                  >
                    <TrashIcon class="size-4" />
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

      <Section title="รูปภาพหรือวิดีโอ">
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
        <TextField label="หัวข้อ" required value={draft().title} error={err("title")} disabled={saving()} onInput={(e) => set("title", e.currentTarget.value)} />
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
          <TextField label="ข้อความบนปุ่ม" required value={draft().ctaLabel} error={err("ctaLabel")} disabled={saving()} onInput={(e) => set("ctaLabel", e.currentTarget.value)} />
          <Show when={draft().audience === "everyone"}>
            <TextField
              label="ลิงก์ของปุ่ม"
              required
              placeholder="/promotion/promotions"
              value={draft().ctaUrl ?? ""}
              error={err("ctaUrl")}
              disabled={saving()}
              onInput={(e) => set("ctaUrl", e.currentTarget.value)}
            />
          </Show>
        </div>
      </Section>

      <Section title="ช่วงเวลาแสดง">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DateTimeField label="เริ่มแสดง" value={draft().startsAt ?? ""} disabled={saving()} onChange={(v) => set("startsAt", v || undefined)} />
          <DateTimeField label="สิ้นสุด" value={draft().endsAt ?? ""} disabled={saving()} error={err("endsAt")} onChange={(v) => set("endsAt", v || undefined)} />
        </div>
        <p class="text-xs text-ink-gray">เว้นว่างได้ ถ้าไม่ระบุจะแสดงตลอดเวลาที่เปิดอยู่</p>
      </Section>

      <Show when={dirty() && contentChanged() && saved().updatedAt !== undefined}>
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
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "Popup" }]} />
      <PageHeader title="Popup" description="หน้าต่างโปรโมชั่นที่ขึ้นเมื่อลูกค้าเปิดหน้าที่เลือกไว้" />
      <Show when={saved().updatedAt}>
        <p class="-mt-4 text-xs text-ink-gray">แก้ไขล่าสุด {saved().updatedAt}</p>
      </Show>

      <AdminFormPreviewLayout form={form} preview={preview} />

      <AdminFloatingBar>
        <div class="flex w-full flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => setConfirmReset(true)} disabled={saving() || isDefault()}>
            คืนค่าเริ่มต้น
          </Button>
          <div class="flex gap-3">
            <Button type="button" variant="outline" onClick={cancel} disabled={saving() || !dirty()}>
              ยกเลิก
            </Button>
            <Button type="button" variant="primary" onClick={save} loading={saving()} disabled={!dirty()}>
              {saving() ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </div>
      </AdminFloatingBar>
      <div class="h-16" aria-hidden="true" />

      <ConfirmDialog
        open={confirmReset()}
        onOpenChange={setConfirmReset}
        title="คืนค่าเริ่มต้น?"
        description="ฟอร์มจะกลับเป็น Popup สมาชิกใหม่แบบเดิมของร้าน กดบันทึกเพื่อให้หน้าร้านเปลี่ยนตาม"
        confirmLabel="คืนค่าเริ่มต้น"
        onConfirm={() => {
          setDraft(buildDefaultPromoPopup());
          setConfirmReset(false);
        }}
      />
    </div>
  );
}

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <section class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </section>
  );
}

function DateTimeField(props: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; error?: string }) {
  return (
    <label class="flex flex-col gap-1.5">
      <span class="text-sm font-medium text-ink">{props.label}</span>
      <div class="flex gap-2">
        <input
          type="datetime-local"
          value={props.value}
          disabled={props.disabled}
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
