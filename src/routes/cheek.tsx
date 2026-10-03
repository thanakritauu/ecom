import { CategoryListingPage } from "~/components/category/CategoryListingPage";

/** Thin route wrapper — see `face.tsx` for the shared-template rationale. */
export default function CheekCategoryPage() {
  return <CategoryListingPage categorySlug="cheek" categoryTitle="แก้ม" />;
}
