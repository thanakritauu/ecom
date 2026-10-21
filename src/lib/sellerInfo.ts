/**
 * The shop as printed on receipts and tax invoices (the owner's details).
 */
export const SELLER = {
  name: "บริษัท บีไทม์ บิวตี้ เฮ้าส์ จำกัด",
  branch: "สำนักงานใหญ่",
  /** เลขทะเบียนนิติบุคคล = เลขประจำตัวผู้เสียภาษี. Empty would hide the line. */
  taxId: "0105563061352",
  address: "188/49 โครงการ DRAGON TOWN อาคาร C14 ถนนจรัสเมือง แขวงวังใหม่ เขตปทุมวัน กรุงเทพมหานคร 10330",
  phone: "061-172-7257",
};

/** Storefront prices include 7% VAT. */
export const VAT_RATE = 0.07;
