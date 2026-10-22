import * as AppleAuthentication from "expo-apple-authentication";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";

// Lets the in-app browser close itself and hand control back after Google login.
WebBrowser.maybeCompleteAuthSession();

// Every function below returns an error message to show the user, or null on
// success (or when the user simply cancelled).

export async function signInWithEmail(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

export async function signUpWithEmail(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signUp({ email, password });
  return error ? error.message : null;
}

// Google: open Supabase's login page in an in-app browser. When it finishes,
// it sends us back to the app with the session in the link.
// Add the redirect link (shown by Linking.createURL) to Supabase under
// Authentication > URL Configuration > Redirect URLs.
export async function signInWithGoogle(): Promise<string | null> {
  const redirectTo = Linking.createURL("auth-callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) return error?.message ?? "Could not start Google sign-in.";

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return null;

  const fragment = result.url.split("#")[1] ?? "";
  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return sessionError ? sessionError.message : null;
  }

  const code = new URL(result.url).searchParams.get("code");
  if (code) {
    const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
    return codeError ? codeError.message : null;
  }
  return "Google sign-in did not finish. Please try again.";
}

// Apple: iPhone's own sign-in sheet gives us a token, which Supabase checks.
export async function signInWithApple(): Promise<string | null> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) return "Apple did not return a sign-in token.";
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });
    return error ? error.message : null;
  } catch (err) {
    // Closing the Apple sheet is not an error.
    if ((err as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
    return "Apple sign-in failed. Please try again.";
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// Has this user finished the one-time profile screen?
export async function profileIsComplete(userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("profile_completed").eq("id", userId).single();
  return data?.profile_completed === true;
}
