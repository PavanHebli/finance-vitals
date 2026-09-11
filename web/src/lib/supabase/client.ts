import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — use this in any "use client" component.
// Safe to call repeatedly; createBrowserClient reuses the same instance.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
