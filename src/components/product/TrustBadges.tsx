import { For } from "solid-js";
import deliveryIcon from "~/assets/icons/delivery.svg";
import authenticIcon from "~/assets/icons/trust-authentic.svg";
import returnIcon from "~/assets/icons/trust-return.svg";
import installmentIcon from "~/assets/icons/trust-installment.svg";

const badges = [
  { icon: deliveryIcon, title: "จัดส่งฟรีทั่วประเทศ", subtitle: "เมื่อซื้อครบ 990.-" },
  { icon: authenticIcon, title: "ของแท้ 100%", subtitle: "จดแจ้ง อย. เรียบร้อย" },
  { icon: returnIcon, title: "คืนสินค้าได้ 7 วัน", subtitle: "กรณีสินค้าชำรุด" },
  { icon: installmentIcon, title: "ผ่อน 0% 3 เดือน", subtitle: "บัตรเครดิตที่ร่วมรายการ" },
] as const;

export function TrustBadges() {
  return (
    <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 rounded-card bg-surface-gray/60 py-4">
      <For each={badges}>
        {(badge) => (
          <div class="flex w-[258px] items-center gap-4">
            <img src={badge.icon} alt="" class="size-8 shrink-0" />
            <div class="flex min-w-0 flex-col">
              <p class="text-base font-semibold text-ink">{badge.title}</p>
              <p class="text-sm text-ink-gray">{badge.subtitle}</p>
            </div>
          </div>
        )}
      </For>
    </div>
  );
}
