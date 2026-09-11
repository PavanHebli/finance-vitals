"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { analytics } from "@/lib/analytics";

type EmailMode = "signin" | "signup";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [emailMode, setEmailMode]         = useState<EmailMode>("signin");
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading]             = useState<"google" | "email" | null>(null);
  const [error, setError]                 = useState<string | null>(null);

  function switchMode(mode: EmailMode) {
    setEmailMode(mode);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleGoogle() {
    setError(null);
    setLoading("google");
    analytics.track("auth_google_clicked");

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(null);
    }
    // On success the browser navigates away to Google — nothing else to do here.
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim() || loading) return;

    if (emailMode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setError(null);
    setLoading("email");
    analytics.track("auth_email_submit", { mode: emailMode });

    const { data, error: authError } =
      emailMode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          });

    setLoading(null);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (emailMode === "signup") {
      setError("Check your email to confirm your account, then sign in.");
      switchMode("signin");
      return;
    }

    // Signed in — send first-time users through profile setup, everyone else home.
    let destination = "/";
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("profile_completed")
        .eq("id", data.user.id)
        .single();
      destination = profile?.profile_completed ? "/" : "/profile";
    }

    router.push(destination);
    router.refresh();
  }

  function handleSkip() {
    analytics.track("auth_skip_clicked");
    router.push("/");
  }

  return (
    <div className="relative min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Soft brand glow behind the card — subtle, works in both themes */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full opacity-[0.08] blur-3xl"
        style={{ background: "var(--brand)" }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm">

        {/* Logo + tagline */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-72 h-24 mb-3">
            <Image src="/logo.png"       alt="Vitals" fill priority className="dark:hidden object-contain" />
            <Image src="/logo-dark.jpeg" alt="Vitals" fill priority className="hidden dark:block object-contain" />
          </div>
          <p className="text-[15px] text-[var(--text-muted)]">
            {emailMode === "signin" ? "Welcome back — sign in to your account" : "Create your account, free forever"}
          </p>
        </div>

        <div className="card space-y-4 shadow-xl shadow-black/[0.03] dark:shadow-black/20">
          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading !== null}
            className="btn-secondary w-full flex items-center justify-center gap-2.5 py-2.5 disabled:opacity-60"
          >
            {loading === "google" ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Mode switch — segmented control */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[var(--bg-2)] border border-[var(--border)]">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`py-1.5 text-sm font-medium rounded-md transition-colors ${
                emailMode === "signin"
                  ? "bg-[var(--bg)] text-[var(--text)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`py-1.5 text-sm font-medium rounded-md transition-colors ${
                emailMode === "signup"
                  ? "bg-[var(--bg)] text-[var(--text)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input"
              autoComplete="email"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="input"
              autoComplete={emailMode === "signin" ? "current-password" : "new-password"}
            />
            {emailMode === "signup" && (
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="input"
                autoComplete="new-password"
              />
            )}

            <button
              type="submit"
              disabled={loading !== null}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading === "email" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {emailMode === "signin" ? "Sign in" : "Create account"}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {error && (
            <p className="text-sm text-[var(--danger)] text-center">{error}</p>
          )}
        </div>

        {/* Trust signal — worth stating explicitly on a finance app's auth screen */}
        <div className="flex items-center justify-center gap-1.5 mt-5 text-xs text-[var(--text-muted)]">
          <ShieldCheck size={13} className="shrink-0" />
          Your financial data is private and never sold.
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="w-full text-center text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mt-5"
        >
          Continue without account →
        </button>

        <p className="text-xs text-[var(--text-muted)] text-center mt-4">
          By continuing you agree to our{" "}
          <Link href="/" className="hover:underline">Terms</Link> and{" "}
          <Link href="/" className="hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
