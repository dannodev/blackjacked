import { NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const MODELS = ["gemini-3.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash"] as const;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 20_000;
const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

const importedMenuSchema = z.object({
  meals: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().max(1000),
    type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
    kcal: z.number().finite().min(0).max(5000),
    protein_g: z.number().finite().min(0).max(500),
    carb_g: z.number().finite().min(0).max(1000),
    fat_g: z.number().finite().min(0).max(500),
    meal_slot: z.string().max(80),
    emoji: z.string().max(16),
  })).max(80),
});

const menuImportSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    meals: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          type: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["breakfast", "lunch", "dinner", "snack"],
          },
          kcal: { type: SchemaType.NUMBER },
          protein_g: { type: SchemaType.NUMBER },
          carb_g: { type: SchemaType.NUMBER },
          fat_g: { type: SchemaType.NUMBER },
          meal_slot: { type: SchemaType.STRING },
          emoji: { type: SchemaType.STRING },
        },
        required: [
          "name",
          "description",
          "type",
          "kcal",
          "protein_g",
          "carb_g",
          "fat_g",
          "meal_slot",
          "emoji",
        ],
      },
    },
  },
  required: ["meals"],
};

function getGeminiKey() {
  return process.env.GEMINI_API_KEY;
}

function cleanMimeType(file: File) {
  return file.type || "application/octet-stream";
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json({ error: "Sign in to import a menu." }, { status: 401 });
  }

  const key = getGeminiKey();
  if (!key) {
    return NextResponse.json({ error: "Gemini is not configured." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid menu import request." }, { status: 400 });
  }

  const fileValue = formData.get("file");
  const textValue = formData.get("text");
  const languageValue = formData.get("language");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  const rawText = typeof textValue === "string" ? textValue.trim() : "";
  const language = languageValue === "es" ? "es" : "en";
  const menuText = rawText.slice(0, MAX_TEXT_CHARS);

  if (!file && !menuText) {
    return NextResponse.json(
      { error: "Upload a menu file or paste menu text first." },
      { status: 400 },
    );
  }

  if (file) {
    const mimeType = cleanMimeType(file);
    if (!ACCEPTED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Use a PDF, clear image, or TXT menu file." },
        { status: 415 },
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Menu file is too large. Keep it under 8 MB." },
        { status: 413 },
      );
    }
  }

  const { data: allowed, error: quotaError } = await supabase.rpc("consume_ai_quota", {
    daily_limit: 30,
  });
  if (quotaError || !allowed) {
    return NextResponse.json({ error: "Daily AI limit reached." }, { status: 429 });
  }

  const prompt = `Extract meals from this user menu and return clean structured JSON.
Rules:
- Return every clear meal option you can find.
- Use type as exactly one of: breakfast, lunch, dinner, snack.
- If macros are listed, use them. If they are missing, estimate reasonable kcal, protein_g, carb_g, and fat_g.
- Put recipe ingredients or preparation notes in description.
- Keep names short and user-friendly.
- Use a single food emoji per meal.
- Return at most 80 meals.
- Return meal names, descriptions, and meal_slot in ${language === "es" ? "Spanish" : "English"}.
${menuText ? `\nPasted menu text:\n${menuText}` : ""}`;

  try {
    const client = new GoogleGenerativeAI(key);
    const filePart = file
      ? {
          inlineData: {
            mimeType: cleanMimeType(file),
            data: Buffer.from(await file.arrayBuffer()).toString("base64"),
          },
        }
      : null;

    let lastError: unknown = null;

    for (const modelName of MODELS) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: menuImportSchema,
          },
        });
        const result = await model.generateContent(
          filePart ? [{ text: prompt }, filePart] : prompt,
        );
        const text = result.response.text();
        const parsed = importedMenuSchema.safeParse(JSON.parse(text));
        if (!parsed.success) {
          lastError = new Error(`${modelName} returned invalid menu values.`);
          continue;
        }

        const tokens = result.response.usageMetadata?.totalTokenCount ?? 0;
        void supabase.rpc("record_ai_tokens", { tokens_used: tokens });

        return NextResponse.json({
          data: parsed.data,
          model: modelName,
          tokens,
        });
      } catch (error) {
        lastError = error;
      }
    }

    console.error("Gemini menu import failed", lastError);
    return NextResponse.json(
      { error: "Menu import is temporarily unavailable. Try again in a moment." },
      { status: 502 },
    );
  } catch (error) {
    console.error("Gemini menu import failed", error);
    return NextResponse.json(
      { error: "Menu import is temporarily unavailable. Try again in a moment." },
      { status: 502 },
    );
  }
}
