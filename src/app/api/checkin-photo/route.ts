import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_UPLOAD_BYTES = 1_500_000;

type CloudinaryResponse = {
  secure_url?: string;
  public_id?: string;
  bytes?: number;
  error?: { message?: string };
};

function missingCloudinaryConfig() {
  return !(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json({ error: "Sign in to upload photos." }, { status: 401 });
  }

  if (missingCloudinaryConfig()) {
    return NextResponse.json(
      { error: "Cloudinary is not configured yet." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
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
    `${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`,
  ).toString("base64");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
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
    return NextResponse.json(
      { error: result.error?.message ?? "Cloudinary upload failed." },
      { status: response.status || 502 },
    );
  }

  return NextResponse.json({
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
  });
}
