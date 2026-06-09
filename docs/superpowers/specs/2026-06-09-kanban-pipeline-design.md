# Kanban Pipeline — Design Spec

**Date:** 2026-06-09
**Status:** Approved
**Module:** 3 of 7

---

## Overview

A drag-and-drop kanban board at `/pipeline` showing all active deals organised by stage. A second UI view over the existing Deal data — no schema changes, no new API routes. Dragging a card between columns updates the deal's stage via the existing PATCH endpoint.

---

## Entry Point

A **Pipeline** link is added to the sidebar navigation, between Deals and Analytics.

---

## Page Layout

### Header

- **Title:** "Pipeline"
- **Summary line:** total active deal count and combined pipeline value (sum of all non-closed deals), e.g. `5 deals · $1,335,000 total pipeline`
- **"+ New Deal" button** — top-right; opens the deal creation modal (same form as the Deals page). After creation, the new deal appears in the appropriate column immediately.

### Board

Four columns, one per active stage, rendered left to right:

| Column | Colour accent |
|--------|--------------|
| PROSPECTING | Slate (`#94a3b8`) |
| QUALIFICATION | Amber (`#f59e0b`) |
| PROPOSAL | Indigo (`#6366f1`) |
| NEGOTIATION | Orange (`#f97316`) |

CLOSED_WON and CLOSED_LOST deals are **not shown** on the board. The Deals table is the place to review closed deals.

**Column header:** stage colour dot + stage name + deal count badge + pipeline total for that column.

**Empty column:** subtle empty state — "No deals" in muted text. The column remains visible so deals can be dragged into it.

### Deal Cards

Each card displays:
- **Title** — bold, primary text
- **Contact or company** — small avatar circle (initials, coloured) + name. Show contact name if set; fall back to company name; show nothing if neither is set.
- **Value** — formatted as currency (e.g. `$240,000`)
- **Expected close date** — short format (e.g. `Jun 30`); `—` if not set
- **Stage colour accent** — 3px top border in the column's colour

---

## Interactions

### Drag to move stage

Powered by **@dnd-kit/core**. Dragging a card to another column:

1. Optimistically moves the card to the target column immediately
2. Sends `PATCH /api/deals/[id]` with `{ stage: newStage }`
3. On failure: reverts the card to its original column and shows a brief inline error on the card

### Click to edit

Clicking a card (without dragging) opens the deal edit modal — the same form fields as the Deals page (title, value, stage, contact, company, expected close date).

After saving:
- If the new stage is still an active stage: card updates in place in the correct column
- If the new stage is CLOSED_WON or CLOSED_LOST: card is removed from the board; pipeline totals update

### New Deal modal

Same creation form as the Deals page. After a successful save, the new deal is prepended to the appropriate column. The modal is self-contained in `PipelineView.tsx` — no refactoring of `DealsView.tsx`.

---

## Architecture

### No schema changes

Module 3 adds no new Prisma models or migrations.

### No new API routes

All mutations use the existing `PATCH /api/deals/[id]` and `POST /api/deals` endpoints.

### Files

| File | Type | Purpose |
|------|------|---------|
| `src/app/pipeline/page.tsx` | Server component | Fetches all active-stage deals (filtered to 4 stages) with company + contact, serialises Decimal values, fetches companies + contacts lists for the New Deal modal dropdowns |
| `src/app/pipeline/PipelineView.tsx` | Client component | Renders the board, handles drag-and-drop, manages edit modal and new-deal modal state |
| `src/components/Sidebar.tsx` | Modified | Adds "Pipeline" nav link between Deals and Analytics |

### Data fetched in `page.tsx`

```ts
const ACTIVE_STAGES = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION"];

const [deals, companies, contacts] = await Promise.all([
  prisma.deal.findMany({
    where: { stage: { in: ACTIVE_STAGES } },
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  }),
  prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  prisma.contact.findMany({
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  }),
]);
```

Deal `value` fields are serialised to strings before passing to the client (same pattern as `DealsPage` and `ContactDetailPage`).

### Drag-and-drop library

**@dnd-kit/core** — the modern standard for React drag-and-drop. Accessible, works with React 18 and Next.js 14, no deprecated dependencies.

Board state is managed as a `Record<DealStage, Deal[]>` map derived from the fetched deals, updated optimistically on drag and on modal save.

### Avatar colours

Contact/company initials avatars use a small fixed palette of colours (indigo, violet, emerald, rose, amber, slate) cycled by index position in the deal list. The colour is purely decorative — it does not need to be stable across page loads.

---

## Error Handling

- **Drag fails (PATCH returns error):** card reverts to original column; a small error message appears on the card for 3 seconds, then clears
- **New deal creation fails:** error shown inside the modal
- **Edit save fails:** error shown inside the edit modal

---

## What Is Not In Scope

- Filtering the board by contact, company, or date range
- Reordering cards within a column (only cross-column drag changes stage)
- Collapsed columns
- Deal detail page (not yet built)
- Pagination (no practical limit for early-stage usage)
