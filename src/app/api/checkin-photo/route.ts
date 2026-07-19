import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_UPLOAD_BYTES = 1_500_000;
const BUCKET = "progress-photos";

async function authenticatedClient() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, user: data.user };
}

export async function POST(request: Request) {
  const auth = await authenticatedClient();
  if (!auth) {
    return NextResponse.json({ error: "Sign in to upload photos." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Choose a valid image." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image is too large after compression." }, { status: 400 });
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await auth.supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: "3600" });

  if (uploadError) {
    console.error("Private progress-photo upload failed", uploadError.message);
    return NextResponse.json({ error: "Photo upload failed. Try again." }, { status: 502 });
  }

  const { data: signed, error: signError } = await auth.supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (signError) {
    await auth.supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: "Could not protect the uploaded photo." }, { status: 502 });
  }

  return NextResponse.json({ url: signed.signedUrl, publicId: path });
}

export async function DELETE(request: Request) {
  const auth = await authenticatedClient();
  if (!auth) {
    return NextResponse.json({ error: "Sign in to delete photos." }, { status: 401 });
  }

  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!path.startsWith(`${auth.user.id}/`) || path.includes("..")) {
    return NextResponse.json({ error: "Invalid photo path." }, { status: 400 });
  }

  const { error } = await auth.supabase.storage.from(BUCKET).remove([path]);
  if (error) return NextResponse.json({ error: "Could not delete photo." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
