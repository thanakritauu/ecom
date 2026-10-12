import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { HeroBanner } from "~/components/home/HeroBanner";
import { HomepageSections } from "~/components/home/HomepageSections";
import { useHomepageContent } from "~/lib/homepageContent";

/**
 * The whole page renders from the homepage record's one ordered section list
 * (Admin, หน้าแคมเปญ > หน้าแรก): editable sections and the built-in blocks
 * (Flash Sale ... FAQ) alike. The hero carousel sits where the list's hero
 * section sits (on top when there is none); its on/off only picks Admin's
 * slides over the default ones, as before.
 */
export default function Home() {
  const homepage = useHomepageContent();
  const heroIndex = () => homepage.sections().findIndex((s) => s.type === "hero");
  const beforeHero = () => (heroIndex() < 0 ? [] : homepage.sections().slice(0, heroIndex()));
  const afterHero = () => (heroIndex() < 0 ? homepage.sections() : homepage.sections().slice(heroIndex() + 1));
  return (
    <>
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] font-medium focus:rounded-pill focus:bg-white focus:px-4 focus:py-2 focus:text-ink focus:shadow-card"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <Header />
      {/* 24px to the Footer whichever section ends up last (FAQ already has exactly pb-6). */}
      <main id="main-content" class="flex flex-col overflow-x-hidden [&>section:last-child]:!pb-6">
        <HomepageSections sections={beforeHero()} productRows={1} swipe hideEmptyProductSections />
        <HeroBanner />
        <HomepageSections sections={afterHero()} productRows={1} swipe hideEmptyProductSections />
      </main>
      <Footer />
    </>
  );
}
