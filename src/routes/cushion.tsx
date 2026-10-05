import { CategoryListingPage } from "~/components/category/CategoryListingPage";

/** Thin route wrapper — every Category route hands its slug into the shared `CategoryListingPage` template. */
export default function CushionCategoryPage() {
  return <CategoryListingPage categorySlug="cushion" categoryTitle="คุชชั่น" />;
}
