import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import {
  PushNotifications,
  type PushNotificationSchema,
  type ActionPerformed,
  type Token,
} from "@capacitor/push-notifications";
import { emitStoreUpdate } from "@/hooks/use-live-data";
import { loadAlertPrefs } from "@/lib/alert-notifications";
import { apiRegisterPushToken, apiUnregisterPushToken } from "@/lib/api";
import { store, type AppNotification } from "@/lib/store";

const PUSH_TOKEN_KEY = "pos_mobile_push_token";
const PUSH_INITIALIZED_KEY = "pos_mobile_push_initialized";

let listenersBound = false;
let loopTimer: number | null = null;
let audioContext: AudioContext | null = null;

function isNativeMobileBuild(): boolean {
  return Capacitor.isNativePlatform();
}

function stopForegroundLoopingSound(): void {
  if (loopTimer !== null) {
    window.clearInterval(loopTimer);
    loopTimer = null;
  }
  if (audioContext) {
    void audioContext.close().catch(() => undefined);
    audioContext = null;
  }
}

function playToneBurst(context: AudioContext): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.35);
}

function playForegroundLoopingSound(): void {
  if (typeof window === "undefined") return;
  stopForegroundLoopingSound();

  try {
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const context = new AudioCtor();
    audioContext = context;
    playToneBurst(context);
    loopTimer = window.setInterval(() => {
      if (!audioContext) return;
      playToneBurst(audioContext);
    }, 1100);

    window.setTimeout(() => {
      stopForegroundLoopingSound();
    }, 12000);
  } catch {
    stopForegroundLoopingSound();
  }
}

function storePushToken(token: string): void {
  localStorage.setItem(PUSH_TOKEN_KEY, token);
}

export function getStoredMobilePushToken(): string | null {
  return localStorage.getItem(PUSH_TOKEN_KEY);
}

function toAppNotification(notification: PushNotificationSchema): AppNotification {
  return {
    id: String(notification.id ?? `push-${Date.now()}`),
    title: notification.title?.trim() || "Notification",
    message: notification.body?.trim() || "You have a new alert.",
    createdAt: new Date().toISOString(),
    type: "info",
    read: false,
  };
}

function saveIncomingNotification(notification: AppNotification): void {
  const current = store.getNotifications();
  if (current.some((item) => item.id === notification.id)) return;
  store.saveNotifications([notification, ...current]);
  emitStoreUpdate();
}

async function ensureAndroidChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;

  await PushNotifications.createChannel({
    id: "pos-alerts",
    name: "POS Alerts",
    description: "Operational alerts and push notifications",
    importance: 5,
    visibility: 1,
    sound: "default",
  });
}

async function bindPushListeners(): Promise<void> {
  if (listenersBound) return;

  await PushNotifications.addListener("registration", (token: Token) => {
    storePushToken(token.value);
    const platform = Capacitor.getPlatform();
    const normalizedPlatform = platform === "android" || platform === "ios" ? platform : "web";

    void apiRegisterPushToken({
      token: token.value,
      platform: normalizedPlatform,
      device_name: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      app_version: "1.0.0",
    }).catch(() => undefined);
  });

  await PushNotifications.addListener("registrationError", (error) => {
    console.error("Push registration failed", error);
  });

  await PushNotifications.addListener("pushNotificationReceived", (notification: PushNotificationSchema) => {
    saveIncomingNotification(toAppNotification(notification));
    const prefs = loadAlertPrefs();
    if (prefs.pushEnabled) {
      playForegroundLoopingSound();
    }
  });

  await PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
    saveIncomingNotification(toAppNotification(action.notification));
    stopForegroundLoopingSound();
  });

  CapacitorApp.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      stopForegroundLoopingSound();
    }
  });

  listenersBound = true;
}

export async function initializeMobilePush(enabled: boolean): Promise<void> {
  if (!isNativeMobileBuild()) return;

  if (!enabled) {
    const savedToken = getStoredMobilePushToken();
    if (savedToken) {
      void apiUnregisterPushToken(savedToken).catch(() => undefined);
    }
    localStorage.removeItem(PUSH_INITIALIZED_KEY);
    return;
  }

  const existing = localStorage.getItem(PUSH_INITIALIZED_KEY);
  if (existing === "1" && listenersBound) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") {
    throw new Error("Push notification permission was not granted.");
  }

  await ensureAndroidChannel();
  await bindPushListeners();
  await PushNotifications.register();
  localStorage.setItem(PUSH_INITIALIZED_KEY, "1");
}