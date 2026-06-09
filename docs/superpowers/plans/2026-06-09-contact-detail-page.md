# Contact Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/contacts/[id]` detail page with a contact header, Deals tab (fully functional with deal creation), and placeholder Activity/Tasks tabs.

**Architecture:** A server component (`page.tsx`) fetches the contact with company and deals, plus the full companies/contacts lists for modal dropdowns, serialises Decimal values, and passes data to a client component (`ContactDetailView.tsx`). No new API routes or schema changes are needed — the page calls the existing `/api/contacts/[id]` PATCH and `/api/deals` POST endpoints.

**Tech Stack:** Next.js 14 App Router, Prisma, TypeScript, Tailwind CSS (existing utility classes from globals.css: `card`, `btn-primary`, `btn-secondary`, `pill`, `table-th`, `table-td`, `input`, `label`)

---

### Task 1: Make contact name a clickable link in ContactsView

**Files:**
- Modify: `src/app/contacts/ContactsView.tsx`

- [ ] **Step 1: Add `Link` import**

In `src/app/contacts/ContactsView.tsx`, find:
```tsx
import { useRouter } from "next/navigation";
```
Replace with:
```tsx
import Link from "next/link";
import { useRouter } from "next/navigation";
```

- [ ] **Step 2: Wrap the contact name in a Link**

Find:
```tsx
                  <td className="table-td font-medium text-slate-900 dark:text-slate-100">
                    {c.firstName} {c.lastName}
                  </td>
```
Replace with:
```tsx
                  <td className="table-td font-medium">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
                    >
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/contacts/ContactsView.tsx
git commit -m "feat: make contact name a link to detail page"
```

---

### Task 2: Create server component and client stub

**Files:**
- Create: `src/app/contacts/[id]/page.tsx`
- Create: `src/app/contacts/[id]/ContactDetailView.tsx` (stub — replaced in Task 3)

- [ ] **Step 1: Create `src/app/contacts/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ContactDetailView from "./ContactDetailView";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [contact, companies, contacts] = await Promise.all([
    prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        company: true,
        deals: { orderBy: { createdAt: "desc" } },
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

  if (!contact) notFound();

  const serializedContact = {
    ...contact,
    deals: contact.deals.map((d) => ({
      ...d,
      value: d.value.toString(),
    })),
  };

  return (
    <ContactDetailView
      contact={serializedContact}
      companies={companies}
      contacts={contacts}
    />
  );
}
```

- [ ] **Step 2: Create `src/app/contacts/[id]/ContactDetailView.tsx` stub**

```tsx
"use client";

export default function ContactDetailView({
  contact,
  companies,
  contacts,
}: {
  contact: any;
  companies: any[];
  contacts: any[];
}) {
  return <div className="p-4 text-slate-500">Loading contact…</div>;
}
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/contacts/[id]/page.tsx src/app/contacts/[id]/ContactDetailView.tsx
git commit -m "feat: add contact detail page server component"
```

---

### Task 3: Build the full ContactDetailView scaffold

**Files:**
- Modify: `src/app/contacts/[id]/ContactDetailView.tsx` (replace stub entirely)

This task builds the full page: back link, header card, tab bar, and placeholder content for each tab. The Edit Contact button is rendered but not yet wired to a modal (that comes in Task 5). The deals tab shows a placeholder message (replaced in Task 4).

- [ ] **Step 1: Replace the stub with the full scaffold**

Overwrite `src/app/contacts/[id]/ContactDetailView.tsx` with:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { statusColor } from "@/lib/format";

type ContactStatus = "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED";
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
  value: string;
  stage: DealStage;
  expectedCloseDate: string | Date | null;
  closedAt: string | Date | null;
  companyId: string | null;
  contactId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  title: string | null;
  status: ContactStatus;
  companyId: string | null;
  company: { id: string; name: string } | null;
  deals: Deal[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

type Company = { id: string; name: string };
type ContactOption = { id: string; firstName: string; lastName: string };
type Tab = "deals" | "activity" | "tasks";

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export default function ContactDetailView({
  contact: initialContact,
  companies,
  contacts,
}: {
  contact: Contact;
  companies: Company[];
  contacts: ContactOption[];
}) {
  const router = useRouter();
  const [contact, setContact] = useState<Contact>(initialContact);
  const [tab, setTab] = useState<Tab>("deals");

  const titleLine = [contact.title, contact.company?.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M15 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Contacts
        </Link>
      </div>

      {/* Header card */}
      <div className="card p-5 mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 flex-shrink-0 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-xl select-none">
            {initials(contact.firstName, contact.lastName)}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {contact.firstName} {contact.lastName}
              </h1>
              <span className={`pill ${statusColor(contact.status)}`}>
                {contact.status}
              </span>
            </div>
            {titleLine && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {titleLine}
              </p>
            )}
            <div className="flex items-center gap-4 mt-0.5">
              <a
                href={`mailto:${contact.email}`}
                className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                {contact.email}
              </a>
              {contact.phone && (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {contact.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <button className="btn-secondary" onClick={() => {}}>
          Edit Contact
        </button>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <nav className="flex -mb-px">
          {(["deals", "activity", "tasks"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {t === "deals"
                ? `Deals (${contact.deals.length})`
                : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === "deals" && (
        <div className="card p-10 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Deals list — implemented in Task 4.
          </p>
        </div>
      )}
      {tab === "activity" && (
        <div className="card p-10 flex flex-col items-center justify-center gap-2 text-center">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Activity logging coming soon.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Activity tracking will be added in a future update.
          </p>
        </div>
      )}
      {tab === "tasks" && (
        <div className="card p-10 flex flex-col items-center justify-center gap-2 text-center">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Task tracking coming soon.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Task management will be added in a future update.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/contacts/[id]/ContactDetailView.tsx
git commit -m "feat: add contact detail view scaffold with header and tabs"
```

---

### Task 4: Implement the Deals tab

**Files:**
- Modify: `src/app/contacts/[id]/ContactDetailView.tsx`

- [ ] **Step 1: Extend imports**

Find the line at the top of `ContactDetailView.tsx`:
```tsx
import { useState } from "react";
```
Replace with:
```tsx
import { useMemo, useState } from "react";
```

Find:
```tsx
import { statusColor } from "@/lib/format";
```
Replace with:
```tsx
import { formatCurrency, formatDate, stageColor, statusColor } from "@/lib/format";
```

- [ ] **Step 2: Add pipeline calculations after the state declarations**

Find:
```tsx
  const titleLine = [contact.title, contact.company?.name]
    .filter(Boolean)
    .join(" · ");
```
Replace with:
```tsx
  const titleLine = [contact.title, contact.company?.name]
    .filter(Boolean)
    .join(" · ");

  const pipelineDeals = useMemo(
    () => contact.deals.filter((d) => d.stage !== "CLOSED_LOST"),
    [contact.deals]
  );
  const pipelineValue = useMemo(
    () => pipelineDeals.reduce((sum, d) => sum + parseFloat(d.value), 0),
    [pipelineDeals]
  );
```

- [ ] **Step 3: Replace the deals tab placeholder with the real table**

Find:
```tsx
      {tab === "deals" && (
        <div className="card p-10 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Deals list — implemented in Task 4.
          </p>
        </div>
      )}
```
Replace with:
```tsx
      {tab === "deals" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {contact.deals.length}{" "}
              {contact.deals.length === 1 ? "deal" : "deals"}
              {pipelineDeals.length > 0 &&
                ` · ${formatCurrency(pipelineValue)} pipeline`}
            </p>
            <button className="btn-primary" onClick={() => {}}>
              + New Deal
            </button>
          </div>
          {contact.deals.length === 0 ? (
            <div className="card p-10 flex flex-col items-center justify-center gap-2 text-center">
              <p className="font-medium text-slate-700 dark:text-slate-300">
                No deals yet.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Create the first deal for this contact.
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="table-th">Title</th>
                      <th className="table-th">Stage</th>
                      <th className="table-th">Value</th>
                      <th className="table-th">Expected Close</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {contact.deals.map((deal) => (
                      <tr
                        key={deal.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      >
                        <td className="table-td font-medium text-slate-900 dark:text-slate-100">
                          {deal.title}
                        </td>
                        <td className="table-td">
                          <span className={`pill ${stageColor(deal.stage)}`}>
                            {deal.stage.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="table-td">
                          {formatCurrency(deal.value)}
                        </td>
                        <td className="table-td">
                          {formatDate(deal.expectedCloseDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 4: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/contacts/[id]/ContactDetailView.tsx
git commit -m "feat: implement deals tab on contact detail page"
```

---

### Task 5: Add the Edit Contact modal

**Files:**
- Modify: `src/app/contacts/[id]/ContactDetailView.tsx`

- [ ] **Step 1: Add Modal import**

Find (this is the expanded import line left by Task 4):
```tsx
import { formatCurrency, formatDate, stageColor, statusColor } from "@/lib/format";
```
Replace with:
```tsx
import Modal from "@/components/Modal";
import { formatCurrency, formatDate, stageColor, statusColor } from "@/lib/format";
```

- [ ] **Step 2: Add constants and type for the edit form**

Find:
```tsx
function initials(firstName: string, lastName: string): string {
```
Add the following block immediately **before** that line:
```tsx
const CONTACT_STATUSES: ContactStatus[] = [
  "LEAD",
  "QUALIFIED",
  "CUSTOMER",
  "CHURNED",
];

type ContactFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  status: ContactStatus;
  companyId: string;
};

```

- [ ] **Step 3: Add edit modal state and handlers inside the component**

Find:
```tsx
  const titleLine = [contact.title, contact.company?.name]
```
Add the following block immediately **before** that line:
```tsx
  const [editOpen, setEditOpen] = useState(false);
  const [contactForm, setContactForm] = useState<ContactFormState>({
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone ?? "",
    title: contact.title ?? "",
    status: contact.status,
    companyId: contact.companyId ?? "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEdit() {
    setContactForm({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone ?? "",
      title: contact.title ?? "",
      status: contact.status,
      companyId: contact.companyId ?? "",
    });
    setEditError(null);
    setEditOpen(true);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: contactForm.firstName,
          lastName: contactForm.lastName,
          email: contactForm.email,
          phone: contactForm.phone || null,
          title: contactForm.title || null,
          status: contactForm.status,
          companyId: contactForm.companyId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      const updatedCompany = saved.companyId
        ? companies.find((c) => c.id === saved.companyId) ?? null
        : null;
      setContact((prev) => ({
        ...prev,
        firstName: saved.firstName,
        lastName: saved.lastName,
        email: saved.email,
        phone: saved.phone,
        title: saved.title,
        status: saved.status,
        companyId: saved.companyId,
        company: updatedCompany,
      }));
      setEditOpen(false);
      router.refresh();
    } catch (err: any) {
      setEditError(err.message ?? "Something went wrong");
    } finally {
      setEditSubmitting(false);
    }
  }

```

- [ ] **Step 4: Wire the Edit Contact button**

Find:
```tsx
        <button className="btn-secondary" onClick={() => {}}>
          Edit Contact
        </button>
```
Replace with:
```tsx
        <button className="btn-secondary" onClick={openEdit}>
          Edit Contact
        </button>
```

- [ ] **Step 5: Add the edit modal JSX before the closing `</div>` of the component**

Find the last line of the return statement:
```tsx
    </div>
  );
}
```
Replace with:
```tsx
    </div>

      {/* Edit Contact modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Contact">
        <form onSubmit={submitEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name</label>
              <input
                className="input"
                required
                value={contactForm.firstName}
                onChange={(e) =>
                  setContactForm({ ...contactForm, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Last name</label>
              <input
                className="input"
                required
                value={contactForm.lastName}
                onChange={(e) =>
                  setContactForm({ ...contactForm, lastName: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={contactForm.email}
              onChange={(e) =>
                setContactForm({ ...contactForm, email: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={contactForm.phone}
                onChange={(e) =>
                  setContactForm({ ...contactForm, phone: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={contactForm.title}
                onChange={(e) =>
                  setContactForm({ ...contactForm, title: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={contactForm.status}
                onChange={(e) =>
                  setContactForm({
                    ...contactForm,
                    status: e.target.value as ContactStatus,
                  })
                }
              >
                {CONTACT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Company</label>
              <select
                className="input"
                value={contactForm.companyId}
                onChange={(e) =>
                  setContactForm({ ...contactForm, companyId: e.target.value })
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
          </div>
          {editError && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {editError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={editSubmitting}
            >
              {editSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 6: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/contacts/[id]/ContactDetailView.tsx
git commit -m "feat: add edit contact modal to detail page"
```

---

### Task 6: Add the New Deal modal

**Files:**
- Modify: `src/app/contacts/[id]/ContactDetailView.tsx`

- [ ] **Step 1: Add deal form constants and type**

Find:
```tsx
const CONTACT_STATUSES: ContactStatus[] = [
```
Add the following block immediately **before** that line:
```tsx
const DEAL_STAGES: DealStage[] = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

type DealFormState = {
  title: string;
  value: string;
  stage: DealStage;
  expectedCloseDate: string;
  companyId: string;
};

const EMPTY_DEAL_FORM: DealFormState = {
  title: "",
  value: "",
  stage: "PROSPECTING",
  expectedCloseDate: "",
  companyId: "",
};

```

- [ ] **Step 2: Add deal modal state and handler inside the component**

Find:
```tsx
  const [editOpen, setEditOpen] = useState(false);
```
Add the following block immediately **before** that line:
```tsx
  const [dealOpen, setDealOpen] = useState(false);
  const [dealForm, setDealForm] = useState<DealFormState>(EMPTY_DEAL_FORM);
  const [dealSubmitting, setDealSubmitting] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);

  async function submitDeal(e: React.FormEvent) {
    e.preventDefault();
    setDealSubmitting(true);
    setDealError(null);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: dealForm.title,
          value: dealForm.value ? parseFloat(dealForm.value) : 0,
          stage: dealForm.stage,
          expectedCloseDate: dealForm.expectedCloseDate || null,
          contactId: contact.id,
          companyId: dealForm.companyId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      const newDeal: Deal = {
        id: saved.id,
        title: saved.title,
        value: String(saved.value),
        stage: saved.stage,
        expectedCloseDate: saved.expectedCloseDate,
        closedAt: saved.closedAt,
        companyId: saved.companyId,
        contactId: saved.contactId,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };
      setContact((prev) => ({
        ...prev,
        deals: [newDeal, ...prev.deals],
      }));
      setDealForm(EMPTY_DEAL_FORM);
      setDealOpen(false);
      router.refresh();
    } catch (err: any) {
      setDealError(err.message ?? "Something went wrong");
    } finally {
      setDealSubmitting(false);
    }
  }

```

- [ ] **Step 3: Wire the "+ New Deal" button**

Find:
```tsx
            <button className="btn-primary" onClick={() => {}}>
              + New Deal
            </button>
```
Replace with:
```tsx
            <button
              className="btn-primary"
              onClick={() => {
                setDealForm(EMPTY_DEAL_FORM);
                setDealError(null);
                setDealOpen(true);
              }}
            >
              + New Deal
            </button>
```

- [ ] **Step 4: Add the new deal modal JSX**

Find:
```tsx
      {/* Edit Contact modal */}
```
Add the following block immediately **before** that line:
```tsx
      {/* New Deal modal */}
      <Modal open={dealOpen} onClose={() => setDealOpen(false)} title="New Deal">
        <form onSubmit={submitDeal} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              placeholder="e.g. Q3 Expansion"
              value={dealForm.title}
              onChange={(e) =>
                setDealForm({ ...dealForm, title: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Value ($)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={dealForm.value}
                onChange={(e) =>
                  setDealForm({ ...dealForm, value: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Stage</label>
              <select
                className="input"
                value={dealForm.stage}
                onChange={(e) =>
                  setDealForm({
                    ...dealForm,
                    stage: e.target.value as DealStage,
                  })
                }
              >
                {DEAL_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Expected close date</label>
              <input
                className="input"
                type="date"
                value={dealForm.expectedCloseDate}
                onChange={(e) =>
                  setDealForm({
                    ...dealForm,
                    expectedCloseDate: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="label">Company</label>
              <select
                className="input"
                value={dealForm.companyId}
                onChange={(e) =>
                  setDealForm({ ...dealForm, companyId: e.target.value })
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
          </div>
          <div>
            <label className="label">Contact</label>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {contact.firstName} {contact.lastName}
            </p>
          </div>
          {dealError && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {dealError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setDealOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={dealSubmitting}
            >
              {dealSubmitting ? "Saving…" : "Create deal"}
            </button>
          </div>
        </form>
      </Modal>

```

- [ ] **Step 5: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/contacts/[id]/ContactDetailView.tsx
git commit -m "feat: add new deal modal to contact detail page"
```

---

## Manual verification checklist

After all tasks are complete:

- [ ] Visit `/contacts` — contact names are underlined links
- [ ] Click a contact name — navigates to `/contacts/[id]`
- [ ] Header shows avatar initials, name, status pill, title + company, email and phone
- [ ] Clicking "Edit Contact" opens the modal pre-filled; saving updates the header in place
- [ ] Deals tab shows the deal table (or empty state if no deals)
- [ ] Pipeline total excludes CLOSED_LOST deals
- [ ] "+ New Deal" opens the modal with the contact pre-filled and read-only; creating a deal adds it to the table instantly
- [ ] Activity and Tasks tabs show "coming soon" messages
- [ ] Visit `/contacts/nonexistent-id` — renders the Next.js 404 page
