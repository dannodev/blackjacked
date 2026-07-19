type PushPayload = { title?: string; body?: string; url?: string };
type WorkerPushEvent = Event & { data?: { json(): PushPayload }; waitUntil(promise: Promise<unknown>): void };
type WorkerClickEvent = Event & { notification: { data?: { url?: string }; close(): void }; waitUntil(promise: Promise<unknown>): void };
type WorkerWindowClient = { focus(): Promise<unknown>; navigate(url: string): Promise<unknown>; url: string };
type WorkerScope = {
  registration: { showNotification(title: string, options: NotificationOptions): Promise<void> };
  clients: { matchAll(options: { type: "window"; includeUncontrolled: boolean }): Promise<WorkerWindowClient[]>; openWindow(url: string): Promise<unknown> };
  location: Location;
  addEventListener(type: string, listener: (event: Event) => void): void;
};

const worker = self as unknown as WorkerScope;

worker.addEventListener("push", (event) => {
  const pushEvent = event as WorkerPushEvent;
  const payload = pushEvent.data?.json() ?? {};
  pushEvent.waitUntil(worker.registration.showNotification(payload.title ?? "Blackjacked", {
    body: payload.body ?? "A quick check-in keeps your plan moving.",
    icon: "/blackjacked-logo.png",
    badge: "/icon.svg",
    data: { url: payload.url ?? "/dashboard" },
  }));
});

worker.addEventListener("notificationclick", (event) => {
  const click = event as WorkerClickEvent;
  click.notification.close();
  const target = new URL(click.notification.data?.url ?? "/dashboard", worker.location.origin).href;
  click.waitUntil(worker.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
    const existing = windows.find((client) => client.url.startsWith(worker.location.origin));
    if (existing) {
      await existing.navigate(target);
      return existing.focus();
    }
    return worker.clients.openWindow(target);
  }));
});
