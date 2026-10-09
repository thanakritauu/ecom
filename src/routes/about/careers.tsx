import { For } from "solid-js";
import { BulletList, InfoCard, InfoPageShell, Prose } from "~/components/info/InfoPageShell";
import { Button } from "~/components/shared/Button";
import { CONTACT, INFO_PAGES } from "~/lib/siteInfo";

/** Mock openings — no HR backend; "สมัครงาน" opens an email to the contact address with the position in the subject. */
const OPENINGS = [
  { title: "Content Creator (Beauty)", team: "Marketing", type: "งานประจำ", location: "กรุงเทพฯ (ปทุมวัน)" },
  { title: "E-commerce Specialist", team: "Online Sales", type: "งานประจำ", location: "กรุงเทพฯ (ปทุมวัน)" },
  { title: "Graphic Designer", team: "Creative", type: "งานประจำ", location: "กรุงเทพฯ / Hybrid" },
  { title: "Customer Service (LINE OA)", team: "Customer Care", type: "งานประจำ", location: "กรุงเทพฯ (ปทุมวัน)" },
];

export default function CareersPage() {
  return (
    <InfoPageShell title={INFO_PAGES.careers.label} subtitle="มาร่วมสร้างความมั่นใจให้ผู้หญิงไทยไปกับ Charmiss">
      <InfoCard title="ทำไมต้อง Charmiss" id="careers-why">
        <Prose>
          <p>เราเป็นทีมเล็กที่คล่องตัว ทุกคนได้ลงมือทำและเห็นผลงานของตัวเองถึงมือลูกค้าจริง</p>
        </Prose>
        <BulletList
          check
          items={["ประกันสังคมและประกันสุขภาพกลุ่ม", "ส่วนลดพนักงานสำหรับสินค้า Charmiss", "โบนัสตามผลประกอบการ", "ทำงานแบบ Hybrid ในบางตำแหน่ง"]}
        />
      </InfoCard>

      <InfoCard title="ตำแหน่งที่เปิดรับ" id="careers-openings">
        <ul class="flex flex-col gap-3">
          <For each={OPENINGS}>
            {(job) => (
              <li class="flex flex-col gap-3 rounded-card border border-surface-gray p-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 flex-col gap-1">
                  <span class="font-semibold leading-[1.75] text-ink">{job.title}</span>
                  <span class="flex flex-wrap gap-x-3 text-sm leading-[1.75] text-ink-gray">
                    <span>{job.team}</span>
                    <span>{job.type}</span>
                    <span>{job.location}</span>
                  </span>
                </div>
                <Button variant="outline" size="sm" href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(`สมัครงาน: ${job.title}`)}`} class="shrink-0 self-start sm:self-auto">
                  สมัครงาน
                </Button>
              </li>
            )}
          </For>
        </ul>
        <p class="text-sm leading-[1.75] text-ink-gray">ไม่พบตำแหน่งที่ใช่? ส่งประวัติมาที่ {CONTACT.email} เราจะติดต่อกลับเมื่อมีตำแหน่งที่เหมาะสม</p>
      </InfoCard>
    </InfoPageShell>
  );
}
