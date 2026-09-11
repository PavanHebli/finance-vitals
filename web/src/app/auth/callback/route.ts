import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect back from Google/Apple OAuth (and the email
// magic-link flow, if that's ever enabled). Exchanges the one-time `code`
// for a real session, then sends the user back into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("profile_completed")
        .eq("id", data.user.id)
        .single();

      const destination = profile?.profile_completed ? next : "/profile";
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
}
