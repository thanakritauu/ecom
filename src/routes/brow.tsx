import { CategoryListingPage } from "~/components/category/CategoryListingPage";

/** Thin route wrapper — see `face.tsx` for the shared-template rationale. */
export default function BrowCategoryPage() {
  return <CategoryListingPage categorySlug="brow" categoryTitle="คิ้ว" />;
}
