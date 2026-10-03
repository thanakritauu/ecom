import { CategoryListingPage } from "~/components/category/CategoryListingPage";

/** Thin route wrapper — see `face.tsx` for the shared-template rationale. */
export default function LipCategoryPage() {
  return <CategoryListingPage categorySlug="lip" categoryTitle="ปาก" />;
}
