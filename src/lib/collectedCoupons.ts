import { createSignal, onMount } from "solid-js";
import { isServer } from "solid-js/web";

/**
 * Coupons a signed-in shopper has collected ("เก็บเลย" on Home / /coupons, or
 * used at Checkout, which counts as collecting it). One module-level signal,
 * so Home and Checkout's "เก็บแล้ว" tab always agree; mirrored to this
 * browser's localStorage (mock: no account API yet, one member persona).
 */
const STORAGE_KEY = "charmiss:collected-coupons:v1";

const [codes, setCodes] = createSignal<Set<string>>(new Set());
let loaded = false;

function load() {
  if (isServer || loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setCodes(new Set(JSON.parse(raw) as string[]));
  } catch {
    // storage unavailable: collected for this visit only.
  }
}

function add(more: string[]) {
  const next = new Set(codes());
  for (const code of more) next.add(code);
  setCodes(next);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {}
}

/** Read after mount (SSR and the first paint show nothing collected). */
export function useCollectedCoupons() {
  onMount(load);
  return {
    collected: codes,
    isCollected: (code: string) => codes().has(code),
    collect: (code: string | string[]) => add(Array.isArray(code) ? code : [code]),
  };
}
