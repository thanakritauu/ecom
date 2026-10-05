import type { Product } from "./types";

/**
 * Mock catalog content (internal prototype only): 32 of the 35 real Charmiss products
 * listed on watsons.co.th (three photos carried a pink "NEW" promo graphic and are
 * left out) — name, price and front photo — so the storefront's
 * mock products look like the real range. Photos were downloaded once into
 * `src/assets/images/products/watsons/` (never hot-linked). Replace with the
 * brand's own catalog/CMS data before going live.
 */
const PHOTOS = import.meta.glob<string>("../assets/images/products/watsons/*.jpg", { eager: true, import: "default" });
const photo = (code: string) => PHOTOS[`../assets/images/products/watsons/wt-${code}.jpg`];

export type WatsonsItem = {
  code: string;
  name: string;
  category: NonNullable<Product["category"]>;
  price: number;
  compareAtPrice?: number;
};

export const WATSONS_ITEMS: WatsonsItem[] = [
  // คุชชั่น / งานผิว
  { code: "331785", name: "Charmiss ชาร์มมิ่ง ไอคอนิก โกลว์ คุชชั่น SPF50+ PA++++ 11ก. 01 ไลท์เบจ", category: "cushion", price: 349, compareAtPrice: 459 },
  { code: "321317", name: "Charmiss บลูมมิ่ง ฮาร์ท ซอฟท์ โกลว์ คุชชั่น SPF50+ PA++++ 8ก. 01 ไอวอรี่", category: "cushion", price: 259, compareAtPrice: 399 },
  { code: "318246", name: "Charmiss เพอร์เฟค ฮาร์ท เอฟเวอลาสติ้ง แมตต์ คุชชั่น 12ก. 01 ไอวอรี่", category: "cushion", price: 349, compareAtPrice: 599 },
  { code: "315574", name: "Charmiss แมทท์ ออล เดย์ แอคเน่ คุชชั่น SPF50 PA++++ 8ก. 01 ไอวอรี่", category: "cushion", price: 229, compareAtPrice: 329 },
  { code: "319696", name: "Charmiss แมทท์ ออล เดย์ แอคเน่ คุชชั่น 5ก. 03 ฮันนี่ เบจ", category: "cushion", price: 59 },
  { code: "315871", name: "Charmiss ชาร์มมิ่ง โกลว์ ลองแวร์ ฟาวเดชั่น SPF50+ PA++++ 5ก. 03 มีเดียม เบจ", category: "cushion", price: 59 },
  { code: "331796", name: "Charmiss แอคเน่ เฟด คอนซีลเลอร์ 3.5ก. 01 ไอวอรี่", category: "cushion", price: 159, compareAtPrice: 199 },
  { code: "321337", name: "Charmiss บลูมมิ่ง ฮาร์ท ลูส พาวเดอร์ 5.5ก. 01 พิงค์ เพเทิล", category: "cushion", price: 189, compareAtPrice: 399 },
  { code: "321123", name: "Charmiss เพอร์เฟค ฮาร์ท แมตต์ ฟินิช เซ็ตติ้ง สเปรย์ 50มล.", category: "cushion", price: 99, compareAtPrice: 199 },
  // ลิป
  { code: "329293", name: "Charmiss พาราไดซ์ ไอส์แลนด์ มิเรอร์ ทินท์ 3ก. 01 พิ้งค์ กวาว่า สแปลช", category: "lip", price: 219, compareAtPrice: 398 },
  { code: "324429", name: "Charmiss แอร์รี่ คิส ทินท์ แมตต์ ลิป แอนด์ ชีค 6ก. 01 โรส เมอแร็งก์", category: "lip", price: 199, compareAtPrice: 299 },
  { code: "321356", name: "Charmiss บลูมมิ่ง ฮาร์ท กลิตเตอร์ ลิป กลอส 3.4ก. 01 โรซี่", category: "lip", price: 149, compareAtPrice: 299 },
  { code: "321336", name: "Charmiss บลูมมิ่ง ฮาร์ท ทินท์เท็ด ลิป เซรั่ม 8ก. 01 เชอร์รี่ บลอสซั่ม", category: "lip", price: 149, compareAtPrice: 399 },
  { code: "320523", name: "Charmiss ชาร์ม ออน กลาสซี่ สติ๊ก 3ก. 02 มูนเบอร์รี่", category: "lip", price: 108, compareAtPrice: 199 },
  { code: "319697", name: "Charmiss จุ๊ยซี่ ป๊อป ทินท์ 1.6ก. 01 พิงค์ เลดี้", category: "lip", price: 159, compareAtPrice: 299 },
  { code: "312741", name: "Charmiss โชว์มียัวร์เลิฟ อิน ทูเดอะ พาราไดซ์ ลิป กลอส 2.2ก. GL07 พิงค์กี้ ทวิงเคิล", category: "lip", price: 199 },
  { code: "307056", name: "Charmiss เอนด์เลส คิส ลิควิด แมทท์ ลิป 3ก. 03 ทรูเลิฟ", category: "lip", price: 69, compareAtPrice: 118 },
  { code: "305507", name: "Charmiss จูซซี่ ดรอป ลิป แอนด์ ชีค ออยล์ 2.5ก. 02", category: "lip", price: 99, compareAtPrice: 229 },
  // แก้ม
  { code: "321315", name: "Charmiss บลูมมิ่ง ฮาร์ท ชายน์นิ่ง บลัช 4ก. 01 พิ้งค์ ไฮไลท์เตอร์ ริบบอน", category: "cheek", price: 149, compareAtPrice: 299 },
  { code: "318249", name: "Charmiss จิวเวล เจลลี่ คริสตัล ไฮไลท์ สติ๊ก 1.1ก. 01 พิงค์ ไดมอนด์", category: "cheek", price: 199, compareAtPrice: 299 },
  { code: "315579", name: "Charmiss เจลลี่ จอย วอเทอร์ ทิ้นท์ บลัช สติ๊ก 5.5ก. 01 โซดา พ็อป", category: "cheek", price: 129, compareAtPrice: 359 },
  { code: "314182", name: "Charmiss คริสตัล คิวบ์ พีเอช เชนจ์จิ้ง บลัช เจล กลาสติ้ง 3ก.", category: "cheek", price: 199, compareAtPrice: 259 },
  { code: "313321", name: "Charmiss โกลว์เฟรนด์ โมจิ บลัช ออน 3.5ก. 03 เบบ คลับ", category: "cheek", price: 149, compareAtPrice: 299 },
  { code: "313082", name: "Charmiss ยู เมค มี บลัช ลิควิด บลัช ออน 3.5ก. 02 แฟนซี ยู", category: "cheek", price: 119, compareAtPrice: 179 },
  // ตาและคิ้ว
  { code: "321479", name: "Charmiss บลูมมิ่ง ฮาร์ท ชาร์มมิ่ง พาเลทท์ 14.8ก. 01 คอตตอน แคนดี้", category: "eye", price: 389, compareAtPrice: 599 },
  { code: "308565", name: "Charmiss โกลว์โลแกรม อายแชโดว์ พาเลท 4ก. 05 ฟรอสเต็ด ไนน์ตี้ส์", category: "eye", price: 199, compareAtPrice: 229 },
  { code: "302889", name: "Charmiss โกลว์โลแกรม อายแชโดว์ พาเลท 4ก. 01 สวีท โมเม้นท์", category: "eye", price: 199, compareAtPrice: 329 },
  { code: "308528", name: "Charmiss สไตล์ลิสต์ แมทท์ อายไลน์เนอร์ 0.5มล. แบล็ค", category: "eye", price: 89, compareAtPrice: 199 },
  { code: "301153", name: "Charmiss บรู๊คกี้ บราว สลิม เพนซิล 0.05ก. 02 บราวน์ ชูก้า", category: "eye", price: 89, compareAtPrice: 199 },
  // ดูแลผิว
  { code: "324143", name: "Charmiss แอคเน่ บาลานซ์ เจล คลีนเซอร์ 100ก. เจลล้างหน้าเพื่อผิวมัน-เป็นสิว", category: "skincare", price: 99, compareAtPrice: 199 },
  { code: "324103", name: "Charmiss แอคเน่ บาลานซ์ โทนเนอร์ แพด 110ก. (80 แผ่น)", category: "skincare", price: 249, compareAtPrice: 599 },
  // กันแดดและบอดี้แคร์
  { code: "329295", name: "Charmiss พาราไดซ์ ไอส์แลนด์ ยูวี บอดี้ เซรั่ม โทนอัพ SPF50+ PA++++ 100ก. พิงก์ เพท", category: "suncare-bodycare", price: 239, compareAtPrice: 398 },
];

const byCode = new Map(WATSONS_ITEMS.map((w) => [w.code, w]));

/** Which real product each mock slot shows, per merchandising rail (ids are kept, so links/orders/cart keep working). */
export const RAIL_ASSIGNMENTS: Record<string, string[]> = {
  "feature-": ["331785", "321317", "318246", "315574", "331796", "321337", "315871", "319696", "321123", "331785"],
  "new-": ["331796", "329293", "329295", "324429", "324143", "324103", "321479", "320523", "318249", "305507"],
  "trend-": ["321336", "321317", "321356", "318246", "319697", "320523", "321315", "318249", "315574", "313321"],
  "flash-": ["315579", "314182", "313082", "312741", "307056", "305507", "302889", "308565", "308528", "301153", "315871", "319696"],
  "best-": ["321336", "331785", "315579", "324429", "321317", "329293", "308565", "313082", "321356", "318246", "313321", "302889"],
};

/** Puts a real Charmiss product's name, photo, prices and category on a mock product (by its rail + position). */
export function applyWatsonsItem(product: Product) {
  const prefix = Object.keys(RAIL_ASSIGNMENTS).find((p) => product.id.startsWith(p));
  if (!prefix) return;
  const index = Number(product.id.slice(prefix.length)) - 1;
  const item = byCode.get(RAIL_ASSIGNMENTS[prefix][index]);
  if (!item) return;
  const sameCategory = WATSONS_ITEMS.filter((w) => w.category === item.category && w.code !== item.code).map((w) => photo(w.code));
  product.name = item.name;
  product.image = photo(item.code);
  // Gallery: this product first, then others from the same category (mock — not this SKU's own angles).
  product.images = [product.image, ...sameCategory.slice(0, 4)];
  product.price = item.price;
  product.compareAtPrice = item.compareAtPrice;
  product.discountPercent = item.compareAtPrice ? Math.round(((item.compareAtPrice - item.price) / item.compareAtPrice) * 100) : undefined;
  product.category = item.category;
}
