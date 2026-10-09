import type { Product, ProductVariant } from "./types";
import type { AdminVariant } from "./adminProductStore";
import { isVideoMedia, type MediaValue } from "./media";

/**
 * Phase 02 §3/§4 — the one place a storefront variant is resolved into
 * everything the Product Option Modal and the cart need (photo, gallery,
 * price, stock). No new data model: the catalog already serves
 * `AdminProduct` (a superset of `Product`), whose `adminVariants` carry the
 * per-variant photos/price/stock admins manage — this just joins them onto
 * the customer-facing `variants` by id, the same list the Product Card's
 * shade circles render, so the card and the modal can never disagree on
 * which options exist.
 *
 * Fallbacks mirror existing readers: price → `product.price` (same
 * `variant.price ?? product.price` rule as Admin's ProductQuickView);
 * photos → the product's own Gallery (`mainImage` → `images` → `image`, the
 * same chain ProductCard/ProductQuickView already use) whenever a variant
 * has no photo of its own.
 */
export type VariantOption = {
  id: string;
  label: string;
  /** Product Card shade circle: flat color, or `swatchImage` when Admin uploaded one (separate from the photos below). */
  color: string;
  swatchImage?: string;
  /** Square thumbnail / cart line photo — always `gallery[0]`. */
  image: string;
  gallery: string[];
  price: number;
  /** Only known when Admin tracks per-variant stock. */
  stock?: number;
  soldOut: boolean;
};

const unique = (list: (string | undefined)[]) => [...new Set(list.filter((s): s is string => !!s))];

/** The product's own gallery (`mainImage` → `images` → `image`) — also what a product with no options shows. */
export function productGallery(product: Product): string[] {
  const images = product.images?.length ? product.images : [product.image];
  return unique([product.mainImage, ...images, product.image]);
}

/**
 * Turns a list of still images (a product's gallery strings) back into what
 * the PDP should play: an entry whose still is a gallery video's poster
 * becomes that video, everything else stays an image. Cards never call this.
 */
export function withProductVideos(product: Product, stills: string[]): MediaValue[] {
  const videos = new Map<string, MediaValue>();
  for (const item of product.media ?? []) if (isVideoMedia(item) && item.poster) videos.set(item.poster, item);
  return stills.map((src) => videos.get(src) ?? src);
}

function adminVariantsOf(product: Product): AdminVariant[] {
  const list = (product as Product & { adminVariants?: unknown }).adminVariants;
  return Array.isArray(list) ? (list as AdminVariant[]) : [];
}

export function resolveVariantOption(product: Product, variant: ProductVariant): VariantOption {
  const admin = adminVariantsOf(product).find((a) => a.id === variant.id);
  // Option photos (the modal's square tile) — an admin variant's `images` are always its photos, independent of the card swatch.
  const own = unique([...(admin?.images ?? []), variant.image]);
  const gallery = own.length ? own : productGallery(product);
  const stock = admin ? admin.stock : undefined;
  return {
    id: variant.id,
    label: variant.label,
    color: admin?.color || variant.color,
    swatchImage: admin ? (admin.mode === "image" ? admin.swatchImage : undefined) : variant.swatchImage,
    image: gallery[0] ?? product.image,
    gallery,
    price: admin?.price ?? product.price,
    stock,
    soldOut: !!variant.soldOut || (stock !== undefined && stock <= 0),
  };
}

export function resolveVariantOptions(product: Product): VariantOption[] {
  return (product.variants ?? []).map((v) => resolveVariantOption(product, v));
}
