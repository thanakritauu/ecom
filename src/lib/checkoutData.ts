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
