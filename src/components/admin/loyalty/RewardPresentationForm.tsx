import { createSignal, For, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { Toggle } from "~/components/admin/Toggle";
import { SingleImageUploader } from "~/components/admin/SingleImageUploader";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { ChevronDownIcon } from "~/components/admin/icons";
import type { AdminReward, RewardPresentationValues } from "~/lib/adminLoyaltyRewards";
import { useAdminProducts } from "~/lib/adminProductStore";
import { useAdminMarketing } from "~/lib/adminMarketingStore";

/**
 * Edits *only* the Charmiss-owned Presentation/Ecommerce fields on a Reward
 * — never `name`/`rewardType`/`coinCost`/`stockRemaining`/`status`/dates
 * (the CRM's own Coin/Redemption Logic, shown read-only elsewhere on this
 * page, refreshed only by Sync). §3 of Phase 08.4's spec.
 */
export function RewardPresentationForm(props: { reward: AdminReward; onSubmit: (values: RewardPresentationValues) => Promise<void>; onCancel: () => void }) {
  const r = () => props.reward;
  const productStore = useAdminProducts();
  const couponStore = useAdminMarketing().coupons;

  const [displayName, setDisplayName] = createSignal(r().displayName);
  const [displayDescription, setDisplayDescription] = createSignal(r().displayDescription);
  const [image, setImage] = createSignal(r().image);
  const [visible, setVisible] = createSignal(r().visible);
  const [linkedProductId, setLinkedProductId] = createSignal(r().linkedProductId ?? "");
  const [linkedCouponId, setLinkedCouponId] = createSignal(r().linkedCouponId ?? "");

  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setSaving(true);
    setSubmitError(undefined);
    try {
      await props.onSubmit({
        displayName: displayName().trim(),
        displayDescription: displayDescription().trim(),
        image: image(),
        visible: visible(),
        linkedProductId: linkedProductId() || undefined,
        linkedCouponId: linkedCouponId() || undefined,
      });
    } catch {
      setSubmitError("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-6">
      <Section title="การแสดงผลบน Charmiss">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SingleImageUploader label="รูปภาพ" value={image()} onChange={setImage} />
          <div class="flex flex-col gap-4">
            <TextField label="ชื่อที่แสดงบน Charmiss" required value={displayName()} onInput={(e) => setDisplayName(e.currentTarget.value)} disabled={saving()} />
            <label class="flex flex-col gap-1.5">
              <span class="text-sm font-medium text-ink">Visibility</span>
              <Toggle checked={visible()} onChange={setVisible} disabled={saving()} onLabel="แสดงบน Charmiss" offLabel="ซ่อนบน Charmiss" />
            </label>
          </div>
          <label class="flex flex-col gap-1.5 sm:col-span-2">
            <span class="text-sm font-medium text-ink">รายละเอียดที่แสดง</span>
            <textarea
              value={displayDescription()}
              disabled={saving()}
              onInput={(e) => setDisplayDescription(e.currentTarget.value)}
              rows={3}
              class="rounded-card border border-border bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
            />
          </label>
        </div>
      </Section>

      <Section title="เชื่อมกับ Ecommerce (ถ้ามี)">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-ink">สินค้าที่เชื่อมกับ Charmiss</span>
            <div class="relative">
              <select
                value={linkedProductId()}
                onChange={(e) => setLinkedProductId(e.currentTarget.value)}
                disabled={saving()}
                class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
              >
                <option value="">ไม่เชื่อมกับสินค้า</option>
                <For each={productStore.products()}>{(p) => <option value={p.id}>{p.name}</option>}</For>
              </select>
              <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
            </div>
          </label>

          <label class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-ink">คูปองที่เชื่อมกับ Charmiss</span>
            <div class="relative">
              <select
                value={linkedCouponId()}
                onChange={(e) => setLinkedCouponId(e.currentTarget.value)}
                disabled={saving()}
                class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
              >
                <option value="">ไม่เชื่อมกับคูปอง</option>
                <For each={couponStore.items()}>{(c) => <option value={c.id}>{c.code}</option>}</For>
              </select>
              <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
            </div>
          </label>
        </div>
        <p class="text-xs text-ink-placeholder">การเชื่อมนี้เป็นข้อมูลฝั่ง Charmiss เท่านั้น ไม่มีผลกับ Coin Rule หรือ Redemption Logic ของ Charmiss Club CRM</p>
      </Section>

      <Show when={submitError()}>
        <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {submitError()}
        </p>
      </Show>

      <AdminFloatingBar>
        <div class="flex w-full flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={props.onCancel} disabled={saving()}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" loading={saving()}>
            บันทึกการเปลี่ยนแปลง
          </Button>
        </div>
      </AdminFloatingBar>
      <div class="h-16" aria-hidden="true" />
    </form>
  );
}

function Section(props: { title: string; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}
