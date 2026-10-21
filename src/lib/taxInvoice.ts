/**
 * ข้อมูลผู้ซื้อบนใบกำกับภาษีเต็มรูป, asked at Checkout only when the shopper
 * ticks "ขอใบกำกับภาษี", and emailed to `email` afterwards. The address is separate (the order's billing address,
 * or the shipping address when "ใช้ที่อยู่เดียวกับที่อยู่จัดส่ง" stays ticked).
 * - `individual` (บุคคลธรรมดา): full name + เลขประจำตัวประชาชน.
 * - `company` (นิติบุคคล): company name + เลขประจำตัวผู้เสียภาษี + สาขา.
 */
export type TaxInvoiceType = "individual" | "company";

export type TaxInvoiceBuyer = {
  type: TaxInvoiceType;
  name: string;
  /** 13 digits, no dashes. */
  taxId: string;
  /** นิติบุคคล only: unset = สำนักงานใหญ่, otherwise the 5-digit สาขาเลขที่. */
  branchNo?: string;
  /** Where the shop emails the invoice (it isn't printed or put in the parcel). */
  email: string;
};

export const TAX_INVOICE_TYPE_LABEL: Record<TaxInvoiceType, string> = {
  individual: "บุคคลธรรมดา",
  company: "นิติบุคคล",
};

export const taxIdLabel = (type: TaxInvoiceType) => (type === "company" ? "เลขประจำตัวผู้เสียภาษี" : "เลขประจำตัวประชาชน");

export const taxNameLabel = (type: TaxInvoiceType) => (type === "company" ? "ชื่อบริษัท" : "ชื่อ-นามสกุล");

/** "สำนักงานใหญ่" / "สาขาเลขที่ 00001"; nothing for บุคคลธรรมดา. */
export function formatTaxBranch(buyer: TaxInvoiceBuyer): string | undefined {
  if (buyer.type !== "company") return undefined;
  return buyer.branchNo ? `สาขาเลขที่ ${buyer.branchNo}` : "สำนักงานใหญ่";
}

/** "1-2345-67890-12-1", the way Thai ID and tax numbers are printed. */
export function formatTaxId(id: string): string {
  const d = id.replace(/\D/g, "");
  return d.length === 13 ? `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d[12]}` : id;
}

/** Thai ID / tax number check: 13 digits whose last digit is the mod-11 check digit of the first 12. */
export function isValidThaiTaxId(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(d[12]);
}

/** The field's error, or undefined when it's fine. */
export function taxIdError(raw: string, type: TaxInvoiceType): string | undefined {
  const d = raw.replace(/\D/g, "");
  if (!d) return `กรุณากรอก${taxIdLabel(type)}`;
  if (d.length !== 13) return `${taxIdLabel(type)}ต้องมี 13 หลัก`;
  if (!isValidThaiTaxId(d)) return `${taxIdLabel(type)}ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง`;
  return undefined;
}

/** A VAT-inclusive total split into ราคาก่อนภาษี + ภาษีมูลค่าเพิ่ม 7% (the VAT rounded to satang; the two always add back up). */
export function vatBreakdown(totalInclVat: number, rate = 0.07): { beforeVat: number; vat: number } {
  const vat = Math.round(((totalInclVat * rate) / (1 + rate)) * 100) / 100;
  return { beforeVat: Math.round((totalInclVat - vat) * 100) / 100, vat };
}

/** Where an order's tax invoice stands in Admin: not asked for, waiting to be emailed, or emailed. */
export type TaxInvoiceStatus = "pending" | "sent";

export const TAX_INVOICE_STATUS_META: Record<TaxInvoiceStatus, { label: string; tone: "warning" | "success" }> = {
  pending: { label: "รอส่งใบกำกับภาษี", tone: "warning" },
  sent: { label: "ส่งใบกำกับภาษีแล้ว", tone: "success" },
};
