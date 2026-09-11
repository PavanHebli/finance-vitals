"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Moon, Sun, LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { analytics } from "@/lib/analytics";

// Session-dependent — never statically prerender at build time (the Supabase
// client is constructed at render time, before NEXT_PUBLIC_* env vars are
// guaranteed available during a build).
export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function DeleteAccountModal({ onConfirm, onCancel, deleting }: {
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onCancel(); }}
    >
      <div
        className="w-full max-w-sm bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5 space-y-4">
          <div className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center">
            <ShieldCheck size={20} className="text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-[var(--text)] mb-2">Delete your account?</p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Your account, budget, score history, and goals will be permanently deleted from our servers. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-2">
          <button type="button" onClick={onCancel} disabled={deleting} className="btn-secondary flex-1 text-sm disabled:opacity-60">
            Keep my account
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 text-sm px-4 py-2.5 rounded-xl font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "#dc2626" }}
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : "Yes, delete it"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const [checking, setChecking]   = useState(true);
  const [email, setEmail]         = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [dark, setDark]           = useState(false);

  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwSaved, setPwSaved]     = useState(false);
  const [pwError, setPwError]     = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth");
        return;
      }
      setEmail(user.email ?? "");
      setHasPassword(!!user.app_metadata?.providers?.includes("email"));
      setChecking(false);
    })();

    setDark(document.documentElement.classList.contains("dark"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setDark(isDark);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwError("Passwords don't match.");
      return;
    }
    setPwError(null);
    setPwSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);

    if (error) {
      setPwError(error.message);
      return;
    }
    analytics.track("password_changed");
    setNewPassword("");
    setConfirmPassword("");
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2500);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    analytics.track("auth_signed_out");
    router.push("/");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/auth");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(await res.text());

      analytics.track("account_deleted");
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setDeleting(false);
      setDeleteError("Something went wrong deleting your account. Try again, or contact support.");
    }
  }

  if (checking) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-8">
      <h1 className="text-2xl font-bold text-[var(--text)]">Settings</h1>

      {/* Appearance */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Appearance</h2>
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            {dark ? <Moon size={18} className="text-[var(--text-muted)]" /> : <Sun size={18} className="text-[var(--text-muted)]" />}
            <span className="text-sm text-[var(--text)]">Dark mode</span>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            role="switch"
            aria-checked={dark}
            className="relative w-10 h-6 rounded-full transition-colors"
            style={{ background: dark ? "var(--brand)" : "var(--border)" }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: dark ? "translateX(18px)" : "translateX(2px)" }}
            />
          </button>
        </div>
      </section>

      {/* Account */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Account</h2>
        <div className="card space-y-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Email</label>
            <p className="text-sm text-[var(--text)]">{email}</p>
          </div>

          {hasPassword && (
            <form onSubmit={handleChangePassword} className="space-y-2 pt-2 border-t border-[var(--border)]">
              <label className="text-xs font-medium text-[var(--text-muted)] block">Change password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="input"
                autoComplete="new-password"
              />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="input"
                autoComplete="new-password"
              />
              <button type="submit" disabled={pwSaving} className="btn-secondary text-sm disabled:opacity-60">
                {pwSaving ? <Loader2 size={14} className="animate-spin" /> : "Update password"}
              </button>
              {pwSaved && <p className="text-sm text-[var(--good)]">Password updated.</p>}
              {pwError && <p className="text-sm text-[var(--danger)]">{pwError}</p>}
            </form>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors pt-2 border-t border-[var(--border)] w-full"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wide">Danger zone</h2>
        <div className="card border-red-500/30 space-y-2">
          <p className="text-sm text-[var(--text-muted)]">
            Permanently delete your account and all data stored on our servers.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="text-sm font-medium text-red-500 hover:underline"
          >
            Delete my account
          </button>
          {deleteError && <p className="text-sm text-[var(--danger)]">{deleteError}</p>}
        </div>
      </section>

      {showDeleteModal && (
        <DeleteAccountModal
          deleting={deleting}
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
