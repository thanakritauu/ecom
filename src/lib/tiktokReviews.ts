import { RAIL_ASSIGNMENTS } from "./watsonsCatalog";

/**
 * TikTok review clips — embedded with TikTok's official player
 * (`tiktok.com/player/v1/:id`), so the clips stay hosted and credited on
 * TikTok. Home's #CharmissReviews shows every clip; every Product Detail
 * Page shows them too, with the clips mapped to that product (`productIds`)
 * first and the rest of the brand's clips after. This list is the seed: Admin
 * (รีวิว > คลิปรีวิว TikTok) edits the live list, read by `storefrontTiktokClips.ts`.
 * The id is the number at the end of the video URL (`tiktok.com/@handle/video/<id>`). No API/token.
 */
export type TikTokReviewClip = {
  videoId: string;
  /** Creator handle, without the "@". */
  author: string;
  /** Short caption used for the iframe title (a11y). */
  title: string;
  /** Catalog product ids this clip reviews — only those PDPs show it. Unset = Home only. */
  productIds?: string[];
  /** Cover uploaded in Admin; wins over the cover TikTok returns (`tiktokPosters.ts`). */
  coverUrl?: string;
};

/** Mock slot ids that show a given real product (Watsons code), across every merchandising rail. */
export function productIdsForWatsonsCode(code: string): string[] {
  return Object.entries(RAIL_ASSIGNMENTS).flatMap(([prefix, codes]) => codes.flatMap((c, i) => (c === code ? [`${prefix}${i + 1}`] : [])));
}

// The Iconic Glow cushion (the pink cushion, Watsons 331785) — only the slots
// that really show it (`feature-1`, `feature-10`, `best-2`); the other
// `feature-*` slots are different products.
const GLOW_CUSHION_IDS = productIdsForWatsonsCode("331785");

export const TIKTOK_REVIEW_CLIPS: TikTokReviewClip[] = [
  {
    videoId: "7527552590708526343",
    author: "charmiss.cosmetics",
    title: "รีวิวเปรียบเทียบคุชชั่น Charmiss 3 ตลับ เขียว ชมพู แดง",
    productIds: GLOW_CUSHION_IDS,
  },
  {
    videoId: "7451540276507593992",
    author: "charmiss.cosmetics",
    title: "เปรียบเทียบคุชชั่น Charming Glow Airy Cushion ตลับชมพู กับตลับเขียว",
    productIds: GLOW_CUSHION_IDS,
  },
  { videoId: "7408049249780256008", author: "charmiss.cosmetics", title: "ทดสอบความปกปิด กันน้ำ ติดทน คุชชั่นผิวกริบ Charmiss" },
  { videoId: "7381831515728006406", author: "charmiss.cosmetics", title: "ลิปกดใจชาร์มิส สีชัด เนื้อเย็น ไม่เหนียว" },
  { videoId: "7504169359800061202", author: "mymayy.2000", title: "รีวิวคุชชั่นชาร์มิสตลับเขียว" },
  { videoId: "7514680359498337554", author: "golfgolf2469", title: "รีวิวคุชชั่นแดง Charmiss Perfect Heart" },
  { videoId: "7522481019082132754", author: "cukqailie", title: "รีวิวคุชชั่นแดง Charmiss Perfect Heart งานผิวแมทไม่ด้าน" },
  { videoId: "7411025043745967368", author: "ms.100cushions", title: "เปรียบเทียบคุชชั่น Charmiss 2 รุ่น" },
];

export const isClipOfProduct = (clip: TikTokReviewClip, productId: string) => !!clip.productIds?.includes(productId);

/** PDP order: this product's own clips first, then every other clip — so every PDP has clips. */
export const tiktokClipsForProduct = (productId: string, clips: TikTokReviewClip[] = TIKTOK_REVIEW_CLIPS) => [
  ...clips.filter((clip) => isClipOfProduct(clip, productId)),
  ...clips.filter((clip) => !isClipOfProduct(clip, productId)),
];

/** Only loaded after a tap (see TikTokReviewRail), so it starts playing straight away. */
export const tiktokPlayerUrl = (videoId: string) =>
  `https://www.tiktok.com/player/v1/${videoId}?autoplay=1&music_info=0&description=0&rel=0&native_context_menu=0`;

export const tiktokVideoUrl = (clip: Pick<TikTokReviewClip, "author" | "videoId">) => `https://www.tiktok.com/@${clip.author}/video/${clip.videoId}`;
