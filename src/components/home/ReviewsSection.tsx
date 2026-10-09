import { Show } from "solid-js";
import { Container } from "../shared/Container";
import { TikTokReviewRail } from "../shared/TikTokReviewRail";
import { useStorefrontTiktokClips } from "~/lib/storefrontTiktokClips";
import starGold from "~/assets/icons/star-gold-4.svg";

export function ReviewsSection() {
  const clips = useStorefrontTiktokClips();
  // No active clips in Admin: drop the whole section (a #CharmissReviews band with nothing in it reads as broken).
  return (
    <Show when={clips().length > 0}>
      <section
        aria-labelledby="reviews-heading"
        class="rounded-t-3xl bg-gradient-to-b from-surface-pink to-white py-6 sm:rounded-t-[32px] sm:py-8 lg:rounded-t-[40px] lg:py-10"
      >
        <Container width="wide" class="flex flex-col items-center gap-4 sm:gap-5 lg:gap-6">
          <div class="relative flex w-full flex-col items-center gap-4">
            <h2
              id="reviews-heading"
              class="text-center text-[28px] font-bold leading-9 text-brand-pink sm:text-[34px] sm:leading-[42px] lg:text-[40px] lg:leading-[50px]"
            >
              #CharmissReviews
            </h2>

            <div class="flex items-center justify-center gap-2 whitespace-nowrap rounded-pill bg-white px-4 py-1.5 text-sm shadow-card sm:gap-3 sm:px-5 sm:py-2 sm:text-base lg:leading-5">
              <div class="flex items-center gap-1.5 sm:gap-2">
                <div class="flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: 5 }).map(() => (
                    <img src={starGold} alt="" class="size-3.5 sm:size-4" />
                  ))}
                </div>
                <span class="font-bold text-ink">4.9</span>
              </div>
              <div class="h-3.5 w-px bg-ink-placeholder sm:h-4" aria-hidden="true" />
              <p class="text-ink-gray">
                จากรีวิวจริง <span class="font-medium text-brand-pink">10,000+</span> รีวิว
              </p>
            </div>
          </div>

          {/* Real TikTok review clips (official embeds), managed in Admin (รีวิว > คลิปรีวิว TikTok). */}
          <div class="w-full max-w-[1100px]">
            <TikTokReviewRail clips={clips()} label="คลิปรีวิวสินค้า Charmiss จาก TikTok" />
          </div>
        </Container>
      </section>
    </Show>
  );
}
