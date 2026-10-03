import { Container } from "../shared/Container";
import { Button } from "../shared/Button";
import { Artwork } from "../shared/Artwork";
import membershipBg from "~/assets/images/membership/membership-bg.png";
import arrowIcon from "~/assets/icons/membership-arrow.svg";

/**
 * Desktop keeps the Figma pattern (copy overlaid on the artwork). On mobile
 * that same overlay makes the headline unreadable against a busy photo, so
 * per the direction doc's "desktop overlay -> mobile stack" example this
 * reflows into image-then-copy instead of shrinking the overlay in place.
 */
export function MembershipCTA() {
  return (
    <section aria-labelledby="membership-heading" class="pb-6 pt-0 sm:pb-8 lg:pb-10">
      <Container width="wide">
        <div class="relative overflow-hidden rounded-2xl sm:rounded-[20px] lg:aspect-[1140/362] lg:rounded-card">
          <div class="lg:absolute lg:inset-0">
            <Artwork
              kind="image"
              src={membershipBg}
              alt=""
              objectPosition="center 30%"
              class="aspect-[16/9] sm:aspect-[21/9] lg:aspect-auto"
            />
          </div>
          <div class="flex flex-col gap-4 bg-white p-6 lg:absolute lg:inset-y-0 lg:left-0 lg:w-[522px] lg:justify-center lg:bg-transparent lg:p-[60px]">
            <div class="flex flex-col gap-1">
              <h2 id="membership-heading" class="text-3xl font-bold text-brand-pink lg:text-[50px] lg:leading-[54px]">
                Charmiss Club
              </h2>
              <p class="text-lg font-medium text-ink lg:text-2xl">
                สะสม Charmiss Coins ทุกการสั่งซื้อ
                <br />
                แลกรับของรางวัล ส่วนลด และสิทธิพิเศษ
              </p>
            </div>
            <Button variant="primary" size="lg" class="w-fit" href="/account/register">
              สมัครฟรีกดเลย
              <img src={arrowIcon} alt="" class="h-4 w-auto invert" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
