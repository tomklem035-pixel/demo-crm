# Activities & Tasks — Design Spec

**Date:** 2026-06-09
**Status:** Approved
**Module:** 4 of 7

---

## Overview

Add two new capabilities to the CRM: an **activity log** (record calls, emails, and notes against a contact or deal) and **tasks** (to-do items with a due date, linked to a contact or deal). Both surface on the Contact Detail Page in a combined Activity tab, and tasks also have a dedicated global `/tasks` page.

No existing pages are restructured — this module adds a new tab to the Contact Detail Page, a new `/tasks` route, and a sidebar link.

---

## Schema

Two new Prisma models and one new enum:

```prisma
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

Both `contactId` and `dealId` are optional on each model — an activity or task can be linked to a contact, a deal, both, or neither. `onDelete: Cascade` ensures records are cleaned up when a linked contact or deal is deleted.

One migration required. No changes to existing models.

---

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/activities` | Create an activity |
| `POST` | `/api/tasks` | Create a task |
| `PATCH` | `/api/tasks/[id]` | Update a task (toggle completed, edit title/dueDate) |
| `DELETE` | `/api/tasks/[id]` | Delete a task |

Activities are **append-only** — no edit or delete endpoint. Mistaken entries are corrected by logging a new note. This keeps the relationship history trustworthy and the implementation simple.

### POST /api/activities — request body

```json
{
  "type": "CALL",
  "body": "Discussed revised pricing. They want a response by end of week.",
  "contactId": "clxxx",
  "dealId": "clyyy"
}
```

`type` and `body` are required. `contactId` and `dealId` are optional.

### POST /api/tasks — request body

```json
{
  "title": "Send updated proposal",
  "dueDate": "2026-06-18",
  "contactId": "clxxx",
  "dealId": "clyyy"
}
```

`title` is required. All other fields are optional.

### PATCH /api/tasks/[id] — request body

Partial update — any combination of fields:

```json
{
  "title": "Send revised proposal",
  "dueDate": "2026-06-20",
  "completed": true
}
```

### DELETE /api/tasks/[id]

No body required. Returns 204 on success.

---

## Contact Detail Page — Activity Tab

The Contact Detail Page (`/contacts/[id]`) gains a second tab: **Activity**, alongside the existing **Deals** tab.

### Tab content — top to bottom

**Action buttons (always visible at top):**
- `+ Log activity` — opens the Log Activity modal
- `+ Add task` — opens the Add Task modal

**Open Tasks section:**
- Lists all incomplete tasks linked to this contact, ordered by `dueDate` ascending (no due date last)
- Each task row: checkbox + title + due date badge
- Overdue tasks (dueDate < today) have an amber background and "Overdue · [date]" label
- Checking the checkbox immediately sends `PATCH /api/tasks/[id] { completed: true }` and removes the task from the list (optimistic)
- Clicking the task title opens the Edit Task modal

**History section:**
- All activities linked to this contact, ordered by `createdAt` descending (newest first)
- Each activity: type icon (📞 Call / ✉️ Email / 📝 Note) + body text + metadata line (`[Type] · [Deal name if set] · [date]`)
- Type icon background colours: Call → indigo, Email → amber, Note → slate

### Log Activity modal fields

| Field | Type | Required |
|-------|------|----------|
| Type | CALL / EMAIL / NOTE selector | Yes |
| Notes | Textarea | Yes |
| Related deal | Dropdown (this contact's deals only) | No |

After saving: activity prepended to the History feed. `contactId` set to the current contact. `dealId` set if a deal was selected.

### Add Task modal fields

| Field | Type | Required |
|-------|------|----------|
| Title | Text input | Yes |
| Due date | Date picker | No |
| Related deal | Dropdown (this contact's deals only) | No |

After saving: task prepended to the Open Tasks list. `contactId` set to the current contact.

### Edit Task modal fields

Same fields as Add Task. Also includes a **Delete** button (calls `DELETE /api/tasks/[id]`, removes task from list).

---

## Global Tasks Page — /tasks

A dedicated page at `/tasks` showing all incomplete tasks across the entire CRM, grouped by due date.

### Page header

- Title: "Tasks"
- Subtitle: count of open tasks (e.g., "4 open")
- `+ New Task` button — opens the New Task modal

### Groups (displayed in this order, group hidden if empty)

| Group | Condition |
|-------|-----------|
| Overdue | `dueDate < today` |
| Today | `dueDate = today` |
| This Week | `dueDate` within the next 7 days (excluding today) |
| Later | `dueDate > 7 days from today` |
| No due date | `dueDate` is null |

Each group has a coloured heading: Overdue → orange, Today → indigo, others → slate.

### Task row

Each row shows:
- Checkbox (complete → optimistically removed from list, `PATCH { completed: true }`)
- Task title (click → Edit Task modal)
- Linked contact name (if set) — shown as secondary text below the title
- Linked deal name (if set) — shown alongside the contact name
- Due date badge (right-aligned)

Overdue rows have an amber tinted background.

### New Task modal fields

| Field | Type | Required |
|-------|------|----------|
| Title | Text input | Yes |
| Due date | Date picker | No |
| Contact | Dropdown (all contacts) | No |
| Deal | Dropdown (all deals) | No |

After saving: task appears in the correct group immediately.

### Edit Task modal fields

Same as New Task. Includes a **Delete** button.

---

## Sidebar

A **Tasks** link is added between Pipeline and Analytics:

| Position | Label |
|----------|-------|
| 5 | Pipeline |
| 6 | **Tasks** ← new |
| 7 | Analytics |

---

## Files

| File | Type | Change |
|------|------|--------|
| `prisma/schema.prisma` | Schema | Add `Activity`, `Task` models and `ActivityType` enum |
| `prisma/migrations/...` | Migration | Generated by `prisma migrate dev` |
| `src/app/api/activities/route.ts` | API | `POST /api/activities` |
| `src/app/api/tasks/route.ts` | API | `POST /api/tasks` |
| `src/app/api/tasks/[id]/route.ts` | API | `PATCH` and `DELETE` |
| `src/app/tasks/page.tsx` | Server component | Fetch all open tasks, pass to client |
| `src/app/tasks/TasksView.tsx` | Client component | Grouped tasks board with modals |
| `src/app/contacts/[id]/ContactDetailView.tsx` | Modified | Add Activity tab (tasks + history + modals) |
| `src/components/Sidebar.tsx` | Modified | Add Tasks nav link |

---

## Error Handling

- **Log activity fails:** error shown inside the modal; activity not added to feed
- **Add task fails:** error shown inside the modal; task not added to list
- **Complete task fails:** task reverts to unchecked; brief inline error on the row
- **Delete task fails:** error shown inside the Edit Task modal

---

## What Is Not In Scope

- Editing activities (append-only log)
- Filtering the activity feed by type (CALL / EMAIL / NOTE)
- Showing completed tasks (they are removed from all views on completion)
- Recurring tasks
- Assigning tasks to users (no auth yet)
- Activity or task notifications
