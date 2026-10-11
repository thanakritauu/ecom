import { createMemo, createSignal, For, Show } from "solid-js";
import { landingPagePublishErrors, landingPagePublishStatus } from "~/components/admin/content/landingPagePublish";
import { hasMedia, type MediaValue } from "~/lib/media";
import { MediaPreview } from "~/components/admin/MediaUploader";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { LandingPageRowActionsMenu } from "~/components/admin/content/LandingPageRowActionsMenu";
import { LandingPagePreviewDialog } from "~/components/admin/content/LandingPagePreview";
import { HomepagePreviewDialog } from "~/components/admin/content/HomepagePreviewDialog";
import { ContentIcon, EyeIcon, ImageIcon } from "~/components/admin/icons";
import { HOMEPAGE_SECTION_TYPE_META } from "~/lib/adminHomepage";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { formatMarketingDateTime } from "~/lib/adminMarketing";
import { LANDING_PAGE_STATUS_META, findLandingPageReferences, promotionPageHref } from "~/lib/adminContent";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminNavigation } from "~/lib/adminNavigationStore";
import { findNavigationReferences, describeNavigationReference } from "~/lib/adminNavigation";
import { pushToast } from "~/lib/toast";

/**
 * หน้าแคมเปญ Architecture & หน้าแคมเปญ Migration — was
 * `routes/admin/content/promotion-pages/[id]/index.tsx`. Header / Hero
 * Banner / Content / Products / Metadata, same static-sections shape every
 * other Admin Detail page already uses. The "Frontend Navigation" section's
 * URL row still reads `/promotion/:slug` — that customer route is
 * deliberately unchanged this phase (§5/§41 of the migration).
 */
export default function AdminLandingPageDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminContent();
  const productStore = useAdminProducts();
  const navigation = useAdminNavigation();
  const navigate = useNavigate();
  const page = createMemo(() => store.getById(params.id));

  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [blockedDelete, setBlockedDelete] = createSignal(false);
  const [blockedHomepageDelete, setBlockedHomepageDelete] = createSignal(false);
  const [confirmToggle, setConfirmToggle] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const [previewOpen, setPreviewOpen] = createSignal(false);

  /** §44 — the Homepage can never be deleted (checked first); then §6/§19's dependency guard — a หน้าแคมเปญ a NavigationItem points at must never be deleted out from under it. */
  const navigationRefs = createMemo(() => {
    const current = page();
    return current ? findNavigationReferences(navigation.items(), "promotion_page", current.id) : [];
  });
  const requestDelete = () => {
    if (page()?.isHomepage) {
      setBlockedHomepageDelete(true);
      return;
    }
    if (navigationRefs().length > 0) setBlockedDelete(true);
    else setConfirmDelete(true);
  };

  /** §26 — checked fresh every time the delete dialog opens, across every other หน้าแคมเปญ's own Sections. */
  const deleteReferences = createMemo(() => {
    const current = page();
    if (!current) return [];
    return findLandingPageReferences(current.id, {
      allPages: store.pages(),
    });
  });

  const confirmToggleAction = async () => {
    const current = page();
    if (!current) return;
    setActionLoading(true);
    await store.setStatus(current.id, current.status === "published" ? "unpublished" : current.status === "draft" ? landingPagePublishStatus(current) : "published");
    setActionLoading(false);
    setConfirmToggle(false);
    pushToast(current.status === "published" ? "ยกเลิกการเผยแพร่หน้าแล้ว" : "เผยแพร่หน้าแล้ว", "success");
  };

  const confirmDeleteAction = async () => {
    const current = page();
    if (!current) return;
    setActionLoading(true);
    await store.remove(current.id);
    setActionLoading(false);
    setConfirmDelete(false);
    pushToast(`ลบ "${current.name}" เรียบร้อยแล้ว`, "error");
    navigate("/admin/promotion-pages");
  };

  const handleDuplicate = async () => {
    const current = page();
    if (!current) return;
    const created = await store.duplicate(current.id);
    pushToast(`ทำสำเนา "${current.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/promotion-pages/${created.id}/edit`);
  };

  return (
    <Show
      when={page()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "หน้าแคมเปญ", href: "/admin/promotion-pages" }]} />
          <EmptyState icon={<ContentIcon />} title="ไม่พบหน้าแคมเปญนี้" description="หน้านี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปรายการหน้าแคมเปญ" onAction={() => navigate("/admin/promotion-pages")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const p = current;
        const products = () => p().products.map((ref) => ({ ref, product: productStore.getById(ref.productId) })).filter((x) => x.product !== undefined);

        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb
              items={[
                { label: "แดชบอร์ด", href: "/admin" },
                { label: "หน้าแคมเปญ", href: "/admin/promotion-pages" },
                { label: p().name },
              ]}
            />
            <PageHeader
              title={p().name}
              description={promotionPageHref(p())}
              actions={
                <div class="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={() => setPreviewOpen(true)}>
                    <EyeIcon class="size-4" /> ดูตัวอย่าง
                  </Button>
                  <Button variant="outline" onClick={() => window.open(`/admin/preview/promotion-pages/${p().id}`, "_blank")}>
                    <EyeIcon class="size-4" /> ดูตัวอย่างเต็มหน้า
                  </Button>
                  <Button variant="primary" href={`/admin/promotion-pages/${p().id}/edit`}>
                    แก้ไขหน้าแคมเปญ
                  </Button>
                  <LandingPageRowActionsMenu
                    id={p().id}
                    name={p().name}
                    isPublished={p().status === "published"}
                    hideView
                    hideDelete={p().isHomepage}
                    onTogglePublish={() => {
                      // Publishing (a แบบร่าง included) runs the full check first and names what's missing.
                      const errs = p().status === "published" ? [] : landingPagePublishErrors(p());
                      if (errs.length > 0) pushToast(`เผยแพร่ "${p().name}" ไม่ได้ ยังขาดข้อมูล ${errs.length} รายการ`, "error", errs.join(", "));
                      else setConfirmToggle(true);
                    }}
                    onDuplicate={handleDuplicate}
                    onDelete={requestDelete}
                    triggerClass="flex size-11 items-center justify-center rounded-pill border border-border text-ink-gray hover:bg-surface-pink"
                  />
                </div>
              }
            />

            <div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div class="flex min-w-0 flex-col gap-6">
                <Show when={!p().isHomepage}>
                <Section title="แบนเนอร์หลัก">
                  <div class="aspect-[3/1] w-full overflow-hidden rounded-media bg-surface-gray/60">
                    <Show when={hasMedia(p().banners.desktop)} fallback={<div class="flex size-full items-center justify-center text-ink-placeholder"><ImageIcon class="size-8" /></div>}>
                      <MediaPreview value={p().banners.desktop} />
                    </Show>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <BannerThumb label="แบนเนอร์แท็บเล็ต" src={p().banners.tablet} aspectClass="aspect-[4/3]" />
                    <BannerThumb label="แบนเนอร์มือถือ" src={p().banners.mobile} aspectClass="aspect-[3/4] max-w-[60%]" />
                  </div>
                  {/* Same field as the form's "วิดีโอ YouTube" — when set, the storefront shows it in place of the banners. */}
                  <div class="flex flex-col gap-1">
                    <dt class="text-sm text-ink-gray">วิดีโอ YouTube ที่แสดงแทนแบนเนอร์</dt>
                    <dd class="min-w-0 text-sm text-ink">
                      <Show when={p().videoUrl} fallback="-">
                        {(url) => (
                          <a href={url()} target="_blank" rel="noopener noreferrer" class="break-all text-brand-pink hover:underline">
                            {url()}
                          </a>
                        )}
                      </Show>
                    </dd>
                  </div>
                </Section>

                <Section title="เนื้อหาหน้า">
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="หัวข้อ" value={p().title || "-"} />
                  </dl>
                  <div class="flex flex-col gap-1">
                    <dt class="text-sm text-ink-gray">คำอธิบาย</dt>
                    <dd class="whitespace-pre-line text-sm text-ink">{p().description || "-"}</dd>
                  </div>
                </Section>

                <Section title="สินค้า">
                  <Show when={products().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่ได้เลือกสินค้า</p>}>
                    <div class="flex flex-col gap-3">
                      <For each={products()}>
                        {({ ref, product }, index) => (
                          <div class="flex items-center gap-3">
                            <span class="flex size-6 shrink-0 items-center justify-center rounded-pill bg-surface-gray text-xs font-semibold text-ink-gray">{index() + 1}</span>
                            <img src={product!.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
                            <div class="min-w-0 flex-1">
                              <p class="truncate text-sm font-medium text-ink">{product!.name}</p>
                              <p class="text-xs text-ink-gray">
                                {formatAdminCurrency(product!.price)}
                                <Show when={ref.variantIds.length > 0}> เลือกไว้ {ref.variantIds.length} ตัวเลือก</Show>
                              </p>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </Section>
                </Show>

                <Section title={`ส่วนเนื้อหาของหน้า (${p().sections.length})`}>
                  <Show when={p().sections.length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีส่วนเนื้อหา หน้านี้แสดงแบนเนอร์ เนื้อหา และสินค้าด้านบน</p>}>
                    <div class="flex flex-col gap-2">
                      <For each={p().sections}>
                        {(s) => (
                          <div class="flex items-center justify-between gap-3 rounded-card bg-surface-gray/60 px-3 py-2 text-sm">
                            <div class="min-w-0 flex-1">
                              <p class="truncate font-medium text-ink">{s.name}</p>
                              <p class="text-xs text-ink-gray">{HOMEPAGE_SECTION_TYPE_META[s.type].label}</p>
                            </div>
                            <StatusBadge tone={s.enabled ? "success" : "neutral"}>{s.enabled ? "แสดง" : "ไม่แสดง"}</StatusBadge>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะ">
                  <div class="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={LANDING_PAGE_STATUS_META[p().status].tone} class="w-fit">
                      {LANDING_PAGE_STATUS_META[p().status].label}
                    </StatusBadge>
                    <Show when={p().isHomepage}>
                      <StatusBadge tone="info">หน้าแรก</StatusBadge>
                    </Show>
                  </div>
                </Section>

                <Section title="ระยะเวลา">
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="เริ่ม" value={formatMarketingDateTime(p().startDate, p().startTime)} />
                    <Row label="สิ้นสุด" value={formatMarketingDateTime(p().endDate, p().endTime)} />
                  </dl>
                </Section>

                <Section title="ข้อมูลเพิ่มเติม">
                  <dl class="flex flex-col gap-1.5 text-sm">
                    <Row label="ลิงก์หน้าร้าน" value={promotionPageHref(p())} />
                    <Row label="สร้างเมื่อ" value={p().createdAt || "-"} />
                    <Row label="แก้ไขล่าสุด" value={p().updatedAt || "-"} />
                  </dl>
                </Section>
              </div>
            </div>

            <ConfirmDialog
              open={confirmToggle()}
              onOpenChange={setConfirmToggle}
              title={p().status === "published" ? "ยกเลิกการเผยแพร่หน้านี้?" : "เผยแพร่หน้านี้?"}
              description={p().status === "published" ? `"${p().name}" จะถูกซ่อนจากหน้าร้าน` : `"${p().name}" จะแสดงบนหน้าร้านตามช่วงเวลาที่ตั้งไว้`}
              confirmLabel={p().status === "published" ? "ยกเลิกการเผยแพร่" : "เผยแพร่"}
              loading={actionLoading()}
              onConfirm={confirmToggleAction}
            />

            <ConfirmDialog
              open={confirmDelete()}
              onOpenChange={setConfirmDelete}
              title="ลบหน้าแคมเปญ?"
              description={
                deleteReferences().length > 0
                  ? `คุณต้องการลบ "${p().name}" หรือไม่? ปุ่มใน ${[...new Set(deleteReferences())].join(", ")} ที่ลิงก์มาหน้านี้จะใช้ไม่ได้ การกระทำนี้ไม่สามารถย้อนกลับได้`
                  : `คุณต้องการลบ "${p().name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`
              }
              confirmLabel="ลบหน้าแคมเปญ"
              tone="danger"
              loading={actionLoading()}
              onConfirm={confirmDeleteAction}
            />

            <ConfirmDialog
              open={blockedHomepageDelete()}
              onOpenChange={setBlockedHomepageDelete}
              title="ไม่สามารถลบได้"
              description="หน้าแรกลบไม่ได้ เพราะเว็บไซต์ต้องมีหน้าแรกเสมอ"
              confirmLabel="เข้าใจแล้ว"
              cancelLabel="ปิด"
              onConfirm={() => setBlockedHomepageDelete(false)}
            />

            <ConfirmDialog
              open={blockedDelete()}
              onOpenChange={setBlockedDelete}
              title="ไม่สามารถลบได้"
              description={`หน้าแคมเปญ "${p().name}" ถูกใช้งานในเมนู: ${navigationRefs()
                .map((r) => describeNavigationReference(r, navigation.items()))
                .join(", ")} กรุณาแก้ไขเมนูเหล่านี้ก่อนลบหน้านี้`}
              confirmLabel="ไปที่เมนูนำทาง"
              cancelLabel="ปิด"
              onConfirm={() => {
                setBlockedDelete(false);
                navigate("/admin/navigation");
              }}
            />

            <Show
              when={p().sections.length > 0}
              fallback={<LandingPagePreviewDialog open={previewOpen()} onOpenChange={setPreviewOpen} banners={p().banners} title={p().title} description={p().description} products={p().products} />}
            >
              <HomepagePreviewDialog open={previewOpen()} onOpenChange={setPreviewOpen} sections={p().sections} />
            </Show>
          </div>
        );
      }}
    </Show>
  );
}

function Section(props: { title: string; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between gap-3">
      <dt class="text-ink-gray">{props.label}</dt>
      <dd class="font-medium text-ink">{props.value}</dd>
    </div>
  );
}

/** `aspectClass` — the storefront crop ratio for this slot (Tablet 4:3, Mobile 3:4 — `BANNER_DEVICE_SPECS`). */
function BannerThumb(props: { label: string; src: MediaValue; aspectClass: string }) {
  return (
    <div class="flex flex-col gap-1.5">
      <p class="text-xs text-ink-placeholder">{props.label}</p>
      <div class={`${props.aspectClass} w-full overflow-hidden rounded-media bg-surface-gray/60`}>
        <Show when={hasMedia(props.src)} fallback={<div class="flex size-full items-center justify-center text-ink-placeholder"><ImageIcon class="size-5" /></div>}>
          <MediaPreview value={props.src} />
        </Show>
      </div>
    </div>
  );
}
