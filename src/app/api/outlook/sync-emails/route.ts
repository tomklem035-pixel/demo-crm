import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface GraphMessage {
  id: string;
  subject: string | null;
  bodyPreview: string;
  receivedDateTime: string;
  sender: { emailAddress: { address: string } } | null;
  toRecipients: { emailAddress: { address: string } }[];
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "Session expired, please sign in again" }, { status: 401 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceIso = since.toISOString();

  const messages: GraphMessage[] = [];
  let url: string | null =
    "https://graph.microsoft.com/v1.0/me/messages" +
    `?$top=100&$orderby=receivedDateTime desc` +
    `&$filter=receivedDateTime ge '${sinceIso}'` +
    `&$select=id,subject,bodyPreview,receivedDateTime,sender,toRecipients`;

  try {
    while (url) {
      const res: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Graph API error (messages)", res.status, text);
        return NextResponse.json({ error: `Graph API error: ${res.status}` }, { status: 502 });
      }
      const data: { value?: GraphMessage[]; "@odata.nextLink"?: string } =
        await res.json();
      messages.push(...(data.value ?? []));
      url = data["@odata.nextLink"] ?? null;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Pre-fetch all CRM contacts and already-synced email IDs
  const [allContacts, syncedActivities] = await Promise.all([
    prisma.contact.findMany({ select: { id: true, email: true } }),
    prisma.activity.findMany({
      where: { body: { startsWith: "[outlook-msg:" } },
      select: { body: true },
    }),
  ]);

  const emailToContactId = new Map(
    allContacts.map((c) => [c.email.toLowerCase(), c.id])
  );
  const syncedMsgIds = new Set(
    syncedActivities.map((a) => a.body.split("\n")[0])
  );

  let created = 0;
  let skipped = 0;

  for (const msg of messages) {
    const prefix = `[outlook-msg:${msg.id}]`;
    if (syncedMsgIds.has(prefix)) { skipped++; continue; }

    const addresses = [
      msg.sender?.emailAddress?.address?.toLowerCase(),
      ...msg.toRecipients.map((r) => r.emailAddress.address.toLowerCase()),
    ].filter(Boolean) as string[];

    const contactId = addresses
      .map((a) => emailToContactId.get(a))
      .find(Boolean) ?? null;

    if (!contactId) { skipped++; continue; }

    const body =
      `${prefix}\n` +
      `Subject: ${msg.subject ?? "(no subject)"}\n` +
      `Date: ${new Date(msg.receivedDateTime).toLocaleString()}\n\n` +
      msg.bodyPreview;

    await prisma.activity.create({
      data: { type: "NOTE", body, contactId },
    });
    syncedMsgIds.add(prefix);
    created++;
  }

  return NextResponse.json({ created, skipped });
}
