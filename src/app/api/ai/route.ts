import { NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MODELS = ["gemini-3.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash"] as const;
const MAX_PROMPT_CHARS = 12_000;
const AI_ACTIONS = ["food", "menu", "exercise", "insight"] as const;

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

        return NextResponse.json({
          data,
          model: modelName,
          tokens: result.response.usageMetadata?.totalTokenCount ?? 0,
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
