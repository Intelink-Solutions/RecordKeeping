import { emitStoreUpdate } from "@/hooks/use-live-data";
import { store, type AppNotification } from "@/lib/store";

export type AlertPrefs = {
  lowStock: boolean;
  duePayments: boolean;
  salesSummary: boolean;
  pushEnabled: boolean;
};

const ALERT_PREFS_KEY = "pos_alert_prefs";
const ALERT_META_KEY = "pos_alert_meta";

const defaultAlertPrefs: AlertPrefs = {
  lowStock: true,
  duePayments: true,
  salesSummary: false,
  pushEnabled: true,
};

type AlertMeta = {
  lowStockSignature?: string;
  dueSignature?: string;
  salesSummaryDate?: string;
};

function loadAlertMeta(): AlertMeta {
  try {
    const raw = localStorage.getItem(ALERT_META_KEY);
    return raw ? (JSON.parse(raw) as AlertMeta) : {};
  } catch {
    return {};
  }
}

function saveAlertMeta(meta: AlertMeta): void {
  localStorage.setItem(ALERT_META_KEY, JSON.stringify(meta));
}

export function loadAlertPrefs(): AlertPrefs {
  try {
    const raw = localStorage.getItem(ALERT_PREFS_KEY);
    if (!raw) return defaultAlertPrefs;
    return { ...defaultAlertPrefs, ...(JSON.parse(raw) as Partial<AlertPrefs>) };
  } catch {
    return defaultAlertPrefs;
  }
}

async function maybeShowBrowserNotification(title: string, body: string, enabled: boolean): Promise<void> {
  if (!enabled || typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: title });
  } catch {
    // Ignore browser notification failures.
  }
}

function playNotificationSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.setValueAtTime(660, context.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
    oscillator.onended = () => {
      void context.close().catch(() => undefined);
    };
  } catch {
    // Ignore audio failures.
  }
}

async function appendNotification(notification: AppNotification, pushEnabled: boolean): Promise<void> {
  const current = store.getNotifications();
  if (current.some((item) => item.id === notification.id)) return;

  const next = [notification, ...current].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  store.saveNotifications(next);
  emitStoreUpdate();
  playNotificationSound();
  await maybeShowBrowserNotification(notification.title, notification.message, pushEnabled);
}

export async function evaluateAlertNotifications(): Promise<void> {
  const prefs = loadAlertPrefs();
  const meta = loadAlertMeta();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (prefs.lowStock) {
    const lowStockProducts = store.getProducts().filter((product) => product.stock <= product.alertQty);
    const signature = lowStockProducts.map((product) => `${product.id}:${product.stock}`).sort().join("|");

    if (lowStockProducts.length > 0 && meta.lowStockSignature !== signature) {
      const preview = lowStockProducts.slice(0, 3).map((product) => product.name).join(", ");
      await appendNotification({
        id: `alert-low-stock-${signature}`,
        title: `Low stock alert (${lowStockProducts.length})`,
        message: `${preview}${lowStockProducts.length > 3 ? " and more" : ""} need restocking.`,
        createdAt: now.toISOString(),
        type: "warning",
        read: false,
      }, prefs.pushEnabled);
      meta.lowStockSignature = signature;
    }

    if (lowStockProducts.length === 0) {
      delete meta.lowStockSignature;
    }
  }

  if (prefs.duePayments) {
    const customerDue = store.getCustomers().reduce((sum, customer) => sum + customer.due, 0);
    const supplierDue = store.getSuppliers().reduce((sum, supplier) => sum + supplier.due, 0);
    const dueCount = store.getCustomers().filter((customer) => customer.due > 0).length + store.getSuppliers().filter((supplier) => supplier.due > 0).length;
    const signature = `${customerDue}:${supplierDue}:${dueCount}`;

    if (dueCount > 0 && meta.dueSignature !== signature) {
      await appendNotification({
        id: `alert-due-${signature}`,
        title: `Due payment reminder (${dueCount})`,
        message: `Customer due: ${customerDue.toFixed(2)} | Supplier due: ${supplierDue.toFixed(2)}.`,
        createdAt: now.toISOString(),
        type: "warning",
        read: false,
      }, prefs.pushEnabled);
      meta.dueSignature = signature;
    }

    if (dueCount === 0) {
      delete meta.dueSignature;
    }
  }

  if (prefs.salesSummary && now.getHours() >= 18 && meta.salesSummaryDate !== today) {
    const todaySales = store.getSales().filter((sale) => sale.date?.slice(0, 10) === today);
    const total = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    await appendNotification({
      id: `alert-sales-summary-${today}`,
      title: "Daily sales summary",
      message: `${todaySales.length} sale(s) recorded today. Total sales: ${total.toFixed(2)}.`,
      createdAt: now.toISOString(),
      type: "info",
      read: false,
    }, prefs.pushEnabled);
    meta.salesSummaryDate = today;
  }

  saveAlertMeta(meta);
}