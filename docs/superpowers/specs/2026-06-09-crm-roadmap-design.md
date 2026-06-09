# Demo CRM — Full Build Roadmap

**Date:** 2026-06-09  
**Status:** Approved

---

## Overview

Extend the existing Demo CRM (Next.js 14, Prisma, PostgreSQL, Railway) with seven additional modules beyond the core Contacts, Companies, and Analytics pages. Each module is built sequentially, with its own spec → implementation plan → code cycle.

---

## Module Order & Dependencies

| # | Module | Depends On | Status |
|---|--------|------------|--------|
| 1 | Deals Page | — | Spec approved (`2026-06-09-deals-management-design.md`) |
| 2 | Contact Detail Page | Deals Page | To be spec'd |
| 3 | Kanban Pipeline | Deals Page | To be spec'd |
| 4 | Activities & Tasks | Contact Detail Page | To be spec'd |
| 5 | Import / Export | — (after module 1) | To be spec'd |
| 6 | User Auth | Core features stable | To be spec'd |
| 7 | Email Integration | User Auth + Activities | To be spec'd |

---

## Module Summaries

### 1 — Deals Page
Table + modal CRUD for deals. Stage filter, search, value totals in header. Sidebar link between Companies and Analytics. Full spec already written and approved.

### 2 — Contact Detail Page
Dedicated `/contacts/[id]` page for each contact. Shows: contact info, linked company, their associated deals, activity timeline, open tasks. Becomes the hub that Activities and Tasks modules surface into.

### 3 — Kanban Pipeline
Drag-and-drop board view of deals organised by `DealStage`. Lives at `/pipeline`. No new schema — a second UI view over the existing Deal data. Stage columns with deal cards; dragging a card updates its stage via the existing `/api/deals/[id]` PATCH endpoint.

### 4 — Activities & Tasks
**Activities:** log calls, emails, and notes against a contact or deal. New `Activity` model: `type` (CALL | EMAIL | NOTE), `body`, `contactId?`, `dealId?`, `createdAt`.  
**Tasks:** to-do items with a due date and completion flag, linked to a contact or deal. New `Task` model: `title`, `dueDate?`, `completed`, `contactId?`, `dealId?`.  
Both surface in the Contact Detail Page timeline and a new global Tasks view.

### 5 — Import / Export
CSV import for Contacts and Companies (column mapping, validation, row-level error report). CSV export from any list view (Contacts, Companies, Deals). No new schema required.

### 6 — User Auth
Login and session management. Multiple users, each with their own account. Implemented with NextAuth.js (credentials provider initially; OAuth optional). New `User` model. Every page and API route protected. Existing data is not user-scoped in the first pass — auth gates access, it does not partition data between users.

### 7 — Email Integration
Send and receive emails linked to contacts, surfaced as Activity records. Requires a third-party provider (Resend for outbound; IMAP or a webhook-based provider for inbound). Requires User Auth to be in place (email is sent from the logged-in user's identity). Most complex module — scoped separately once Auth is stable.

---

## What Is Not In Scope (for any module)

- Mobile app or native client
- Real-time / WebSocket updates
- Reporting beyond the existing Analytics page (until explicitly requested)
- Multi-tenancy / per-org data isolation (Auth gates access; data is shared across users)
- Paid billing or subscription management
