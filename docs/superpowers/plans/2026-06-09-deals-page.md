# Deals Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fully functional Deals management page (`/deals`) with table view, search, stage filter, and create/edit/delete modal — following the same pattern as Contacts and Companies.

**Architecture:** Four new files (two API routes, one server page, one client view component) and one sidebar modification. No schema changes required — the `Deal` model and `DealStage` enum already exist in `prisma/schema.prisma`. The server page fetches all data via Prisma; the client view handles local state, filtering, and calls the new API routes on mutation.

**Tech Stack:** Next.js 14 App Router, Prisma, TypeScript, Tailwind CSS. No new dependencies. Verification via `npx tsc --noEmit` (type check) and `npm run build` (full build).

**Spec:** `docs/superpowers/specs/2026-06-09-deals-management-design.md`

---

### Task 1: API collection route — GET + POST

**Files:**
- Create: `src/app/api/deals/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/app/api/deals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_STAGES = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;
type DealStage = (typeof ALLOWED_STAGES)[number];

const CLOSED_STAGES = new Set<string>(["CLOSED_WON", "CLOSED_LOST"]);

export async function GET() {
  const deals = await prisma.deal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, value, stage, expectedCloseDate, companyId, contactId } =
    body ?? {};

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (stage && !ALLOWED_STAGES.includes(stage as DealStage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  try {
    const deal = await prisma.deal.create({
      data: {
        title,
        value: value !== undefined && value !== "" ? parseFloat(value) : 0,
        stage: (stage as DealStage) ?? "PROSPECTING",
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        closedAt: stage && CLOSED_STAGES.has(stage) ? new Date() : null,
        companyId: companyId || null,
        contactId: contactId || null,
      },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(deal, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors related to `src/app/api/deals/route.ts`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/deals/route.ts
git commit -m "feat: add GET and POST /api/deals"
```

---

### Task 2: API item route — PATCH + DELETE

**Files:**
- Create: `src/app/api/deals/[id]/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/app/api/deals/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_STAGES = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;
type DealStage = (typeof ALLOWED_STAGES)[number];

const CLOSED_STAGES = new Set<string>(["CLOSED_WON", "CLOSED_LOST"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const { title, value, stage, expectedCloseDate, companyId, contactId } =
    body ?? {};

  if (title !== undefined && !title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (stage !== undefined && !ALLOWED_STAGES.includes(stage as DealStage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  try {
    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(stage !== undefined && {
          stage: stage as DealStage,
          closedAt: CLOSED_STAGES.has(stage) ? new Date() : null,
        }),
        ...(expectedCloseDate !== undefined && {
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        }),
        ...(companyId !== undefined && { companyId: companyId || null }),
        ...(contactId !== undefined && { contactId: contactId || null }),
      },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(deal);
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.deal.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/deals/[id]/route.ts
git commit -m "feat: add PATCH and DELETE /api/deals/[id]"
```

---

### Task 3: Deals server page

**Files:**
- Create: `src/app/deals/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
// src/app/deals/page.tsx
import { prisma } from "@/lib/prisma";
import DealsView from "./DealsView";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const [deals, companies, contacts] = await Promise.all([
    prisma.deal.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.contact.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return (
    <DealsView
      initialDeals={deals}
      companies={companies}
      contacts={contacts}
    />
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: error about `DealsView` not existing yet — this is expected at this step. Confirm the only errors are about the missing `DealsView` module.

- [ ] **Step 3: Commit**

```bash
git add src/app/deals/page.tsx
git commit -m "feat: add /deals server page"
```

---

### Task 4: DealsView client component

**Files:**
- Create: `src/app/deals/DealsView.tsx`

This is the main client component. It mirrors the structure of `src/app/contacts/ContactsView.tsx`.

- [ ] **Step 1: Create the file**

```typescript
// src/app/deals/DealsView.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { formatCurrency, formatDate, stageColor } from "@/lib/format";

type DealStage =
  | "PROSPECTING"
  | "QUALIFICATION"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST";

type Deal = {
  id: string;
  title: string;
  value: string | number;
  stage: DealStage;
  expectedCloseDate: string | Date | null;
  closedAt: string | Date | null;
  companyId: string | null;
  contactId: string | null;
  createdAt: string | Date;
  company: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
};

type CompanyOption = { id: string; name: string };
type ContactOption = { id: string; firstName: string; lastName: string };

type FormState = {
  id?: string;
  title: string;
  value: string;
  stage: DealStage;
  expectedCloseDate: string;
  companyId: string;
  contactId: string;
};

const STAGES: DealStage[] = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

const EMPTY_FORM: FormState = {
  title: "",
  value: "",
  stage: "PROSPECTING",
  expectedCloseDate: "",
  companyId: "",
  contactId: "",
};

export default function DealsView({
  initialDeals,
  companies,
  contacts,
}: {
  initialDeals: Deal[];
  companies: CompanyOption[];
  contacts: ContactOption[];
}) {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deals.filter((d) => {
      if (stageFilter !== "ALL" && d.stage !== stageFilter) return false;
      if (!q) return true;
      return [d.title, d.company?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [deals, search, stageFilter]);

  const totalPipeline = useMemo(
    () => deals.reduce((sum, d) => sum + Number(d.value), 0),
    [deals],
  );

  const wonValue = useMemo(
    () =>
      deals
        .filter((d) => d.stage === "CLOSED_WON")
        .reduce((sum, d) => sum + Number(d.value), 0),
    [deals],
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(d: Deal) {
    setForm({
      id: d.id,
      title: d.title,
      value: d.value ? String(Number(d.value)) : "",
      stage: d.stage,
      expectedCloseDate: d.expectedCloseDate
        ? new Date(d.expectedCloseDate).toISOString().split("T")[0]
        : "",
      companyId: d.companyId ?? "",
      contactId: d.contactId ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = form.id ? `/api/deals/${form.id}` : "/api/deals";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          value: form.value ? parseFloat(form.value) : 0,
          stage: form.stage,
          expectedCloseDate: form.expectedCloseDate || null,
          companyId: form.companyId || null,
          contactId: form.contactId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved: Deal = await res.json();
      setDeals((prev) => {
        if (form.id) return prev.map((d) => (d.id === saved.id ? saved : d));
        return [saved, ...prev];
      });
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this deal?")) return;
    const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeals((prev) => prev.filter((d) => d.id !== id));
      router.refresh();
    } else {
      alert("Failed to delete deal");
    }
  }

  return (
    <div>
      <PageHeader
        title="Deals"
        subtitle={`${deals.length} deals · ${formatCurrency(totalPipeline)} pipeline · ${formatCurrency(wonValue)} won`}
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New Deal
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <input
            className="input max-w-xs"
            placeholder="Search by title or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input max-w-[180px]"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="ALL">All stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="table-th">Title</th>
                <th className="table-th">Company</th>
                <th className="table-th">Contact</th>
                <th className="table-th">Stage</th>
                <th className="table-th">Value</th>
                <th className="table-th">Expected Close</th>
                <th className="table-th">Added</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                >
                  <td className="table-td font-medium text-slate-900 dark:text-slate-100">
                    {d.title}
                  </td>
                  <td className="table-td">{d.company?.name ?? "—"}</td>
                  <td className="table-td">
                    {d.contact
                      ? `${d.contact.firstName} ${d.contact.lastName}`
                      : "—"}
                  </td>
                  <td className="table-td">
                    <span className={`pill ${stageColor(d.stage)}`}>
                      {d.stage.replace("_", " ")}
                    </span>
                  </td>
                  <td className="table-td tabular-nums">
                    {formatCurrency(Number(d.value))}
                  </td>
                  <td className="table-td">
                    {formatDate(d.expectedCloseDate)}
                  </td>
                  <td className="table-td">{formatDate(d.createdAt)}</td>
                  <td className="table-td text-right whitespace-nowrap">
                    <button
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mr-3"
                      onClick={() => openEdit(d)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs font-medium text-rose-600 hover:text-rose-700"
                      onClick={() => remove(d.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No deals match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? "Edit Deal" : "New Deal"}
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Value (USD)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Stage</label>
              <select
                className="input"
                value={form.stage}
                onChange={(e) =>
                  setForm({ ...form, stage: e.target.value as DealStage })
                }
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Expected Close Date</label>
            <input
              className="input"
              type="date"
              value={form.expectedCloseDate}
              onChange={(e) =>
                setForm({ ...form, expectedCloseDate: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Company</label>
              <select
                className="input"
                value={form.companyId}
                onChange={(e) =>
                  setForm({ ...form, companyId: e.target.value })
                }
              >
                <option value="">— None —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Contact</label>
              <select
                className="input"
                value={form.contactId}
                onChange={(e) =>
                  setForm({ ...form, contactId: e.target.value })
                }
              >
                <option value="">— None —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting
                ? "Saving..."
                : form.id
                  ? "Save changes"
                  : "Create deal"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Type-check — expect clean pass**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/deals/DealsView.tsx
git commit -m "feat: add DealsView client component"
```

---

### Task 5: Sidebar link

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Add Deals to the links array**

In `src/components/Sidebar.tsx`, find the `links` array (lines 7–12) and insert the Deals entry between Companies and Analytics:

```typescript
const links = [
  { href: "/", label: "Dashboard", icon: "M3 12 12 4l9 8M5 10v10h14V10" },
  { href: "/contacts", label: "Contacts", icon: "M16 14a4 4 0 1 0-8 0M4 20a8 8 0 1 1 16 0" },
  { href: "/companies", label: "Companies", icon: "M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" },
  { href: "/deals", label: "Deals", icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2" },
  { href: "/analytics", label: "Analytics", icon: "M3 3v18h18M7 14l4-4 4 4 5-5" },
];
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Deals link to sidebar"
```

---

### Task 6: Build verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: build completes successfully with no TypeScript or Next.js errors. You should see a route entry for `/deals` and `/api/deals` in the build output.

- [ ] **Step 2: Start dev server and verify manually**

```bash
npm run dev
```

Open `http://localhost:3000/deals` and verify:
- Page loads and shows the deals table
- "Deals" link in sidebar is active/highlighted when on `/deals`
- "New Deal" button opens the modal
- Filling in title + stage and submitting creates a deal that appears in the table
- Edit button opens the modal pre-filled with the deal's data
- Saving edits updates the row in place
- Changing stage to `CLOSED_WON` or `CLOSED_LOST` and saving — verify `closedAt` is set (check in the DB or via GET `/api/deals` response)
- Search filters by title and company name
- Stage filter dropdown filters the table
- Delete button shows confirm dialog, then removes the row

- [ ] **Step 3: Commit if any fixes were needed, then tag**

```bash
git add -A
git commit -m "fix: deals page manual verification fixes"  # only if fixes were needed
```
