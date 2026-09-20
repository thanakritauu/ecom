import { For } from "solid-js";
import { Container } from "../shared/Container";
import { Carousel } from "../shared/Carousel";
import ugc1 from "~/assets/images/reviews/ugc-1.png";
import ugc2 from "~/assets/images/reviews/ugc-2.png";
import ugc3 from "~/assets/images/reviews/ugc-3.png";
import starGold from "~/assets/icons/star-gold-4.svg";

/**
 * The 3 UGC images already contain their own caption/like-count overlay
 * (they're screenshots of real Instagram posts pulled into the design), so
 * we render them as-is rather than reconstructing that overlay as markup.
 */
const ugcImages = [ugc1, ugc2, ugc3];

// Built once at module scope — Carousel reads `props.slides` multiple times
// (count(), the aria-labels, <For>), so an inline `.map()` in the JSX prop
// would re-run on every read and re-create fresh JSX each time, breaking
// hydration. Hero/PromoCarousel already do this correctly; mirror it here.
const reviewSlides = ugcImages.map((src, i) => ({
  id: `ugc-${i}`,
  content: (
    <div class="mx-auto flex max-w-[320px] justify-center px-2 pt-4 pb-8">
      {/* Carousel's track is `overflow-x-auto` with no `overflow-y` set —
          per the CSS Overflow spec that forces overflow-y to auto too, which
          clips this image's shadow-card bleed flush at the track's top/bottom
          edge (same root cause as ProductRail's card-shadow fix). Padding
          added here, on this slide's own content wrapper, not on Carousel's
          shared track — Hero/PromoCarousel reuse that same track and don't
          need the extra room. */}
      <img
        src={src}
        alt="รีวิวสินค้า Charmiss จากลูกค้าบนโซเชียลมีเดีย"
        loading="lazy"
        class="aspect-[303/515] w-full rounded-2xl object-cover shadow-card"
      />
    </div>
  ),
}));

export function ReviewsSection() {
  return (
    <section
      aria-labelledby="reviews-heading"
      class="rounded-t-[40px] bg-gradient-to-b from-surface-pink to-white py-14 lg:py-20"
    >
      <Container width="wide" class="flex flex-col items-center gap-8">
        <div class="relative flex w-full flex-col items-center gap-4">
          <h2 id="reviews-heading" class="text-3xl font-bold text-brand-pink lg:text-[40px]">
            #CharmissReviews
          </h2>

          <div class="flex flex-wrap items-center justify-center gap-3 rounded-pill bg-white px-5 py-2 shadow-card">
            <div class="flex items-center gap-2">
              <div class="flex gap-0.5" aria-hidden="true">
                {Array.from({ length: 5 }).map(() => (
                  <img src={starGold} alt="" class="size-4" />
                ))}
              </div>
              <span class="font-bold text-ink">4.9</span>
            </div>
            <div class="h-4 w-px bg-ink-placeholder" aria-hidden="true" />
            <p class="text-ink-gray">
              จากรีวิวจริง <span class="font-medium text-brand-pink">10,000+</span> รีวิว
            </p>
          </div>
        </div>

        {/* Mobile/tablet: swipeable single-card carousel */}
        <div class="w-full max-w-[1000px] lg:hidden">
          <Carousel label="รีวิวจากลูกค้าจริงบนโซเชียล" showDots={false} slides={reviewSlides} autoPlay={5000} />
        </div>

        {/* Desktop: Figma shows all 3 UGC posts side by side, not one at a time */}
        <div class="hidden w-full max-w-[1000px] lg:grid lg:grid-cols-3 lg:gap-6">
          <For each={ugcImages}>
            {(src) => (
              <img
                src={src}
                alt="รีวิวสินค้า Charmiss จากลูกค้าบนโซเชียลมีเดีย"
                loading="lazy"
                class="aspect-[303/515] w-full rounded-2xl object-cover shadow-card"
              />
            )}
          </For>
        </div>
      </Container>
    </section>
  );
}
