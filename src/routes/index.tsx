import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { HeroBanner } from "~/components/home/HeroBanner";
import { HomepageSections } from "~/components/home/HomepageSections";
import { useHomepageContent } from "~/lib/homepageContent";
import { FlashSaleSection } from "~/components/home/FlashSaleSection";
import { BestSellersSection } from "~/components/home/BestSellersSection";
import { CouponSection } from "~/components/home/CouponSection";
import { NewArrivalsSection } from "~/components/home/NewArrivalsSection";
import { TrendingSection } from "~/components/home/TrendingSection";
import { ReviewsSection } from "~/components/home/ReviewsSection";
import { FAQSection } from "~/components/home/FAQSection";

export default function Home() {
  const homepage = useHomepageContent();
  return (
    <>
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] font-medium focus:rounded-pill focus:bg-white focus:px-4 focus:py-2 focus:text-ink focus:shadow-card"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <Header />
      <main id="main-content" class="flex flex-col overflow-x-hidden">
        <HeroBanner />
        {/* Phase 10.2 — replaces the old static "Featured Collection" section
            with the same content, now driven by Admin's Homepage Content
            (published) state; every other section below stays exactly as it
            was (not part of the 5 admin-manageable section types). */}
        <HomepageSections sections={homepage.sections()} productRows={1} swipe hideEmptyProductSections />
        <FlashSaleSection />
        <BestSellersSection />
        <CouponSection />
        <NewArrivalsSection />
        <TrendingSection />
        <ReviewsSection />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
