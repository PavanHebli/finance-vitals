"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, TrendingUp, Moon, Sun, Home, FileText } from "lucide-react";

const NAV_ITEMS = [
  { href: "/",         label: "Home",     icon: Home },
  { href: "/form",     label: "Check my health", icon: FileText },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

export function Header() {
  const [open, setOpen]   = useState(false);
  const [dark, setDark]   = useState(false);
  const pathname          = usePathname();

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
            onClick={() => setOpen(true)}
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

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-[var(--bg-2)] text-[var(--text-muted)] transition-colors"
          aria-label="Toggle theme"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
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
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors"
          >
            {dark ? <Sun size={16} className="text-[var(--text-muted)]" /> : <Moon size={16} className="text-[var(--text-muted)]" />}
            {dark ? "Switch to light" : "Switch to dark"}
          </button>
        </div>
      </aside>
    </>
  );
}
