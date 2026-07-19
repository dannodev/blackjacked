"use client";

import { useCallback, useEffect, useState } from "react";

export type PushNotificationStatus =
  | "loading"
  | "unsupported"
  | "blocked"
  | "disabled"
  | "enabled";

const SUBSCRIPTION_CHANGED_EVENT = "blackjacked:push-subscription-changed";

function supportsPush() {
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function saveSubscription(subscription: PushSubscription, reminderTime: string) {
  const json = subscription.toJSON();
  const response = await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: json.keys,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      reminderTime,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Could not enable reminders.");
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushNotificationStatus>("loading");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!supportsPush()) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("blocked");
      return;
    }
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    const enabled = Notification.permission === "granted" && Boolean(subscription);
    setStatus(enabled ? "enabled" : "disabled");
    localStorage.setItem("blackjacked.reminders", String(enabled));
  }, []);

  useEffect(() => {
    void refresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const handleSubscriptionChange = () => void refresh();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener(SUBSCRIPTION_CHANGED_EVENT, handleSubscriptionChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(SUBSCRIPTION_CHANGED_EVENT, handleSubscriptionChange);
    };
  }, [refresh]);

  const enable = useCallback(async (reminderTime: string) => {
    setBusy(true);
    try {
      if (!supportsPush()) {
        setStatus("unsupported");
        throw new Error("This browser does not support background reminders.");
      }
      if (Notification.permission === "denied") {
        setStatus("blocked");
        throw new Error("Notifications are blocked in browser settings.");
      }
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "disabled");
        throw new Error("Notification permission was not granted.");
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push reminders are not configured yet.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription()
        ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      await saveSubscription(subscription, reminderTime);
      localStorage.setItem("blackjacked.reminders", "true");
      localStorage.setItem("blackjacked.reminderTime", reminderTime);
      setStatus("enabled");
      window.dispatchEvent(new Event(SUBSCRIPTION_CHANGED_EVENT));
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      if (!supportsPush()) {
        setStatus("unsupported");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/notifications", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not disable reminders.");
        await subscription.unsubscribe();
      }
      localStorage.setItem("blackjacked.reminders", "false");
      setStatus(Notification.permission === "denied" ? "blocked" : "disabled");
      window.dispatchEvent(new Event(SUBSCRIPTION_CHANGED_EVENT));
    } finally {
      setBusy(false);
    }
  }, []);

  const syncReminderTime = useCallback(async (reminderTime: string) => {
    if (!supportsPush() || Notification.permission !== "granted") return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await saveSubscription(subscription, reminderTime);
    localStorage.setItem("blackjacked.reminderTime", reminderTime);
  }, []);

  return { status, busy, enable, disable, syncReminderTime, refresh };
}
