import { NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const MODELS = ["gemini-3.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash"] as const;
const MAX_PROMPT_CHARS = 12_000;
const AI_ACTIONS = ["food", "menu", "exercise", "insight"] as const;

const foodResultSchema = z.object({
  ingredients: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    quantity: z.number().finite().min(0).max(10000),
    unit: z.string().trim().min(1).max(30),
    kcal: z.number().finite().min(0).max(10000),
    protein_g: z.number().finite().min(0).max(1000),
    fat_g: z.number().finite().min(0).max(1000),
    carb_g: z.number().finite().min(0).max(2000),
  })).min(1).max(50),
  total_kcal: z.number().finite().min(0).max(20000),
  total_protein_g: z.number().finite().min(0).max(2000),
  total_fat_g: z.number().finite().min(0).max(2000),
  total_carb_g: z.number().finite().min(0).max(4000),
  summary: z.string().trim().min(1).max(500),
});

type AiAction = (typeof AI_ACTIONS)[number];

type AiRequest = {
  action: AiAction;
  prompt: string;
};

function getGeminiKey() {
  return process.env.GEMINI_API_KEY;
}

function isAiAction(value: unknown): value is AiAction {
  return typeof value === "string" && AI_ACTIONS.includes(value as AiAction);
}

const foodResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    ingredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER },
          unit: { type: SchemaType.STRING },
          kcal: { type: SchemaType.NUMBER },
          protein_g: { type: SchemaType.NUMBER },
          fat_g: { type: SchemaType.NUMBER },
          carb_g: { type: SchemaType.NUMBER },
        },
        required: [
          "name",
          "quantity",
          "unit",
          "kcal",
          "protein_g",
          "fat_g",
          "carb_g",
        ],
      },
    },
    total_kcal: { type: SchemaType.NUMBER },
    total_protein_g: { type: SchemaType.NUMBER },
    total_fat_g: { type: SchemaType.NUMBER },
    total_carb_g: { type: SchemaType.NUMBER },
    summary: { type: SchemaType.STRING },
  },
  required: [
    "ingredients",
    "total_kcal",
    "total_protein_g",
    "total_fat_g",
    "total_carb_g",
    "summary",
  ],
};

function responseSchemaFor(action: AiAction) {
  if (action === "food") return foodResponseSchema;
  return undefined;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json({ error: "Sign in to use AI." }, { status: 401 });
  }

  const key = getGeminiKey();
  if (!key) {
    return NextResponse.json({ error: "Gemini is not configured." }, { status: 503 });
  }

  let body: AiRequest;
  try {
    body = (await request.json()) as AiRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isAiAction(body.action) || typeof body.prompt !== "string") {
    return NextResponse.json({ error: "Missing AI request." }, { status: 400 });
  }

  const prompt = body.prompt.trim();
  if (!prompt) {
    return NextResponse.json({ error: "Prompt cannot be empty." }, { status: 400 });
  }

  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json(
      { error: "Prompt is too long. Try a shorter description." },
      { status: 413 },
    );
  }

  const { data: allowed, error: quotaError } = await supabase.rpc("consume_ai_quota", {
    daily_limit: 30,
  });
  if (quotaError || !allowed) {
    return NextResponse.json(
      { error: "Daily AI limit reached. Manual logging is still available." },
      { status: 429 },
    );
  }

  try {
    const client = new GoogleGenerativeAI(key);
    let lastError: unknown = null;

    for (const modelName of MODELS) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchemaFor(body.action),
          },
        });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          lastError = new Error(`${modelName} returned invalid JSON.`);
          continue;
        }

        const validated = body.action === "food" ? foodResultSchema.safeParse(data) : { success: true as const, data };
        if (!validated.success) {
          lastError = new Error(`${modelName} returned unsafe values.`);
          continue;
        }
        const tokens = result.response.usageMetadata?.totalTokenCount ?? 0;
        void supabase.rpc("record_ai_tokens", { tokens_used: tokens });
        return NextResponse.json({
          data: validated.data,
          model: modelName,
          tokens,
        });
      } catch (error) {
        lastError = error;
      }
    }

    console.error("Gemini AI request failed", lastError);
    return NextResponse.json(
      { error: "AI is temporarily unavailable. Try again in a moment." },
      { status: 502 },
    );
  } catch (error) {
    console.error("Gemini AI request failed", error);
    return NextResponse.json(
      { error: "AI is temporarily unavailable. Try again in a moment." },
      { status: 502 },
    );
  }
}
