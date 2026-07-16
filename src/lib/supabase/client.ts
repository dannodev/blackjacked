"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

// Singleton — createBrowserClient already caches internally
let _client: ReturnType<typeof createSupabaseBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (!_client) {
    _client = createSupabaseBrowserClient();
  }
  return _client;
}

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("https://")
  );
}