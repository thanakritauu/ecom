import { createMemo, createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { Button } from "~/components/shared/Button";
import { useCart } from "~/lib/cart";
import {
  resolveCartLines,
  computeCartTotal,
  computeCheckoutTotals,
  SHIPPING_METHODS,
  PAYMENT_METHODS,
  MAX_COIN_REDEMPTION,
  type ShippingMethodId,
  type PaymentMethodId,
  type Coupon,
} from "~/lib/cartSelectors";
import { MOCK_ADDRESSES, type Address } from "~/lib/checkoutData";
import { useProductCatalog } from "~/lib/productCatalog";
import { formatTHB } from "~/components/shared/PriceDisplay";
import { AddressSection } from "~/components/checkout/AddressSection";
import { ShippingMethodSection } from "~/components/checkout/ShippingMethodSection";
import { PaymentMethodSection, type CardDetails } from "~/components/checkout/PaymentMethodSection";
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
  const catalog = useProductCatalog();
  const resolvedLines = createMemo(() => resolveCartLines(cart.lines(), catalog.products()));
  const subtotal = createMemo(() => computeCartTotal(resolvedLines()));
  const hasUnavailableItem = createMemo(() =>
    resolvedLines().some(({ product }) => product.stockLeft !== undefined && product.stockLeft <= 0),
  );

  const [addresses, setAddresses] = createSignal<Address[]>(MOCK_ADDRESSES);
  const [selectedAddressId, setSelectedAddressId] = createSignal<string | undefined>(
    MOCK_ADDRESSES.find((a) => a.isDefault)?.id ?? MOCK_ADDRESSES[0]?.id,
  );
  const [shippingMethod, setShippingMethod] = createSignal<ShippingMethodId>("standard");
  const [paymentMethod, setPaymentMethod] = createSignal<PaymentMethodId>("card");
  const [card, setCard] = createSignal<CardDetails>({ number: "", expiry: "", cvv: "", name: "" });
  const [coupon, setCoupon] = createSignal<Coupon>();
  const [coinsRedeemed, setCoinsRedeemed] = createSignal(0);

  const [fieldErrors, setFieldErrors] = createSignal<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = createSignal<"idle" | "loading" | "error">("idle");
  const [submitError, setSubmitError] = createSignal<string>();
  const [order, setOrder] = createSignal<{ number: string; total: number } | undefined>();

  const shippingFee = createMemo(() => SHIPPING_METHODS.find((m) => m.id === shippingMethod())!.fee);
  const totals = createMemo(() =>
    computeCheckoutTotals({ subtotal: subtotal(), coupon: coupon(), coinsRedeemed: coinsRedeemed(), shippingFee: shippingFee() }),
  );
  // Same condition that gates the two-column form/summary — nothing to pay
  // for once the cart's empty or the order already went through, so the
  // floating bar (and the bottom padding reserved for it) only exist then.
  const showFloatingBar = () => !order() && resolvedLines().length > 0;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!selectedAddressId()) errors.address = "กรุณาเลือกที่อยู่จัดส่ง";
    if (paymentMethod() === "card") {
      const c = card();
      if (!c.number.replace(/\s/g, "")) errors.cardNumber = "กรุณากรอกหมายเลขบัตร";
      else if (c.number.replace(/\s/g, "").length < 12) errors.cardNumber = "หมายเลขบัตรไม่ถูกต้อง";
      if (!c.name.trim()) errors.cardName = "กรุณากรอกชื่อบนบัตร";
      if (!/^\d{2}\/\d{2}$/.test(c.expiry)) errors.cardExpiry = "รูปแบบ MM/YY";
      if (!/^\d{3,4}$/.test(c.cvv)) errors.cardCvv = "CVV ไม่ถูกต้อง";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const scrollTargetId = errors.address ? "shipping-address-heading" : "payment-method-heading";
      document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (submitStatus() === "loading") return; // guards against double submit
    if (resolvedLines().length === 0 || hasUnavailableItem()) {
      setSubmitStatus("error");
      setSubmitError("มีสินค้าในตะกร้าที่ไม่สามารถสั่งซื้อได้ กรุณากลับไปแก้ไขตะกร้าก่อน");
      return;
    }
    if (!validate()) return;

    setSubmitStatus("loading");
    setSubmitError(undefined);
    await new Promise((resolve) => setTimeout(resolve, 900 + Math.random() * 400));
    if (Math.random() < 0.12) {
      setSubmitStatus("error");
      setSubmitError("ไม่สามารถดำเนินการสั่งซื้อได้ กรุณาลองอีกครั้ง");
      return; // cart is untouched — nothing cleared on failure
    }

    const orderNumber = `CM${Date.now().toString().slice(-8)}`;
    setOrder({ number: orderNumber, total: totals().total });
    cart.clearCart();
    setSubmitStatus("idle");
  };

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
            fallback={<OrderSuccess number={order()!.number} total={order()!.total} />}
          >
            <Show when={resolvedLines().length > 0} fallback={<EmptyCheckout />}>
              <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div class="flex flex-1 flex-col gap-6 rounded-card bg-white p-4 lg:p-6">
                  <AddressSection
                    addresses={addresses()}
                    selectedId={selectedAddressId()}
                    onSelect={setSelectedAddressId}
                    onSave={(address) => {
                      setAddresses((prev) => {
                        const exists = prev.some((a) => a.id === address.id);
                        return exists ? prev.map((a) => (a.id === address.id ? address : a)) : [...prev, address];
                      });
                      setSelectedAddressId(address.id);
                    }}
                    error={fieldErrors().address}
                  />
                  <ShippingMethodSection selected={shippingMethod()} onSelect={setShippingMethod} />
                  <PaymentMethodSection
                    selected={paymentMethod()}
                    onSelect={setPaymentMethod}
                    card={card()}
                    onCardChange={setCard}
                    cardErrors={{
                      number: fieldErrors().cardNumber,
                      name: fieldErrors().cardName,
                      expiry: fieldErrors().cardExpiry,
                      cvv: fieldErrors().cardCvv,
                    }}
                  />

                  <Show when={hasUnavailableItem()}>
                    <p class="rounded-card bg-danger-soft p-3 text-sm text-danger-strong" role="alert">
                      มีสินค้าในตะกร้าที่หมดสต็อก กรุณา
                      <A href="/cart" class="mx-1 underline">
                        กลับไปที่ตะกร้า
                      </A>
                      เพื่อแก้ไขก่อนสั่งซื้อ
                    </p>
                  </Show>
                </div>

                <CheckoutOrderSummary
                  lines={resolvedLines()}
                  totals={totals()}
                  coupon={coupon()}
                  onApplyCoupon={setCoupon}
                  onRemoveCoupon={() => setCoupon(undefined)}
                  coinsRedeemed={coinsRedeemed()}
                  onToggleCoins={() => setCoinsRedeemed((v) => (v > 0 ? 0 : MAX_COIN_REDEMPTION))}
                  onSubmit={submit}
                  submitStatus={submitStatus()}
                  submitError={submitError()}
                  disabled={hasUnavailableItem()}
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
          ctaLabel="ยืนยันการชำระเงิน"
          onCta={submit}
          ctaLoading={submitStatus() === "loading"}
          ctaDisabled={hasUnavailableItem()}
          error={submitStatus() === "error" ? (submitError() ?? "ไม่สามารถดำเนินการสั่งซื้อได้ กรุณาลองอีกครั้ง") : undefined}
        />
      </Show>

      <Footer />
    </>
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

function OrderSuccess(props: { number: string; total: number }) {
  return (
    <div class="flex flex-col items-center justify-center gap-4 rounded-card bg-white py-20 text-center">
      <div class="flex size-16 items-center justify-center rounded-pill bg-success-soft text-success">
        <svg viewBox="0 0 24 24" class="size-8" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-ink">สั่งซื้อสำเร็จ</h1>
      <p class="text-ink-gray">ขอบคุณสำหรับคำสั่งซื้อของคุณ</p>
      <div class="flex flex-col gap-1 rounded-card bg-surface-gray px-6 py-4 text-sm">
        <p class="text-ink-gray">
          หมายเลขคำสั่งซื้อ: <span class="font-semibold text-ink">{props.number}</span>
        </p>
        <p class="text-ink-gray">
          ยอดชำระทั้งหมด: <span class="font-semibold text-brand-pink">{formatTHB(props.total)}</span>
        </p>
      </div>
      {/* `/account` (not the `/account/orders` string Footer's "ติดตามคำสั่งซื้อ"
          link uses) is the real, working route — it renders AccountSidebar +
          OrderHistoryPanel directly with no tab/query param needed, so this
          lands the shopper on their order history immediately. */}
      <Button href="/account" variant="primary">
        ดูออเดอร์
      </Button>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
    </svg>
  );
}
