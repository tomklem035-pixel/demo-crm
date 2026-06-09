# Activities & Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add activity logging (calls, emails, notes) and task tracking to the CRM, surfaced on the Contact Detail Page and a new global `/tasks` page.

**Architecture:** Two new Prisma models (`Activity`, `Task`) with API routes following existing patterns. The Contact Detail Page gains a combined Activity tab (replacing the "coming soon" placeholders). A new `/tasks` server + client component pair handles the global task view grouped by due date.

**Tech Stack:** Next.js 14 App Router, Prisma, PostgreSQL, TypeScript, Tailwind CSS

---

### Task 1: Schema — add Activity and Task models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new models and relations to `prisma/schema.prisma`**

Add the following to the **end** of `prisma/schema.prisma`, and also add `activities Activity[]` and `tasks Task[]` to the existing `Contact` and `Deal` models:

```prisma
// Add inside model Contact (after the deals Deal[] line):
activities Activity[]
tasks      Task[]

// Add inside model Deal (after the updatedAt line):
activities Activity[]
tasks      Task[]

// Add at end of file:
model Activity {
  id        String       @id @default(cuid())
  type      ActivityType
  body      String
  contactId String?
  dealId    String?
  contact   Contact?     @relation(fields: [contactId], references: [id], onDelete: Cascade)
  deal      Deal?        @relation(fields: [dealId], references: [id], onDelete: Cascade)
  createdAt DateTime     @default(now())

  @@index([contactId])
  @@index([dealId])
}

enum ActivityType {
  CALL
  EMAIL
  NOTE
}

model Task {
  id        String    @id @default(cuid())
  title     String
  dueDate   DateTime?
  completed Boolean   @default(false)
  contactId String?
  dealId    String?
  contact   Contact?  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  deal      Deal?     @relation(fields: [dealId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now())

  @@index([contactId])
  @@index([dealId])
  @@index([completed])
  @@index([dueDate])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-activities-and-tasks
```

Expected: migration created and applied, Prisma client regenerated.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Activity and Task schema models"
```

---

### Task 2: API — POST /api/activities

**Files:**
- Create: `src/app/api/activities/route.ts`

- [ ] **Step 1: Create `src/app/api/activities/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["CALL", "EMAIL", "NOTE"] as const;
type ActivityType = (typeof ALLOWED_TYPES)[number];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, body: text, contactId, dealId } = body ?? {};

  if (!type || !ALLOWED_TYPES.includes(type as ActivityType)) {
    return NextResponse.json(
      { error: "type must be CALL, EMAIL, or NOTE" },
      { status: 400 },
    );
  }
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  try {
    const activity = await prisma.activity.create({
      data: {
        type: type as ActivityType,
        body: text.trim(),
        contactId: contactId || null,
        dealId: dealId || null,
      },
      include: {
        deal: { select: { id: true, title: true } },
      },
    });
    return NextResponse.json(activity, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2003") {
      return NextResponse.json(
        { error: "Referenced contact or deal not found" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/activities/route.ts
git commit -m "feat: add POST /api/activities"
```

---

### Task 3: API — tasks routes

**Files:**
- Create: `src/app/api/tasks/route.ts`
- Create: `src/app/api/tasks/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/tasks/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, dueDate, contactId, dealId } = body ?? {};

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        contactId: contactId || null,
        dealId: dealId || null,
      },
      include: {
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2003") {
      return NextResponse.json(
        { error: "Referenced contact or deal not found" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Create `src/app/api/tasks/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const { title, dueDate, completed, dealId, contactId } = body ?? {};

  if (
    title !== undefined &&
    (!title || typeof title !== "string" || !title.trim())
  ) {
    return NextResponse.json(
      { error: "title cannot be empty" },
      { status: 400 },
    );
  }

  try {
    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
        ...(completed !== undefined && { completed: Boolean(completed) }),
        ...(dealId !== undefined && { dealId: dealId || null }),
        ...(contactId !== undefined && { contactId: contactId || null }),
      },
      include: {
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(task);
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.task.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasks/route.ts src/app/api/tasks/[id]/route.ts
git commit -m "feat: add POST/PATCH/DELETE /api/tasks"
```

---

### Task 4: Sidebar — add Tasks link

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Add Tasks link between Pipeline and Analytics**

In `src/components/Sidebar.tsx`, find:

```tsx
  { href: "/pipeline", label: "Pipeline", icon: "M9 17V7m0 10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 10V7m0 10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2" },
  { href: "/analytics", label: "Analytics", icon: "M3 3v18h18M7 14l4-4 4 4 5-5" },
```

Replace with:

```tsx
  { href: "/pipeline", label: "Pipeline", icon: "M9 17V7m0 10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 10V7m0 10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2" },
  { href: "/tasks", label: "Tasks", icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { href: "/analytics", label: "Analytics", icon: "M3 3v18h18M7 14l4-4 4 4 5-5" },
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Tasks nav link to sidebar"
```

---

### Task 5: Contact Detail Page — Activity tab

**Files:**
- Modify: `src/app/contacts/[id]/page.tsx`
- Modify: `src/app/contacts/[id]/ContactDetailView.tsx`

- [ ] **Step 1: Overwrite `src/app/contacts/[id]/page.tsx`**

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
  const [contact, companies, contacts, activities, tasks] = await Promise.all([
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
    prisma.activity.findMany({
      where: { contactId: params.id },
      orderBy: { createdAt: "desc" },
      include: { deal: { select: { id: true, title: true } } },
    }),
    prisma.task.findMany({
      where: { contactId: params.id, completed: false },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: { deal: { select: { id: true, title: true } } },
    }),
  ]);

  if (!contact) notFound();

  const serializedContact = {
    ...contact,
    company: contact.company
      ? {
          ...contact.company,
          annualRevenue: contact.company.annualRevenue.toString(),
        }
      : null,
    deals: contact.deals.map((d) => ({ ...d, value: d.value.toString() })),
  };

  const serializedActivities = activities.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

  const serializedTasks = tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <ContactDetailView
      contact={serializedContact}
      companies={companies}
      contacts={contacts}
      initialActivities={serializedActivities}
      initialTasks={serializedTasks}
    />
  );
}
```

- [ ] **Step 2: Overwrite `src/app/contacts/[id]/ContactDetailView.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { formatCurrency, formatDate, stageColor, statusColor } from "@/lib/format";

type ContactStatus = "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED";
type DealStage =
  | "PROSPECTING"
  | "QUALIFICATION"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST";
type ActivityType = "CALL" | "EMAIL" | "NOTE";
type Tab = "deals" | "activity";

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
  company: { id: string; name: string; annualRevenue: string } | null;
  deals: Deal[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

type Activity = {
  id: string;
  type: ActivityType;
  body: string;
  contactId: string | null;
  dealId: string | null;
  deal: { id: string; title: string } | null;
  createdAt: string;
};

type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  contactId: string | null;
  dealId: string | null;
  deal: { id: string; title: string } | null;
  createdAt: string;
};

type Company = { id: string; name: string };
type ContactOption = { id: string; firstName: string; lastName: string };
type LogForm = { type: ActivityType; body: string; dealId: string };
type TaskForm = { title: string; dueDate: string; dealId: string };

const DEAL_STAGES: DealStage[] = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

const CONTACT_STATUSES: ContactStatus[] = [
  "LEAD",
  "QUALIFIED",
  "CUSTOMER",
  "CHURNED",
];

const ACTIVITY_TYPES: ActivityType[] = ["CALL", "EMAIL", "NOTE"];

const ACTIVITY_ICON: Record<ActivityType, { emoji: string; bg: string }> = {
  CALL:  { emoji: "📞", bg: "bg-indigo-500" },
  EMAIL: { emoji: "✉️", bg: "bg-amber-500" },
  NOTE:  { emoji: "📝", bg: "bg-slate-500" },
};

type DealFormState = {
  title: string;
  value: string;
  stage: DealStage;
  expectedCloseDate: string;
  companyId: string;
};

type ContactFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  status: ContactStatus;
  companyId: string;
};

const EMPTY_DEAL_FORM: DealFormState = {
  title: "",
  value: "",
  stage: "PROSPECTING",
  expectedCloseDate: "",
  companyId: "",
};

const EMPTY_LOG_FORM: LogForm = { type: "CALL", body: "", dealId: "" };
const EMPTY_TASK_FORM: TaskForm = { title: "", dueDate: "", dealId: "" };

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

function shortDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

export default function ContactDetailView({
  contact: initialContact,
  companies,
  contacts,
  initialActivities,
  initialTasks,
}: {
  contact: Contact;
  companies: Company[];
  contacts: ContactOption[];
  initialActivities: Activity[];
  initialTasks: Task[];
}) {
  const router = useRouter();
  const [contact, setContact] = useState<Contact>(initialContact);
  const [tab, setTab] = useState<Tab>("deals");

  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState<LogForm>(EMPTY_LOG_FORM);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskForm>(EMPTY_TASK_FORM);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskForm, setEditTaskForm] = useState<TaskForm>(EMPTY_TASK_FORM);
  const [editTaskSubmitting, setEditTaskSubmitting] = useState(false);
  const [editTaskError, setEditTaskError] = useState<string | null>(null);
  const [taskCompleteError, setTaskCompleteError] = useState<{
    taskId: string;
    message: string;
  } | null>(null);

  const [dealOpen, setDealOpen] = useState(false);
  const [dealForm, setDealForm] = useState<DealFormState>(EMPTY_DEAL_FORM);
  const [dealSubmitting, setDealSubmitting] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);

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

  async function submitLog(e: React.FormEvent) {
    e.preventDefault();
    setLogSubmitting(true);
    setLogError(null);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: logForm.type,
          body: logForm.body,
          contactId: contact.id,
          dealId: logForm.dealId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      setActivities((prev) => [
        {
          id: saved.id,
          type: saved.type,
          body: saved.body,
          contactId: saved.contactId,
          dealId: saved.dealId,
          deal: saved.deal,
          createdAt: saved.createdAt,
        },
        ...prev,
      ]);
      setLogForm(EMPTY_LOG_FORM);
      setLogOpen(false);
    } catch (err: any) {
      setLogError(err.message ?? "Something went wrong");
    } finally {
      setLogSubmitting(false);
    }
  }

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    setTaskSubmitting(true);
    setTaskError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskForm.title,
          dueDate: taskForm.dueDate || null,
          contactId: contact.id,
          dealId: taskForm.dealId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      setTasks((prev) =>
        sortTasks([
          ...prev,
          {
            id: saved.id,
            title: saved.title,
            dueDate: saved.dueDate,
            completed: saved.completed,
            contactId: saved.contactId,
            dealId: saved.dealId,
            deal: saved.deal,
            createdAt: saved.createdAt,
          },
        ])
      );
      setTaskForm(EMPTY_TASK_FORM);
      setTaskOpen(false);
    } catch (err: any) {
      setTaskError(err.message ?? "Something went wrong");
    } finally {
      setTaskSubmitting(false);
    }
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setEditTaskForm({
      title: task.title,
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
      dealId: task.dealId ?? "",
    });
    setEditTaskError(null);
    setEditTaskOpen(true);
  }

  async function submitEditTask(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTask) return;
    setEditTaskSubmitting(true);
    setEditTaskError(null);
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTaskForm.title,
          dueDate: editTaskForm.dueDate || null,
          dealId: editTaskForm.dealId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      setTasks((prev) =>
        sortTasks(
          prev.map((t) =>
            t.id === saved.id
              ? {
                  ...t,
                  title: saved.title,
                  dueDate: saved.dueDate,
                  dealId: saved.dealId,
                  deal: saved.deal,
                }
              : t
          )
        )
      );
      setEditTaskOpen(false);
      setEditingTask(null);
    } catch (err: any) {
      setEditTaskError(err.message ?? "Something went wrong");
    } finally {
      setEditTaskSubmitting(false);
    }
  }

  async function deleteTask() {
    if (!editingTask) return;
    setEditTaskSubmitting(true);
    setEditTaskError(null);
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      setTasks((prev) => prev.filter((t) => t.id !== editingTask.id));
      setEditTaskOpen(false);
      setEditingTask(null);
    } catch (err: any) {
      setEditTaskError(err.message ?? "Something went wrong");
    } finally {
      setEditTaskSubmitting(false);
    }
  }

  async function completeTask(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setTaskCompleteError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error("Failed to complete task");
    } catch {
      setTasks((prev) => sortTasks([task, ...prev]));
      setTaskCompleteError({ taskId: task.id, message: "Failed — try again" });
      setTimeout(() => setTaskCompleteError(null), 3000);
    }
  }

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
      setContact((prev) => ({
        ...prev,
        deals: [
          {
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
          },
          ...prev.deals,
        ],
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
      setContact((prev) => ({
        ...prev,
        firstName: saved.firstName,
        lastName: saved.lastName,
        email: saved.email,
        phone: saved.phone,
        title: saved.title,
        status: saved.status,
        companyId: saved.companyId,
        company: saved.company,
      }));
      setEditOpen(false);
      router.refresh();
    } catch (err: any) {
      setEditError(err.message ?? "Something went wrong");
    } finally {
      setEditSubmitting(false);
    }
  }

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
        <button className="btn-secondary" onClick={openEdit}>
          Edit Contact
        </button>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <nav className="flex -mb-px">
          {(["deals", "activity"] as Tab[]).map((t) => (
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
                : "Activity"}
            </button>
          ))}
        </nav>
      </div>

      {/* Deals tab */}
      {tab === "deals" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {contact.deals.length}{" "}
              {contact.deals.length === 1 ? "deal" : "deals"}
              {pipelineDeals.length > 0 &&
                ` · ${formatCurrency(pipelineValue)} pipeline`}
            </p>
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

      {/* Activity tab */}
      {tab === "activity" && (
        <div className="flex flex-col gap-6">
          <div className="flex gap-2">
            <button
              className="btn-primary"
              onClick={() => {
                setLogForm(EMPTY_LOG_FORM);
                setLogError(null);
                setLogOpen(true);
              }}
            >
              + Log activity
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setTaskForm(EMPTY_TASK_FORM);
                setTaskError(null);
                setTaskOpen(true);
              }}
            >
              + Add task
            </button>
          </div>

          {/* Open tasks */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
              Open Tasks
            </p>
            {tasks.length === 0 ? (
              <div className="card p-6 flex items-center justify-center">
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  No open tasks.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {tasks.map((task) => {
                  const overdue = isOverdue(task.dueDate);
                  const completeErr =
                    taskCompleteError?.taskId === task.id
                      ? taskCompleteError.message
                      : null;
                  return (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
                        overdue
                          ? "bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30"
                          : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand-600 cursor-pointer"
                        onChange={() => completeTask(task)}
                      />
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => openEditTask(task)}
                          className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 text-left w-full"
                        >
                          {task.title}
                        </button>
                        {task.deal && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {task.deal.title}
                          </p>
                        )}
                        {completeErr && (
                          <p className="text-xs text-rose-500 mt-1">
                            {completeErr}
                          </p>
                        )}
                      </div>
                      {task.dueDate && (
                        <span
                          className={`text-xs font-medium flex-shrink-0 ${
                            overdue
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {overdue ? "Overdue · " : ""}
                          {shortDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activity history */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
              History
            </p>
            {activities.length === 0 ? (
              <div className="card p-6 flex items-center justify-center">
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  No activity logged yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {activities.map((activity) => {
                  const icon = ACTIVITY_ICON[activity.type];
                  return (
                    <div
                      key={activity.id}
                      className="flex gap-3 items-start"
                    >
                      <div
                        className={`w-7 h-7 rounded-full ${icon.bg} flex items-center justify-center text-sm flex-shrink-0 mt-0.5`}
                      >
                        {icon.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 dark:text-slate-100 leading-snug">
                          {activity.body}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {activity.type.charAt(0) +
                            activity.type.slice(1).toLowerCase()}
                          {activity.deal ? ` · ${activity.deal.title}` : ""}
                          {" · "}
                          {new Date(activity.createdAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Edit Contact modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Contact"
      >
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

      {/* Log Activity modal */}
      <Modal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="Log Activity"
      >
        <form onSubmit={submitLog} className="space-y-4">
          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              {ACTIVITY_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLogForm({ ...logForm, type: t })}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    logForm.type === t
                      ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-400"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {ACTIVITY_ICON[t].emoji}{" "}
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              required
              rows={4}
              placeholder="What happened?"
              value={logForm.body}
              onChange={(e) =>
                setLogForm({ ...logForm, body: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Related deal (optional)</label>
            <select
              className="input"
              value={logForm.dealId}
              onChange={(e) =>
                setLogForm({ ...logForm, dealId: e.target.value })
              }
            >
              <option value="">— None —</option>
              {contact.deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
          {logError && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {logError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setLogOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={logSubmitting}
            >
              {logSubmitting ? "Saving…" : "Log activity"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Task modal */}
      <Modal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        title="Add Task"
      >
        <form onSubmit={submitTask} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              placeholder="e.g. Send updated proposal"
              value={taskForm.title}
              onChange={(e) =>
                setTaskForm({ ...taskForm, title: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Due date (optional)</label>
            <input
              className="input"
              type="date"
              value={taskForm.dueDate}
              onChange={(e) =>
                setTaskForm({ ...taskForm, dueDate: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Related deal (optional)</label>
            <select
              className="input"
              value={taskForm.dealId}
              onChange={(e) =>
                setTaskForm({ ...taskForm, dealId: e.target.value })
              }
            >
              <option value="">— None —</option>
              {contact.deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
          {taskError && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {taskError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setTaskOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={taskSubmitting}
            >
              {taskSubmitting ? "Saving…" : "Add task"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Task modal */}
      <Modal
        open={editTaskOpen}
        onClose={() => setEditTaskOpen(false)}
        title="Edit Task"
      >
        <form onSubmit={submitEditTask} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              value={editTaskForm.title}
              onChange={(e) =>
                setEditTaskForm({ ...editTaskForm, title: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Due date (optional)</label>
            <input
              className="input"
              type="date"
              value={editTaskForm.dueDate}
              onChange={(e) =>
                setEditTaskForm({ ...editTaskForm, dueDate: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Related deal (optional)</label>
            <select
              className="input"
              value={editTaskForm.dealId}
              onChange={(e) =>
                setEditTaskForm({ ...editTaskForm, dealId: e.target.value })
              }
            >
              <option value="">— None —</option>
              {contact.deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
          {editTaskError && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {editTaskError}
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium"
              onClick={deleteTask}
              disabled={editTaskSubmitting}
            >
              Delete
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditTaskOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={editTaskSubmitting}
              >
                {editTaskSubmitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/contacts/[id]/page.tsx src/app/contacts/[id]/ContactDetailView.tsx
git commit -m "feat: add Activity tab to contact detail page"
```

---

### Task 6: Global Tasks page

**Files:**
- Create: `src/app/tasks/page.tsx`
- Create: `src/app/tasks/TasksView.tsx`

- [ ] **Step 1: Create `src/app/tasks/page.tsx`**

```tsx
import { prisma } from "@/lib/prisma";
import TasksView from "./TasksView";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, contacts, deals] = await Promise.all([
    prisma.task.findMany({
      where: { completed: false },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
    }),
    prisma.contact.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.deal.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const serializedTasks = tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <TasksView initialTasks={serializedTasks} contacts={contacts} deals={deals} />
  );
}
```

- [ ] **Step 2: Create `src/app/tasks/TasksView.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";

type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  contactId: string | null;
  dealId: string | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  deal: { id: string; title: string } | null;
  createdAt: string;
};

type ContactOption = { id: string; firstName: string; lastName: string };
type DealOption = { id: string; title: string };
type TaskForm = {
  title: string;
  dueDate: string;
  contactId: string;
  dealId: string;
};

const EMPTY_FORM: TaskForm = {
  title: "",
  dueDate: "",
  contactId: "",
  dealId: "",
};

type Group = "overdue" | "today" | "this-week" | "later" | "no-date";

const GROUP_CONFIG: Record<Group, { label: string; color: string }> = {
  overdue:     { label: "Overdue",      color: "text-orange-600 dark:text-orange-400" },
  today:       { label: "Today",        color: "text-brand-600 dark:text-brand-400" },
  "this-week": { label: "This Week",    color: "text-slate-600 dark:text-slate-400" },
  later:       { label: "Later",        color: "text-slate-600 dark:text-slate-400" },
  "no-date":   { label: "No Due Date",  color: "text-slate-600 dark:text-slate-400" },
};

const GROUP_ORDER: Group[] = ["overdue", "today", "this-week", "later", "no-date"];

function getGroup(dueDate: string | null): Group {
  if (!dueDate) return "no-date";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const due = new Date(dueDate);
  if (due < today) return "overdue";
  if (due < tomorrow) return "today";
  if (due < nextWeek) return "this-week";
  return "later";
}

function shortDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TasksView({
  initialTasks,
  contacts,
  deals,
}: {
  initialTasks: Task[];
  contacts: ContactOption[];
  deals: DealOption[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<TaskForm>(EMPTY_FORM);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<TaskForm>(EMPTY_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [completeError, setCompleteError] = useState<{
    taskId: string;
    message: string;
  } | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<Group, Task[]> = {
      overdue: [],
      today: [],
      "this-week": [],
      later: [],
      "no-date": [],
    };
    for (const task of tasks) {
      groups[getGroup(task.dueDate)].push(task);
    }
    return groups;
  }, [tasks]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title,
          dueDate: createForm.dueDate || null,
          contactId: createForm.contactId || null,
          dealId: createForm.dealId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      setTasks((prev) => [
        {
          id: saved.id,
          title: saved.title,
          dueDate: saved.dueDate,
          completed: saved.completed,
          contactId: saved.contactId,
          dealId: saved.dealId,
          contact: saved.contact,
          deal: saved.deal,
          createdAt: saved.createdAt,
        },
        ...prev,
      ]);
      setCreateForm(EMPTY_FORM);
      setCreateOpen(false);
    } catch (err: any) {
      setCreateError(err.message ?? "Something went wrong");
    } finally {
      setCreateSubmitting(false);
    }
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
      contactId: task.contactId ?? "",
      dealId: task.dealId ?? "",
    });
    setEditError(null);
    setEditOpen(true);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTask) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          dueDate: editForm.dueDate || null,
          contactId: editForm.contactId || null,
          dealId: editForm.dealId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === saved.id
            ? {
                ...t,
                title: saved.title,
                dueDate: saved.dueDate,
                contactId: saved.contactId,
                dealId: saved.dealId,
                contact: saved.contact,
                deal: saved.deal,
              }
            : t
        )
      );
      setEditOpen(false);
      setEditingTask(null);
    } catch (err: any) {
      setEditError(err.message ?? "Something went wrong");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function deleteTask() {
    if (!editingTask) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      setTasks((prev) => prev.filter((t) => t.id !== editingTask.id));
      setEditOpen(false);
      setEditingTask(null);
    } catch (err: any) {
      setEditError(err.message ?? "Something went wrong");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function completeTask(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setCompleteError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error("Failed to complete task");
    } catch {
      setTasks((prev) => [task, ...prev]);
      setCompleteError({ taskId: task.id, message: "Failed — try again" });
      setTimeout(() => setCompleteError(null), 3000);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {tasks.length} open
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setCreateForm(EMPTY_FORM);
            setCreateError(null);
            setCreateOpen(true);
          }}
        >
          + New Task
        </button>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center gap-2 text-center">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            All caught up!
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No open tasks. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {GROUP_ORDER.map((group) => {
            const groupTasks = grouped[group];
            if (groupTasks.length === 0) return null;
            const { label, color } = GROUP_CONFIG[group];
            return (
              <div key={group}>
                <p
                  className={`text-xs font-bold uppercase tracking-wide mb-2 ${color}`}
                >
                  {label}
                </p>
                <div className="flex flex-col gap-2">
                  {groupTasks.map((task) => {
                    const overdue = group === "overdue";
                    const completeErr =
                      completeError?.taskId === task.id
                        ? completeError.message
                        : null;
                    const contactName = task.contact
                      ? `${task.contact.firstName} ${task.contact.lastName}`
                      : null;
                    return (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
                          overdue
                            ? "bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30"
                            : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand-600 cursor-pointer"
                          onChange={() => completeTask(task)}
                        />
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => openEdit(task)}
                            className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 text-left w-full"
                          >
                            {task.title}
                          </button>
                          {(contactName || task.deal) && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {contactName && task.contactId ? (
                                <Link
                                  href={`/contacts/${task.contactId}`}
                                  className="hover:text-brand-600 dark:hover:text-brand-400"
                                >
                                  {contactName}
                                </Link>
                              ) : (
                                contactName
                              )}
                              {contactName && task.deal ? " · " : ""}
                              {task.deal?.title}
                            </p>
                          )}
                          {completeErr && (
                            <p className="text-xs text-rose-500 mt-1">
                              {completeErr}
                            </p>
                          )}
                        </div>
                        {task.dueDate && (
                          <span
                            className={`text-xs font-medium flex-shrink-0 ${
                              overdue
                                ? "text-orange-600 dark:text-orange-400"
                                : "text-slate-400 dark:text-slate-500"
                            }`}
                          >
                            {shortDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Task modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Task"
      >
        <form onSubmit={createTask} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              placeholder="e.g. Send updated proposal"
              value={createForm.title}
              onChange={(e) =>
                setCreateForm({ ...createForm, title: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Due date (optional)</label>
            <input
              className="input"
              type="date"
              value={createForm.dueDate}
              onChange={(e) =>
                setCreateForm({ ...createForm, dueDate: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contact (optional)</label>
              <select
                className="input"
                value={createForm.contactId}
                onChange={(e) =>
                  setCreateForm({ ...createForm, contactId: e.target.value })
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
            <div>
              <label className="label">Deal (optional)</label>
              <select
                className="input"
                value={createForm.dealId}
                onChange={(e) =>
                  setCreateForm({ ...createForm, dealId: e.target.value })
                }
              >
                <option value="">— None —</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {createError && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {createError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={createSubmitting}
            >
              {createSubmitting ? "Saving…" : "Create task"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Task modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Task"
      >
        <form onSubmit={submitEdit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              value={editForm.title}
              onChange={(e) =>
                setEditForm({ ...editForm, title: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Due date (optional)</label>
            <input
              className="input"
              type="date"
              value={editForm.dueDate}
              onChange={(e) =>
                setEditForm({ ...editForm, dueDate: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contact (optional)</label>
              <select
                className="input"
                value={editForm.contactId}
                onChange={(e) =>
                  setEditForm({ ...editForm, contactId: e.target.value })
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
            <div>
              <label className="label">Deal (optional)</label>
              <select
                className="input"
                value={editForm.dealId}
                onChange={(e) =>
                  setEditForm({ ...editForm, dealId: e.target.value })
                }
              >
                <option value="">— None —</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
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
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium"
              onClick={deleteTask}
              disabled={editSubmitting}
            >
              Delete
            </button>
            <div className="flex gap-2">
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
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/tasks/page.tsx src/app/tasks/TasksView.tsx
git commit -m "feat: add global tasks page"
```

---

## Manual verification checklist

After all tasks complete:

- [ ] "Tasks" appears in the sidebar between Pipeline and Analytics
- [ ] `/tasks` renders with grouped sections (Overdue / Today / This Week / Later / No Due Date)
- [ ] Creating a task from `/tasks` adds it to the correct group immediately
- [ ] Completing a task removes it from the list; reverts and shows error on API failure
- [ ] Clicking a task title opens Edit modal; changes persist; Delete removes the task
- [ ] Contact detail page `/contacts/[id]` has Deals and Activity tabs (no Tasks tab)
- [ ] Activity tab shows "+ Log activity" and "+ Add task" buttons
- [ ] Logging a call/email/note prepends it to the History feed with correct icon
- [ ] Adding a task from the Activity tab adds it to Open Tasks, sorted by due date
- [ ] Overdue tasks have amber background
- [ ] Completing a task from Activity tab removes it; reverts on failure
- [ ] Log Activity modal shows the contact's deals in the "Related deal" dropdown
