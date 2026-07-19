import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_BYTES = 4 * 1024 * 1024;
const resultSchema = z.object({
  ingredients: z.array(z.object({ name: z.string().min(1).max(120), quantity: z.number().min(0).max(10000), unit: z.string().min(1).max(30), kcal: z.number().min(0).max(10000), protein_g: z.number().min(0).max(1000), fat_g: z.number().min(0).max(1000), carb_g: z.number().min(0).max(2000) })).min(1).max(50),
  total_kcal: z.number().min(0).max(20000), total_protein_g: z.number().min(0).max(2000), total_fat_g: z.number().min(0).max(2000), total_carb_g: z.number().min(0).max(4000), summary: z.string().min(1).max(500),
});
const responseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    ingredients: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { name: { type: SchemaType.STRING }, quantity: { type: SchemaType.NUMBER }, unit: { type: SchemaType.STRING }, kcal: { type: SchemaType.NUMBER }, protein_g: { type: SchemaType.NUMBER }, fat_g: { type: SchemaType.NUMBER }, carb_g: { type: SchemaType.NUMBER } }, required: ["name", "quantity", "unit", "kcal", "protein_g", "fat_g", "carb_g"] } },
    total_kcal: { type: SchemaType.NUMBER }, total_protein_g: { type: SchemaType.NUMBER }, total_fat_g: { type: SchemaType.NUMBER }, total_carb_g: { type: SchemaType.NUMBER }, summary: { type: SchemaType.STRING },
  },
  required: ["ingredients", "total_kcal", "total_protein_g", "total_fat_g", "total_carb_g", "summary"],
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in to analyze meals." }, { status: 401 });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Gemini is not configured." }, { status: 503 });
  const { data: allowed } = await supabase.rpc("consume_ai_quota", { daily_limit: 30 });
  if (!allowed) return NextResponse.json({ error: "Daily AI limit reached." }, { status: 429 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const description = String(form?.get("description") ?? "").trim().slice(0, 1000);
  const language = form?.get("language") === "es" ? "Spanish" : "English";
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > MAX_BYTES) return NextResponse.json({ error: "Choose a JPG, PNG, or WebP image under 4 MB." }, { status: 400 });

  const model = new GoogleGenerativeAI(key).getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json", responseSchema } });
  try {
    const result = await model.generateContent([
      { text: `Estimate the visible meal ingredients, portions, calories, and macros. Use ${language}. User context: ${description || "none"}. Be conservative and say estimated in the summary.` },
      { inlineData: { mimeType: file.type, data: Buffer.from(await file.arrayBuffer()).toString("base64") } },
    ]);
    const parsed = resultSchema.safeParse(JSON.parse(result.response.text()));
    if (!parsed.success) throw new Error("Unsafe result");
    const tokens = result.response.usageMetadata?.totalTokenCount ?? 0;
    void supabase.rpc("record_ai_tokens", { tokens_used: tokens });
    return NextResponse.json({ data: parsed.data, model: "gemini-2.5-flash", tokens });
  } catch (error) {
    console.error("Meal photo analysis failed", error);
    return NextResponse.json({ error: "Could not analyze that photo. Try a clearer overhead image." }, { status: 502 });
  }
}
