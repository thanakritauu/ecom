import { CategoryListingPage } from "~/components/category/CategoryListingPage";

/** Thin route wrapper — every Category route hands its slug into the shared `CategoryListingPage` template. */
export default function SkincareCategoryPage() {
  return <CategoryListingPage categorySlug="skincare" categoryTitle="ดูแลผิว" />;
}
