import { DELIVERY } from "~/lib/cartSelectors";
import { formatTHB } from "../shared/PriceDisplay";
import dhlLogo from "~/assets/icons/dhl-logo-circle.png";

/** Checkout delivery info — no method to pick: every order ships with DHL. */
export function DeliverySection() {
  return (
    <section aria-labelledby="delivery-heading" class="flex w-full flex-col gap-3">
      <h2 id="delivery-heading" class="text-lg font-semibold text-ink">
        การจัดส่ง
      </h2>
      {/* DHL's circular mark (supplied by Charmiss), 40px / 48px. */}
      <div class="flex items-center gap-3 rounded-card border border-surface-gray p-4 sm:gap-4">
        <img src={dhlLogo} alt="DHL" class="size-10 shrink-0 sm:size-12" />
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <p class="font-semibold text-ink">{DELIVERY.label}</p>
          <p class="text-xs text-ink-gray">
            <span class="font-semibold" classList={{ "text-success": DELIVERY.fee === 0, "text-ink": DELIVERY.fee > 0 }}>
              {DELIVERY.fee === 0 ? "ส่งฟรี" : `ค่าส่ง ${formatTHB(DELIVERY.fee)}`}
            </span>
            {" · "}
            {DELIVERY.etaLabel}
          </p>
        </div>
      </div>
    </section>
  );
}
