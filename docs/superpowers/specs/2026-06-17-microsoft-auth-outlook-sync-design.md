# Microsoft Auth + Outlook Sync — Design Spec

**Date:** 2026-06-17
**Status:** Approved

---

## Problem

The CRM is currently public with no authentication. It needs to be locked to a single client user who logs in with their Microsoft account, and that same login should power Outlook contact/email/calendar import into the CRM.

---

## Goals

1. Only one authorised Microsoft account can access the CRM (enforced by `ALLOWED_EMAIL` env var).
2. After login, the client can import Outlook contacts into the CRM Contacts page.
3. After login, the client can sync recent emails and calendar events as NOTE activities against matching CRM contacts.
4. No new infrastructure required for the client — they just open the URL in a browser.

---

## Authentication Layer

**Library:** `next-auth` v4 with the Azure AD provider.

**Session mode:** JWT (no extra DB tables). The Microsoft access token is stored in the encrypted session cookie and exposed to server-side code via `getServerSession()`.

**Single-user enforcement:** A `ALLOWED_EMAIL` environment variable holds the client's Microsoft email. The `signIn` callback rejects any other account.

**Scopes requested at login:**
`openid email profile offline_access Contacts.Read Mail.Read Calendars.Read`

Requesting all scopes at login means the access token in the session already has Graph API permissions — no extra OAuth step needed when the user clicks a sync button.

**Route protection:** `src/middleware.ts` uses next-auth's built-in middleware. Any request to a non-auth route without a valid session cookie is redirected to `/login`.

**Login page:** `/login` — a full-page layout (no sidebar) with a single "Sign in with Microsoft" button.

---

## Layout Changes

A `Providers` client component wraps the app with `SessionProvider`. A `ClientShell` client component reads the pathname — if `/login`, it renders children full-page; otherwise it renders the existing Sidebar + main layout. This avoids restructuring any existing page files.

The Sidebar gains:
- A "Settings → Outlook" nav link at the bottom of the nav list
- A sign-out button showing the signed-in user's name/email

---

## Outlook Sync Page

Route: `/settings/outlook`

Three panels, each with a sync button and a "last synced" timestamp stored in `localStorage`:

| Panel | Graph endpoint | CRM effect |
|---|---|---|
| Import Contacts | `GET /me/contacts` | Upsert Contact records; find-or-create Company by `companyName` |
| Sync Emails | `GET /me/messages` | Create NOTE activities on matching contacts (last 90 days) |
| Sync Calendar | `GET /me/events` | Create NOTE activities on matching contacts (last 30 → next 60 days) |

Each panel shows a count of items created/updated after sync completes.

---

## API Routes

All three sync routes are server-side POST handlers. They:
1. Call `getServerSession(authOptions)` — return 401 if no session or no access token.
2. Fetch from Microsoft Graph using the access token from the session.
3. Write to the database via Prisma.

### Contact sync (`POST /api/outlook/sync-contacts`)

For each Graph contact with a valid email address:
- Parse `displayName` → `firstName` + `lastName` (split on last space)
- Map `mobilePhone` or `businessPhones[0]` → `phone`
- Map `jobTitle` → `title`
- If `companyName` is present: `findFirst` company by name, create if missing
- `upsert` the CRM contact on `email` (unique field)

Handles Graph pagination (`@odata.nextLink`).

### Email sync (`POST /api/outlook/sync-emails`)

- Fetches last 90 days: `$filter=receivedDateTime ge {date}`, `$top=100`, selects `id, subject, bodyPreview, sender, toRecipients, receivedDateTime`
- For each email: collect all email addresses (sender + recipients), check which ones match a CRM contact (`findFirst` by email)
- Deduplication: activity body is prefixed with `[outlook-msg:{id}]`. Before creating, check `findFirst` where body `startsWith` that prefix.
- Creates one NOTE activity per email per matching contact

### Calendar sync (`POST /api/outlook/sync-calendar`)

- Fetches last 30 → next 60 days of events, `$top=100`, selects `id, subject, start, end, attendees`
- For each event: collect attendee emails, find matching CRM contacts
- Deduplication prefix: `[outlook-event:{id}]`
- Activity body: `Meeting: {subject} | {start} → {end} | Attendees: {list}`

---

## Data Mapping

### Outlook contact → CRM Contact

| Outlook field | CRM field |
|---|---|
| `displayName` (split) | `firstName`, `lastName` |
| `emailAddresses[0].address` | `email` (upsert key) |
| `mobilePhone` or `businessPhones[0]` | `phone` |
| `jobTitle` | `title` |
| `companyName` | `company.name` (find-or-create) |

### Outlook message → CRM Activity

| Outlook field | CRM field |
|---|---|
| `[outlook-msg:{id}]` prefix | dedup key in `body` |
| `subject` | included in `body` |
| `bodyPreview` | included in `body` |
| `receivedDateTime` | included in `body` |
| matching contact email | `contactId` |

### Outlook event → CRM Activity

| Outlook field | CRM field |
|---|---|
| `[outlook-event:{id}]` prefix | dedup key in `body` |
| `subject`, `start`, `end`, attendee names | included in `body` |
| first matching attendee | `contactId` |

---

## Environment Variables

Set in Railway (client never sees these):

| Variable | Value |
|---|---|
| `NEXTAUTH_SECRET` | Random 32-char string |
| `NEXTAUTH_URL` | `https://demo-crm-production-f18e.up.railway.app` |
| `AZURE_AD_CLIENT_ID` | From Azure portal |
| `AZURE_AD_CLIENT_SECRET` | From Azure portal |
| `AZURE_AD_TENANT_ID` | `common` (supports personal + org accounts) |
| `ALLOWED_EMAIL` | Client's Microsoft email address |

---

## Azure App Registration (one-time setup)

1. `portal.azure.com` → Azure Active Directory → App registrations → **New registration**
2. Name: `Demo CRM` | Supported accounts: **Accounts in any organizational directory and personal Microsoft accounts**
3. Redirect URI (Web): `https://demo-crm-production-f18e.up.railway.app/api/auth/callback/azure-ad`
4. Copy **Application (client) ID** → `AZURE_AD_CLIENT_ID`
5. Copy **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`
6. **Certificates & secrets** → New client secret → copy value → `AZURE_AD_CLIENT_SECRET`
7. **API permissions** → Add → Microsoft Graph → Delegated:
   - `User.Read` ✓ (usually pre-added)
   - `Contacts.Read`
   - `Mail.Read`
   - `Calendars.Read`
   - `offline_access`

No admin consent required — the user grants consent on first login.

---

## Prisma Changes

None. The existing `Activity` model with `type: NOTE` and `body: String` is sufficient. Deduplication uses a text prefix in the body field.

---

## Files Created / Modified

**New files:**
- `src/lib/auth.ts` — NextAuth config (authOptions)
- `src/types/next-auth.d.ts` — TypeScript extension for `session.accessToken`
- `src/middleware.ts` — Route protection
- `src/components/Providers.tsx` — SessionProvider wrapper
- `src/components/ClientShell.tsx` — Conditional sidebar rendering
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- `src/app/login/page.tsx` — Login page
- `src/app/settings/outlook/page.tsx` — Outlook sync UI
- `src/app/api/outlook/sync-contacts/route.ts`
- `src/app/api/outlook/sync-emails/route.ts`
- `src/app/api/outlook/sync-calendar/route.ts`

**Modified files:**
- `src/app/layout.tsx` — Add Providers + ClientShell, remove direct Sidebar/main
- `src/components/Sidebar.tsx` — Add Outlook Settings link + sign-out button
- `package.json` — Add `next-auth`
