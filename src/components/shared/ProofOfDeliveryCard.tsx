import { Show } from "solid-js";
import { formatEventTime } from "~/lib/orderTracking";
import type { ProofOfDelivery } from "~/lib/types";

/**
 * The carrier's proof of delivery (`Shipment.proofOfDelivery`, from its API with the delivered scan): who took
 * the parcel, how, when, and the courier's photo / the signature. Tapping a picture opens it full size in a new
 * tab. Shown under the DHL timeline on the customer's order page and on Admin's order page, never on the public
 * /tracking lookup (the photo shows the customer's door).
 */
export function ProofOfDeliveryCard(props: { proof: ProofOfDelivery; carrierName: string; class?: string }) {
  return (
    <section aria-label={`หลักฐานการจัดส่งจาก ${props.carrierName}`} class={`flex flex-col gap-3 rounded-2xl border border-surface-gray p-4 ${props.class ?? ""}`}>
      <p class="text-sm font-semibold text-ink">หลักฐานการจัดส่งจาก {props.carrierName}</p>
      <dl class="flex flex-col gap-1 text-sm">
        <div class="flex justify-between gap-3">
          <dt class="text-ink-gray">ผู้รับ</dt>
          <dd class="text-right text-ink">{props.proof.receivedBy}</dd>
        </div>
        <Show when={props.proof.method}>
          {(method) => (
            <div class="flex justify-between gap-3">
              <dt class="text-ink-gray">การส่งมอบ</dt>
              <dd class="text-right text-ink">{method()}</dd>
            </div>
          )}
        </Show>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-gray">เวลา</dt>
          <dd class="text-right text-ink">{formatEventTime(props.proof.deliveredAt)}</dd>
        </div>
      </dl>
      <Show when={props.proof.photoUrl || props.proof.signatureUrl}>
        <div class="grid grid-cols-2 gap-3">
          <Show when={props.proof.photoUrl}>
            {(src) => <ProofImage src={src()} label="รูปถ่ายตอนส่งมอบ" />}
          </Show>
          <Show when={props.proof.signatureUrl}>
            {(src) => <ProofImage src={src()} label="ลายมือชื่อผู้รับ" whole />}
          </Show>
        </div>
      </Show>
    </section>
  );
}

/** `whole`: shown uncropped (a wide signature), not filling the frame like a photo. */
function ProofImage(props: { src: string; label: string; whole?: boolean }) {
  return (
    <a
      href={props.src}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`ดู${props.label}แบบเต็ม`}
      class="flex flex-col gap-1.5 text-xs text-ink-gray transition-colors duration-150 lg:hover:text-brand-pink"
    >
      <img src={props.src} alt={props.label} loading="lazy" class={`aspect-[4/3] w-full rounded-xl border border-surface-gray bg-white ${props.whole ? "object-contain" : "object-cover"}`} />
      {props.label}
    </a>
  );
}
