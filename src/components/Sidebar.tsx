"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", icon: "M3 12 12 4l9 8M5 10v10h14V10" },
  { href: "/contacts", label: "Contacts", icon: "M16 14a4 4 0 1 0-8 0M4 20a8 8 0 1 1 16 0" },
  { href: "/companies", label: "Companies", icon: "M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" },
  { href: "/analytics", label: "Analytics", icon: "M3 3v18h18M7 14l4-4 4 4 5-5" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-slate-200 bg-white">
      <div className="px-6 py-6 border-b border-slate-200">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-brand-600 text-white grid place-items-center font-bold">
            D
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Demo CRM</div>
            <div className="text-xs text-slate-500">Northwind Demo Co.</div>
          </div>
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
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
      </nav>
      <div className="px-6 py-4 border-t border-slate-200 text-xs text-slate-500">
        v1.0 — demo build
      </div>
    </aside>
  );
}
