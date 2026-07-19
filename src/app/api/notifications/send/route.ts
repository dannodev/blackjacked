import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import webpush from "web-push";

type SubscriptionRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; timezone: string; reminder_time: string; last_sent_date: string | null };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const authorized = Boolean(
    secret &&
    supplied.length === secret.length &&
    timingSafeEqual(Buffer.from(supplied), Buffer.from(secret)),
  );
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!url || !serviceKey || !publicKey || !privateKey || !subject) return NextResponse.json({ error: "Push is not configured" }, { status: 503 });

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  await admin.from("push_dispatches").delete().lt("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString());
  const { data } = await admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth, timezone, reminder_time, last_sent_date").eq("enabled", true);
  const userIds = [...new Set(((data ?? []) as SubscriptionRow[]).map((row) => row.user_id))];
  const { data: preferences } = userIds.length
    ? await admin.from("coach_preferences").select("user_id, focus_items").in("user_id", userIds)
    : { data: [] as { user_id: string; focus_items: string[] }[] };
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id, sex").in("id", userIds)
    : { data: [] as { id: string; sex: string }[] };
  const focusByUser = new Map((preferences ?? []).map((row) => [row.user_id, row.focus_items as string[]]));
  const sexByUser = new Map((profiles ?? []).map((row) => [row.id, row.sex as string]));
  let sent = 0;

  for (const row of (data ?? []) as SubscriptionRow[]) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: row.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
    const localDate = `${part("year")}-${part("month")}-${part("day")}`;
    const localTime = `${part("hour")}:${part("minute")}`;
    if (row.last_sent_date === localDate || localTime.slice(0, 2) !== row.reminder_time.slice(0, 2)) continue;
    try {
      const focus = (focusByUser.get(row.user_id) ?? ["water", "meals", "fitness_streak"])
        .filter((item) => sexByUser.get(row.user_id) === "male" || item !== "no_fap");
      await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify({ title: "Your daily Blackjacked check-in", body: dailyReminderBody(focus), url: "/dashboard#today-priorities" }));
      await admin.from("push_subscriptions").update({ last_sent_date: localDate }).eq("id", row.id);
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) await admin.from("push_subscriptions").delete().eq("id", row.id);
    }
  }
  return NextResponse.json({ sent });
}

function dailyReminderBody(items: string[]) {
  const labels = items.slice(0, 5).map((item) => {
    if (item === "water") return "water";
    if (item === "sleep") return "sleep";
    if (item === "meals") return "meals";
    if (item === "no_fap") return "your No fap challenge";
    if (item === "fitness_streak") return "your fitness streak";
    if (item.startsWith("exercise:")) return "your selected exercise";
    return null;
  }).filter(Boolean);
  return labels.length
    ? `Check in on ${labels.join(", ")}.`
    : "Your personalized Today check-in is ready.";
}
