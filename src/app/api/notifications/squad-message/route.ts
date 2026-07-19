import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  squadId: z.string().uuid(),
  messageId: z.string().uuid(),
});

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message event." }, { status: 400 });

  const { data: message, error: messageError } = await supabase
    .from("squad_messages")
    .select("id, squad_id, user_id")
    .eq("id", parsed.data.messageId)
    .eq("squad_id", parsed.data.squadId)
    .single();
  if (messageError || message.user_id !== authData.user.id) {
    return NextResponse.json({ error: "Message event not allowed." }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!url || !serviceKey || !publicKey || !privateKey || !subject) {
    return NextResponse.json({ sent: 0, configured: false });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const eventKey = `squad-message:${message.id}`;
  const { error: claimError } = await admin.from("push_dispatches").insert({ event_key: eventKey });
  if (claimError?.code === "23505") return NextResponse.json({ sent: 0, duplicate: true });
  if (claimError) return NextResponse.json({ error: "Could not claim push event." }, { status: 502 });

  const { data: members, error: membersError } = await admin
    .from("squad_members")
    .select("user_id, display_name")
    .eq("squad_id", parsed.data.squadId);
  if (membersError) return NextResponse.json({ error: "Could not load recipients." }, { status: 502 });
  const senderName = members?.find((member) => member.user_id === authData.user!.id)?.display_name ?? "A teammate";
  const recipientIds = (members ?? [])
    .map((member) => member.user_id)
    .filter((userId) => userId !== authData.user!.id);
  if (recipientIds.length === 0) return NextResponse.json({ sent: 0 });

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", recipientIds)
    .eq("enabled", true);
  webpush.setVapidDetails(subject, publicKey, privateKey);
  let sent = 0;
  for (const row of (subscriptions ?? []) as SubscriptionRow[]) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify({
          title: `${senderName} sent a squad message`,
          body: "Open Blackjacked to read and reply.",
          url: "/squad",
        }),
      );
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", row.id);
      }
    }
  }
  return NextResponse.json({ sent, configured: true });
}
