"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/", label: "Dashboard", icon: "M3 12 12 4l9 8M5 10v10h14V10" },
  { href: "/contacts", label: "Contacts", icon: "M16 14a4 4 0 1 0-8 0M4 20a8 8 0 1 1 16 0" },
  { href: "/companies", label: "Companies", icon: "M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" },
  { href: "/deals", label: "Deals", icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2" },
  { href: "/pipeline", label: "Pipeline", icon: "M9 17V7m0 10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 10V7m0 10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2" },
  { href: "/tasks", label: "Tasks", icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { href: "/analytics", label: "Analytics", icon: "M3 3v18h18M7 14l4-4 4 4 5-5" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800">
      <div className="px-6 py-6 border-b border-slate-200 dark:border-slate-800">
        <Link href="/">
          <Image src="/sheds.png" alt="SHEDS" width={120} height={40} className="h-10 w-auto" priority />
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              }`}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d={link.icon} />
              </svg>
              {link.label}
            </Link>
          );
        })}

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
          <Link
            href="/settings/outlook"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              pathname.startsWith("/settings/outlook")
                ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            }`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Outlook Sync
          </Link>
        </div>
      </nav>
      <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800">
        <ThemeToggle />
      </div>
      {session?.user && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
            {session.user.name ?? session.user.email}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-2">
            {session.user.email}
          </p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
          >
            Sign out
          </button>
        </div>
      )}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        v1.0 — demo build
      </div>
    </aside>
  );
}
