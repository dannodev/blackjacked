import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type OffResponse = {
  status?: number;
  product?: {
    product_name?: string;
    brands?: string;
    serving_size?: string;
    nutriments?: Record<string, number | string | undefined>;
  };
};

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in to scan foods." }, { status: 401 });
  const { code } = await context.params;
  if (!/^\d{7,14}$/.test(code)) return NextResponse.json({ error: "Enter a valid 7–14 digit barcode." }, { status: 400 });

  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=code,product_name,brands,serving_size,nutriments`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Blackjacked/0.1 (privacy@example.com) - barcode" },
    next: { revalidate: 86_400 },
  });
  const result = (await response.json()) as OffResponse;
  const product = result.product;
  if (!response.ok || result.status === 0 || !product?.product_name) return NextResponse.json({ error: "Product not found. You can add it manually or use AI Macros." }, { status: 404 });
  const nutrient = (key: string) => {
    const value = Number(product.nutriments?.[key]);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  };

  return NextResponse.json({
    food: {
      id: `off-${code}`,
      source: "custom",
      name: product.product_name,
      brand: product.brands || undefined,
      serving_size: 100,
      serving_unit: "g",
      kcal: Math.round(nutrient("energy-kcal_100g")),
      protein_g: nutrient("proteins_100g"),
      fat_g: nutrient("fat_100g"),
      carb_g: nutrient("carbohydrates_100g"),
      barcode: code,
    },
    source: "Open Food Facts · values per 100 g",
  });
}
