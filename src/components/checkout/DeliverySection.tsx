import { DELIVERY } from "~/lib/cartSelectors";
import dhlLogo from "~/assets/icons/dhl-logo-circle.png";

/**
 * Checkout delivery info — no method to pick: every order ships DHL standard. Carrier + ETA only;
 * the fee (free from ฿990, `computeShippingFee`) is shown in the order summary, not here.
 */
export function DeliverySection() {
  return (
    <section aria-labelledby="delivery-heading" class="flex w-full flex-col gap-3">
      <h2 id="delivery-heading" class="text-lg font-semibold text-ink">
        การจัดส่ง
      </h2>
      {/* Same surface as the payment-method tiles (white, 2px gray border). DHL's circular mark, 40px / 48px. */}
      <div class="flex items-center gap-3 rounded-card border-2 border-surface-gray bg-white p-4 sm:gap-4">
        <img src={dhlLogo} alt="DHL" class="size-10 shrink-0 sm:size-12" />
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <p class="font-semibold text-ink">{DELIVERY.label}</p>
          <p class="text-xs leading-[1.75] text-ink-gray">{DELIVERY.etaLabel}</p>
        </div>
      </div>
    </section>
  );
}
