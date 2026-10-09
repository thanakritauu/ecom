import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";

export type AdminNotification = {
  id: string;
  title: string;
  description: string;
  /** epoch ms — frozen at first generation (see `buildMockNotifications`), not recomputed on every load. */
  createdAt: number;
  read: boolean;
  /** Admin page the item opens when clicked. */
  href?: string;
};

/** v2: seeds point at real orders/pages and no longer mention cut features (review moderation). v3: the Campaigns module is gone, so the "campaign ending" seed points at a หน้าแคมเปญ instead. */
const STORAGE_KEY = "charmiss:admin:notifications:v3";

/**
 * Fixed string-literal ids and offsets from a single `Date.now()` capture —
 * same "baseline-builder purity" rule as `buildHomepageSectionBaseline()`/
 * `buildMockBanners()`/etc: this can be called once to seed localStorage and
 * must not depend on when in the session it happens to run.
 */
function buildMockNotifications(): AdminNotification[] {
  const now = Date.now();
  return [
    {
      id: "notif-001",
      title: "มีคำสั่งซื้อใหม่",
      description: "คำสั่งซื้อ ORD-2026-1035 รอลูกค้าชำระเงิน",
      createdAt: now - 12 * 60 * 1000,
      read: false,
      href: "/admin/orders/ORD-2026-1035",
    },
    {
      id: "notif-005",
      title: "ชำระเงินไม่สำเร็จ",
      description: "บัตรของคำสั่งซื้อ ORD-2026-1034 ถูกปฏิเสธ ลูกค้ายังชำระใหม่ได้ภายใน 24 ชั่วโมง",
      createdAt: now - 45 * 60 * 1000,
      read: false,
      href: "/admin/orders/ORD-2026-1034",
    },
    {
      id: "notif-002",
      title: "สินค้าใกล้หมดสต๊อก",
      description: "Charmiss x Sanrio Blooming Heart Lip Gloss เหลือน้อยกว่า 10 ชิ้น",
      createdAt: now - 3 * 60 * 60 * 1000,
      read: false,
      href: "/admin/inventory",
    },
    {
      id: "notif-003",
      title: "หน้าแคมเปญกำลังจะสิ้นสุด",
      description: "หน้าแคมเปญ Charmiss x Sanrio Collection จะสิ้นสุดวันที่ 31 ต.ค. 2569",
      createdAt: now - 26 * 60 * 60 * 1000,
      read: true,
      href: "/admin/promotion-pages/promo-page-003",
    },
  ];
}

function normalizeNotification(n: Partial<AdminNotification>): AdminNotification {
  return {
    id: n.id ?? "",
    title: n.title ?? "",
    description: n.description ?? "",
    createdAt: typeof n.createdAt === "number" ? n.createdAt : Date.now(),
    read: n.read ?? false,
    href: typeof n.href === "string" ? n.href : undefined,
  };
}

function readStored(): AdminNotification[] {
  if (isServer) return buildMockNotifications();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildMockNotifications();
    return (JSON.parse(raw) as AdminNotification[]).map(normalizeNotification);
  } catch {
    return buildMockNotifications();
  }
}

function persist(list: AdminNotification[]) {
  if (isServer) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // storage can be unavailable — state just stays in-memory for this tab.
  }
}

type AdminNotificationContextValue = {
  ready: Accessor<boolean>;
  notifications: Accessor<AdminNotification[]>;
  unreadCount: Accessor<number>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
};

const AdminNotificationContext = createContext<AdminNotificationContextValue>();

/**
 * Notification state with no backend: a signal persisted to localStorage so
 * read/unread survives refresh.
 * Same SSR-safe pattern as every other admin store: deterministic baseline on
 * server + first client render, real localStorage read deferred to onMount.
 */
export function AdminNotificationProvider(props: { children: JSX.Element }) {
  const [notifications, setNotifications] = createSignal<AdminNotification[]>(buildMockNotifications());
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    setNotifications(readStored());
    setReady(true);
  });

  const unreadCount = () => notifications().filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((list) => {
      const next = list.map((n) => (n.id === id ? { ...n, read: true } : n));
      persist(next);
      return next;
    });
  };

  const markAllAsRead = () => {
    setNotifications((list) => {
      const next = list.map((n) => (n.read ? n : { ...n, read: true }));
      persist(next);
      return next;
    });
  };

  return (
    <AdminNotificationContext.Provider value={{ ready, notifications, unreadCount, markAsRead, markAllAsRead }}>
      {props.children}
    </AdminNotificationContext.Provider>
  );
}

export function useAdminNotifications() {
  const ctx = useContext(AdminNotificationContext);
  if (!ctx) throw new Error("useAdminNotifications must be used within AdminNotificationProvider");
  return ctx;
}

/** Coarse Thai relative-time label — good enough for mock notification timestamps, not a full i18n date library. */
export function formatRelativeTimeTH(epochMs: number): string {
  const diffMs = Date.now() - epochMs;
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}
