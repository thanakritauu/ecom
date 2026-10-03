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
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminNavigation } from "~/lib/adminNavigationStore";
import { findNavigationReferences, describeNavigationReference } from "~/lib/adminNavigation";
import { useAdminBanners } from "~/lib/adminBannerStore";
import { useAdminCampaigns } from "~/lib/adminCampaignStore";
import { pushToast } from "~/lib/toast";

/**
 * หน้าโปรโมชั่น Architecture & หน้าโปรโมชั่น Migration — was
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
  const navigation = useAdminNavigation();
  const navigate = useNavigate();
  const page = createMemo(() => store.getById(params.id));

  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [blockedDelete, setBlockedDelete] = createSignal(false);
  const [blockedHomepageDelete, setBlockedHomepageDelete] = createSignal(false);
  const [confirmToggle, setConfirmToggle] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const [previewOpen, setPreviewOpen] = createSignal(false);

  /** §44 — the Homepage can never be deleted (checked first); then §6/§19's dependency guard — a หน้าโปรโมชั่น a NavigationItem points at must never be deleted out from under it. */
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

  /** §26 — checked fresh every time the delete dialog opens, across Banners/Campaigns/every other หน้าโปรโมชั่น's own Sections. */
  const deleteReferences = createMemo(() => {
    const current = page();
    if (!current) return [];
    return findLandingPageReferences(current.id, {
      banners: bannerStore.banners(),
      campaigns: campaignStore.campaigns(),
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
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "หน้าโปรโมชั่น", href: "/admin/promotion-pages" }]} />
          <EmptyState icon={<ContentIcon />} title="ไม่พบหน้าโปรโมชั่นนี้" description="หน้านี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ารายการ" onAction={() => navigate("/admin/promotion-pages")} class="bg-surface-card shadow-card" />
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
                { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" },
                { label: "หน้าโปรโมชั่น", href: "/admin/promotion-pages" },
                { label: p().name },
              ]}
            />
            <PageHeader
              title={p().name}
              description={p().isHomepage ? "/" : `/${p().slug}`}
              status={
                <Show when={p().isHomepage}>
                  <span class="shrink-0 rounded-pill bg-surface-pink px-2.5 py-1 text-xs font-medium text-brand-pink">★ Homepage</span>
                </Show>
              }
              actions={
                <div class="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setPreviewOpen(true)}>
                    <EyeIcon class="size-4" /> ดูตัวอย่าง
                  </Button>
                  <Button variant="outline" onClick={() => window.open(`/admin/preview/promotion-pages/${p().id}`, "_blank")}>
                    <EyeIcon class="size-4" /> เปิดเต็มหน้า
                  </Button>
                  <Button variant="primary" href={`/admin/promotion-pages/${p().id}/edit`}>
                    แก้ไข
                  </Button>
                  <LandingPageRowActionsMenu
                    id={p().id}
                    name={p().name}
                    isPublished={p().status === "published"}
                    hideView
                    hideDelete={p().isHomepage}
                    onTogglePublish={() => setConfirmToggle(true)}
                    onDuplicate={handleDuplicate}
                    onDelete={requestDelete}
                    triggerClass="flex size-11 items-center justify-center rounded-pill border border-border text-ink-gray hover:bg-surface-pink"
                  />
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title="แบนเนอร์หลัก">
                  <div class="aspect-[16/6] w-full overflow-hidden rounded-media bg-surface-gray/60">
                    <Show when={p().banners.desktop} fallback={<div class="flex size-full items-center justify-center text-ink-placeholder"><ImageIcon class="size-8" /></div>}>
                      <img src={p().banners.desktop} alt="" class="size-full object-cover" />
                    </Show>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <BannerThumb label="แบนเนอร์แท็บเล็ต" src={p().banners.tablet} />
                    <BannerThumb label="แบนเนอร์มือถือ" src={p().banners.mobile} />
                  </div>
                </Section>

                <Section title="เนื้อหาหน้า">
                  <Row label="หัวข้อ" value={p().title || "—"} />
                  <div class="flex flex-col gap-1">
                    <dt class="text-sm text-ink-gray">คำอธิบาย</dt>
                    <dd class="text-sm text-ink">{p().description || "—"}</dd>
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
                                <Show when={ref.variantIds.length > 0}> · {ref.variantIds.length} ตัวเลือก</Show>
                              </p>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </Section>

                <Section title={`ส่วนประกอบของหน้า (${p().sections.length})`}>
                  <Show when={p().sections.length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่ได้เพิ่มส่วนประกอบ — หน้านี้แสดงผลจากแบนเนอร์หลัก/เนื้อหาหน้า/สินค้าด้านบนเท่านั้น</p>}>
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

                <Section title="ข้อมูลเพิ่มเติม">
                  <Row label="Slug" value={p().isHomepage ? "/ (Homepage)" : `/${p().slug}`} />
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
              title="ลบหน้าโปรโมชั่น?"
              description={
                deleteReferences().length > 0
                  ? `คุณต้องการลบ "${p().name}" หรือไม่? หน้านี้ถูกอ้างอิงอยู่โดย ${[...new Set(deleteReferences())].join(", ")} การกระทำนี้ไม่สามารถย้อนกลับได้`
                  : `คุณต้องการลบ "${p().name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`
              }
              confirmLabel="ลบ"
              tone="danger"
              loading={actionLoading()}
              onConfirm={confirmDeleteAction}
            />

            <ConfirmDialog
              open={blockedHomepageDelete()}
              onOpenChange={setBlockedHomepageDelete}
              title="ไม่สามารถลบ Homepage ได้"
              description="เว็บไซต์ต้องมี Homepage อยู่เสมอ — กรุณากำหนดหน้าโปรโมชั่นอื่นเป็น Homepage ก่อน (ฟีเจอร์นี้ยังไม่เปิดใช้งานใน Prototype นี้) จึงจะสามารถลบหน้านี้ได้"
              confirmLabel="เข้าใจแล้ว"
              cancelLabel="ปิด"
              onConfirm={() => setBlockedHomepageDelete(false)}
            />

            <ConfirmDialog
              open={blockedDelete()}
              onOpenChange={setBlockedDelete}
              title="ไม่สามารถลบได้"
              description={`"${p().name}" ถูกใช้งานใน Navigation อยู่ — เมนูที่อ้างอิง: ${navigationRefs()
                .map((r) => `- ${describeNavigationReference(r, navigation.items())}`)
                .join(" ")} กรุณาย้ายหรือแก้ไขเมนูเหล่านี้ในหน้า Navigation ก่อนลบหน้านี้`}
              confirmLabel="ไปที่ Navigation"
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
