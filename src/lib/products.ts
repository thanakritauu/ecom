import productPhoto from "~/assets/images/products/product-flash-sale.png";
import productLipTintMain from "~/assets/images/products/product-lip-tint-main.png";
import productLipTintUgc1 from "~/assets/images/reviews/ugc-1.png";
import productLipTintUgc2 from "~/assets/images/reviews/ugc-2.png";
import productLipTintUgc3 from "~/assets/images/reviews/ugc-3.png";
// Filename is a holdover from an earlier asset pass and doesn't match its
// contents — this file is actually the cushion-compact product shot (visible
// "SPF50+ PA++++" badge matches this exact SKU), not a blush product photo.
import productCushionMain from "~/assets/images/account/order-item-blush.png";
// This catalog's Hero banner for the exact same "Charming Iconic Glow Cushion
// SPF50+ PA++++" line (its own on-page copy names this SKU verbatim) — a
// second real, correctly-matching photo of this product, not a different
// product's marketing art.
import productCushionHero from "~/assets/images/hero/hero-banner-1.png";
import type { Product, ProductVariant } from "./types";

/**
 * The Figma export only shipped one real product photograph — every
 * Product_Card instance in the design reused the same image with different
 * copy. We do the same here rather than pulling in stock/AI imagery; swap
 * `image` per SKU once the real catalog photos come from the backend/CMS.
 */
const FLASH_SALE_ENDS_AT = Date.now() + (8 * 60 + 24) * 60 * 1000 + 15 * 1000;

/**
 * Lip gloss shade family. Figma's own export didn't include per-shade swatch
 * colors for this product line (only the cushion-foundation set below was
 * exported as real assets) — these three hexes are a reasonable stand-in
 * approximation until real swatch colors come from design/CMS.
 */
const shadeVariants = [
  { id: "coral", label: "Coral Bloom", color: "#F2735C" },
  { id: "rose", label: "Rose Whisper", color: "#E8899A" },
  { id: "nude", label: "Nude Petal", color: "#D9A692" },
];

/**
 * Cushion-foundation shade family — hex values pulled directly from the
 * Figma "ColorOption" swatch export (node 65:1491–1499) so this one is
 * pixel-accurate, not approximated. A 6th shade is appended purely to give
 * the shade-selector's "+N" overflow affordance something real to render in
 * this catalog; drop it once real SKUs define how many shades exist.
 */
const cushionShadeVariants = [
  { id: "cushion-01", label: "เบอร์ 01", color: "#FBDBC4" },
  { id: "cushion-02", label: "เบอร์ 02", color: "#FDCFAA" },
  { id: "cushion-03", label: "เบอร์ 03", color: "#F3B994" },
  { id: "cushion-04", label: "เบอร์ 04", color: "#EDA97D" },
  { id: "cushion-05", label: "เบอร์ 05", color: "#DB8B57" },
  { id: "cushion-06", label: "เบอร์ 06", color: "#C97A4A" },
];

/**
 * Shared PDP-only "detail completeness" content (description copy + the
 * Reviews section's rating/breakdown/review cards) — per explicit direction,
 * every PDP example this catalog is exercising uses the identical text here
 * rather than each SKU getting its own authored copy. One definition reused
 * by reference across products, not copy-pasted three times, so there's a
 * single place to update if this content changes later.
 */
const showcaseDescription =
  "ลิปทินท์เนื้อบางเบา เกลี่ยง่าย ให้สีชัดในปาดเดียว บำรุงริมฝีปากด้วย Hyaluronic Acid ลดปัญหาปากแห้ง คล้ำ แตก มาพร้อมพวงกุญแจคาแรกเตอร์ Sanrio ลิขสิทธิ์แท้";
const showcaseReviewCount = 2146;
const showcaseRatingBreakdown = [1759, 279, 64, 28, 16];
const showcaseReviews = [
  {
    id: "review-1",
    name: "ปาล์มมี่ ก.",
    rating: 5,
    date: "12 ส.ค. 2569",
    variantLabel: "04 Sugar Coral",
    text: "เนื้อบางเบาจริง ทาแล้วไม่รู้สึกหนักปากเลย สีตรงปกมาก ติดทนทั้งวันแม้กินข้าวก็ยังไม่จางไปหมด ชอบพวงกุญแจที่แถมมาด้วยน่ารักมาก",
  },
  {
    id: "review-2",
    name: "Nutcha S.",
    rating: 5,
    date: "3 ส.ค. 2569",
    variantLabel: "01 Melody Pink",
    text: "ซื้อเพราะพวงกุญแจ My Melody แต่ตัวทินท์ดีเกินคาด โทนสีหวานมากใส่แล้วปากดูอิ่มฟู ไม่แห้งตึงเหมือนทินท์ยี่ห้ออื่นที่เคยลอง",
  },
  {
    id: "review-3",
    name: "ฝ้าย ธ.",
    rating: 4,
    date: "28 ก.ค. 2569",
    variantLabel: "05 Cherry Kiss",
    text: "สีสวยมากสำหรับคนผิวสองสี ติดทนดี แต่ต้องทาลิปบาล์มรองพื้นก่อนไม่งั้นจะเห็นเนื้อปากแห้งเป็นขุยนิดหน่อย โดยรวมยังประทับใจอยู่",
  },
];

// Counts below were raised (per an explicit "more products to browse" request)
// from the original 6-8 per section. Still generated from the single real
// product photo this catalog has — see the top-of-file note — cycled with
// varied copy/price/rating the same way the original items already were,
// rather than introducing placeholder/stock imagery the project doesn't have.
export const flashSaleProducts: Product[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `flash-${i + 1}`,
  slug: `charmiss-sanrio-blooming-heart-lip-gloss-${i + 1}`,
  name: "Charmiss x Sanrio Blooming Heart Lip Gloss",
  image: productPhoto,
  price: 199,
  compareAtPrice: 329,
  discountPercent: 15,
  // index 1 is intentionally 0 — the one card in this catalog that exercises
  // the disabled "สินค้าหมด" (out of stock) state. Indexed with `% 8` so it
  // keeps cycling correctly now that this list is longer than 8.
  stockLeft: [20, 0, 10, 10, 20, 20, 20, 20][i % 8],
  stockTotal: 30,
  flashSaleEndsAt: FLASH_SALE_ENDS_AT,
  variants: i % 3 === 0 ? undefined : shadeVariants,
  rating: 4.6 + (i % 4) * 0.1,
  soldCount: 800 + i * 150,
}));

// Same reasoning as the two `Object.assign` blocks below: fill in the
// PDP-only fields for real on this specific SKU (the one this catalog's own
// Out of Stock PDP example points at) instead of leaving it comparatively
// bare next to the fully-detailed showcase SKU. Gallery reuses this
// catalog's other real lip-product photography (same "close enough, not
// exact" precedent already used for the Lip Tint SKU below) since it's the
// same product category (lip), unlike the cushion SKU above.
Object.assign(flashSaleProducts[1], {
  description: showcaseDescription,
  images: [
    productPhoto,
    productLipTintMain,
    productLipTintUgc1,
    productLipTintUgc2,
    productLipTintUgc3,
    productLipTintUgc3,
    productLipTintUgc2,
    productLipTintUgc1,
    productLipTintMain,
    productPhoto,
  ],
  reviewCount: showcaseReviewCount,
  ratingBreakdown: showcaseRatingBreakdown,
  reviews: showcaseReviews,
} satisfies Partial<Product>);

const bestSellerCategories = ["eye", "cheek", "lip"] as const;

export const bestSellerProducts: Product[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `best-${i + 1}`,
  slug: `charmiss-sanrio-blooming-heart-lip-gloss-best-${i + 1}`,
  name: "Charmiss x Sanrio Blooming Heart Lip Gloss",
  image: productPhoto,
  price: 199,
  compareAtPrice: 329,
  discountPercent: 15,
  variants: i % 2 === 0 ? shadeVariants : undefined,
  category: bestSellerCategories[i % bestSellerCategories.length],
  rating: 4.7 + (i % 3) * 0.1,
  soldCount: 1000 + i * 220,
}));

/**
 * Product Detail (Figma node 132:3677) content lives entirely on this one
 * catalog item rather than a separate/duplicate data set — every other
 * product still resolves and renders on `/product/:slug` via the same
 * Product type, just without the optional PDP-only fields (gallery beyond
 * the one photo, description, reviews), which the page treats as sections
 * to omit rather than fake content to fill in. Shade names not given
 * verbatim in Figma (only "01 Melody Pink" and two named in review copy)
 * use the same kind of Sanrio-character-paired naming the rest of the
 * catalog already does.
 */
const lipTintVariants: ProductVariant[] = [
  { id: "lip-tint-01", label: "01 Melody Pink", color: "#f08ba6" },
  { id: "lip-tint-02", label: "02 Kuromi Purple", color: "#8f6fa8" },
  { id: "lip-tint-03", label: "03 Peach Bloom", color: "#f2a177" },
  { id: "lip-tint-04", label: "04 Sugar Coral", color: "#ee6e63" },
  { id: "lip-tint-05", label: "05 Cherry Kiss", color: "#c9354f" },
  { id: "lip-tint-06", label: "06 Rosy Nude", color: "#b57c86", soldOut: true },
];

Object.assign(bestSellerProducts[0], {
  name: "Charmiss x Sanrio Blooming Heart Lip Tint ลิปทินท์เนื้อฉ่ำ ติดทน 8 ชั่วโมง",
  image: productLipTintMain,
  // Slots 2-5 reuse other real Charmiss photography already in this project
  // (the catalog's other lip-product shot + 3 real UGC/social images) rather
  // than the Figma mock's own thumbnails, which are a different product's
  // banner art entirely — picked for "close enough, not exact" per explicit
  // sign-off, not presented as this exact SKU's own studio photography.
  // Slots 6-10 repeat the same 5 real photos (reordered, not appended
  // verbatim) — this catalog has no further distinct photography for this
  // SKU, and per explicit sign-off this is for exercising the 10-image
  // gallery/carousel, not a claim of 10 unique studio shots.
  images: [
    productLipTintMain,
    productPhoto,
    productLipTintUgc1,
    productLipTintUgc2,
    productLipTintUgc3,
    productLipTintUgc3,
    productLipTintUgc2,
    productLipTintUgc1,
    productPhoto,
    productLipTintMain,
  ],
  price: 259,
  compareAtPrice: 390,
  discountPercent: 34,
  description: showcaseDescription,
  variants: lipTintVariants,
  category: "lip",
  rating: 4.8,
  reviewCount: showcaseReviewCount,
  soldCount: 18400,
  stockLeft: 20,
  stockTotal: 30,
  flashSaleEndsAt: FLASH_SALE_ENDS_AT,
  ratingBreakdown: showcaseRatingBreakdown,
  reviews: showcaseReviews,
} satisfies Partial<Product>);

export const newArrivalProducts: Product[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `new-${i + 1}`,
  slug: `charmiss-new-arrival-${i + 1}`,
  name: "Charmiss x Sanrio Blooming Heart Lip Gloss",
  image: productPhoto,
  price: 249,
  variants: shadeVariants,
  // New arrivals are, well, new — most have few or no reviews yet, so only
  // some of these show a rating row at all (Product.rating is optional).
  rating: i % 2 === 0 ? 4.5 + (i % 3) * 0.1 : undefined,
  soldCount: i % 2 === 0 ? 60 + i * 30 : undefined,
}));

export const trendingProducts: Product[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `trend-${i + 1}`,
  slug: `charmiss-trending-${i + 1}`,
  name: "Charmiss x Sanrio Blooming Heart Lip Gloss",
  image: productPhoto,
  price: 219,
  compareAtPrice: 269,
  discountPercent: 20,
  variants: undefined,
  rating: 4.8 + (i % 2) * 0.1,
  soldCount: 1500 + i * 300,
}));

export const featuredCollectionProducts: Product[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `feature-${i + 1}`,
  slug: `charmiss-glow-in-motion-${i + 1}`,
  name: "Charmiss Charming Iconic Glow Cushion SPF50+ PA++++",
  image: productPhoto,
  price: 590,
  variants: cushionShadeVariants,
  rating: 4.9,
  soldCount: 1000 + i * 180,
}));

// PDP-only detail fields (Product Detail's description/gallery/reviews) only
// existed on one showcase SKU historically — filling them in here for real
// on this catalog's other product line too, same as that SKU, rather than
// leaving this one's PDP comparatively bare. Per explicit direction, the
// gallery is padded to 10 with this catalog's other real product photography
// (not this exact SKU's own packaging beyond the first two slots), and the
// description/review content is shared verbatim with the other PDP examples
// rather than separately authored.
Object.assign(featuredCollectionProducts[0], {
  image: productCushionMain,
  images: [
    productCushionMain,
    productCushionHero,
    productPhoto,
    productLipTintMain,
    productLipTintUgc1,
    productLipTintUgc2,
    productLipTintUgc3,
    productLipTintUgc3,
    productLipTintUgc2,
    productLipTintUgc1,
  ],
  description: showcaseDescription,
  reviewCount: showcaseReviewCount,
  ratingBreakdown: showcaseRatingBreakdown,
  reviews: showcaseReviews,
} satisfies Partial<Product>);

/**
 * Single source of truth for "all products this catalog knows about" —
 * anything that needs to resolve a cart line's productId back to a Product
 * (CartDrawer, a future order-history page, ...) should import this instead
 * of re-assembling the list itself. Forgetting one of the per-section
 * exports here was exactly the bug that made Featured Collection items
 * disappear from the cart drawer while still counting toward the badge.
 */
export const allProducts: Product[] = [
  ...flashSaleProducts,
  ...bestSellerProducts,
  ...newArrivalProducts,
  ...trendingProducts,
  ...featuredCollectionProducts,
];

// Per explicit direction: give every remaining catalog item (everything
// besides the 3 SKUs already hand-enriched above) the same PDP-detail
// fields too — same shared description/reviews, and a 10-image gallery
// built from this catalog's existing real image assets (not necessarily
// *that* SKU's own photography) rather than leaving 51 of 54 products with
// a bare single-photo PDP. Only fills fields a product doesn't already have
// set, so the 3 hand-authored SKUs above are untouched.
const galleryFillerPool = [
  productPhoto,
  productLipTintMain,
  productLipTintUgc1,
  productLipTintUgc2,
  productLipTintUgc3,
  productCushionMain,
  productCushionHero,
];

for (const product of allProducts) {
  if (!product.images) {
    const images = [product.image];
    for (let i = 0; images.length < 10; i++) {
      images.push(galleryFillerPool[i % galleryFillerPool.length]);
    }
    product.images = images;
  }
  if (!product.description) {
    product.description = showcaseDescription;
  }
  if (!product.reviewCount) {
    product.reviewCount = showcaseReviewCount;
    product.ratingBreakdown = showcaseRatingBreakdown;
    product.reviews = showcaseReviews;
  }
}

/**
 * Architecture Cleanup & Source of Truth — `adminProductStore.tsx`'s
 * baseline seeds every `AdminProduct` straight off these five arrays
 * (flattened into `allProducts`), which is the only place group membership
 * ("this one is a Best Seller") was ever recorded — as which literal array
 * an object lived in, never a field on the object itself. Once the
 * storefront reads the live, flattened Product Store instead of these
 * arrays directly, that membership needs a real (if minimal) way to survive
 * the flattening: these five id-prefix checks, derived from the exact same
 * stable seed ids (`best-*`, `new-*`, `trend-*`, `feature-*`) every other
 * admin-authored reference in this codebase already keys off of (Homepage's
 * own baseline hardcodes `productId: "best-1"`, etc.) — not a new dataset
 * dimension, just naming the grouping the ids already encode. A product
 * added later through Product Management (`admin-*` id) matches none of
 * these and simply belongs to no auto-curated rail — same as a store
 * clerk needing to explicitly add a new SKU to a merchandising rail rather
 * than it appearing there automatically. Flash Sale needs no id check: a
 * product's own `flashSaleEndsAt` already *is* its flash-sale membership.
 */
export const isBestSeller = (p: Pick<Product, "id">): boolean => p.id.startsWith("best-");
export const isNewArrival = (p: Pick<Product, "id">): boolean => p.id.startsWith("new-");
export const isTrending = (p: Pick<Product, "id">): boolean => p.id.startsWith("trend-");
export const isFeatured = (p: Pick<Product, "id">): boolean => p.id.startsWith("feature-");
export const isFlashSale = (p: Pick<Product, "flashSaleEndsAt">): boolean => !!p.flashSaleEndsAt;

export const productFilterTabs = [
  { id: "all", label: "ทั้งหมด" },
  { id: "eye", label: "ตา" },
  { id: "cheek", label: "แก้ม" },
  { id: "lip", label: "ปาก" },
] as const;
