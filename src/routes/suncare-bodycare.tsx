import { CategoryListingPage } from "~/components/category/CategoryListingPage";

/** Thin route wrapper — every Category route hands its slug into the shared `CategoryListingPage` template. */
export default function SuncareBodycareCategoryPage() {
  return <CategoryListingPage categorySlug="suncare-bodycare" categoryTitle="กันแดดและบอดี้แคร์" />;
}
