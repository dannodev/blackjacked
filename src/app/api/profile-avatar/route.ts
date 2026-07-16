import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_UPLOAD_BYTES = 600_000;

type CloudinaryResponse = {
  secure_url?: string;
  public_id?: string;
  bytes?: number;
  error?: { message?: string };
};

type ProfileAvatarRow = {
  avatar_url: string | null;
  avatar_public_id: string | null;
};

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

function cloudinaryAuth(apiKey: string, apiSecret: string) {
  return Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
}

function cloudinarySignature(
  params: Record<string, string | number | boolean>,
  apiSecret: string,
) {
  const payload = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

async function deleteCloudinaryImage(
  config: NonNullable<ReturnType<typeof cloudinaryConfig>>,
  publicId?: string | null,
) {
  if (!publicId) return;

  const timestamp = Math.round(Date.now() / 1000);
  const signatureParams = {
    invalidate: true,
    public_id: publicId,
    timestamp,
  };
  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("invalidate", "true");
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", config.apiKey);
  formData.append(
    "signature",
    cloudinarySignature(signatureParams, config.apiSecret),
  );

  await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
    method: "POST",
    body: formData,
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json({ error: "Sign in to upload a profile picture." }, { status: 401 });
  }

  const config = cloudinaryConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Cloudinary is not configured yet." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid avatar upload request." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image file." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images are allowed." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Image is too large after compression." },
      { status: 400 },
    );
  }

  const { data: oldProfile, error: profileError } = await supabase
    .from("profiles")
    .select("avatar_url, avatar_public_id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const uploadForm = new FormData();
  uploadForm.append("file", file);
  uploadForm.append("folder", `blackjacked/avatars/${data.user.id}`);
  uploadForm.append("resource_type", "image");
  uploadForm.append("tags", "blackjacked,profile-avatar");
  uploadForm.append("overwrite", "false");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${cloudinaryAuth(config.apiKey, config.apiSecret)}`,
      },
      body: uploadForm,
    },
  );

  const result = (await response.json()) as CloudinaryResponse;

  if (!response.ok || !result.secure_url || !result.public_id) {
    return NextResponse.json(
      { error: result.error?.message ?? "Cloudinary upload failed." },
      { status: response.status || 502 },
    );
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      avatar_url: result.secure_url,
      avatar_public_id: result.public_id,
    })
    .eq("id", data.user.id);

  if (updateError) {
    await deleteCloudinaryImage(config, result.public_id);
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await deleteCloudinaryImage(
    config,
    (oldProfile as ProfileAvatarRow | null)?.avatar_public_id,
  );

  return NextResponse.json({
    avatar_url: result.secure_url,
    avatar_public_id: result.public_id,
    bytes: result.bytes,
  });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json({ error: "Sign in to remove a profile picture." }, { status: 401 });
  }

  const config = cloudinaryConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Cloudinary is not configured yet." },
      { status: 503 },
    );
  }

  const { data: oldProfile, error: profileError } = await supabase
    .from("profiles")
    .select("avatar_url, avatar_public_id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: null, avatar_public_id: null })
    .eq("id", data.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await deleteCloudinaryImage(
    config,
    (oldProfile as ProfileAvatarRow | null)?.avatar_public_id,
  );

  return NextResponse.json({ avatar_url: null, avatar_public_id: null });
}
