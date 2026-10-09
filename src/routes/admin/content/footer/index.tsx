import { createMemo, createSignal, Index, onMount, Show, type JSX } from "solid-js";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { TextField } from "~/components/shared/TextField";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { Toggle } from "~/components/admin/Toggle";
import { StatusBadge, type StatusTone } from "~/components/admin/StatusBadge";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "~/components/admin/icons";
import { STOREFRONT_CATEGORY_ROUTE_SLUGS } from "~/lib/adminCategories";
import { formatOrderDateLabel } from "~/lib/adminOrders";
import { INFO_PAGES } from "~/lib/siteInfo";
import {
  buildDefaultFooterContent,
  FOOTER_SOCIAL_LABELS,
  newFooterLinkId,
  readStoredFooter,
  saveStoredFooter,
  type FooterContent,
  type FooterLink,
} from "~/lib/siteFooter";
import { pushToast } from "~/lib/toast";

/**
 * Storefront footer editor. Saves to the same store `Footer.tsx` reads
 * (`~/lib/siteFooter`), so the storefront updates right after saving. Each
 * link shows whether its URL lands on a real storefront page today.
 */
const LINK_STATUS_META: Record<"live" | "missing", { label: string; tone: StatusTone }> = {
  live: { label: "มีหน้า", tone: "success" },
  missing: { label: "ยังไม่มีหน้า", tone: "warning" },
};

/** Static mirror of `src/routes` (storefront side). Anything else falls through to the `[...path]` catch-all screen. */
const LIVE_EXACT = new Set(["/", "/products", "/cart", "/checkout", "/coupons", "/account", "/login", "/register", "/account/address", "/account/cards", "/account/points", "/account/profile", "/account/wishlist"]);
const LIVE_PREFIXES = ["/promotion/", "/product/", "/account/orders/"];
const INFO_PAGE_HREFS = new Set<string>(Object.values(INFO_PAGES).map((p) => p.href));

function isLiveHref(href: string): boolean {
  const path = href.trim().split(/[?#]/)[0];
  if (LIVE_EXACT.has(path) || INFO_PAGE_HREFS.has(path)) return true;
  if (/^(https?:\/\/|mailto:|tel:)/.test(href.trim())) return true; // external profile / contact link
  if (STOREFRONT_CATEGORY_ROUTE_SLUGS.some((slug) => path === `/${slug}`)) return true;
  return LIVE_PREFIXES.some((prefix) => path.startsWith(prefix) && path.length > prefix.length);
}

const isValidHref = (href: string) => /^(\/|https?:\/\/|mailto:|tel:)/.test(href.trim());
const isValidUrl = (href: string) => /^https?:\/\/\S+$/.test(href.trim());

const stripMeta = (c: FooterContent) => JSON.stringify({ ...c, updatedAt: undefined });
const clone = (c: FooterContent): FooterContent => JSON.parse(JSON.stringify(c)) as FooterContent;

const inputClass =
  "h-11 w-full rounded-card border bg-surface-card px-4 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-ink-placeholder focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray";

export default function AdminFooterPage() {
  const [saved, setSaved] = createSignal<FooterContent>(buildDefaultFooterContent());
  const [draft, setDraft] = createSignal<FooterContent>(buildDefaultFooterContent());
  const [saving, setSaving] = createSignal(false);
  const [showErrors, setShowErrors] = createSignal(false);
  const [confirmReset, setConfirmReset] = createSignal(false);

  onMount(() => {
    const stored = readStoredFooter();
    setSaved(stored);
    setDraft(clone(stored));
  });

  const dirty = createMemo(() => stripMeta(draft()) !== stripMeta(saved()));
  const isDefault = createMemo(() => stripMeta(draft()) === stripMeta(buildDefaultFooterContent()));

  const update = (fn: (c: FooterContent) => void) => {
    const next = clone(draft());
    fn(next);
    setDraft(next);
  };

  const linkError = (l: FooterLink): { label?: string; href?: string } => ({
    label: l.label.trim() ? undefined : "กรุณากรอกชื่อลิงก์",
    href: !l.href.trim() ? "กรุณากรอกลิงก์" : isValidHref(l.href) ? undefined : "ลิงก์ต้องขึ้นต้นด้วย / หรือ https://",
  });

  const errors = createMemo(() => {
    const d = draft();
    const e: Record<string, string> = {};
    d.columns.forEach((col, i) => {
      if (!col.title.trim()) e[`col-${i}`] = "กรุณากรอกชื่อหัวข้อ";
    });
    const allLinks = [...d.columns.flatMap((c) => c.links), ...d.legalLinks];
    if (allLinks.some((l) => linkError(l).label || linkError(l).href)) e.links = "กรอกชื่อและลิงก์ให้ครบทุกรายการ";
    if (d.contact.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.contact.email.trim())) e.email = "รูปแบบอีเมลไม่ถูกต้อง";
    d.social.forEach((s) => {
      if (s.enabled && !isValidUrl(s.href)) e[`social-${s.platform}`] = "กรุณากรอกลิงก์ที่ขึ้นต้นด้วย https://";
    });
    return e;
  });
  const err = (key: string) => (showErrors() ? errors()[key] : undefined);

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
      const next: FooterContent = {
        ...d,
        columns: d.columns.map((c) => ({ ...c, title: c.title.trim(), links: c.links.map((l) => ({ ...l, label: l.label.trim(), href: l.href.trim() })) })),
        legalLinks: d.legalLinks.map((l) => ({ ...l, label: l.label.trim(), href: l.href.trim() })),
        contact: {
          address: d.contact.address.trim(),
          phoneLabel: d.contact.phoneLabel.trim(),
          email: d.contact.email.trim(),
          hours: d.contact.hours.trim(),
        },
        social: d.social.map((s) => ({ ...s, href: s.href.trim() })),
        copyright: d.copyright.trim(),
        updatedAt: formatOrderDateLabel(new Date().toISOString()),
      };
      saveStoredFooter(next);
      setSaved(next);
      setDraft(clone(next));
      setShowErrors(false);
      pushToast("บันทึกส่วนท้ายเว็บไซต์เรียบร้อยแล้ว", "success");
    } catch {
      pushToast("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(clone(saved()));
    setShowErrors(false);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "ส่วนท้ายเว็บไซต์" }]} />
      <PageHeader title="ส่วนท้ายเว็บไซต์" description="แก้ไขลิงก์ ข้อมูลติดต่อ และโซเชียลมีเดียที่แสดงท้ายทุกหน้าของหน้าร้าน" />
      <Show when={saved().updatedAt}>
        <p class="-mt-4 text-xs text-ink-gray">แก้ไขล่าสุด {saved().updatedAt}</p>
      </Show>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Index each={draft().columns}>
          {(col, i) => (
            <Section title={`คอลัมน์ที่ ${i + 1}`}>
              <TextField
                label="ชื่อหัวข้อ"
                required
                value={col().title}
                disabled={saving()}
                error={err(`col-${i}`)}
                onInput={(e) => {
                  const v = e.currentTarget.value;
                  update((c) => (c.columns[i].title = v));
                }}
              />
              <LinkListEditor
                links={col().links}
                disabled={saving()}
                showErrors={showErrors()}
                linkError={linkError}
                onChange={(links) => update((c) => (c.columns[i].links = links))}
              />
            </Section>
          )}
        </Index>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="ข้อมูลติดต่อ">
          <label class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-ink">ที่อยู่</span>
            <textarea
              value={draft().contact.address}
              disabled={saving()}
              rows={3}
              onInput={(e) => {
                const v = e.currentTarget.value;
                update((c) => (c.contact.address = v));
              }}
              class="rounded-card border border-border bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
            />
          </label>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="เบอร์โทรศัพท์"
              value={draft().contact.phoneLabel}
              disabled={saving()}
              onInput={(e) => {
                const v = e.currentTarget.value;
                update((c) => (c.contact.phoneLabel = v));
              }}
            />
            <TextField
              label="อีเมล"
              type="email"
              value={draft().contact.email}
              disabled={saving()}
              error={err("email")}
              onInput={(e) => {
                const v = e.currentTarget.value;
                update((c) => (c.contact.email = v));
              }}
            />
          </div>
          <TextField
            label="เวลาทำการ"
            value={draft().contact.hours}
            disabled={saving()}
            onInput={(e) => {
              const v = e.currentTarget.value;
              update((c) => (c.contact.hours = v));
            }}
          />
          <p class="text-xs text-ink-gray">ช่องที่เว้นว่างจะไม่แสดงบนหน้าร้าน ลูกค้ากดเบอร์โทรและอีเมลเพื่อติดต่อได้ทันที</p>
        </Section>

        <Section title="โซเชียลมีเดีย">
          <p class="-mt-2 text-xs text-ink-gray">ไอคอนเรียงตามลำดับนี้ใต้ข้อมูลติดต่อ เปิดในแท็บใหม่</p>
          <div class="flex flex-col divide-y divide-border">
            <Index each={draft().social}>
              {(s, i) => (
                <div class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-sm font-medium text-ink">{FOOTER_SOCIAL_LABELS[s().platform]}</span>
                    <Toggle
                      checked={s().enabled}
                      disabled={saving()}
                      onLabel="แสดง"
                      offLabel="ไม่แสดง"
                      onChange={(v) => update((c) => (c.social[i].enabled = v))}
                    />
                  </div>
                  <input
                    type="url"
                    aria-label={`ลิงก์ ${FOOTER_SOCIAL_LABELS[s().platform]}`}
                    placeholder="https://"
                    value={s().href}
                    disabled={saving()}
                    onInput={(e) => {
                      const v = e.currentTarget.value;
                      update((c) => (c.social[i].href = v));
                    }}
                    class={`${inputClass} ${err(`social-${s().platform}`) ? "border-system-red" : "border-border"}`}
                  />
                  <Show when={err(`social-${s().platform}`)}>
                    <p class="text-sm text-system-red">{err(`social-${s().platform}`)}</p>
                  </Show>
                </div>
              )}
            </Index>
          </div>
        </Section>
      </div>

      <Section title="แถบล่างสุด">
        <TextField
          label="ข้อความลิขสิทธิ์"
          value={draft().copyright}
          disabled={saving()}
          onInput={(e) => {
            const v = e.currentTarget.value;
            update((c) => (c.copyright = v));
          }}
        />
        <div class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-ink">ลิงก์ข้อกำหนด</span>
          <LinkListEditor
            links={draft().legalLinks}
            disabled={saving()}
            showErrors={showErrors()}
            linkError={linkError}
            onChange={(links) => update((c) => (c.legalLinks = links))}
          />
        </div>
      </Section>

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
        description="ฟอร์มจะกลับเป็นข้อมูลส่วนท้ายแบบเดิมของร้าน กดบันทึกเพื่อให้หน้าร้านเปลี่ยนตาม"
        confirmLabel="คืนค่าเริ่มต้น"
        onConfirm={() => {
          setDraft(buildDefaultFooterContent());
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

const iconButtonClass =
  "flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink disabled:cursor-not-allowed disabled:opacity-30";

/** Label + URL rows with reorder / remove, plus an add button. */
function LinkListEditor(props: {
  links: FooterLink[];
  disabled?: boolean;
  showErrors: boolean;
  linkError: (l: FooterLink) => { label?: string; href?: string };
  onChange: (links: FooterLink[]) => void;
}) {
  const set = (i: number, patch: Partial<FooterLink>) => props.onChange(props.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...props.links];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    props.onChange(next);
  };

  return (
    <div class="flex flex-col gap-3">
      <Show when={props.links.length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีลิงก์</p>}>
        <ul class="flex flex-col divide-y divide-border">
          <Index each={props.links}>
            {(link, i) => {
              const e = () => (props.showErrors ? props.linkError(link()) : {});
              const meta = () => LINK_STATUS_META[isLiveHref(link().href) ? "live" : "missing"];
              return (
                <li class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                  <div class="flex items-center gap-1">
                    <button type="button" aria-label="เลื่อนขึ้น" disabled={props.disabled || i === 0} onClick={() => move(i, -1)} class={iconButtonClass}>
                      <ArrowUpIcon class="size-4" />
                    </button>
                    <button type="button" aria-label="เลื่อนลง" disabled={props.disabled || i === props.links.length - 1} onClick={() => move(i, 1)} class={iconButtonClass}>
                      <ArrowDownIcon class="size-4" />
                    </button>
                    <span class="ml-auto">
                      <Show when={link().href.trim()}>
                        <StatusBadge tone={meta().tone}>{meta().label}</StatusBadge>
                      </Show>
                    </span>
                    <button
                      type="button"
                      aria-label={`ลบลิงก์ ${link().label}`}
                      disabled={props.disabled}
                      onClick={() => props.onChange(props.links.filter((_, idx) => idx !== i))}
                      class={`${iconButtonClass} hover:!bg-danger-soft hover:text-system-red`}
                    >
                      <TrashIcon class="size-4" />
                    </button>
                  </div>
                  <input
                    aria-label="ชื่อลิงก์"
                    placeholder="ชื่อลิงก์"
                    value={link().label}
                    disabled={props.disabled}
                    onInput={(ev) => set(i, { label: ev.currentTarget.value })}
                    class={`${inputClass} ${e().label ? "border-system-red" : "border-border"}`}
                  />
                  <input
                    aria-label="ลิงก์ปลายทาง"
                    placeholder="/products หรือ https://"
                    value={link().href}
                    disabled={props.disabled}
                    onInput={(ev) => set(i, { href: ev.currentTarget.value })}
                    class={`${inputClass} ${e().href ? "border-system-red" : "border-border"}`}
                  />
                  <Show when={e().label || e().href}>
                    <p class="text-sm text-system-red">{e().label ?? e().href}</p>
                  </Show>
                </li>
              );
            }}
          </Index>
        </ul>
      </Show>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="self-start"
        disabled={props.disabled}
        onClick={() => props.onChange([...props.links, { id: newFooterLinkId(), label: "", href: "" }])}
      >
        <PlusIcon class="size-4" />
        เพิ่มลิงก์
      </Button>
    </div>
  );
}
