# SHEDS Marketing Site — Design Spec

**Date:** 2026-07-14
**Status:** Approved

---

## Problem

SHEDS (industrial/warehouse leasing + property sales & investment brokerage) has no public-facing website. Angus wants a marketing site targeted primarily at investors and landlords, that also captures leasing/investment inquiries as leads directly into the existing demo-crm as `Contact` records — without exposing the CRM's real API to unauthenticated internet traffic.

---

## Goals

1. A standalone public marketing site for SHEDS: Home, Properties, About, Contact.
2. Visual identity built around the existing `public/logo.png` (red `#E31C3D` / near-black `#1A1A1A` / cream `#F5F1E8`), in an "Institutional Trust" style — credible, restrained, investor-facing.
3. Contact form submissions land as `LEAD` contacts (with the inquiry message) in the demo-crm, without opening a fully public unauthenticated write endpoint on the CRM's real contacts API.
4. Ship as its own deployable project, independent of the CRM's release cycle.

**Out of scope:** a real property database/CMS, tenant- or self-service portal features, authentication on the marketing site itself, analytics/SEO tooling, blog/news section.

---

## Architecture

Two separate Next.js 14 (App Router, TypeScript, Tailwind CSS) projects, each with its own GitHub repo and Railway service:

- **`demo-crm`** (existing, this repo) — gains one new public API route.
- **`sheds-website`** (new) — sibling folder at `../sheds-website`, new GitHub repo, new Railway project. No database — all content is static/hard-coded in the repo.

The two projects communicate over HTTP: the marketing site's server-side `/api/inquiry` route forwards contact-form submissions to the CRM's new `/api/public/leads` route, authenticated with a shared secret set as an env var on both services.

```
Browser (sheds-website)
  → POST /api/inquiry (sheds-website server)
    → POST https://<crm-domain>/api/public/leads   [X-Leads-Secret header]
      → creates Contact (status: LEAD) + Activity (body: message) in demo-crm DB
```

---

## sheds-website: Pages

Shared layout: header (logo + nav: Properties / About / Contact), footer (contact info, copyright).

- **`/` Home** — hero section (headline, subhead, CTA to Properties), 3 featured properties pulled from the static list, a short "why SHEDS" strip (e.g. leasing + investment expertise), CTA to Contact.
- **`/properties`** — grid/list of static placeholder listings. Data source: `src/data/properties.ts`, an array of objects `{ id, name, location, sqft, type: "Lease" | "Investment", description, imageUrl }`. Ship with ~6 placeholder entries. No filtering/search — just a grid.
- **`/about`** — SHEDS positioning (leasing + investment brokerage for industrial property), placeholder team section (2-3 people, name/title/photo placeholder).
- **`/contact`** — inquiry form: `firstName`, `lastName`, `email`, `phone` (optional), `inquiryType` (radio: Leasing / Investment), `message` (textarea). Plus a hidden honeypot field (`companyWebsite` or similar, styled off-screen, never shown to real users). Client-side validation for required fields; submits via `fetch` to `/api/inquiry`. Shows a success message or inline error, doesn't navigate away.

---

## sheds-website: `POST /api/inquiry`

Server-side route (`src/app/api/inquiry/route.ts`) that:

1. Validates the request body — `firstName`, `lastName`, `email` required; rejects if the honeypot field is non-empty (return a fake success to avoid tipping off bots).
2. Forwards to `${CRM_BASE_URL}/api/public/leads` with header `X-Leads-Secret: ${LEADS_SHARED_SECRET}` and a JSON body: `{ firstName, lastName, email, phone, inquiryType, message }`.
3. Returns `{ ok: true }` on 201 from the CRM, or a generic error message on failure (never leaks the CRM's internal error detail to the browser).

Env vars: `CRM_BASE_URL` (the CRM's public Railway domain), `LEADS_SHARED_SECRET`.

---

## demo-crm: `POST /api/public/leads`

New file `src/app/api/public/leads/route.ts`:

1. Excluded from the NextAuth middleware — add `api/public` to the negative lookahead in `src/middleware.ts`'s matcher, alongside the existing `api/auth|api/health` exclusions.
2. Requires header `X-Leads-Secret` to exactly match env var `PUBLIC_LEADS_SECRET`; returns 401 if missing/mismatched.
3. Validates body: `firstName`, `lastName`, `email` required (same shape as the existing `/api/contacts` POST); `inquiryType` must be `"Leasing"` or `"Investment"` if present; `message` optional string, capped at 2000 chars.
4. Creates a `Contact`:
   - `status: "LEAD"`
   - `title`: `"Leasing Inquiry"` or `"Investment Inquiry"` based on `inquiryType` (or `null` if not provided)
   - `phone`: from body, or `null`
   - On unique-email conflict (`P2002`), same as the existing contacts route: return 409 rather than erroring — but since this is a public endpoint, treat 409 as a non-fatal "already have you" case and still return success-shaped `{ ok: true }` to the caller (don't leak whether an email already exists in the CRM to the public internet).
5. If `message` is non-empty, also creates a linked `Activity`: `type: "NOTE"` (a valid `ActivityType` enum value per `prisma/schema.prisma`), `body: message`, `contactId: <new contact's id>`.
6. Returns `201 { ok: true }` on success.

Env var: `PUBLIC_LEADS_SECRET` (same value must be set on both the demo-crm and sheds-website Railway services).

---

## Visual Design

"Institutional Trust" direction (validated via visual mockup during brainstorming):

- Background: cream `#F5F1E8`
- Text: near-black `#1A1A1A`
- Accent (CTAs, links, small highlights only): red `#E31C3D`, matching the existing logo
- Typography: clean sans-serif (system stack or Inter), generous whitespace, restrained 1px borders instead of heavy shadows/gradients
- Logo: reuse `public/logo.png` from demo-crm (copy into `sheds-website/public/`)

Specific spacing/typography/component details to be worked out during implementation, following the `frontend-design` skill's guidance rather than over-specifying here.

---

## Deployment

1. `sheds-website`: new private GitHub repo (via `gh repo create`), new Railway project with its own web service, public domain generated via Railway (same flow as demo-crm's original setup, documented in `ARCHITECTURE.md`).
2. Set `PUBLIC_LEADS_SECRET` (generated random value) identically on the demo-crm Railway service and the sheds-website Railway service (as `LEADS_SHARED_SECRET`).
3. Set `CRM_BASE_URL` on sheds-website to the demo-crm's public Railway domain.
4. demo-crm's `/api/public/leads` route and `src/middleware.ts` change ship as a normal commit/deploy to the existing service — no new infra needed on the CRM side.

---

## Testing

- demo-crm: route-level tests (or manual `curl`) for `/api/public/leads` — missing secret (401), bad secret (401), missing required fields (400), happy path (201 + Contact + Activity created), duplicate email (still 201-shaped `{ok:true}`, no new Contact).
- sheds-website: manual verification of the Contact form — happy path creates a lead visible in the CRM's Contacts page; honeypot-filled submission is silently dropped; CRM unreachable/secret mismatch shows a graceful error in the browser, not a raw stack trace.
- Visual: manual check of Home/Properties/About/Contact pages against the approved "Institutional Trust" style at both desktop and mobile widths.
