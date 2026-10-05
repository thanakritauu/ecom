import { createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { MemberBadgeIcon, RefreshIcon } from "~/components/admin/icons";
import { TierBadge } from "~/components/admin/loyalty/TierBadge";
import { getCustomerInitials } from "~/lib/adminCustomers";
import { COIN_ENTRY_STATE_META, LOYALTY_MEMBER_STATUS_META, memberIdLabel, memberName } from "~/lib/adminLoyaltyMembers";
import { useAdminLoyaltyMembers } from "~/lib/adminLoyaltyMemberStore";
import { pushToast } from "~/lib/toast";

/** Read-only Detail — every field on the Member is Charmiss Club CRM's own Membership data; Customer info is read-only here too, and "ดูข้อมูลลูกค้า" is the only way to reach the real Customer Detail page. */
export default function AdminLoyaltyMemberDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminLoyaltyMembers();
  const navigate = useNavigate();
  const member = createMemo(() => store.getById(params.id));
  const customer = createMemo(() => {
    const m = member();
    return m ? store.customerOf(m) : undefined;
  });

  const [syncing, setSyncing] = createSignal(false);

  const handleSync = async () => {
    const m = member();
    if (!m) return;
    setSyncing(true);
    await store.syncSelected([m.id]);
    setSyncing(false);
    pushToast("Sync ข้อมูลจาก Charmiss Club CRM เรียบร้อยแล้ว", "success");
  };

  const openCrm = () => pushToast("(จำลอง) กำลังเปิด Charmiss Club CRM ในแท็บใหม่", "success");

  return (
    <Show
      when={member()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สะสมแต้ม", href: "/admin/loyalty" }, { label: "สมาชิก", href: "/admin/loyalty/members" }]} />
          <EmptyState icon={<MemberBadgeIcon />} title="ไม่พบสมาชิกนี้" description="ข้อมูลอาจยังไม่ได้ Sync มาจาก Charmiss Club CRM หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าสมาชิก" onAction={() => navigate("/admin/loyalty/members")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const m = current;
        const c = customer;
        const name = () => memberName(m(), c());
        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สะสมแต้ม", href: "/admin/loyalty" }, { label: "สมาชิก", href: "/admin/loyalty/members" }, { label: name() }]} />
            <PageHeader
              title={name()}
              description={memberIdLabel(m())}
              actions={
                <div class="flex flex-wrap items-center gap-2">
                  <Show when={c()}>
                    <Button variant="outline" href={`/admin/customers/${c()!.id}`}>
                      ดูข้อมูลลูกค้า
                    </Button>
                  </Show>
                  <Button variant="outline" onClick={handleSync} loading={syncing()}>
                    <RefreshIcon class="size-4" /> Sync
                  </Button>
                  <Button variant="primary" onClick={openCrm}>
                    จัดการใน Charmiss Club CRM
                  </Button>
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title="ข้อมูลลูกค้า (Read-only)">
                  <div class="flex items-center gap-3">
                    <span class="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-pink text-base font-semibold text-white">
                      {c() ? getCustomerInitials(c()!) : (m().crmProfile?.name.charAt(0) ?? "?")}
                    </span>
                    <div class="min-w-0">
                      <p class="truncate font-medium text-ink">{name()}</p>
                      <p class="truncate text-sm text-ink-gray">{c()?.email ?? m().crmProfile?.email ?? "-"}</p>
                    </div>
                  </div>
                  <Row label="เบอร์โทร" value={c()?.phone || m().crmProfile?.phone || "-"} />
                  <Show when={!c()}>
                    <p class="text-sm text-ink-gray">สมาชิกเดิมใน Charmiss Club CRM ที่ยังไม่เคยเข้าสู่ระบบบนเว็บไซต์ — เมื่อเข้าสู่ระบบด้วยเบอร์โทร อีเมล หรือ LINE ที่ตรงกัน ระบบจะสร้างข้อมูลลูกค้าและย้ายคอยน์ให้อัตโนมัติ</p>
                  </Show>
                </Section>

                <Section title="ประวัติคอยน์ (Mock)">
                  <Show when={m().coinHistory.length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีประวัติคอยน์</p>}>
                    <div class="flex flex-col divide-y divide-border">
                      <For each={m().coinHistory}>
                        {(entry) => (
                          <div class="flex items-center justify-between gap-3 py-2.5 text-sm">
                            <div class="min-w-0">
                              <p class="truncate text-ink">{entry.label}</p>
                              <p class="text-xs text-ink-placeholder">
                                {entry.orderId ? `${entry.orderId} · ` : ""}
                                {entry.date}
                              </p>
                            </div>
                            <div class="flex shrink-0 items-center gap-2">
                              <StatusBadge tone={COIN_ENTRY_STATE_META[entry.state].tone}>{COIN_ENTRY_STATE_META[entry.state].label}</StatusBadge>
                              {/* Same colours as the storefront history: credited green, pending grey, redeemed red. */}
                              <span
                                class="w-16 text-right font-medium"
                                classList={{ "text-success": entry.state === "earned", "text-ink-gray": entry.state === "pending", "text-system-red": entry.state === "used" }}
                              >
                                {entry.amount > 0 ? "+" : ""}
                                {entry.amount.toLocaleString("th-TH")}
                              </span>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะสมาชิก">
                  <StatusBadge tone={LOYALTY_MEMBER_STATUS_META[m().status].tone} class="w-fit">
                    {LOYALTY_MEMBER_STATUS_META[m().status].label}
                  </StatusBadge>
                </Section>

                <Section title="ระดับสมาชิก">
                  <TierBadge tier={m().tier} />
                </Section>

                <Section title="คอยน์">
                  <Row label="คอยน์ที่ได้รับ" value={`+${m().coinsEarned.toLocaleString("th-TH")}`} />
                  <Row label="คอยน์ที่ใช้ไป" value={m().coinsUsed.toLocaleString("th-TH")} />
                  <Row label="คอยน์คงเหลือ" value={m().coinsRemaining.toLocaleString("th-TH")} />
                </Section>

                <Section title="ข้อมูลการเชื่อมต่อ">
                  <Row label="รหัส CRM" value={memberIdLabel(m())} />
                  <Row label="เข้าร่วมเมื่อ" value={m().joinedAt || "-"} />
                  <Row label="Source" value={m().source} />
                  <Row label="Sync ล่าสุด" value={m().syncedAt || "-"} />
                </Section>
              </div>
            </div>
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
