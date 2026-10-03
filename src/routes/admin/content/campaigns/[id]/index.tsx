import { createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { CampaignRowActionsMenu } from "~/components/admin/content/CampaignRowActionsMenu";
import { ContentIcon, ImageIcon } from "~/components/admin/icons";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { formatMarketingDate } from "~/lib/adminMarketing";
import { resolveHomepageDestinationHref } from "~/lib/adminHomepage";
import { useAdminDestinationLookups } from "~/lib/adminDestinationLookups";
import { CAMPAIGN_STATUS_META, validateCampaignPublish } from "~/lib/adminCampaigns";
import { useAdminCampaigns } from "~/lib/adminCampaignStore";
import { pushToast } from "~/lib/toast";

/** Header / Hero Banner / Content / Products / Metadata — same static-sections shape as `promotion-pages/[id]/index.tsx`. */
export default function AdminCampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminCampaigns();
  const productStore = useAdminProducts();
  const lookups = useAdminDestinationLookups();
  const navigate = useNavigate();
  const campaign = createMemo(() => store.getById(params.id));

  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [confirmToggle, setConfirmToggle] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);

  const confirmToggleAction = async () => {
    const current = campaign();
    if (!current) return;
    if (current.status !== "published") {
      const errs = validateCampaignPublish(current);
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
    pushToast(current.status === "published" ? "ยกเลิกการเผยแพร่แล้ว" : "เผยแพร่ Campaign แล้ว", "success");
  };

  const confirmDeleteAction = async () => {
    const current = campaign();
    if (!current) return;
    setActionLoading(true);
    await store.remove(current.id);
    setActionLoading(false);
    setConfirmDelete(false);
    pushToast(`ลบ "${current.name}" เรียบร้อยแล้ว`, "error");
    navigate("/admin/content/campaigns");
  };

  return (
    <Show
      when={campaign()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "Campaigns", href: "/admin/content/campaigns" }]} />
          <EmptyState icon={<ContentIcon />} title="ไม่พบ Campaign นี้" description="Campaign นี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ารายการ" onAction={() => navigate("/admin/content/campaigns")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const c = current;
        const products = () => c().products.map((ref) => ({ ref, product: productStore.getById(ref.productId) })).filter((x) => x.product !== undefined);
        const ctaHref = () => resolveHomepageDestinationHref(c().cta.destination, lookups);

        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb
              items={[
                { label: "แดชบอร์ด", href: "/admin" },
                { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" },
                { label: "Campaigns", href: "/admin/content/campaigns" },
                { label: c().name },
              ]}
            />
            <PageHeader
              title={c().name}
              description={`/${c().slug}`}
              actions={
                <div class="flex items-center gap-2">
                  <Button variant="primary" href={`/admin/content/campaigns/${c().id}/edit`}>
                    แก้ไข
                  </Button>
                  <CampaignRowActionsMenu
                    id={c().id}
                    name={c().name}
                    isPublished={c().status === "published"}
                    hideView
                    onTogglePublish={() => setConfirmToggle(true)}
                    onDelete={() => setConfirmDelete(true)}
                    triggerClass="flex size-11 items-center justify-center rounded-pill border border-border text-ink-gray hover:bg-surface-pink"
                  />
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title="Hero Banner">
                  <div class="aspect-[16/6] w-full overflow-hidden rounded-media bg-surface-gray/60">
                    <Show when={c().banners.desktop} fallback={<div class="flex size-full items-center justify-center text-ink-placeholder"><ImageIcon class="size-8" /></div>}>
                      <img src={c().banners.desktop} alt="" class="size-full object-cover" />
                    </Show>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <BannerThumb label="Tablet Banner" src={c().banners.tablet} />
                    <BannerThumb label="Mobile Banner" src={c().banners.mobile} />
                  </div>
                </Section>

                <Section title="Content">
                  <Row label="Title" value={c().title || "—"} />
                  <div class="flex flex-col gap-1">
                    <dt class="text-sm text-ink-gray">Description</dt>
                    <dd class="text-sm text-ink">{c().description || "—"}</dd>
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
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะ">
                  <StatusBadge tone={CAMPAIGN_STATUS_META[c().status].tone} class="w-fit">
                    {CAMPAIGN_STATUS_META[c().status].label}
                  </StatusBadge>
                </Section>

                <Section title="ระยะเวลา">
                  <Show when={c().startDate && c().endDate} fallback={<p class="text-sm text-ink-gray">ไม่ได้กำหนดระยะเวลา</p>}>
                    <Row label="เริ่ม" value={`${formatMarketingDate(c().startDate)} ${c().startTime}`} />
                    <Row label="สิ้นสุด" value={`${formatMarketingDate(c().endDate)} ${c().endTime}`} />
                  </Show>
                </Section>

                <Section title="Call to Action">
                  <Show when={c().cta.label || ctaHref()} fallback={<p class="text-sm text-ink-gray">ไม่ได้กำหนด CTA</p>}>
                    <Row label="Label" value={c().cta.label || "—"} />
                    <Row label="Destination" value={ctaHref() ?? "—"} />
                  </Show>
                </Section>

                <Section title="ข้อมูลเพิ่มเติม">
                  <Row label="Slug" value={`/${c().slug}`} />
                  <Row label="สร้างเมื่อ" value={c().createdAt} />
                  <Row label="แก้ไขล่าสุด" value={c().updatedAt} />
                </Section>
              </div>
            </div>

            <ConfirmDialog
              open={confirmToggle()}
              onOpenChange={setConfirmToggle}
              title={c().status === "published" ? "ยกเลิกการเผยแพร่ Campaign นี้?" : "เผยแพร่ Campaign นี้?"}
              description={c().name}
              confirmLabel={c().status === "published" ? "ยกเลิกการเผยแพร่" : "เผยแพร่"}
              loading={actionLoading()}
              onConfirm={confirmToggleAction}
            />

            <ConfirmDialog
              open={confirmDelete()}
              onOpenChange={setConfirmDelete}
              title="ลบ Campaign?"
              description={`คุณต้องการลบ "${c().name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
              confirmLabel="ลบ"
              tone="danger"
              loading={actionLoading()}
              onConfirm={confirmDeleteAction}
            />
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
      <dd class="truncate font-medium text-ink">{props.value}</dd>
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
