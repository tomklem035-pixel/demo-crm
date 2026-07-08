# Mailing List Send Email — Design Spec

**Date:** 2026-07-08
**Status:** Approved

---

## Problem

Angus needs to send the same one-off update email (e.g. "new property/land listing") to every contact in his CRM who's involved in commercial property/real estate, without manually composing 175+ individual emails in Outlook. The CRM already has the right contacts (synced from his real mailbox), but there's no way to bulk-tag them or bulk-email them from inside the app.

---

## Goals

1. Tag every commercial-property/real-estate contact as `CUSTOMER` status (one-time bulk update), excluding contacts at CBRE, Knight Frank, Colliers, Cushman & Wakefield, and JLL (competing agencies).
2. Let Angus filter the Contacts page down to a segment (using the status filter that already exists) and send one email to everyone currently shown.
3. Compose fresh each time — no saved templates, no send history/audit trail, no scheduling. Just subject + body + send.

---

## One-time contact classification

Re-run the same domain/keyword classification used for the earlier cross-reference report, against the **current full contact set** (2,099 contacts, not the stale 175 from the prior one-off report). Matching logic:

- Known CRE firm domains (CBRE, Knight Frank, Colliers, Goodman, Dexus, Mirvac, Charter Hall, Stockland, etc. — same list as before)
- Generic property/real-estate/industrial keyword in the domain (e.g. `*property*`, `*realestate*`, `*industrial*`)
- Exclude: any domain containing `cbre`, `knightfrank`, `colliers`, `cushwake`/`cushmanwakefield`, `jll`

Every matched contact gets `status = CUSTOMER` via a direct Prisma update (one-off script run against production, not a UI feature). No review gate — apply directly per user's explicit instruction.

---

## UI: Send button on Contacts page

`src/app/contacts/ContactsView.tsx` already has a `filtered` array (search + status filter applied) and a status `<select>` with `CUSTOMER` as an option. Add:

- A **"Send update email"** button in the toolbar row (next to search/status filter), enabled whenever `filtered.length > 0`
- Clicking it opens a new `Modal` (reusing the existing `Modal` component) with:
  - A read-only line: `Sending to {filtered.length} contacts` (so Angus sees exactly who before sending)
  - Subject `<input>`
  - Body `<textarea>`
  - Cancel / Send buttons
- On Send: `POST /api/outlook/send-email` with `{ subject, body, recipientEmails: filtered.map(c => c.email) }`
- Show a success toast/message with count sent, or an inline error if it fails. Close the modal on success.

This makes the feature general — whatever the current search+status filter shows is what gets emailed, not hardcoded to "commercial property." For this task, Angus filters to `CUSTOMER` and sends.

---

## API Route: `POST /api/outlook/send-email`

New file: `src/app/api/outlook/send-email/route.ts`, following the exact auth pattern of the existing sync routes:

1. `getServerSession(authOptions)` — 401 if no `session.accessToken`; 401 if `session.error === "RefreshAccessTokenError"`.
2. Validate request body: non-empty `subject`, non-empty `body`, non-empty `recipientEmails` array (cap at 500 — Exchange Online's per-message recipient limit; well above the ~175 we need, so this is just a safety bound, not expected to trigger).
3. Call Microsoft Graph `POST https://graph.microsoft.com/v1.0/me/sendMail` with:
   ```json
   {
     "message": {
       "subject": "<subject>",
       "body": { "contentType": "Text", "content": "<body>" },
       "toRecipients": [{ "emailAddress": { "address": "<angus's own session email>" } }],
       "bccRecipients": [ ...recipientEmails.map(address => ({ emailAddress: { address } })) ]
     }
   }
   ```
   Angus's own address goes in `toRecipients` (so he gets a copy and there's a valid primary recipient); everyone else is BCC'd so recipients never see each other's addresses — this is a hard requirement given it's an external mass email.
4. Graph's `sendMail` returns `202 Accepted` with an empty body on success. On non-2xx, log the status + body server-side (same pattern as `sync-emails`) and return `{ error: "Graph API error: {status}" }` with a 502.
5. On success, return `{ sent: recipientEmails.length }`.

Angus's own email address for the `toRecipients` field comes from `session.user.email` (already present in the NextAuth session from the `profile` scope).

---

## New Graph permission required

`Mail.Send` (delegated) isn't in the current scope list (`openid email profile offline_access Contacts.Read Mail.Read Calendars.Read`). Add it to `GRAPH_SCOPES` in `src/lib/auth.ts`, and add the corresponding delegated permission in the Azure app registration.

Since the app is now multi-tenant and Angus holds Cloud Application Administrator rights on his own tenant (granted during the earlier Outlook-sync work), he can self-consent to this new permission on next login — no need to loop in the external IT service again.

---

## Error handling

- No access token / expired session → same 401 pattern as existing sync routes; the modal shows the error inline, doesn't close.
- Graph throttling (429) or any non-2xx → surfaced as a generic "Graph API error: {status}" in the modal; full error logged server-side for debugging, matching the existing sync routes' error-handling style.
- Empty recipient list (e.g. filters return zero contacts) → button is disabled client-side, so this shouldn't reach the API, but the route still validates and 400s defensively.

---

## Explicitly out of scope (YAGNI)

- No saved templates
- No send history/audit log (no Activity records created per send)
- No scheduling / delayed send
- No per-recipient personalization (same body to everyone)
- No retry/batching logic beyond the single Graph call (175 recipients is well within Graph's single-message limits)

---

## Files Created / Modified

**New files:**
- `src/app/api/outlook/send-email/route.ts` — sendMail API route

**Modified files:**
- `src/app/contacts/ContactsView.tsx` — add "Send update email" button + compose modal
- `src/lib/auth.ts` — add `Mail.Send` to `GRAPH_SCOPES`

**One-off (not committed as a feature, run directly against production DB):**
- Classification script to set `status = CUSTOMER` on matched contacts across the current 2,099-contact set, excluding the 5 named agencies
