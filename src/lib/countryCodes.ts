/**
 * Phone country-code picker (address forms) — flag, Thai name, dial code.
 * Thailand first (the default), the rest sorted by Thai name. Countries that
 * share a dial code (+1 US/Canada, +7 Russia/Kazakhstan) are separate rows;
 * an address stores only the code, so either row resolves back to the first.
 */
export type CountryCode = { code: string; flag: string; country: string };

export const DEFAULT_PHONE_COUNTRY_CODE = "+66";

const THAILAND: CountryCode = { code: "+66", flag: "🇹🇭", country: "ไทย" };

const OTHERS: CountryCode[] = [
  // ASEAN
  { code: "+856", flag: "🇱🇦", country: "ลาว" },
  { code: "+95", flag: "🇲🇲", country: "เมียนมา" },
  { code: "+855", flag: "🇰🇭", country: "กัมพูชา" },
  { code: "+60", flag: "🇲🇾", country: "มาเลเซีย" },
  { code: "+65", flag: "🇸🇬", country: "สิงคโปร์" },
  { code: "+84", flag: "🇻🇳", country: "เวียดนาม" },
  { code: "+62", flag: "🇮🇩", country: "อินโดนีเซีย" },
  { code: "+63", flag: "🇵🇭", country: "ฟิลิปปินส์" },
  { code: "+673", flag: "🇧🇳", country: "บรูไน" },
  { code: "+670", flag: "🇹🇱", country: "ติมอร์-เลสเต" },
  // East Asia
  { code: "+86", flag: "🇨🇳", country: "จีน" },
  { code: "+852", flag: "🇭🇰", country: "ฮ่องกง" },
  { code: "+853", flag: "🇲🇴", country: "มาเก๊า" },
  { code: "+886", flag: "🇹🇼", country: "ไต้หวัน" },
  { code: "+81", flag: "🇯🇵", country: "ญี่ปุ่น" },
  { code: "+82", flag: "🇰🇷", country: "เกาหลีใต้" },
  { code: "+976", flag: "🇲🇳", country: "มองโกเลีย" },
  // South Asia
  { code: "+91", flag: "🇮🇳", country: "อินเดีย" },
  { code: "+92", flag: "🇵🇰", country: "ปากีสถาน" },
  { code: "+880", flag: "🇧🇩", country: "บังกลาเทศ" },
  { code: "+94", flag: "🇱🇰", country: "ศรีลังกา" },
  { code: "+977", flag: "🇳🇵", country: "เนปาล" },
  { code: "+975", flag: "🇧🇹", country: "ภูฏาน" },
  { code: "+960", flag: "🇲🇻", country: "มัลดีฟส์" },
  // Middle East
  { code: "+971", flag: "🇦🇪", country: "สหรัฐอาหรับเอมิเรตส์" },
  { code: "+966", flag: "🇸🇦", country: "ซาอุดีอาระเบีย" },
  { code: "+974", flag: "🇶🇦", country: "กาตาร์" },
  { code: "+965", flag: "🇰🇼", country: "คูเวต" },
  { code: "+973", flag: "🇧🇭", country: "บาห์เรน" },
  { code: "+968", flag: "🇴🇲", country: "โอมาน" },
  { code: "+972", flag: "🇮🇱", country: "อิสราเอล" },
  { code: "+962", flag: "🇯🇴", country: "จอร์แดน" },
  { code: "+90", flag: "🇹🇷", country: "ตุรกี" },
  { code: "+98", flag: "🇮🇷", country: "อิหร่าน" },
  { code: "+20", flag: "🇪🇬", country: "อียิปต์" },
  // Europe
  { code: "+44", flag: "🇬🇧", country: "สหราชอาณาจักร" },
  { code: "+353", flag: "🇮🇪", country: "ไอร์แลนด์" },
  { code: "+33", flag: "🇫🇷", country: "ฝรั่งเศส" },
  { code: "+49", flag: "🇩🇪", country: "เยอรมนี" },
  { code: "+39", flag: "🇮🇹", country: "อิตาลี" },
  { code: "+34", flag: "🇪🇸", country: "สเปน" },
  { code: "+351", flag: "🇵🇹", country: "โปรตุเกส" },
  { code: "+31", flag: "🇳🇱", country: "เนเธอร์แลนด์" },
  { code: "+32", flag: "🇧🇪", country: "เบลเยียม" },
  { code: "+41", flag: "🇨🇭", country: "สวิตเซอร์แลนด์" },
  { code: "+43", flag: "🇦🇹", country: "ออสเตรีย" },
  { code: "+46", flag: "🇸🇪", country: "สวีเดน" },
  { code: "+47", flag: "🇳🇴", country: "นอร์เวย์" },
  { code: "+45", flag: "🇩🇰", country: "เดนมาร์ก" },
  { code: "+358", flag: "🇫🇮", country: "ฟินแลนด์" },
  { code: "+48", flag: "🇵🇱", country: "โปแลนด์" },
  { code: "+420", flag: "🇨🇿", country: "เช็กเกีย" },
  { code: "+36", flag: "🇭🇺", country: "ฮังการี" },
  { code: "+30", flag: "🇬🇷", country: "กรีซ" },
  { code: "+7", flag: "🇷🇺", country: "รัสเซีย" },
  { code: "+380", flag: "🇺🇦", country: "ยูเครน" },
  // Americas
  { code: "+1", flag: "🇺🇸", country: "สหรัฐอเมริกา" },
  { code: "+1", flag: "🇨🇦", country: "แคนาดา" },
  { code: "+52", flag: "🇲🇽", country: "เม็กซิโก" },
  { code: "+55", flag: "🇧🇷", country: "บราซิล" },
  { code: "+54", flag: "🇦🇷", country: "อาร์เจนตินา" },
  { code: "+56", flag: "🇨🇱", country: "ชิลี" },
  { code: "+57", flag: "🇨🇴", country: "โคลอมเบีย" },
  { code: "+51", flag: "🇵🇪", country: "เปรู" },
  // Oceania
  { code: "+61", flag: "🇦🇺", country: "ออสเตรเลีย" },
  { code: "+64", flag: "🇳🇿", country: "นิวซีแลนด์" },
  { code: "+679", flag: "🇫🇯", country: "ฟิจิ" },
  // Africa (common)
  { code: "+27", flag: "🇿🇦", country: "แอฟริกาใต้" },
  { code: "+212", flag: "🇲🇦", country: "โมร็อกโก" },
  { code: "+254", flag: "🇰🇪", country: "เคนยา" },
];

export const PHONE_COUNTRY_CODES: readonly CountryCode[] = [THAILAND, ...[...OTHERS].sort((a, b) => a.country.localeCompare(b.country, "th"))];

/** The picker row for a stored code — the first row with that code (Thailand when unset/unknown). */
export const findCountryCode = (code: string | undefined): CountryCode => PHONE_COUNTRY_CODES.find((c) => c.code === code) ?? THAILAND;
