import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().min(20).max(500), auth: z.string().min(10).max(500) }),
  timezone: z.string().min(1).max(100),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in to enable reminders." }, { status: 401 });
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });

  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: data.user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    timezone: parsed.data.timezone,
    reminder_time: parsed.data.reminderTime,
    enabled: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: "Could not save reminder." }, { status: 502 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in to disable reminders." }, { status: 401 });
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", data.user.id);
  if (error) return NextResponse.json({ error: "Could not disable reminder." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
