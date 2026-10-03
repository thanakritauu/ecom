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
// Mock review clip for prototype review UX — a 6s slow-zoom slideshow rendered
// locally from the three UGC photos above (no external/stock footage).
import reviewDemoVideo from "~/assets/videos/review-demo.mp4";
import type { Product, ProductVariant, Review } from "./types";

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
const showcaseRatingBreakdown: [number, number, number, number, number] = [1759, 279, 64, 28, 16];
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
  {
    id: "review-4",
    name: "Kanyarat P.",
    rating: 5,
    date: "21 ก.ค. 2569",
    text: "สั่งครั้งที่สองแล้วค่ะ แพ็กของมาดีมาก ส่งไว ใช้แล้วชอบจนต้องซื้อเผื่อเพื่อน คุ้มราคาสุด ๆ",
  },
];

/**
 * Option-level mock reviews — plain data, not special cases: each review
 * names its product (`productId`) and the option bought (`variantId` →
 * `ProductVariant.id`), the generic relation `lib/productReviews.ts` filters
 * by for ANY product. These two SKUs carry hand-written reviews; every
 * option is then topped up to 3–4 reviews by `topUpOptionReviews` below.
 * Media reuse this project's own photos + the locally rendered demo clip.
 */
const lipTintReviews: Review[] = [
  { ...showcaseReviews[1], id: "lt-review-1", productId: "best-1", variantId: "lip-tint-01", photos: [productLipTintUgc2] },
  {
    id: "lt-review-2",
    productId: "best-1",
    variantId: "lip-tint-01",
    name: "Pimchanok R.",
    rating: 5,
    date: "30 ก.ค. 2569",
    variantLabel: "01 Melody Pink",
    text: "สีชมพูหวานใส่ทุกวันได้ ถ่ายคลิปสวอชมาให้ดูค่ะ ปาดเดียวสีขึ้นเลย",
    videos: [{ src: reviewDemoVideo, poster: productLipTintUgc1 }],
  },
  {
    id: "lt-review-3",
    productId: "best-1",
    variantId: "lip-tint-02",
    name: "มายด์ ว.",
    rating: 4,
    date: "25 ก.ค. 2569",
    variantLabel: "02 Kuromi Purple",
    text: "สีม่วงอมชมพูแปลกตาดี ทาบาง ๆ แล้วเบลอขอบจะสวยมาก พวงกุญแจคุโรมิน่ารักสุด ๆ",
    photos: [productLipTintUgc3, productLipTintMain],
  },
  { ...showcaseReviews[0], id: "lt-review-4", productId: "best-1", variantId: "lip-tint-04", photos: [productLipTintUgc1, productLipTintMain, productPhoto] },
  {
    ...showcaseReviews[2],
    id: "lt-review-5",
    productId: "best-1",
    variantId: "lip-tint-05",
    videos: [{ src: reviewDemoVideo, poster: productLipTintUgc3 }],
    photos: [productLipTintUgc2],
  },
];

/**
 * Mock option-level reviews for ANY product with options — generated from the
 * product's own data (its option ids/labels, its own gallery photos, its id),
 * never from its name or a hardcoded id. Every option ends up with 3–4
 * reviews in the Option Modal (alternating per option): reviews a product
 * already has (the hand-written Cushion / Lip Tint sets) are kept and only
 * the shortfall is generated, with photos (the very first one also a video).
 * Deterministic, so SSR and the client render the same data.
 */
const MOCK_REVIEWERS = ["Ploy S.", "เบล ก.", "Natt P.", "มิ้นท์ ร.", "June K.", "ฟ้าใส ท.", "Bow W.", "แพรว ส."];
const MOCK_REVIEW_TEXTS = [
  (label: string) => `ตัวเลือกสินค้า ${label} สีสวยตรงปกมาก ใช้แล้วหน้าดูสดใสขึ้น จะซื้อซ้ำแน่นอน`,
  (label: string) => `ลอง ${label} แล้วชอบเลย เนื้อสัมผัสดี ใช้ง่าย แพ็กเกจน่ารัก ส่งไวมาก`,
  (label: string) => `${label} เข้ากับสีผิวดี ติดทนประมาณครึ่งวัน ระหว่างวันเติมนิดหน่อยก็สวยแล้ว`,
  (label: string) => `ถ่ายรูปมาให้ดูค่ะ ${label} ของจริงสวยกว่าในรูป คุ้มราคามาก`,
];
const MOCK_REVIEW_DATES = ["22 ก.ย. 2569", "18 ก.ย. 2569", "13 ก.ย. 2569", "7 ก.ย. 2569", "1 ก.ย. 2569", "26 ส.ค. 2569"];

const optionReviewTarget = (optionIndex: number) => 3 + (optionIndex % 2);

function topUpOptionReviews(product: Product, existing: Review[]): Review[] {
  const photos = (product.images?.length ? product.images : [product.image]).filter(Boolean);
  const pickPhotos = (seed: number, count: number) => Array.from({ length: count }, (_, k) => photos[(seed + k) % photos.length]);
  const reviews = [...existing];
  (product.variants ?? []).forEach((variant, i) => {
    const have = existing.filter((r) => r.variantId === variant.id).length;
    for (let k = have; k < optionReviewTarget(i); k++) {
      const n = i * 4 + k;
      reviews.push({
        id: `${product.id}-mock-review-${variant.id}-${k + 1}`,
        productId: product.id,
        variantId: variant.id,
        name: MOCK_REVIEWERS[n % MOCK_REVIEWERS.length],
        rating: n % 4 === 3 ? 4 : 5,
        date: MOCK_REVIEW_DATES[n % MOCK_REVIEW_DATES.length],
        variantLabel: variant.label,
        text: MOCK_REVIEW_TEXTS[n % MOCK_REVIEW_TEXTS.length](variant.label),
        photos: pickPhotos(n, (n % 3) + 1),
        ...(n === 0 ? { videos: [{ src: reviewDemoVideo, poster: photos[0] }] } : {}),
      });
    }
  });
  return reviews;
}

const cushionReviews: Review[] = [
  {
    id: "cs-review-1",
    productId: "feature-1",
    variantId: "cushion-01",
    name: "Kanokwan T.",
    rating: 5,
    date: "14 ก.ย. 2569",
    variantLabel: "เบอร์ 01",
    text: "ผิวขาวเหลืองใช้เบอร์ 01 พอดีมาก บางเบา ปกปิดรอยแดงได้ดี ไม่ดรอประหว่างวัน",
    photos: [productCushionMain, productCushionHero],
    videos: [{ src: reviewDemoVideo, poster: productCushionHero }],
  },
  {
    id: "cs-review-2",
    productId: "feature-1",
    variantId: "cushion-02",
    name: "ฟ้า ส.",
    rating: 4,
    date: "9 ก.ย. 2569",
    variantLabel: "เบอร์ 02",
    text: "สีกลางๆ เข้ากับผิวสองสี ฟินิชโกลว์สวย แต่คนผิวมันอาจต้องซับแป้งทับเล็กน้อย",
    photos: [productCushionHero],
  },
  {
    id: "cs-review-3",
    productId: "feature-1",
    variantId: "cushion-04",
    name: "Jirapat K.",
    rating: 5,
    date: "2 ก.ย. 2569",
    variantLabel: "เบอร์ 04",
    text: "เบอร์ 04 สำหรับผิวแทนคือดีมาก ไม่ลอย ไม่เทา ตลับสวยพกง่าย",
    photos: [productCushionMain],
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
  discountPercent: 40,
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
} satisfies Partial<Product>);

const bestSellerCategories = ["eye", "cheek", "lip"] as const;

export const bestSellerProducts: Product[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `best-${i + 1}`,
  slug: `charmiss-sanrio-blooming-heart-lip-gloss-best-${i + 1}`,
  name: "Charmiss x Sanrio Blooming Heart Lip Gloss",
  image: productPhoto,
  price: 199,
  compareAtPrice: 329,
  discountPercent: 40,
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
  ratingBreakdown: showcaseRatingBreakdown,
  reviews: lipTintReviews,
} satisfies Partial<Product>);

export const newArrivalProducts: Product[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `new-${i + 1}`,
  slug: `charmiss-new-arrival-${i + 1}`,
  name: "Charmiss x Sanrio Blooming Heart Lip Gloss",
  image: productPhoto,
  price: 249,
  // Product Card Refinement — every card shows original price + discount
  // and the rating/sold row, so the review mocks carry that data too.
  compareAtPrice: 299,
  discountPercent: 17,
  variants: shadeVariants,
  rating: 4.5 + (i % 3) * 0.1,
  soldCount: 60 + i * 30,
}));

export const trendingProducts: Product[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `trend-${i + 1}`,
  slug: `charmiss-trending-${i + 1}`,
  name: "Charmiss x Sanrio Blooming Heart Lip Gloss",
  image: productPhoto,
  price: 219,
  compareAtPrice: 269,
  discountPercent: 19,
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
  compareAtPrice: 790,
  discountPercent: 25,
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
  reviews: cushionReviews,
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
  // `reviews === undefined` (not "no reviewCount") so a product explicitly set to have no reviews keeps that.
  if (product.reviews === undefined) {
    product.reviewCount = showcaseReviewCount;
    product.ratingBreakdown = showcaseRatingBreakdown;
    // Products without options keep the shared product-level reviews (4).
    product.reviews = product.variants?.length ? [] : showcaseReviews;
  }
  // Every option gets 3–4 reviews — hand-written ones kept, the rest generated.
  if (product.variants?.length) {
    product.reviews = topUpOptionReviews(product, product.reviews ?? []);
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

/**
 * Discount badge % — always derived from the two real prices
 * (`((compareAtPrice - price) / compareAtPrice) × 100`, rounded) rather than
 * trusting the stored `discountPercent`, so the badge can never disagree
 * with the prices shown next to it. Same formula Admin's ProductForm uses.
 * `undefined` when the product isn't actually discounted.
 */
export function getDiscountPercent(p: Pick<Product, "price" | "compareAtPrice">): number | undefined {
  if (!p.compareAtPrice || p.price <= 0 || p.compareAtPrice <= p.price) return undefined;
  return Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100) || undefined;
}
