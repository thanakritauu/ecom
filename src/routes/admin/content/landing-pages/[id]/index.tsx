import { createMemo, createSignal, For, Show } from "solid-js";
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
import { formatMarketingDate } from "~/lib/adminMarketing";
import { LANDING_PAGE_STATUS_META, validatePublishRequirements, findLandingPageReferences } from "~/lib/adminContent";
import { PROMOTION_NAV_ICON_OPTIONS } from "~/lib/promotionNavIcons";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminBanners } from "~/lib/adminBannerStore";
import { useAdminCampaigns } from "~/lib/adminCampaignStore";
import { useAdminHomepage } from "~/lib/adminHomepageStore";
import { pushToast } from "~/lib/toast";

/**
 * Landing Page Architecture & Promotion Page Migration — was
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
  const bannerStore = useAdminBanners();
  const campaignStore = useAdminCampaigns();
  const homepageStore = useAdminHomepage();
  const navigate = useNavigate();
  const page = createMemo(() => store.getById(params.id));

  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [confirmToggle, setConfirmToggle] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const [previewOpen, setPreviewOpen] = createSignal(false);

  /** §26 — checked fresh every time the delete dialog opens, across Banners/Campaigns/Homepage (draft + published)/every other Landing Page's own Sections. */
  const deleteReferences = createMemo(() => {
    const current = page();
    if (!current) return [];
    return findLandingPageReferences(current.id, {
      banners: bannerStore.banners(),
      campaigns: campaignStore.campaigns(),
      homepageSections: [...homepageStore.draftSections(), ...homepageStore.publishedSections()],
      allPages: store.pages(),
    });
  });

  const confirmToggleAction = async () => {
    const current = page();
    if (!current) return;
    if (current.status !== "published") {
      const errs = validatePublishRequirements(current);
      if (errs.length > 0) {
        setConfirmToggle(false);
        pushToast(`ไม่สามารถเผยแพร่ได้: ${errs[0]}`, "error");
        return;
      }
    }
    setActionLoading(true);
    await store.setStatus(current.id, current.status === "published" ? "unpublished" : "published");
    setActionLoading(false);
    setConfirmToggle(false);
    pushToast(current.status === "published" ? "ยกเลิกการเผยแพร่แล้ว" : "เผยแพร่หน้าแล้ว", "success");
  };

  const confirmDeleteAction = async () => {
    const current = page();
    if (!current) return;
    setActionLoading(true);
    await store.remove(current.id);
    setActionLoading(false);
    setConfirmDelete(false);
    pushToast(`ลบ "${current.name}" เรียบร้อยแล้ว`, "error");
    navigate("/admin/content/landing-pages");
  };

  const handleDuplicate = async () => {
    const current = page();
    if (!current) return;
    const created = await store.duplicate(current.id);
    pushToast(`ทำสำเนา "${current.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/content/landing-pages/${created.id}/edit`);
  };

  return (
    <Show
      when={page()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "เนื้อหา", href: "/admin/content" }, { label: "Landing Pages", href: "/admin/content/landing-pages" }]} />
          <EmptyState icon={<ContentIcon />} title="ไม่พบ Landing Page นี้" description="หน้านี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ารายการ" onAction={() => navigate("/admin/content/landing-pages")} class="bg-white shadow-card" />
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
                { label: "เนื้อหา", href: "/admin/content" },
                { label: "Landing Pages", href: "/admin/content/landing-pages" },
                { label: p().name },
              ]}
            />
            <PageHeader
              title={p().name}
              description={`/${p().slug}`}
              actions={
                <div class="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setPreviewOpen(true)}>
                    <EyeIcon class="size-4" /> Preview
                  </Button>
                  <Button variant="primary" href={`/admin/content/landing-pages/${p().id}/edit`}>
                    แก้ไข
                  </Button>
                  <LandingPageRowActionsMenu
                    id={p().id}
                    name={p().name}
                    isPublished={p().status === "published"}
                    hideView
                    onTogglePublish={() => setConfirmToggle(true)}
                    onDuplicate={handleDuplicate}
                    onDelete={() => setConfirmDelete(true)}
                    triggerClass="flex size-11 items-center justify-center rounded-pill border border-surface-gray text-ink-gray hover:bg-surface-pink"
                  />
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title="Hero Banner">
                  <div class="aspect-[16/6] w-full overflow-hidden rounded-media bg-surface-gray/60">
                    <Show when={p().banners.desktop} fallback={<div class="flex size-full items-center justify-center text-ink-placeholder"><ImageIcon class="size-8" /></div>}>
                      <img src={p().banners.desktop} alt="" class="size-full object-cover" />
                    </Show>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <BannerThumb label="Tablet Banner" src={p().banners.tablet} />
                    <BannerThumb label="Mobile Banner" src={p().banners.mobile} />
                  </div>
                </Section>

                <Section title="Content">
                  <Row label="Title" value={p().title || "—"} />
                  <div class="flex flex-col gap-1">
                    <dt class="text-sm text-ink-gray">Description</dt>
                    <dd class="text-sm text-ink">{p().description || "—"}</dd>
                  </div>
                </Section>

                <Section title="Products">
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
                                <Show when={ref.variantIds.length > 0}> · {ref.variantIds.length} ตัวเลือก</Show>
                              </p>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </Section>

                <Section title={`Page Sections (${p().sections.length})`}>
                  <Show when={p().sections.length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่ได้เพิ่ม Section — หน้านี้แสดงผลจาก Hero Banner/Content/Products ด้านบนเท่านั้น</p>}>
                    <div class="flex flex-col gap-2">
                      <For each={p().sections}>
                        {(s) => (
                          <div class="flex items-center justify-between gap-3 rounded-card bg-surface-gray/40 px-3 py-2 text-sm">
                            <div class="min-w-0 flex-1">
                              <p class="truncate font-medium text-ink">{s.name}</p>
                              <p class="text-xs text-ink-gray">{HOMEPAGE_SECTION_TYPE_META[s.type].label}</p>
                            </div>
                            <StatusBadge tone={s.enabled ? "success" : "neutral"}>{s.enabled ? "แสดง" : "ซ่อน"}</StatusBadge>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะ">
                  <StatusBadge tone={LANDING_PAGE_STATUS_META[p().status].tone} class="w-fit">
                    {LANDING_PAGE_STATUS_META[p().status].label}
                  </StatusBadge>
                </Section>

                <Section title="ระยะเวลา">
                  <Show when={p().startDate && p().endDate} fallback={<p class="text-sm text-ink-gray">ไม่ได้กำหนดระยะเวลา</p>}>
                    <Row label="เริ่ม" value={`${formatMarketingDate(p().startDate)} ${p().startTime}`} />
                    <Row label="สิ้นสุด" value={`${formatMarketingDate(p().endDate)} ${p().endTime}`} />
                  </Show>
                </Section>

                <Section title="Frontend Navigation">
                  <Show
                    when={p().navigation.enabled}
                    fallback={<p class="text-sm text-ink-gray">ไม่ได้แสดงบน Top Navigation</p>}
                  >
                    <Row label="Menu Label" value={p().navigation.label || "—"} />
                    <Row label="Icon" value={PROMOTION_NAV_ICON_OPTIONS.find((o) => o.key === p().navigation.icon)?.label ?? p().navigation.icon} />
                    <Row label="Order" value={String(p().navigation.order)} />
                    <Row label="URL" value={`/promotion/${p().slug}`} />
                  </Show>
                </Section>

                <Section title="ข้อมูลเพิ่มเติม">
                  <Row label="Slug" value={`/${p().slug}`} />
                  <Row label="สร้างเมื่อ" value={p().createdAt} />
                  <Row label="แก้ไขล่าสุด" value={p().updatedAt} />
                </Section>
              </div>
            </div>

            <ConfirmDialog
              open={confirmToggle()}
              onOpenChange={setConfirmToggle}
              title={p().status === "published" ? "ยกเลิกการเผยแพร่หน้านี้?" : "เผยแพร่หน้านี้?"}
              description={p().name}
              confirmLabel={p().status === "published" ? "ยกเลิกการเผยแพร่" : "เผยแพร่"}
              loading={actionLoading()}
              onConfirm={confirmToggleAction}
            />

            <ConfirmDialog
              open={confirmDelete()}
              onOpenChange={setConfirmDelete}
              title="ลบ Landing Page?"
              description={
                deleteReferences().length > 0
                  ? `คุณต้องการลบ "${p().name}" หรือไม่? หน้านี้ถูกอ้างอิงอยู่โดย ${[...new Set(deleteReferences())].join(", ")} — เมื่อลบแล้ว Navigation ที่เชื่อมโยงมาจะใช้งานไม่ได้ การกระทำนี้ไม่สามารถย้อนกลับได้`
                  : `คุณต้องการลบ "${p().name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`
              }
              confirmLabel="ลบ"
              tone="danger"
              loading={actionLoading()}
              onConfirm={confirmDeleteAction}
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
    <div class="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between gap-3 text-sm">
      <dt class="text-ink-gray">{props.label}</dt>
      <dd class="font-medium text-ink">{props.value}</dd>
    </div>
  );
}

function BannerThumb(props: { label: string; src: string }) {
  return (
    <div class="flex flex-col gap-1.5">
      <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">{props.label}</p>
      <div class="aspect-[16/10] w-full overflow-hidden rounded-media bg-surface-gray/60">
        <Show when={props.src} fallback={<div class="flex size-full items-center justify-center text-ink-placeholder"><ImageIcon class="size-5" /></div>}>
          <img src={props.src} alt="" class="size-full object-cover" />
        </Show>
      </div>
    </div>
  );
}
