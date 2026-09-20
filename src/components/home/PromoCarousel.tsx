import { Container } from "../shared/Container";
import { Carousel } from "../shared/Carousel";
import { Artwork } from "../shared/Artwork";
import promoBanner1 from "~/assets/images/promo/promo-carousel-1.png";

const slides = [
  {
    id: "kiss-signal-gloss",
    content: (
      <Artwork
        kind="image"
        src={promoBanner1}
        alt="Kiss Signal Gloss — กลอสนางฟ้า No.1"
        objectPosition="center"
        class="aspect-[21/9] rounded-card sm:aspect-[3/1]"
      />
    ),
  },
];

export function PromoCarousel() {
  return (
    <section aria-label="โปรโมชั่นรอง" class="py-8 lg:py-12">
      <Container width="wide">
        <Carousel slides={slides} label="แบนเนอร์โปรโมชั่นรอง" showDots={false} autoPlay={6000} />
      </Container>
    </section>
  );
}
