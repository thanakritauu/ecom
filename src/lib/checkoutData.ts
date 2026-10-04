export type Address = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  province: string;
  district: string;
  subDistrict: string;
  postalCode: string;
  isDefault?: boolean;
};

/**
 * Mock saved addresses — this prototype has no account/address backend, so
 * these stand in for "what a returning shopper would already have on file",
 * matching Figma's own two example addresses. New/edited addresses added
 * during a session are appended to this same shape by CheckoutAddressSection,
 * not a separate data structure.
 */
export const MOCK_ADDRESSES: Address[] = [
  {
    id: "addr-1",
    label: "บ้าน",
    recipientName: "กมลชนก ใจดี",
    phone: "081-234-5678",
    addressLine: "88/12 ซอยสุขุมวิท 31 แขวงคลองตันเหนือ เขตวัฒนา",
    province: "กรุงเทพมหานคร",
    district: "เขตวัฒนา",
    subDistrict: "คลองตันเหนือ",
    postalCode: "10110",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "ที่ทำงาน",
    recipientName: "กมลชนก ใจดี",
    phone: "081-234-5678",
    addressLine: "อาคารเอ็มไพร์ ชั้น 21 ถนนสาทรใต้ แขวงยานนาวา เขตสาทร",
    province: "กรุงเทพมหานคร",
    district: "เขตสาทร",
    subDistrict: "ยานนาวา",
    postalCode: "10120",
  },
];

/**
 * Phase 04 — the 77 Thai provinces, for the address form's province
 * selector (a fixed, small list — picking beats typing on mobile and rules
 * out misspellings). District → sub-district → postal code are cascading
 * pick-lists fed by `lib/thaiAddress.ts`.
 */
export const THAI_PROVINCES = [
  "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท",
  "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม",
  "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์",
  "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา", "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์",
  "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน", "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง",
  "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ",
  "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย",
  "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี",
] as const;

/** Bangkok uses เขต/แขวง; every other province uses อำเภอ/ตำบล — labels/errors follow the selected province. */
export const isBangkok = (province: string) => province === "กรุงเทพมหานคร";

/** One-line display for cards/summaries. Seed `addressLine`s already include แขวง/เขต, so each part is only appended when its prefixed form (e.g. "เขตวัฒนา") isn't already in the line — a bare-name check would wrongly match street names like "ถนนสาทรใต้". */
export function formatAddress(a: Address): string {
  const bkk = isBangkok(a.province);
  const withPrefix = (value: string, prefixes: RegExp, prefix: string) => {
    const bare = value.replace(prefixes, "").trim();
    return bare ? `${prefix}${bare}` : "";
  };
  const sub = withPrefix(a.subDistrict, /^(แขวง|ตำบล|ต\.)/, bkk ? "แขวง" : "ตำบล");
  const dist = withPrefix(a.district, /^(เขต|อำเภอ|อ\.)/, bkk ? "เขต" : "อำเภอ");
  const parts = [a.addressLine];
  if (sub && !a.addressLine.includes(sub)) parts.push(sub);
  if (dist && !a.addressLine.includes(dist)) parts.push(dist);
  parts.push(a.province, a.postalCode);
  return parts.filter(Boolean).join(" ");
}
