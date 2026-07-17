import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_UPLOAD_BYTES = 1_500_000;

type CloudinaryResponse = {
  secure_url?: string;
  public_id?: string;
  bytes?: number;
  error?: { message?: string };
};

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json({ error: "Sign in to upload photos." }, { status: 401 });
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
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
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

  const uploadForm = new FormData();
  uploadForm.append("file", file);
  uploadForm.append("folder", `blackjacked/checkins/${data.user.id}`);
  uploadForm.append("resource_type", "image");
  uploadForm.append("tags", "blackjacked,progress-checkin");
  uploadForm.append("overwrite", "false");

  const credentials = Buffer.from(
    `${config.apiKey}:${config.apiSecret}`,
  ).toString("base64");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      body: uploadForm,
    },
  );

  const result = (await response.json()) as CloudinaryResponse;

  if (!response.ok || !result.secure_url) {
    console.error("Cloudinary check-in upload failed", result.error);
    return NextResponse.json(
      { error: "Photo upload failed. Try again in a moment." },
      { status: response.status || 502 },
    );
  }

  return NextResponse.json({
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
  });
}
