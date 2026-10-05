import { CategoryListingPage } from "~/components/category/CategoryListingPage";

/** Thin route wrapper — see `face.tsx` for the shared-template rationale. */
export default function EyeCategoryPage() {
  return <CategoryListingPage categorySlug="eye" categoryTitle="ตาและคิ้ว" />;
}
