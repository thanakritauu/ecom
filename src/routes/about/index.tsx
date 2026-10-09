import { For } from "solid-js";
import { InfoCard, InfoCta, InfoPageShell, Prose } from "~/components/info/InfoPageShell";
import { INFO_PAGES } from "~/lib/siteInfo";

const VALUES = [
  { title: "ของแท้ 100%", body: "จำหน่ายโดย Charmiss อย่างเป็นทางการ ทุกชิ้นส่งตรงจากโรงงานที่ได้มาตรฐาน" },
  { title: "ออกแบบเพื่อผิวคนไทย", body: "เฉดสีและเนื้อสัมผัสที่คิดมาสำหรับสภาพอากาศร้อนชื้นและโทนผิวเอเชีย" },
  { title: "คุณภาพในราคาที่เข้าถึงได้", body: "เครื่องสำอางคุณภาพดีที่ทุกคนเป็นเจ้าของได้ ไม่ต้องรอโอกาสพิเศษ" },
  { title: "ใส่ใจทุกส่วนผสม", body: "ผ่านการทดสอบความปลอดภัยและขึ้นทะเบียน อย. ทุกผลิตภัณฑ์" },
];

/** เกี่ยวกับเรา — brand story + values. Prototype copy, to be replaced by the brand team's own text. */
export default function AboutPage() {
  return (
    <InfoPageShell title={INFO_PAGES.about.label} subtitle="Charmiss เครื่องสำอางที่ทำให้ทุกวันของคุณมีเสน่ห์ในแบบของตัวเอง">
      <InfoCard title="เรื่องราวของเรา" id="about-story">
        <Prose>
          <p>
            Charmiss เริ่มต้นจากความเชื่อว่าความสวยไม่จำเป็นต้องซับซ้อนหรือแพง เราจึงตั้งใจพัฒนาเครื่องสำอางที่ใช้ง่าย ติดทนในอากาศเมืองไทย
            และมีเฉดสีที่เข้ากับผิวของสาวไทยทุกโทน
          </p>
          <p>
            จากลิปสติกแท่งแรก วันนี้ Charmiss มีทั้งเมคอัพสำหรับริมฝีปาก ดวงตา แก้ม คุชชั่น ไปจนถึงสกินแคร์และกันแดด
            ที่ได้รับความไว้วางใจจากลูกค้าทั่วประเทศ
          </p>
        </Prose>
      </InfoCard>

      <InfoCard title="สิ่งที่เรายึดมั่น" id="about-values">
        <ul class="grid gap-3 sm:grid-cols-2">
          <For each={VALUES}>
            {(v) => (
              <li class="flex flex-col gap-1 rounded-card bg-surface-pink p-4">
                <span class="font-semibold leading-[1.75] text-brand-pink">{v.title}</span>
                <span class="text-sm leading-[1.75] text-ink">{v.body}</span>
              </li>
            )}
          </For>
        </ul>
      </InfoCard>

      <InfoCta title="ร่วมเป็นส่วนหนึ่งกับ Charmiss" body="ค้นพบสินค้าที่ใช่สำหรับคุณ" actionLabel="ดูสินค้าทั้งหมด" href="/products" />
    </InfoPageShell>
  );
}
