import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth token on every request so SSR/route handlers
// always see a valid session. Deliberately does NOT redirect anyone —
// Guest users get full app access with no account, so this is refresh-only,
// never a gate. See BACKEND_PLAN.md → Auth Flow — Web.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touches the session so an expired access token gets refreshed via the
  // refresh token before any Server Component reads it.
  await supabase.auth.getUser();

  return response;
}
