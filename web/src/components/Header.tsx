"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, TrendingUp, Moon, Sun, Home, FileText, MessageSquare, Wallet, Trash2, ShieldCheck, LogIn, LogOut, User, Settings as SettingsIcon, Loader2 } from "lucide-react";
import { analytics } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";

interface AccountInfo {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  plan: "free" | "pro";
}

const NAV_ITEMS = [
  { href: "/",          label: "Home",             icon: Home },
  { href: "/form",      label: "Check my health",  icon: FileText },
  { href: "/budget",    label: "Budget Planner",   icon: Wallet },
  { href: "/progress",  label: "Progress",         icon: TrendingUp },
  { href: "/feedback",  label: "Give feedback",    icon: MessageSquare },
];

// Only ever rendered when logged in — Guest sessions have nothing to
// clear (no persistence at all without an account).
function ClearDataModal({ onConfirm, onCancel, clearing }: {
  onConfirm: () => void;
  onCancel: () => void;
  clearing: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget && !clearing) onCancel(); }}
    >
      <div
        className="w-full max-w-sm bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5 space-y-4">
          {/* Icon */}
          <div className="w-11 h-11 rounded-full bg-[color-mix(in_srgb,var(--brand)_12%,transparent)] flex items-center justify-center">
            <ShieldCheck size={20} className="text-[var(--brand)]" />
          </div>

          <div>
            <p className="font-semibold text-[var(--text)] mb-2">Clear all data?</p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Your budget, score history, and goals will be permanently deleted from our servers. This cannot be undone.
            </p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-2">
              Your account itself stays intact — to remove that too, use{" "}
              <span className="text-[var(--text)] font-medium">Settings → Delete my account</span>.
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={clearing}
            className="btn-secondary flex-1 text-sm disabled:opacity-60"
          >
            Keep my data
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={clearing}
            className="flex-1 text-sm px-4 py-2.5 rounded-xl font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "#dc2626" }}
          >
            {clearing ? <Loader2 size={15} className="animate-spin" /> : "Yes, delete everything"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const [open,          setOpen]          = useState(false);
  const [dark,          setDark]          = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing,       setClearing]       = useState(false);
  const [account,        setAccount]        = useState<AccountInfo | null>(null);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router   = useRouter();

  // Track auth state so the header can swap "Sign in" for the account menu.
  // No redirects here — Guest users keep full access either way.
  useEffect(() => {
    const supabase = createClient();

    async function loadAccount(userId: string, email: string) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, plan")
        .eq("id", userId)
        .single();
      setAccount({
        email,
        displayName: profile?.display_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        plan: (profile?.plan as "free" | "pro") ?? "free",
      });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) loadAccount(session.user.id, session.user.email);
      else setAccount(null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) loadAccount(session.user.id, session.user.email);
      else setAccount(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close the account dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    analytics.track("auth_signed_out");
    setOpen(false);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  // Only reachable when logged in (button is gated on `account`) — wipes the
  // cloud data rows, never the account itself. RLS (auth.uid() = user_id)
  // already permits deleting only your own rows, no service-role key needed
  // here, unlike account deletion. No localStorage involved at all — Guest
  // sessions have nothing to clear, and there's nothing left to clear it from.
  async function clearAllData() {
    if (!account) return;
    setClearing(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await Promise.all([
        supabase.from("snapshots").delete().eq("user_id", user.id),
        supabase.from("budget_cards").delete().eq("user_id", user.id),
        supabase.from("goals").delete().eq("user_id", user.id),
        supabase.from("distribution_log").delete().eq("user_id", user.id),
      ]);
    }

    analytics.track("data_cleared");
    setClearing(false);
    setShowClearModal(false);
    router.push("/");
    router.refresh();
  }

  // Initialise from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setDark(isDark);
  }

  // Close sidebar on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setOpen(true); analytics.track("menu_opened"); }}
            className="p-2 rounded-lg hover:bg-[var(--bg-2)] text-[var(--text-muted)] transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <Link href="/">
            <div className="relative w-28 h-9 overflow-hidden">
              <Image src="/logo.png"       alt="Vitals" fill priority className="dark:hidden object-cover object-center" />
              <Image src="/logo-dark.jpeg" alt="Vitals" fill priority className="hidden dark:block object-cover object-center" />
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {account ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border border-[var(--border)] bg-[var(--bg-2)] text-[var(--text)] text-sm font-semibold hover:opacity-90 transition-opacity"
                aria-label="Account menu"
              >
                {account.avatarUrl ? (
                  <Image src={account.avatarUrl} alt="" width={32} height={32} className="object-cover w-full h-full" />
                ) : (
                  (account.displayName || account.email)[0]?.toUpperCase()
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    {account.displayName && (
                      <p className="text-sm font-medium text-[var(--text)] truncate">{account.displayName}</p>
                    )}
                    <p className="text-xs text-[var(--text-muted)] truncate">{account.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => { setMenuOpen(false); analytics.track("nav_clicked", { item: "Profile" }); }}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors"
                    >
                      <User size={15} className="text-[var(--text-muted)]" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => { setMenuOpen(false); analytics.track("nav_clicked", { item: "Settings" }); }}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors"
                    >
                      <SettingsIcon size={15} className="text-[var(--text-muted)]" />
                      Settings
                    </Link>
                  </div>

                  <div className="py-1 border-t border-[var(--border)]">
                    <p className="px-4 py-1.5 text-xs text-[var(--text-muted)] capitalize">{account.plan} plan</p>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors"
                    >
                      <LogOut size={15} className="text-[var(--text-muted)]" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth"
              onClick={() => analytics.track("nav_clicked", { item: "Sign in (topbar)" })}
              className="btn-secondary hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm"
            >
              <LogIn size={15} />
              Sign in
            </Link>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-[var(--bg-2)] text-[var(--text-muted)] transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-60 bg-[var(--bg)] border-r border-[var(--border)] z-50 flex flex-col transform transition-transform duration-200 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="relative w-24 h-8 overflow-hidden">
            <Image src="/logo.png"       alt="Vitals" fill className="dark:hidden object-cover object-center" />
            <Image src="/logo-dark.jpeg" alt="Vitals" fill className="hidden dark:block object-cover object-center" />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-2)] text-[var(--text-muted)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => analytics.track("nav_clicked", { item: label })}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] text-[var(--brand)] font-medium"
                    : "text-[var(--text)] hover:bg-[var(--bg-2)]"
                }`}
              >
                <Icon size={16} className={active ? "text-[var(--brand)]" : "text-[var(--text-muted)]"} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Settings footer */}
        <div className="p-3 border-t border-[var(--border)] space-y-0.5">
          <p className="px-3 py-1 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Settings
          </p>

          {account ? (
            <Link
              href="/settings"
              onClick={() => { setOpen(false); analytics.track("nav_clicked", { item: "Settings (sidebar)" }); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors"
            >
              <SettingsIcon size={16} className="text-[var(--text-muted)] shrink-0" />
              <span className="truncate">Account settings</span>
            </Link>
          ) : (
            <Link
              href="/auth"
              onClick={() => { setOpen(false); analytics.track("nav_clicked", { item: "Sign in" }); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors"
            >
              <LogIn size={16} className="text-[var(--text-muted)]" />
              Sign in
            </Link>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors"
          >
            {dark ? <Sun size={16} className="text-[var(--text-muted)]" /> : <Moon size={16} className="text-[var(--text-muted)]" />}
            {dark ? "Switch to light" : "Switch to dark"}
          </button>

          {account && (
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={16} />
              Clear all data
            </button>
          )}
        </div>
      </aside>

      {showClearModal && account && (
        <ClearDataModal
          onConfirm={clearAllData}
          onCancel={() => setShowClearModal(false)}
          clearing={clearing}
        />
      )}
    </>
  );
}
