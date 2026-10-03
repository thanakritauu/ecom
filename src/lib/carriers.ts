import type { CarrierId } from "./types";

/**
 * Phase 05 — carrier configuration. The one place a carrier's public
 * tracking-page URL lives, so it can be corrected/changed (or moved to
 * runtime config) without touching any UI.
 *
 * DHL: DHL's public tracking page with the number pre-filled
 * (`tracking-id` + `submit=1`). No DHL API, key or OAuth is involved — this
 * only opens DHL's own website. Confirm with the DHL account manager which
 * DHL service Charmiss ships with (e.g. Express vs eCommerce); if it has its
 * own tracking portal, change only `trackingUrlTemplate` here.
 */
export type CarrierConfig = {
  name: string;
  /** `{trackingNumber}` is replaced (URL-encoded). */
  trackingUrlTemplate: string;
};

export const CARRIERS: Record<CarrierId, CarrierConfig> = {
  dhl: {
    name: "DHL",
    trackingUrlTemplate: "https://www.dhl.com/th-th/home/tracking.html?tracking-id={trackingNumber}&submit=1",
  },
};

export function getCarrierTrackingUrl(carrier: CarrierId, trackingNumber: string): string {
  return CARRIERS[carrier].trackingUrlTemplate.replace("{trackingNumber}", encodeURIComponent(trackingNumber));
}
