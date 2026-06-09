# Contact Detail Page — Design Spec

**Date:** 2026-06-09
**Status:** Approved
**Module:** 2 of 7

---

## Overview

A dedicated page at `/contacts/[id]` for each contact record. Shows all contact info in a header, with tabs below for Deals, Activity, and Tasks. Activity and Tasks tabs are placeholder empty states now; they become functional in Module 4.

---

## Entry Point

The contact's full name in the contacts list (`/contacts`) becomes a clickable link navigating to `/contacts/[id]`. No other changes to the list view.

---

## Page Layout

### Header (always visible)

A card at the top of the page showing:

- **Avatar** — initials derived from `firstName` and `lastName`, displayed in a coloured circle (brand indigo)
- **Full name** — `firstName lastName` as the page title
- **Status pill** — same colour coding as the contacts list (`statusColor` from `src/lib/format.ts`)
- **Title + company** — e.g. "VP of Engineering · Acme Corp"; company name is plain text (no link — company detail page is out of scope for this module)
- **Email** — styled as a `mailto:` link
- **Phone** — plain text, or `—` if absent
- **"Edit Contact" button** — opens the existing edit modal (reuses the modal already built in `ContactsView`); after saving, the detail page re-fetches and re-renders via `router.refresh()`
- **Back link** — `← Contacts` at the top-left, navigating to `/contacts`

### Tabs

Three tabs rendered below the header card:

| Tab | Module 2 behaviour |
|-----|--------------------|
| **Deals** | Fully functional (default active tab) |
| **Activity** | Empty state: "Activity logging coming soon." |
| **Tasks** | Empty state: "Task tracking coming soon." |

Tab state is local UI state (no URL change).

---

## Deals Tab

### Summary line
Above the table: deal count and total pipeline value (sum of all non-CLOSED_LOST deal values), e.g. `3 deals · $48,500 pipeline`.

### Deal table
Columns: **Title**, **Stage** (pill), **Value**, **Expected close date**. Ordered by `createdAt` descending. No pagination — contacts typically have few deals.

Each deal row links to nothing for now (deal detail page is not in scope).

### New Deal button
A "+ New Deal" button in the top-right of the Deals tab. Opens the existing deal creation modal (the same modal used on `/deals`) with the `contactId` field pre-populated and locked to this contact. Requires fetching the full companies and contacts lists (for the modal's dropdowns) in the server component.

After a deal is created successfully, the page re-fetches via `router.refresh()`.

---

## Architecture

### No schema changes

Module 2 adds no new Prisma models or migrations. It reads existing `Contact`, `Company`, and `Deal` data.

### Files

| File | Type | Purpose |
|------|------|---------|
| `src/app/contacts/[id]/page.tsx` | Server component | Fetches contact (with company + deals), plus all companies and contacts for the New Deal modal dropdowns. Returns 404 if contact not found. |
| `src/app/contacts/[id]/ContactDetailView.tsx` | Client component | Renders the header, tabs, deal table, and modals. Manages tab state, edit modal state, new-deal modal state. |
| `src/app/contacts/ContactsView.tsx` | Modified | Contact name becomes a `<Link href={/contacts/${c.id}}>` instead of plain text. |

### Data fetched in `page.tsx`

```ts
const [contact, companies, contacts] = await Promise.all([
  prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      deals: { orderBy: { createdAt: "desc" } },
    },
  }),
  prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  prisma.contact.findMany({
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  }),
]);

if (!contact) notFound();
```

Deal `value` fields are serialised to strings before passing to the client (same pattern as `DealsPage`).

### Reusing existing modals

`ContactDetailView` contains its own copy of both form blocks (edit-contact and new-deal). No refactoring of `ContactsView` or `DealsView` is required — duplication is acceptable here to keep each file self-contained.

The New Deal modal in `ContactDetailView` mirrors `DealsView`'s form with one difference: the contact selector is replaced by a read-only text line showing the contact's name (e.g. "Jane Doe"), and `contactId` is sent as a fixed value in the POST body. The user cannot change the contact from this modal.

---

## Error Handling

- Contact not found → `notFound()` (Next.js 404 page)
- Deal creation failure → error message inside the modal (same pattern as `DealsView`)
- Contact edit failure → error message inside the modal

---

## What Is Not In Scope

- Company detail page link from the contact header
- Activity tab functionality (Module 4)
- Tasks tab functionality (Module 4)
- Deal row click-through to a deal detail page
- Pagination of the deal table
- Deleting the contact from the detail page (deletion stays on the list view)
