import { For } from "solid-js";
import { A } from "@solidjs/router";
import { Container } from "../shared/Container";
import categoryFace from "~/assets/images/category/category-face.png";
import categoryBrow from "~/assets/images/category/category-brow.png";
import categoryEye from "~/assets/images/category/category-eye.png";
import categoryCheek from "~/assets/images/category/category-cheek.png";
import categoryLip from "~/assets/images/category/category-lip.png";
import categoryTools from "~/assets/images/category/category-tools.png";

const categories = [
  { href: "/category/face", label: "FACE", image: categoryFace },
  { href: "/category/brow", label: "BROW", image: categoryBrow },
  { href: "/category/eye", label: "EYE", image: categoryEye },
  { href: "/category/cheek", label: "CHEEK", image: categoryCheek },
  { href: "/category/lip", label: "LIP", image: categoryLip },
  { href: "/category/tools", label: "BEAUTY TOOLS", image: categoryTools },
];

export function CategorySection() {
  return (
    <section aria-label="ช้อปตามหมวดหมู่" class="py-8 lg:py-12">
      <Container width="wide">
        <div class="scroll-rail rounded-[32px] bg-brand-pink px-4 py-6 lg:justify-between lg:overflow-visible lg:px-10 lg:py-8">
          <For each={categories}>
            {(cat) => (
              <A
                href={cat.href}
                class="flex w-[110px] shrink-0 flex-col items-center gap-2 sm:w-[130px] lg:w-[150px]"
              >
                <div class="aspect-square w-full overflow-hidden rounded-icon">
                  <img src={cat.image} alt={cat.label} loading="lazy" class="size-full object-cover" />
                </div>
              </A>
            )}
          </For>
        </div>
      </Container>
    </section>
  );
}
