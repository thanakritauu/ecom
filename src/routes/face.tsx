import { CategoryListingPage } from "~/components/category/CategoryListingPage";

/** Thin route wrapper — same "route hands a config into the shared template" shape as `product/[slug]/index.tsx` handing a slug into `ProductDetailView`. All 5 Category routes (face/brow/eye/cheek/lip) are this same 3-line shape; the real implementation lives once in `CategoryListingPage`. */
export default function FaceCategoryPage() {
  return <CategoryListingPage categorySlug="face" categoryTitle="หน้า" />;
}
