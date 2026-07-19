import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const EXPORT_TABLES = [
  "profiles",
  "meals",
  "exercise_logs",
  "daily_summary",
  "weight_logs",
  "recipes",
  "weekly_menu",
  "notification_prefs",
  "coach_preferences",
  "streaks",
  "squad_members",
  "squad_activity",
  "squad_messages",
] as const;

function signature(params: Record<string, string | number | boolean>, secret: string) {
  const payload = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(`${payload}${secret}`).digest("hex");
}

async function destroyAvatar(publicId: string | null) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!publicId || !cloudName || !apiKey || !apiSecret) return;

  const timestamp = Math.round(Date.now() / 1000);
  const params = { invalidate: true, public_id: publicId, timestamp };
  const form = new FormData();
  form.append("public_id", publicId);
  form.append("invalidate", "true");
  form.append("timestamp", String(timestamp));
  form.append("api_key", apiKey);
  form.append("signature", signature(params, apiSecret));
  await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body: form,
  });
}

async function authenticate() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, user: data.user };
}

export async function GET() {
  const auth = await authenticate();
  if (!auth) return NextResponse.json({ error: "Sign in to export data." }, { status: 401 });

  const exported: Record<string, unknown> = {};
  for (const table of EXPORT_TABLES) {
    const selection = table === "meals" ? "*, meal_items(*)" : "*";
    let query = auth.supabase.from(table).select(selection);
    if (["squad_members", "squad_activity", "squad_messages"].includes(table)) {
      query = query.eq("user_id", auth.user.id);
    }
    const { data, error } = await query;
    exported[table] = error ? { unavailable: true } : data;
  }

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    account: { id: auth.user.id, email: auth.user.email, created_at: auth.user.created_at },
    data: exported,
  });
}

export async function DELETE() {
  const auth = await authenticate();
  if (!auth) return NextResponse.json({ error: "Sign in to delete your account." }, { status: 401 });

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("avatar_public_id")
    .eq("id", auth.user.id)
    .maybeSingle();

  const { data: photos } = await auth.supabase.storage
    .from("progress-photos")
    .list(auth.user.id, { limit: 1000 });
  if (photos?.length) {
    await auth.supabase.storage
      .from("progress-photos")
      .remove(photos.map((photo) => `${auth.user.id}/${photo.name}`));
  }
  await destroyAvatar((profile as { avatar_public_id?: string | null } | null)?.avatar_public_id ?? null);

  const { error } = await auth.supabase.rpc("delete_current_account");
  if (error) {
    console.error("Account deletion failed", error.message);
    return NextResponse.json({ error: "Could not delete the account." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
