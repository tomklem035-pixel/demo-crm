# Microsoft Auth + Outlook Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Microsoft OAuth login (single-user, enforced by email allowlist) and an Outlook sync page that imports contacts, emails, and calendar events into the CRM via Microsoft Graph API.

**Architecture:** NextAuth v4 with Azure AD provider handles auth and stores the Microsoft access token in a JWT session cookie. A middleware file protects all routes. Three server-side API routes call Microsoft Graph using that token and write results to the existing Prisma database.

**Tech Stack:** next-auth v4, Microsoft Graph REST API, Next.js 14 App Router, Prisma (no schema changes)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/auth.ts` | Create | NextAuth config, Azure AD provider, JWT/session callbacks, single-user guard |
| `src/types/next-auth.d.ts` | Create | Extend Session + JWT types to include `accessToken` |
| `src/middleware.ts` | Create | Redirect unauthenticated requests to `/login` |
| `src/components/Providers.tsx` | Create | Client component — wraps children with `SessionProvider` |
| `src/components/ClientShell.tsx` | Create | Client component — conditionally renders Sidebar based on pathname |
| `src/app/api/auth/[...nextauth]/route.ts` | Create | NextAuth GET/POST handler |
| `src/app/login/page.tsx` | Create | Full-page login with "Sign in with Microsoft" button |
| `src/app/settings/outlook/page.tsx` | Create | Outlook sync UI with three panels |
| `src/app/api/outlook/sync-contacts/route.ts` | Create | Graph contacts → CRM contacts |
| `src/app/api/outlook/sync-emails/route.ts` | Create | Graph emails → NOTE activities |
| `src/app/api/outlook/sync-calendar/route.ts` | Create | Graph calendar events → NOTE activities |
| `src/app/layout.tsx` | Modify | Add Providers + ClientShell, remove direct Sidebar/main rendering |
| `src/components/Sidebar.tsx` | Modify | Add Outlook Settings link + sign-out button |
| `package.json` | Modify | Add next-auth dependency |

---

## Task 1: Install next-auth and add TypeScript types

**Files:**
- Modify: `package.json`
- Create: `src/types/next-auth.d.ts`

- [ ] **Step 1: Install next-auth**

```bash
cd C:/Users/tomkl/OneDrive/Documents/GitHub/demo-crm
npm install next-auth
```

Expected: `next-auth` added to `node_modules` and `package.json` dependencies. No errors.

- [ ] **Step 2: Create TypeScript declaration file**

Create `src/types/next-auth.d.ts`:

```typescript
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors related to Session or JWT types.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/types/next-auth.d.ts
git commit -m "feat: install next-auth and extend session types"
```

---

## Task 2: Create NextAuth config

**Files:**
- Create: `src/lib/auth.ts`

- [ ] **Step 1: Create `src/lib/auth.ts`**

```typescript
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID ?? "common",
      authorization: {
        params: {
          scope:
            "openid email profile offline_access Contacts.Read Mail.Read Calendars.Read",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
    async signIn({ profile }) {
      const allowed = process.env.ALLOWED_EMAIL;
      if (!allowed) return true;
      return profile?.email?.toLowerCase() === allowed.toLowerCase();
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: add NextAuth config with Azure AD provider"
```

---

## Task 3: Create NextAuth API route

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create the route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/auth/[...nextauth]/route.ts"
git commit -m "feat: add NextAuth API route handler"
```

---

## Task 4: Add SessionProvider and ClientShell to layout

**Files:**
- Create: `src/components/Providers.tsx`
- Create: `src/components/ClientShell.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create `src/components/Providers.tsx`**

```typescript
"use client";

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 2: Create `src/components/ClientShell.tsx`**

```typescript
"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Update `src/app/layout.tsx`**

Replace the entire file with:

```typescript
import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import ClientShell from "@/components/ClientShell";

export const metadata: Metadata = {
  title: "Sheds CRM",
  description: "Sheds CRM",
};

const themeInitScript = `
(function(){try{
var t=localStorage.getItem('theme');
if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){
document.documentElement.classList.add('dark');
}}catch(e){}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>
          <ClientShell>{children}</ClientShell>
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/Providers.tsx src/components/ClientShell.tsx src/app/layout.tsx
git commit -m "feat: wrap app with SessionProvider and conditional sidebar shell"
```

---

## Task 5: Add middleware to protect all routes

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create `src/middleware.ts`**

```typescript
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon\\.ico|.*\\.png$).*)",
  ],
};
```

This uses next-auth's built-in middleware. Any request not matching the exclusion list (auth callbacks, the login page itself, static assets) gets checked for a valid session cookie. If missing, the user is redirected to `/login`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add next-auth middleware to protect all app routes"
```

---

## Task 6: Create the login page

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Create `src/app/login/page.tsx`**

```typescript
"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="card p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Sign in to CRM
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Use your Microsoft account to continue
          </p>
        </div>
        <button
          onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" className="h-5 w-5">
            <path fill="#f3f3f3" d="M0 0h23v23H0z" />
            <path fill="#f35325" d="M1 1h10v10H1z" />
            <path fill="#81bc06" d="M12 1h10v10H12z" />
            <path fill="#05a6f0" d="M1 12h10v10H1z" />
            <path fill="#ffba08" d="M12 12h10v10H12z" />
          </svg>
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: add Microsoft login page"
```

---

## Task 7: Update Sidebar with Outlook Settings link and sign-out

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Replace `src/components/Sidebar.tsx`**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Outlook Sync link and sign-out to sidebar"
```

---

## Task 8: Create the Outlook sync page UI

**Files:**
- Create: `src/app/settings/outlook/page.tsx`

- [ ] **Step 1: Create `src/app/settings/outlook/page.tsx`**

```typescript
"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";

type Panel = "contacts" | "emails" | "calendar";

type SyncResult = {
  created?: number;
  updated?: number;
  skipped?: number;
  error?: string;
};

function useSync(endpoint: string) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error ?? "Sync failed" });
      } else {
        setResult(data);
        setLastSynced(new Date().toLocaleString());
      }
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return { sync, loading, result, lastSynced };
}

function SyncPanel({
  title,
  description,
  endpoint,
  icon,
}: {
  title: string;
  description: string;
  endpoint: string;
  icon: string;
}) {
  const { sync, loading, result, lastSynced } = useSync(endpoint);

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-brand-50 dark:bg-brand-500/10 p-2.5">
          <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d={icon} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        </div>
        <button
          onClick={sync}
          disabled={loading}
          className="btn-primary shrink-0"
        >
          {loading ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {lastSynced && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Last synced: {lastSynced}
        </p>
      )}

      {result && !result.error && (
        <div className="rounded-lg bg-green-50 dark:bg-green-500/10 ring-1 ring-green-200 dark:ring-green-500/30 px-4 py-3 text-sm text-green-800 dark:text-green-300">
          {result.created !== undefined && <span>{result.created} created · </span>}
          {result.updated !== undefined && <span>{result.updated} updated · </span>}
          {result.skipped !== undefined && <span>{result.skipped} skipped</span>}
        </div>
      )}

      {result?.error && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {result.error}
        </div>
      )}
    </div>
  );
}

export default function OutlookSyncPage() {
  return (
    <div>
      <PageHeader
        title="Outlook Sync"
        subtitle="Import contacts, emails, and calendar events from your Microsoft account"
      />
      <div className="space-y-4 max-w-2xl">
        <SyncPanel
          title="Import Contacts"
          description="Pull all contacts from your Outlook address book. New contacts are created; existing ones (matched by email) are updated."
          endpoint="/api/outlook/sync-contacts"
          icon="M16 14a4 4 0 1 0-8 0M4 20a8 8 0 1 1 16 0"
        />
        <SyncPanel
          title="Sync Emails"
          description="Log emails from the last 90 days as activities against matching CRM contacts. Re-syncing won't create duplicates."
          endpoint="/api/outlook/sync-emails"
          icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
        <SyncPanel
          title="Sync Calendar"
          description="Log calendar events (last 30 days + next 60 days) as activities against matching CRM contacts."
          endpoint="/api/outlook/sync-calendar"
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/outlook/page.tsx
git commit -m "feat: add Outlook sync page with three sync panels"
```

---

## Task 9: Create sync-contacts API route

**Files:**
- Create: `src/app/api/outlook/sync-contacts/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/outlook/sync-contacts/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface GraphContact {
  id: string;
  displayName: string | null;
  emailAddresses: { address: string; name: string }[];
  mobilePhone: string | null;
  businessPhones: string[];
  jobTitle: string | null;
  companyName: string | null;
}

function parseName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const lastName = parts.pop()!;
  return { firstName: parts.join(" "), lastName };
}

async function fetchAllContacts(accessToken: string): Promise<GraphContact[]> {
  const results: GraphContact[] = [];
  let url: string | null =
    "https://graph.microsoft.com/v1.0/me/contacts" +
    "?$top=100&$select=id,displayName,emailAddresses,mobilePhone,businessPhones,jobTitle,companyName";

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Graph API ${res.status}: ${text}`);
    }
    const data = await res.json();
    results.push(...(data.value ?? []));
    url = data["@odata.nextLink"] ?? null;
  }

  return results;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let contacts: GraphContact[];
  try {
    contacts = await fetchAllContacts(session.accessToken);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const c of contacts) {
    const email = c.emailAddresses?.[0]?.address?.toLowerCase();
    if (!email) { skipped++; continue; }

    const { firstName, lastName } = parseName(c.displayName ?? "Unknown");
    const phone = c.mobilePhone ?? c.businessPhones?.[0] ?? null;

    let companyId: string | null = null;
    if (c.companyName?.trim()) {
      let company = await prisma.company.findFirst({
        where: { name: c.companyName.trim() },
      });
      if (!company) {
        company = await prisma.company.create({
          data: { name: c.companyName.trim(), industry: "Unknown" },
        });
      }
      companyId = company.id;
    }

    const existing = await prisma.contact.findUnique({ where: { email } });
    if (existing) {
      await prisma.contact.update({
        where: { email },
        data: {
          firstName,
          lastName,
          phone,
          title: c.jobTitle ?? null,
          companyId,
        },
      });
      updated++;
    } else {
      await prisma.contact.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          title: c.jobTitle ?? null,
          companyId,
        },
      });
      created++;
    }
  }

  return NextResponse.json({ created, updated, skipped });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/outlook/sync-contacts/route.ts
git commit -m "feat: add Outlook contacts sync API route"
```

---

## Task 10: Create sync-emails API route

**Files:**
- Create: `src/app/api/outlook/sync-emails/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/outlook/sync-emails/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface GraphMessage {
  id: string;
  subject: string | null;
  bodyPreview: string;
  receivedDateTime: string;
  sender: { emailAddress: { address: string } } | null;
  toRecipients: { emailAddress: { address: string } }[];
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceIso = since.toISOString();

  const messages: GraphMessage[] = [];
  let url: string | null =
    "https://graph.microsoft.com/v1.0/me/messages" +
    `?$top=100&$orderby=receivedDateTime desc` +
    `&$filter=receivedDateTime ge ${sinceIso}` +
    `&$select=id,subject,bodyPreview,receivedDateTime,sender,toRecipients`;

  try {
    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `Graph API ${res.status}: ${text}` }, { status: 502 });
      }
      const data = await res.json();
      messages.push(...(data.value ?? []));
      url = data["@odata.nextLink"] ?? null;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  // Build a lookup of CRM contact emails
  const allContacts = await prisma.contact.findMany({
    select: { id: true, email: true },
  });
  const emailToContactId = new Map(
    allContacts.map((c) => [c.email.toLowerCase(), c.id])
  );

  let created = 0;
  let skipped = 0;

  for (const msg of messages) {
    const prefix = `[outlook-msg:${msg.id}]`;

    // Dedup: skip if already imported
    const existing = await prisma.activity.findFirst({
      where: { body: { startsWith: prefix } },
    });
    if (existing) { skipped++; continue; }

    // Collect all email addresses in this message
    const addresses = [
      msg.sender?.emailAddress?.address?.toLowerCase(),
      ...msg.toRecipients.map((r) => r.emailAddress.address.toLowerCase()),
    ].filter(Boolean) as string[];

    // Find first matching CRM contact
    const contactId = addresses
      .map((a) => emailToContactId.get(a))
      .find(Boolean) ?? null;

    if (!contactId) { skipped++; continue; }

    const body =
      `${prefix}\n` +
      `Subject: ${msg.subject ?? "(no subject)"}\n` +
      `Date: ${new Date(msg.receivedDateTime).toLocaleString()}\n\n` +
      msg.bodyPreview;

    await prisma.activity.create({
      data: { type: "NOTE", body, contactId },
    });
    created++;
  }

  return NextResponse.json({ created, skipped });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/outlook/sync-emails/route.ts
git commit -m "feat: add Outlook email sync API route"
```

---

## Task 11: Create sync-calendar API route

**Files:**
- Create: `src/app/api/outlook/sync-calendar/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/outlook/sync-calendar/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface GraphAttendee {
  emailAddress: { address: string; name: string };
}

interface GraphEvent {
  id: string;
  subject: string | null;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees: GraphAttendee[];
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const from = new Date();
  from.setDate(from.getDate() - 30);
  const to = new Date();
  to.setDate(to.getDate() + 60);

  const events: GraphEvent[] = [];
  let url: string | null =
    "https://graph.microsoft.com/v1.0/me/events" +
    `?$top=100` +
    `&$filter=start/dateTime ge '${from.toISOString()}' and start/dateTime le '${to.toISOString()}'` +
    `&$select=id,subject,start,end,attendees` +
    `&$orderby=start/dateTime asc`;

  try {
    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `Graph API ${res.status}: ${text}` }, { status: 502 });
      }
      const data = await res.json();
      events.push(...(data.value ?? []));
      url = data["@odata.nextLink"] ?? null;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  const allContacts = await prisma.contact.findMany({
    select: { id: true, email: true },
  });
  const emailToContactId = new Map(
    allContacts.map((c) => [c.email.toLowerCase(), c.id])
  );

  let created = 0;
  let skipped = 0;

  for (const event of events) {
    const prefix = `[outlook-event:${event.id}]`;

    const existing = await prisma.activity.findFirst({
      where: { body: { startsWith: prefix } },
    });
    if (existing) { skipped++; continue; }

    const attendeeEmails = event.attendees.map(
      (a) => a.emailAddress.address.toLowerCase()
    );
    const attendeeNames = event.attendees.map(
      (a) => a.emailAddress.name || a.emailAddress.address
    );

    const contactId = attendeeEmails
      .map((e) => emailToContactId.get(e))
      .find(Boolean) ?? null;

    if (!contactId) { skipped++; continue; }

    const startStr = new Date(event.start.dateTime).toLocaleString();
    const endStr = new Date(event.end.dateTime).toLocaleString();

    const body =
      `${prefix}\n` +
      `Meeting: ${event.subject ?? "(no title)"}\n` +
      `Start: ${startStr}\n` +
      `End: ${endStr}\n` +
      `Attendees: ${attendeeNames.join(", ")}`;

    await prisma.activity.create({
      data: { type: "NOTE", body, contactId },
    });
    created++;
  }

  return NextResponse.json({ created, skipped });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/outlook/sync-calendar/route.ts
git commit -m "feat: add Outlook calendar sync API route"
```

---

## Task 12: Set Railway environment variables and deploy

**This task requires you to set variables in the Railway dashboard AND generate a secret. No code changes.**

- [ ] **Step 1: Generate NEXTAUTH_SECRET**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output — this is your `NEXTAUTH_SECRET`.

- [ ] **Step 2: Get client's Microsoft email**

Ask the client: what is the Microsoft account email they will use to log in? This becomes `ALLOWED_EMAIL`.

- [ ] **Step 3: Set variables in Railway**

Go to `railway.app` → your project → **demo-crm service** → **Variables** → add each:

| Key | Value |
|---|---|
| `NEXTAUTH_SECRET` | Output from Step 1 |
| `NEXTAUTH_URL` | `https://demo-crm-production-f18e.up.railway.app` |
| `AZURE_AD_CLIENT_ID` | From Azure portal (App registrations → Demo CRM → Overview) |
| `AZURE_AD_CLIENT_SECRET` | From Azure portal (Certificates & secrets) |
| `AZURE_AD_TENANT_ID` | `common` |
| `ALLOWED_EMAIL` | Client's Microsoft email |

- [ ] **Step 4: Complete Azure app registration** (if not already done)

1. Go to `portal.azure.com` → Azure Active Directory → App registrations → **New registration**
2. Name: `Demo CRM`
3. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts (e.g. Skype, Xbox)**
4. Redirect URI type: **Web** — Value: `https://demo-crm-production-f18e.up.railway.app/api/auth/callback/azure-ad`
5. Click **Register**
6. Copy **Application (client) ID** → use as `AZURE_AD_CLIENT_ID`
7. Copy **Directory (tenant) ID** → note it (not needed if using `common`)
8. Go to **Certificates & secrets** → **New client secret** → set expiry 24 months → click Add → copy the **Value** → use as `AZURE_AD_CLIENT_SECRET`
9. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions** → add:
   - `Contacts.Read`
   - `Mail.Read`
   - `Calendars.Read`
   - `offline_access`
   (`User.Read` is usually pre-added)
10. Click **Grant admin consent** if prompted (only needed for org accounts)

- [ ] **Step 5: Push to deploy**

```bash
git push origin main
```

Wait ~2 minutes for Railway to rebuild and deploy.

- [ ] **Step 6: Smoke test**

1. Open `https://demo-crm-production-f18e.up.railway.app` in an incognito window
2. Verify you are redirected to `/login`
3. Click "Sign in with Microsoft"
4. Authenticate with the client's Microsoft account
5. Verify you land on the dashboard
6. Navigate to **Outlook Sync** in the sidebar
7. Click **Sync now** on Contacts — verify the result shows counts
8. Check the Contacts page to confirm records were imported
9. Click Sign out — verify you are returned to `/login`
10. Attempt to access `/contacts` directly — verify redirect to `/login`
