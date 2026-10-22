import { createMemo, createSignal, For, Show } from "solid-js";
import { A, useSearchParams } from "@solidjs/router";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { Button } from "~/components/shared/Button";
import { EmptyState } from "~/components/shared/EmptyState";
import { CartIcon } from "~/components/shared/icons";
import { useCart } from "~/lib/cart";
import { useAuth } from "~/lib/auth";
import {
  resolveCartLines,
  computeCheckoutTotals,
  computeCoinsEarned,
  couponCartBlock,
  couponUsageBlock,
  maxRedeemableCoins,
  MOCK_COIN_BALANCE,
  DELIVERY_OPTIONS,
  type Coupon,
  type DeliveryOptionId,
} from "~/lib/cartSelectors";
import { createAddressBook, createLocalAddressRepository, type AddressMockState } from "~/lib/addressBook";
import { createMockOrderRepository, createOrderHistory } from "~/lib/orderHistory";
import { resolveTier, yearlySpend } from "~/lib/membership";
import { useProductCatalog } from "~/lib/productCatalog";
import { useCartPromotions, useStorefrontPromotions } from "~/lib/storefrontPromotions";
import { formatTHB } from "~/components/shared/PriceDisplay";
import { AddressCard } from "~/components/checkout/AddressSection";
import type { ShippingAddressSheetView } from "~/components/checkout/ShippingAddressSheet";
import { TaxInvoiceSummary } from "~/components/checkout/TaxInvoiceFields";
import type { TaxInvoiceSheetView } from "~/components/checkout/TaxInvoiceSheet";
import { clientOnly } from "@solidjs/start";
import {
  mergeTaxInvoiceProfile,
  readTaxInvoiceProfiles,
  setDefaultTaxInvoiceProfile,
  upsertTaxInvoiceProfile,
  withDefaultTaxInvoiceProfile,
  type TaxInvoiceProfile,
} from "~/lib/taxInvoiceProfiles";
import { PaymentSection } from "~/components/checkout/PaymentSection";
import { DeliverySection } from "~/components/checkout/DeliverySection";
import { createCheckoutPayment, type PaidResult } from "~/components/checkout/checkoutPayment";
import { generateOrderNumber } from "~/lib/orderNumber";
import { CheckoutOrderSummary, CheckoutPerks } from "~/components/checkout/CheckoutOrderSummary";
import { METHOD_ICONS } from "~/components/checkout/paymentMarks";
import coinMark from "~/assets/icons/charmiss-coin.png";
import { FloatingOrderSummary } from "~/components/shared/FloatingOrderSummary";
import { focusFirstInvalid } from "~/lib/validators";

/**
 * Figma node 146:8484. Reuses the exact same shared cart state and pricing
 * primitives as the Drawer and Cart Page (cart.tsx / cartSelectors.ts) —
 * this is the fourth and last screen in that one chain, not a fourth place
 * that re-derives its own subtotal.
 */

// Same Kobalte Dialog SSR/hydration workaround as the coupon / coin sheets.
const ShippingAddressSheet = clientOnly(() => import("~/components/checkout/ShippingAddressSheet").then((m) => ({ default: m.ShippingAddressSheet })));
const TaxInvoiceSheet = clientOnly(() => import("~/components/checkout/TaxInvoiceSheet").then((m) => ({ default: m.TaxInvoiceSheet })));
export default function CheckoutPage() {
  const cart = useCart();
  const auth = useAuth();
  const catalog = useProductCatalog();
  const resolvedLines = createMemo(() => resolveCartLines(cart.lines(), catalog.products()));
  const promos = useCartPromotions(resolvedLines);
  // Same `priceCart` as the mini cart and cart page: lines' total, cart-level promo rows, and the priced lines the coupon works on.
  const subtotal = () => promos.pricing().subtotal;
  const promoDiscount = () => promos.pricing().promoDiscount;
  const pricedLines = () => promos.pricing().pricedLines;
  const hasUnavailableItem = createMemo(() => resolvedLines().some(({ product }) => product.stockLeft !== undefined && product.stockLeft <= 0));

  // Phase 04 — saved addresses come through the address book (repository
  // layer), never mock data directly. Mock state: signed-in member = has a
  // default address (State B), guest = first-time buyer with none (State A);
  // `?address=new|existing` forces either for QA / user testing.
  const [searchParams] = useSearchParams();
  const accountState = (): AddressMockState => {
    const forced = searchParams.address;
    return forced === "new" || forced === "existing" ? forced : auth.isAuthenticated() ? "existing" : "new";
  };
  const addressBook = createAddressBook(() => createLocalAddressRepository(accountState()));
  const [pickedShippingId, setPickedShippingId] = createSignal<string | undefined>();
  // Falls back to the default address, so a returning shopper's checkout opens ready to go.
  // Billing-only addresses (saved from the billing form, maybe a company) aren't offered for shipping.
  const shippingAddresses = () => addressBook.addresses().filter((a) => a.kind !== "billing");
  const selectedAddressId = () =>
    shippingAddresses().some((a) => a.id === pickedShippingId()) ? pickedShippingId() : addressBook.defaultAddress()?.id;
  // "เปลี่ยน" on the address card (or "+ เพิ่มที่อยู่จัดส่ง" with none yet) opens `ShippingAddressSheet`.
  const [shippingSheetOpen, setShippingSheetOpen] = createSignal(false);
  const [shippingSheetView, setShippingSheetView] = createSignal<ShippingAddressSheetView>({ kind: "list" });
  const openShippingSheet = (view: ShippingAddressSheetView) => {
    setShippingSheetView(view);
    setShippingSheetOpen(true);
  };

  // Tax invoice — off by default. Ticked: a summary of the chosen details (most recent saved entry) with "เปลี่ยน",
  // which opens `TaxInvoiceSheet` (pick from the saved list, or add / edit). No saved entry yet: the popup opens on its form.
  const [wantsTaxInvoice, setWantsTaxInvoice] = createSignal(false);
  // Signed-in members' entries persist (`taxInvoiceProfiles`); a guest's live for this visit only. Read on tick (client only).
  const [taxProfiles, setTaxProfiles] = createSignal<TaxInvoiceProfile[]>([]);
  const [taxProfileId, setTaxProfileId] = createSignal<string | undefined>();
  const [taxSheetOpen, setTaxSheetOpen] = createSignal(false);
  const [taxSheetView, setTaxSheetView] = createSignal<TaxInvoiceSheetView>({ kind: "list" });
  const selectedTaxProfile = () => taxProfiles().find((p) => p.id === taxProfileId());
  const shippingAddress = () => shippingAddresses().find((a) => a.id === selectedAddressId());
  /** ที่อยู่ออกใบกำกับภาษี: the entry's saved address, or the shipping address. */
  const taxInvoiceAddress = (p: TaxInvoiceProfile) => addressBook.addresses().find((a) => a.id === p.addressId) ?? shippingAddress();
  const openTaxSheet = (view: TaxInvoiceSheetView) => {
    setTaxSheetView(view);
    setTaxSheetOpen(true);
  };
  const onTaxInvoiceToggle = (on: boolean) => {
    setWantsTaxInvoice(on);
    setFieldErrors(({ taxInvoice, ...rest }) => rest);
    if (!on || taxProfileId()) return;
    const profiles = auth.isAuthenticated() ? readTaxInvoiceProfiles(accountState()) : taxProfiles();
    setTaxProfiles(profiles);
    // Start from the default (the list keeps it first).
    const start = profiles.find((p) => p.isDefault) ?? profiles[0];
    if (start) setTaxProfileId(start.id);
    else openTaxSheet({ kind: "form" });
  };
  const saveTaxProfile = (profile: TaxInvoiceProfile, opts: { makeDefault: boolean }) => {
    setTaxProfiles((list) =>
      auth.isAuthenticated() ? upsertTaxInvoiceProfile(accountState(), profile, opts.makeDefault) : mergeTaxInvoiceProfile(list, profile, opts.makeDefault),
    );
    setTaxProfileId(profile.id);
    setFieldErrors(({ taxInvoice, ...rest }) => rest);
  };
  const setDefaultTaxProfile = (id: string) =>
    setTaxProfiles((list) => (auth.isAuthenticated() ? setDefaultTaxInvoiceProfile(accountState(), id) : withDefaultTaxInvoiceProfile(list, id)));
  const [deliveryId, setDeliveryId] = createSignal<DeliveryOptionId>("dhl");
  const delivery = () => DELIVERY_OPTIONS.find((o) => o.id === deliveryId()) ?? DELIVERY_OPTIONS[0];
  // The picked carrier's fee, unless a free-shipping promo is unlocked (then every carrier is free).
  const freeShipping = () => promos.shippingFee() === 0;
  const shippingFee = () => (freeShipping() ? 0 : delivery().fee);
  const [pickedCoupon, setCoupon] = createSignal<Coupon>();
  const [coinsPicked, setCoinsPicked] = createSignal(0);

  let formColumn: HTMLDivElement | undefined;

  const [fieldErrors, setFieldErrors] = createSignal<Record<string, string>>({});
  const [submitError, setSubmitError] = createSignal<string>();
  const [order, setOrder] = createSignal<{ number: string; total: number; coinsEarned: number; payment: PaidResult } | undefined>();

  // One-page checkout: address → billing → delivery → payment method, then
  // Beam's payment page (new window) takes the money — see `createCheckoutPayment`.
  const [pendingOrderNumber, setPendingOrderNumber] = createSignal("");

  // The shopper's member tier (this year's paid spend, same as `/account/points`) sets the coin multiplier.
  const orderHistory = createOrderHistory(() => createMockOrderRepository());
  const storefrontMarketing = useStorefrontPromotions();
  // Coupon "จำกัดต่อลูกค้า": the signed-in shopper's own non-cancelled orders that used the code (a guest has no history to count).
  const couponUsesByShopper = (code: string) =>
    auth.isAuthenticated() ? orderHistory.orders().filter((o) => o.status !== "cancelled" && o.payment.couponCode?.toUpperCase() === code.toUpperCase()).length : 0;
  // A picked coupon stops counting the moment its usage limit is reached (e.g. order history loaded after it was picked),
  // or the cart no longer qualifies (its products removed, or under the minimum); it comes back if the cart qualifies again.
  const coupon = () => {
    const c = pickedCoupon();
    // กลุ่มลูกค้า is checked against the current shopper (e.g. a guest who picked a new-customer coupon, then signed in as a returning member).
    const outsideAudience = c && storefrontMarketing.codeCoupons().find((x) => x.code === c.code)?.audienceBlock;
    return c && !outsideAudience && !couponUsageBlock(c, couponUsesByShopper(c.code)) && !couponCartBlock(c, pricedLines()) ? c : undefined;
  };

  // Coins the order can take — the coupon/cart can change after coins were picked, so the pick is capped (not reset).
  const maxCoins = createMemo(() =>
    maxRedeemableCoins({
      balance: MOCK_COIN_BALANCE,
      subtotal: promos.pricing().total,
      couponDiscount: computeCheckoutTotals({ subtotal: subtotal(), promoDiscount: promoDiscount(), lines: pricedLines(), coupon: coupon(), shippingFee: 0 }).couponDiscount,
    }),
  );
  const coinsRedeemed = () => Math.min(coinsPicked(), maxCoins());
  const totals = createMemo(() =>
    computeCheckoutTotals({ subtotal: subtotal(), promoDiscount: promoDiscount(), lines: pricedLines(), coupon: coupon(), coinsRedeemed: coinsRedeemed(), shippingFee: shippingFee() }),
  );

  const tier = () => resolveTier(yearlySpend(orderHistory.orders())).current;
  // Same condition that gates the two-column form/summary — nothing to pay
  // for once the cart's empty or the order already went through, so the
  // floating bar (and the bottom padding reserved for it) only exist then.
  const showFloatingBar = () => !order() && resolvedLines().length > 0;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    // An open form shows every empty/invalid field's own error (both forms at once); the line under it
    // only says what's left — fix the fields, or save a complete form first.
    if (!selectedAddressId()) errors.address = "กรุณาเพิ่มที่อยู่จัดส่ง";
    if (wantsTaxInvoice() && !selectedTaxProfile()) errors.taxInvoice = "กรุณาเพิ่มข้อมูลใบกำกับภาษี";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      // First invalid field (shipping before the tax invoice); a complete-but-unsaved form → its section heading.
      if (!focusFirstInvalid(formColumn)) {
        const scrollTargetId = errors.address ? "shipping-address-heading" : "tax-invoice-heading";
        document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }
    return true;
  };

  // Checkout's own checks, run by the pay action before any money moves.
  const validateOrder = (): boolean => {
    if (resolvedLines().length === 0 || hasUnavailableItem()) {
      setSubmitError("มีสินค้าในตะกร้าที่ไม่สามารถสั่งซื้อได้ กรุณากลับไปแก้ไขตะกร้าก่อน");
      return false;
    }
    setSubmitError(undefined);
    return validate();
  };

  const onPaid = (payment: PaidResult) => {
    // Display-only mockup — no loyalty-points backend exists, so this never
    // touches `auth`'s `coinBalance`; same amount-paid-for-merchandise basis
    // (shipping fee excluded) and tier multiplier as the account's order pages.
    // The amount Beam charged — in same-tab mode this page reloaded and lost coupon/coin picks, so not `totals()`.
    const coinsEarned = computeCoinsEarned(payment.amount - totals().shippingFee, tier().id);
    setOrder({ number: payment.orderNumber, total: payment.amount, coinsEarned, payment });
    cart.clearCart();
    window.scrollTo({ top: 0 });
  };

  const payment = createCheckoutPayment({
    amount: () => totals().total,
    // Reserved on the first pay attempt, so a failed/retried payment stays on the same order.
    orderNumber: () => pendingOrderNumber() || setPendingOrderNumber(generateOrderNumber()),
    validateOrder,
    onPaid,
    returnPath: () => "/checkout",
  });

  return (
    <>
      <Header minimal />
      {/* Icon sits inline at the start of the sentence, so icon + text center as one block; the wrap is
          balanced so phones get two even lines instead of "ปลอดภัย" alone. */}
      {/* Checkout form only: gone once the order is paid (success page). */}
      <Show when={!order()}>
        <p class="text-balance bg-success-soft px-4 py-2 text-center text-sm font-semibold text-success">
          <ShieldIcon /> ข้อมูลการชำระเงินของคุณได้รับการปกป้องอย่างปลอดภัย
        </p>
      </Show>

      {/* `overflow-x-hidden` forces `overflow-y` to `auto` too (an axis can't
          stay `visible` while the other isn't, per the CSS Overflow spec) —
          that made this <main> the nearest scroll-container ancestor for
          CheckoutOrderSummary's `lg:sticky lg:top-6`, so the sticky offset
          was resolving against <main>'s scrollport instead of the viewport
          and pushing the right column down by a full 24px. `overflow-x-clip`
          clips the same horizontal overflow without that pairing rule
          kicking in (confirmed live: overflow-y stays `visible`), which is
          the actual fix for Part B's top-alignment — the CheckoutOrderSummary
          padding tweak alone only accounts for the remaining ~1px. */}
      <main class="flex flex-col overflow-x-clip bg-surface-gray/60 py-6">
        <Container width="wide">
          <Show
            when={!order()}
            fallback={
              <OrderSuccess
                number={order()!.number}
                total={order()!.total}
                coinsEarned={order()!.coinsEarned}
                payment={order()!.payment}
                isMember={auth.isAuthenticated()}
              />
            }
          >
            <Show when={resolvedLines().length > 0} fallback={<EmptyCheckout />}>
              {/* Phones / tablets: form + order summary are one white card (no gap, summary continues below the form). */}
              <div class="flex flex-col lg:flex-row lg:items-start lg:gap-6">
                <div ref={formColumn} class="flex min-w-0 flex-1 flex-col gap-6 rounded-t-card bg-white p-4 lg:rounded-card lg:p-6">
                  <Show when={addressBook.ready()} fallback={<AddressSkeleton />}>
                    {/* Same flow as the tax invoice: the chosen address in one card, "เปลี่ยน" to pick / add / edit in the popup. */}
                    <section aria-labelledby="shipping-address-heading" class="flex flex-col gap-3">
                      <h2 id="shipping-address-heading" class="text-lg font-semibold text-ink">
                        ที่อยู่จัดส่ง
                      </h2>
                      <Show
                        when={shippingAddress()}
                        fallback={
                          <div class="flex flex-col items-start gap-3 rounded-card border border-surface-gray p-4">
                            <p class="text-sm text-ink-gray">ยังไม่มีที่อยู่จัดส่ง กรอกเพียงครั้งเดียว ครั้งหน้าระบบจะใช้ที่อยู่นี้ให้อัตโนมัติ</p>
                            <Button type="button" variant="outline" size="sm" onClick={() => openShippingSheet({ kind: "form" })}>
                              + เพิ่มที่อยู่จัดส่ง
                            </Button>
                          </div>
                        }
                      >
                        {(a) => <AddressCard address={a()} editLabel="เปลี่ยน" onEdit={() => openShippingSheet({ kind: "list" })} />}
                      </Show>
                      <Show when={fieldErrors().address}>
                        <p role="alert" class="text-sm text-system-red">
                          {fieldErrors().address}
                        </p>
                      </Show>
                      <ShippingAddressSheet
                        open={shippingSheetOpen()}
                        onOpenChange={setShippingSheetOpen}
                        view={shippingSheetView()}
                        addresses={shippingAddresses()}
                        selectedId={selectedAddressId()}
                        onSelect={(id) => {
                          setPickedShippingId(id);
                          setFieldErrors(({ address, ...rest }) => rest);
                        }}
                        onSave={(address, opts) => addressBook.save(address, opts)}
                        onSetDefault={addressBook.setDefault}
                      />
                    </section>

                    <Show when={selectedAddressId()}>
                      {/* No gap: the checkbox row keeps its 44px tap height, which alone puts its box 12px under the heading. */}
                      <section aria-labelledby="tax-invoice-heading" class="flex flex-col">
                        <h2 id="tax-invoice-heading" class="text-lg font-semibold text-ink">
                          ใบกำกับภาษี
                        </h2>
                        <label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={wantsTaxInvoice()}
                            onChange={(e) => onTaxInvoiceToggle(e.currentTarget.checked)}
                            class="size-5 shrink-0 rounded accent-brand-pink"
                          />
                          ขอใบกำกับภาษี
                        </label>
                        {/* Ticked: the chosen details in one card, "เปลี่ยน" to pick / add / edit in the popup. */}
                        <Show when={wantsTaxInvoice()}>
                          <div class="mt-2 flex flex-col gap-2">
                            <Show
                              when={selectedTaxProfile()}
                              fallback={
                                <div class="flex flex-col items-start gap-3 rounded-card border border-surface-gray p-4">
                                  <p class="text-sm text-ink-gray">ยังไม่มีข้อมูลใบกำกับภาษี</p>
                                  <Button type="button" variant="outline" size="sm" onClick={() => openTaxSheet({ kind: "form" })}>
                                    + เพิ่มข้อมูลใบกำกับภาษี
                                  </Button>
                                </div>
                              }
                            >
                              {(p) => (
                                <div class="flex items-start gap-3 rounded-card bg-surface-pink p-4">
                                  <div class="min-w-0 flex-1">
                                    <TaxInvoiceSummary profile={p()} address={taxInvoiceAddress(p())} />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => openTaxSheet({ kind: "list" })}
                                    class="min-h-6 shrink-0 text-xs font-medium text-brand-pink underline"
                                    aria-label="เปลี่ยนข้อมูลใบกำกับภาษี"
                                  >
                                    เปลี่ยน
                                  </button>
                                </div>
                              )}
                            </Show>
                            <Show when={fieldErrors().taxInvoice}>
                              <p role="alert" class="text-sm text-system-red">
                                {fieldErrors().taxInvoice}
                              </p>
                            </Show>
                          </div>
                        </Show>
                        <TaxInvoiceSheet
                          open={taxSheetOpen()}
                          onOpenChange={setTaxSheetOpen}
                          view={taxSheetView()}
                          profiles={taxProfiles()}
                          selectedId={taxProfileId()}
                          onSelect={(id) => {
                            setTaxProfileId(id);
                            setFieldErrors(({ taxInvoice, ...rest }) => rest);
                          }}
                          onSave={saveTaxProfile}
                          onSetDefault={setDefaultTaxProfile}
                          addresses={addressBook.addresses()}
                          shippingAddress={shippingAddress()}
                          onSaveAddress={(address, opts) => addressBook.save(address, opts)}
                          accountEmail={auth.user()?.email ?? ""}
                        />
                      </section>
                    </Show>
                  </Show>
                  {/* Carrier choice: same tiles as the payment methods; DHL by default. */}
                  <DeliverySection value={deliveryId()} onChange={setDeliveryId} free={freeShipping()} disabled={payment.waiting()} />

                  {/* Payment — paid here; its button ends the form. */}
                  <PaymentSection
                    payment={payment}
                    amount={totals().total}
                    disabled={hasUnavailableItem()}
                    submitError={submitError()}
                    payLaterHint
                    payButtonDesktopOnly
                    afterMethods={
                      <CheckoutPerks
                        class="flex rounded-card lg:hidden"
                        lines={pricedLines()}
                        totals={totals()}
                        coupon={coupon()}
                        onApplyCoupon={setCoupon}
                        onRemoveCoupon={() => setCoupon(undefined)}
                        couponUsesByShopper={couponUsesByShopper}
                        coinsRedeemed={coinsRedeemed()}
                        maxCoins={maxCoins()}
                        onApplyCoins={setCoinsPicked}
                      />
                    }
                    notice={
                      <Show when={hasUnavailableItem()}>
                        <p class="rounded-card bg-danger-soft p-3 text-sm text-danger-strong" role="alert">
                          มีสินค้าในตะกร้าที่หมดสต็อก กรุณา
                          <A href="/cart" class="mx-1 underline">
                            กลับไปที่ตะกร้า
                          </A>
                          เพื่อแก้ไขก่อนสั่งซื้อ
                        </p>
                      </Show>
                    }
                  />
                </div>

                <CheckoutOrderSummary
                  carrierName={delivery().name}
                  carrierFee={delivery().fee}
                  lines={resolvedLines()}
                  pricedLines={pricedLines()}
                  promoRows={promos.pricing().rows}
                  gifts={promos.giftLines()}
                  totals={totals()}
                  coupon={coupon()}
                  onApplyCoupon={setCoupon}
                  onRemoveCoupon={() => setCoupon(undefined)}
                  couponUsesByShopper={couponUsesByShopper}
                  coinsRedeemed={coinsRedeemed()}
                  maxCoins={maxCoins()}
                  onApplyCoins={setCoinsPicked}
                />
              </div>
            </Show>
          </Show>
        </Container>
      </main>

      <Show when={showFloatingBar()}>
        <FloatingOrderSummary
          itemCount={resolvedLines().reduce((n, l) => n + l.line.qty, 0)}
          discount={totals().promoDiscount + totals().couponDiscount + totals().coinDiscount}
          shippingFee={totals().shippingFee}
          total={totals().total}
          ctaLabel={payment.ctaLabel()}
          onCta={payment.pay}
          ctaDisabled={hasUnavailableItem()}
          error={submitError()}
        />
      </Show>

      <Footer />
      {/* Room for the fixed floating bar — below the Footer, so the content→Footer gap stays the site-wide 24px. */}
      <Show when={showFloatingBar()}>
        <div class="h-36 bg-brand-pink md:h-24" aria-hidden="true" />
      </Show>
    </>
  );
}

function AddressSkeleton() {
  return (
    <div class="flex flex-col gap-3" aria-hidden="true">
      <div class="h-6 w-32 animate-pulse rounded bg-surface-gray" />
      <div class="h-20 w-full animate-pulse rounded-card bg-surface-gray" />
    </div>
  );
}

function EmptyCheckout() {
  return (
    <div class="rounded-card bg-white py-6">
      <EmptyState
        icon={CartIcon}
        title="ไม่มีสินค้าในตะกร้า"
        description="เพิ่มสินค้าลงตะกร้าก่อน แล้วกลับมาชำระเงินได้เลย"
        action={{ label: "เลือกซื้อสินค้า", href: "/products" }}
      />
    </div>
  );
}

function OrderSuccess(props: { number: string; total: number; coinsEarned: number; payment: PaidResult; isMember: boolean }) {
  return (
    <div class="mx-auto flex w-full max-w-[560px] flex-col items-center justify-center gap-4 rounded-card bg-white px-4 py-12 text-center shadow-card sm:py-16" role="status">
      {/* Pops in, a soft ring pulses out once, then the DSL tick draws itself (app.css `success-check-*`; still under reduced motion). */}
      <div class="relative flex size-16 items-center justify-center" aria-hidden="true">
        <span class="success-check-ring absolute inset-0 rounded-pill bg-success/30" />
        <span class="success-check-pop relative flex size-16 items-center justify-center rounded-pill bg-success text-white">
          <svg viewBox="0 0 16 16" fill="none" class="size-9">
            <path class="success-check-path" pathLength="1" d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </div>
      <h1 class="text-2xl font-bold text-ink">ชำระเงินสำเร็จ</h1>
      <p class="text-ink-gray">ขอบคุณสำหรับคำสั่งซื้อของคุณ</p>
      <dl class="flex w-full max-w-sm flex-col gap-2 rounded-card bg-surface-gray/60 px-5 py-4 text-sm">
        <div class="flex justify-between gap-3">
          <dt class="text-ink-gray">หมายเลขคำสั่งซื้อ</dt>
          <dd class="font-semibold text-ink">{props.number}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-gray">ยอดชำระ</dt>
          <dd class="font-semibold text-brand-pink">{formatTHB(props.total)}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-gray">ช่องทางชำระเงิน</dt>
          <dd class="flex flex-col items-end gap-1 text-right text-ink">
            {/* The method's own icons (same artwork as the payment picker), then its name. */}
            <span class="flex items-center gap-2">
              <span class="flex shrink-0 items-center -space-x-1.5">
                <For each={METHOD_ICONS[props.payment.method]}>
                  {(src) => <img src={src} alt="" class="size-6 rounded-md ring-2 ring-surface-gray" />}
                </For>
              </span>
              {props.payment.methodLabel}
            </span>
            <Show when={props.payment.detail}>
              <span class="block text-xs text-ink-gray">{props.payment.detail}</span>
            </Show>
          </dd>
        </div>
      </dl>
      {/* Charmiss Coin is a member-account balance (`auth.tsx`'s `User.coinBalance`)
          — a guest checkout has no account to credit, so this only shows once
          actually signed in, same gate as anywhere else this balance appears. */}
      <Show when={props.isMember && props.coinsEarned > 0}>
        <div class="flex items-center gap-2 rounded-pill bg-surface-pink py-2 pl-2 pr-4 text-sm font-semibold text-ink">
          <img src={coinMark} alt="" class="size-6 shrink-0" />
          คุณได้รับ {props.coinsEarned.toLocaleString("th-TH")} คอยน์จากคำสั่งซื้อนี้
        </div>
      </Show>
      <div class="flex w-full max-w-sm flex-col gap-2">
        {/* Paid: straight to the "กำลังจัดส่ง" tab, where this order now sits. */}
        <Button href="/account?tab=in_progress" variant="primary" size="lg" class="w-full">
          ดูประวัติการซื้อ
        </Button>
        <Button href="/" variant="outline" size="lg" class="w-full">
          กลับไปช้อปต่อ
        </Button>
      </div>
    </div>
  );
}

/** Iconex "Shield" (Light) — shield with a check; drawn in `currentColor`, i.e. the banner's success green (#009B4D). */
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" class="-mt-0.5 mr-1 inline-block size-5 align-middle" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <path d="M4 7.03285C4 6.66968 4.19689 6.33506 4.51436 6.15869L11.5144 2.2698C11.8164 2.10201 12.1836 2.10201 12.4856 2.2698L19.4856 6.15869C19.8031 6.33506 20 6.66968 20 7.03285V11.6715C20 15.3032 18.0311 18.6494 14.8564 20.4131L12.4856 21.7302C12.1836 21.898 11.8164 21.898 11.5144 21.7302L9.14357 20.4131C5.96892 18.6494 4 15.3032 4 11.6715V7.03285Z" />
      <path d="M9.5 12L11.5 14L15.5 10" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}
