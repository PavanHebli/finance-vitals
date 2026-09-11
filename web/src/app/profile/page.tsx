"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES } from "@/lib/countries";
import { analytics } from "@/lib/analytics";

type Gender = "male" | "female" | "other" | "prefer_not_to_say" | "";

// Dual-purpose: first-time onboarding right after signup (with "Skip for
// now"), and a regular editable profile page reachable anytime after via
// the header's avatar menu. Which mode it's in is derived from
// profile_completed, not a route param — same screen either way.
export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking]       = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender]           = useState<Gender>("");
  const [country, setCountry]         = useState("");
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, date_of_birth, gender, country, profile_completed")
        .eq("id", user.id)
        .single();

      setIsFirstTime(!profile?.profile_completed);
      setDisplayName(profile?.display_name ?? "");
      setAvatarUrl(profile?.avatar_url ?? null);
      setDateOfBirth(profile?.date_of_birth ?? "");
      setGender((profile?.gender as Gender) ?? "");
      setCountry(profile?.country ?? "");
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile(fields: {
    display_name?: string;
    date_of_birth?: string | null;
    gender?: string | null;
    country?: string | null;
  }) {
    setSaving(true);
    setError(null);
    setSaved(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ ...fields, profile_completed: true })
      .eq("id", user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (isFirstTime) {
      router.push("/");
      router.refresh();
      return;
    }

    setIsFirstTime(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    analytics.track(isFirstTime ? "profile_setup_completed" : "profile_updated", {
      filled_dob: !!dateOfBirth,
      filled_gender: !!gender,
      filled_country: !!country,
    });
    await saveProfile({
      display_name: displayName.trim() || undefined,
      date_of_birth: dateOfBirth || null,
      gender: gender || null,
      country: country || null,
    });
  }

  async function handleSkip() {
    analytics.track("profile_setup_skipped");
    await saveProfile({});
  }

  if (checking) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8 text-center">
          {avatarUrl && (
            <div className="relative w-16 h-16 rounded-full overflow-hidden mb-4 border border-[var(--border)]">
              <Image src={avatarUrl} alt="" fill className="object-cover" />
            </div>
          )}
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">
            {isFirstTime ? "Tell us a bit about you" : "Your profile"}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {isFirstTime
              ? "Optional — helps us tailor your financial picture. Skip anytime."
              : "Update your details anytime."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="input"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Date of birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="input"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="input"
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="input"
            >
              <option value="">Select a country</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : isFirstTime ? (
              <>Continue <ArrowRight size={15} /></>
            ) : (
              "Save changes"
            )}
          </button>

          {saved && (
            <p className="text-sm text-[var(--good)] text-center">Saved.</p>
          )}
          {error && (
            <p className="text-sm text-[var(--danger)] text-center">{error}</p>
          )}
        </form>

        {isFirstTime && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="w-full text-center text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mt-6 disabled:opacity-60"
          >
            Skip for now →
          </button>
        )}
      </div>
    </div>
  );
}
