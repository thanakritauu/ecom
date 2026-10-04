import { createMemo, createSignal, Show } from "solid-js";
import { A, useSearchParams } from "@solidjs/router";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { Button } from "~/components/shared/Button";
import { useCart } from "~/lib/cart";
import { useAuth } from "~/lib/auth";
import {
  resolveCartLines,
  computeCartTotal,
  computeCheckoutTotals,
  computeCoinsEarned,
  DELIVERY,
  MAX_COIN_REDEMPTION,
  type Coupon,
} from "~/lib/cartSelectors";
import { createAddressBook, createLocalAddressRepository, type AddressMockState } from "~/lib/addressBook";
import { useProductCatalog } from "~/lib/productCatalog";
import { formatTHB } from "~/components/shared/PriceDisplay";
import { AddressSection } from "~/components/checkout/AddressSection";
import { PaymentSection } from "~/components/checkout/PaymentSection";
import { createCheckoutPayment, type PaidResult } from "~/components/checkout/checkoutPayment";
import { createMockPaymentProvider } from "~/lib/payment";
import { CheckoutOrderSummary } from "~/components/checkout/CheckoutOrderSummary";
import { FloatingOrderSummary } from "~/components/shared/FloatingOrderSummary";

/**
 * Figma node 146:8484. Reuses the exact same shared cart state and pricing
 * primitives as the Drawer and Cart Page (cart.tsx / cartSelectors.ts) —
 * this is the fourth and last screen in that one chain, not a fourth place
 * that re-derives its own subtotal.
 */
export default function CheckoutPage() {
  const cart = useCart();
  const auth = useAuth();
  const catalog = useProductCatalog();
  const resolvedLines = createMemo(() => resolveCartLines(cart.lines(), catalog.products()));
  const subtotal = createMemo(() => computeCartTotal(resolvedLines()));
  const hasUnavailableItem = createMemo(() =>
    resolvedLines().some(({ product }) => product.stockLeft !== undefined && product.stockLeft <= 0),
  );

  // Phase 04 — saved addresses come through the address book (repository
  // layer), never mock data directly. Mock state: signed-in member = has a
  // default address (State B), guest = first-time buyer with none (State A);
  // `?address=new|existing` forces either for QA / user testing.
  const [searchParams] = useSearchParams();
  const addressBook = createAddressBook(() => {
    const forced = searchParams.address;
    const state: AddressMockState = forced === "new" || forced === "existing" ? forced : auth.isAuthenticated() ? "existing" : "new";
    return createLocalAddressRepository(state);
  });
  const [pickedShippingId, setPickedShippingId] = createSignal<string | undefined>();
  // Falls back to the default address, so a returning shopper's checkout opens ready to go.
  const selectedAddressId = () =>
    addressBook.addresses().some((a) => a.id === pickedShippingId()) ? pickedShippingId() : addressBook.defaultAddress()?.id;
  const [shippingFormOpen, setShippingFormOpen] = createSignal(false);

  // Billing — same as shipping by default (State E); unticking reveals a picker/form (State D).
  const [billingSameAsShipping, setBillingSameAsShipping] = createSignal(true);
  const [pickedBillingId, setPickedBillingId] = createSignal<string | undefined>();
  const [billingFormOpen, setBillingFormOpen] = createSignal(false);
  const billingCandidates = () => addressBook.addresses().filter((a) => a.id !== selectedAddressId());
  const billingAddressId = () =>
    billingSameAsShipping() ? selectedAddressId() : billingCandidates().some((a) => a.id === pickedBillingId()) ? pickedBillingId() : undefined;
  const [coupon, setCoupon] = createSignal<Coupon>();
  const [coinsRedeemed, setCoinsRedeemed] = createSignal(0);

  const [fieldErrors, setFieldErrors] = createSignal<Record<string, string>>({});
  const [submitError, setSubmitError] = createSignal<string>();
  const [order, setOrder] = createSignal<{ number: string; total: number; coinsEarned: number; payment: PaidResult } | undefined>();

  // One-page checkout: address → billing → payment, paid right here.
  // The payment provider is the only payment dependency; mock today
  // (`?mockPayment=fail` forces failures, `?mockPayment=expire` shortens the PromptPay QR).
  const [pendingOrderNumber, setPendingOrderNumber] = createSignal("");
  const paymentProvider = createMockPaymentProvider({
    forceFail: searchParams.mockPayment === "fail",
    shortQrExpiry: searchParams.mockPayment === "expire",
  });

  const totals = createMemo(() =>
    computeCheckoutTotals({ subtotal: subtotal(), coupon: coupon(), coinsRedeemed: coinsRedeemed(), shippingFee: DELIVERY.fee }),
  );
  // Same condition that gates the two-column form/summary — nothing to pay
  // for once the cart's empty or the order already went through, so the
  // floating bar (and the bottom padding reserved for it) only exist then.
  const showFloatingBar = () => !order() && resolvedLines().length > 0;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (shippingFormOpen()) {
      errors.address = selectedAddressId()
        ? "กรุณากด “บันทึกการแก้ไข” หรือ “ยกเลิก” ในฟอร์มที่อยู่จัดส่งก่อน"
        : "กรุณากรอกที่อยู่จัดส่งให้ครบ แล้วกด “ใช้ที่อยู่นี้”";
    } else if (!selectedAddressId()) errors.address = "กรุณาเพิ่มที่อยู่จัดส่ง";
    if (!billingSameAsShipping()) {
      if (billingFormOpen()) errors.billing = "กรุณากรอกที่อยู่ออกใบเสร็จรับเงินให้ครบ แล้วกดบันทึก หรือเลือก “ใช้ที่อยู่เดียวกับที่อยู่จัดส่ง”";
      else if (!billingAddressId()) errors.billing = "กรุณาเลือกหรือเพิ่มที่อยู่ออกใบเสร็จรับเงิน";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const scrollTargetId = errors.address ? "shipping-address-heading" : "billing-address-heading";
      document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    // (shipping fee excluded) as `OrderCard`'s own per-order estimate.
    const coinsEarned = computeCoinsEarned(totals().total - totals().shippingFee);
    setOrder({ number: pendingOrderNumber(), total: totals().total, coinsEarned, payment });
    cart.clearCart();
    window.scrollTo({ top: 0 });
  };

  const payment = createCheckoutPayment({
    provider: paymentProvider,
    amount: () => totals().total,
    // Reserved on the first pay attempt, so a failed/retried payment stays on the same order.
    orderNumber: () => pendingOrderNumber() || setPendingOrderNumber(`CM${Date.now().toString().slice(-8)}`),
    validateOrder,
    onPaid,
  });

  return (
    <>
      <Header minimal />
      <div class="flex items-center justify-center gap-2 bg-success-soft px-4 py-2 text-center text-sm font-semibold text-success">
        <ShieldIcon /> ข้อมูลการชำระเงินของคุณได้รับการปกป้องอย่างปลอดภัย
      </div>

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
      <main
        class="flex flex-col overflow-x-clip bg-surface-gray/60 py-6"
        classList={{ "pb-36 md:pb-24": showFloatingBar() }}
      >
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
              <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div class="flex flex-1 flex-col gap-6 rounded-card bg-white p-4 lg:p-6">
                  <Show when={addressBook.ready()} fallback={<AddressSkeleton />}>
                    <AddressSection
                      headingId="shipping-address-heading"
                      title="ที่อยู่จัดส่ง"
                      emptyTitle="เพิ่มที่อยู่จัดส่ง"
                      newAddressLabel="ที่อยู่ใหม่"
                      addresses={addressBook.addresses()}
                      selectedId={selectedAddressId()}
                      onSelect={(id) => {
                        setPickedShippingId(id);
                        setFieldErrors(({ address, ...rest }) => rest);
                      }}
                      onSave={(address, opts) => addressBook.save(address, opts)}
                      onSetDefault={addressBook.setDefault}
                      showDefaultOption
                      onFormOpenChange={setShippingFormOpen}
                      error={fieldErrors().address}
                    />

                    {/* Delivery (DHL) block hidden for now — component kept in checkout/DeliverySection.tsx. */}

                    <Show when={selectedAddressId()}>
                      {/* No gap: the checkbox row keeps its 44px tap height, which alone puts its box 12px under the heading. */}
                      <section aria-labelledby="billing-address-heading" class="flex flex-col">
                        <h2 id="billing-address-heading" class="text-lg font-semibold text-ink">
                          ที่อยู่ออกใบเสร็จรับเงิน
                        </h2>
                        <label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={billingSameAsShipping()}
                            onChange={(e) => {
                              setBillingSameAsShipping(e.currentTarget.checked);
                              setFieldErrors(({ billing, ...rest }) => rest);
                            }}
                            class="size-5 shrink-0 rounded accent-brand-pink"
                          />
                          ใช้ที่อยู่เดียวกับที่อยู่จัดส่ง
                        </label>
                        <Show when={!billingSameAsShipping()}>
                          <div class="mt-2">
                          <AddressSection
                            embedded
                            headingId="billing-address-heading"
                            title="เลือกที่อยู่ออกใบเสร็จรับเงิน"
                            emptyTitle="เพิ่มที่อยู่ออกใบเสร็จรับเงิน"
                            newAddressLabel="ที่อยู่ออกใบเสร็จรับเงิน"
                            companyAllowed
                            addresses={billingCandidates()}
                            selectedId={billingAddressId()}
                            onSelect={(id) => {
                              setPickedBillingId(id);
                              setFieldErrors(({ billing, ...rest }) => rest);
                            }}
                            onSave={(address) => addressBook.save(address)}
                            onFormOpenChange={setBillingFormOpen}
                            error={fieldErrors().billing}
                          />
                          </div>
                        </Show>
                      </section>
                    </Show>
                  </Show>
                  {/* Payment — right after the billing address; paid here, its button ends the form. */}
                  <PaymentSection
                    payment={payment}
                    amount={totals().total}
                    disabled={hasUnavailableItem()}
                    submitError={submitError()}
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
                  lines={resolvedLines()}
                  totals={totals()}
                  coupon={coupon()}
                  onApplyCoupon={setCoupon}
                  onRemoveCoupon={() => setCoupon(undefined)}
                  coinsRedeemed={coinsRedeemed()}
                  onToggleCoins={() => setCoinsRedeemed((v) => (v > 0 ? 0 : MAX_COIN_REDEMPTION))}
                />
              </div>
            </Show>
          </Show>
        </Container>
      </main>

      <Show when={showFloatingBar()}>
        <FloatingOrderSummary
          itemCount={resolvedLines().reduce((n, l) => n + l.line.qty, 0)}
          discount={totals().couponDiscount + totals().coinDiscount}
          shippingFee={totals().shippingFee}
          total={totals().total}
          ctaLabel={payment.ctaLabel()}
          ctaLoadingLabel={payment.ctaLoadingLabel()}
          onCta={() => void payment.pay()}
          ctaLoading={payment.busy()}
          ctaDisabled={hasUnavailableItem()}
          error={submitError()}
        />
      </Show>

      <Footer />
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
    <div class="flex flex-col items-center justify-center gap-4 rounded-card bg-white py-20 text-center">
      <p class="text-lg text-ink-gray">ไม่มีสินค้าในตะกร้า</p>
      <Button href="/" variant="primary">
        เลือกซื้อสินค้า
      </Button>
    </div>
  );
}

function OrderSuccess(props: { number: string; total: number; coinsEarned: number; payment: PaidResult; isMember: boolean }) {
  return (
    <div class="mx-auto flex w-full max-w-[560px] flex-col items-center justify-center gap-4 rounded-card bg-white px-4 py-12 text-center shadow-card sm:py-16" role="status">
      <div class="flex size-16 items-center justify-center rounded-pill bg-success-soft text-success">
        <svg viewBox="0 0 24 24" class="size-8" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
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
          <dd class="text-right text-ink">
            {props.payment.methodLabel}
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
        <div class="flex items-center gap-2 rounded-pill bg-warning-soft px-4 py-2 text-sm font-semibold text-ink">
          <CoinEarnedIcon />
          คุณได้รับ {props.coinsEarned.toLocaleString("th-TH")} คอยน์จากคำสั่งซื้อนี้
        </div>
      </Show>
      <div class="flex w-full max-w-sm flex-col gap-2">
        <Button href="/account" variant="primary" size="lg" class="w-full">
          ดูประวัติการซื้อ
        </Button>
        <Button href="/" variant="outline" size="lg" class="w-full">
          กลับไปช้อปต่อ
        </Button>
      </div>
    </div>
  );
}

function CoinEarnedIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 15.5c.5.7 1.4 1 2.5 1 1.7 0 3-.8 3-2s-1.3-1.8-3-2-3-.8-3-2 1.3-2 3-2c1.1 0 2 .3 2.5 1M12 7.5v1M12 15.5v1" stroke-linecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
    </svg>
  );
}
