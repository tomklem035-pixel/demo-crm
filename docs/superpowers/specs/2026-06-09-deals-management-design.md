# Deals Management — Design Spec

**Date:** 2026-06-09  
**Status:** Approved

---

## Overview

Add a Deals management page to the existing demo-crm (Next.js 14, Prisma, PostgreSQL, Railway). The page lets users create, view, edit, and delete deals. It follows the same table + modal CRUD pattern used by Contacts and Companies, requiring no new dependencies and no schema changes.

---

## What Already Exists

- `Deal` model in `prisma/schema.prisma` with fields: `id`, `title`, `value`, `stage`, `expectedCloseDate`, `closedAt`, `companyId`, `contactId`, `createdAt`, `updatedAt`
- `DealStage` enum: `PROSPECTING`, `QUALIFICATION`, `PROPOSAL`, `NEGOTIATION`, `CLOSED_WON`, `CLOSED_LOST`
- Deals shown in Dashboard (recent deals list) and Analytics (pipeline charts, KPIs)
- No dedicated Deals page, no API routes for deals

---

## New Files

### `src/app/deals/page.tsx`
Server component. Fetches all deals ordered by `createdAt desc`, includes `company { id, name }` and `contact { id, firstName, lastName }`. Also fetches all companies and contacts for the modal dropdowns. Passes data to `DealsView`.

### `src/app/deals/DealsView.tsx`
Client component. Renders:
- `PageHeader` with title "Deals", subtitle showing total count + total pipeline value + won value (computed client-side)
- Search input (matches title or company name)
- Stage filter dropdown (ALL + each enum value)
- Table with columns: Title · Company · Contact · Stage · Value · Expected Close · Added · Actions
- Edit / Delete action buttons per row (same pattern as Contacts)
- Modal with form for create and edit

### `src/app/api/deals/route.ts`
- `GET` — `prisma.deal.findMany`, ordered by `createdAt desc`, includes company and contact
- `POST` — validates `title` required, `stage` must be valid enum; creates deal; returns 201

### `src/app/api/deals/[id]/route.ts`
- `PATCH` — partial update; same validations as POST; returns updated deal with includes
- `DELETE` — hard delete; returns 204

---

## Form Fields

| Field | Input type | Required | Notes |
|---|---|---|---|
| title | text | yes | |
| value | number | no | USD, min 0 |
| stage | select | yes | Defaults to PROSPECTING |
| expectedCloseDate | date | no | |
| companyId | select | no | Lists all companies |
| contactId | select | no | Lists all contacts |

`closedAt` is not exposed in the form — it is set automatically server-side when stage changes to `CLOSED_WON` or `CLOSED_LOST` (set to `now()`), and cleared when stage moves back to an open stage.

---

## Sidebar

Add a "Deals" link in `src/components/Sidebar.tsx` between Companies and Analytics.

Icon path (SVG, 24×24): a simple tag/price-tag shape — `M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2`

---

## Data Flow

```
page.tsx (server)
  ├── prisma.deal.findMany (with company, contact)
  ├── prisma.company.findMany (for dropdown)
  └── prisma.contact.findMany (for dropdown)
        ↓
DealsView.tsx (client)
  ├── local state: deals[], search, stageFilter, open modal, form, submitting, error
  ├── filtered = useMemo over deals[]
  └── fetch → /api/deals or /api/deals/[id] on submit/delete
        ↓
  router.refresh() after mutation (revalidates server data)
```

---

## Error Handling

- 400 if `title` missing on POST/PATCH
- 400 if `stage` is not a valid enum value
- 500 with `{ error: "..." }` for unexpected DB errors
- Client shows inline error in modal (same red banner as Contacts/Companies)
- Delete uses `confirm()` dialog before firing (same pattern as other pages)

---

## Out of Scope

- Filtering contacts by selected company in the modal dropdown (nice-to-have, adds complexity)
- Deal detail/show page
- Pagination (existing pages don't paginate either)
- Bulk operations
