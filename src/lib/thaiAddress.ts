/**
 * Thai address lookup for the checkout address form: province → district
 * (เขต/อำเภอ) → sub-district (แขวง/ตำบล) → postal code, so each dropdown only
 * offers what belongs to the level above it.
 *
 * Data: `data/thaiAddress.json`, reduced from kongvut/thai-province-data (MIT,
 * see `data/thaiAddress.LICENSE.md`) — 77 provinces, 930 districts, 7,436
 * sub-districts, each with its postal code. Names are stored WITHOUT their
 * เขต/แขวง/อำเภอ/ตำบล prefix (`formatAddress` adds the right one back).
 * ~58 KB gzipped, so it's a lazy chunk: only fetched when an address form
 * mounts, never on other pages.
 */
type SubDistrictRow = [name: string, postalCode: string];
type DistrictRow = [name: string, subDistricts: SubDistrictRow[]];
type ProvinceRow = [name: string, districts: DistrictRow[]];

export type ThaiAddressData = ProvinceRow[];

let loading: Promise<ThaiAddressData> | undefined;
export const loadThaiAddressData = () =>
  (loading ??= import("./data/thaiAddress.json").then((m) => m.default as unknown as ThaiAddressData));

const unique = (list: string[]) => [...new Set(list)];

/** "เขตวัฒนา" / "อ.เมือง" / "แขวงคลองตันเหนือ" → bare name, to match the dataset (saved addresses may carry a prefix). */
export const stripAreaPrefix = (value: string) => value.replace(/^(เขต|แขวง|อำเภอ|ตำบล|อ\.|ต\.)\s*/, "").trim();

const provinceRow = (data: ThaiAddressData, province: string) => data.find(([name]) => name === province);
const districtRow = (data: ThaiAddressData, province: string, district: string) =>
  provinceRow(data, province)?.[1].find(([name]) => name === district);

export const districtsOf = (data: ThaiAddressData, province: string) => provinceRow(data, province)?.[1].map(([name]) => name) ?? [];

export const subDistrictsOf = (data: ThaiAddressData, province: string, district: string) =>
  districtRow(data, province, district)?.[1].map(([name]) => name) ?? [];

/** Postal codes for the current pick: the sub-district's own code once one is chosen, else every code in the district. */
export function postalCodesOf(data: ThaiAddressData, province: string, district: string, subDistrict: string): string[] {
  const subs = districtRow(data, province, district)?.[1] ?? [];
  const picked = subDistrict ? subs.filter(([name]) => name === subDistrict) : subs;
  return unique(picked.map(([, code]) => code)).sort();
}
