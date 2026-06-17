import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface GraphAttendee {
  emailAddress: { address: string; name: string };
}

interface GraphEvent {
  id: string;
  subject: string | null;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees: GraphAttendee[];
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const from = new Date();
  from.setDate(from.getDate() - 30);
  const to = new Date();
  to.setDate(to.getDate() + 60);

  const events: GraphEvent[] = [];
  let url: string | null =
    "https://graph.microsoft.com/v1.0/me/events" +
    `?$top=100` +
    `&$filter=start/dateTime ge '${from.toISOString()}' and start/dateTime le '${to.toISOString()}'` +
    `&$select=id,subject,start,end,attendees` +
    `&$orderby=start/dateTime asc`;

  try {
    while (url) {
      const res: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json(
          { error: `Graph API ${res.status}: ${text}` },
          { status: 502 }
        );
      }
      const data: { value?: GraphEvent[]; "@odata.nextLink"?: string } =
        await res.json();
      events.push(...(data.value ?? []));
      url = data["@odata.nextLink"] ?? null;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const allContacts = await prisma.contact.findMany({
    select: { id: true, email: true },
  });
  const emailToContactId = new Map(
    allContacts.map((c) => [c.email.toLowerCase(), c.id])
  );

  let created = 0;
  let skipped = 0;

  for (const event of events) {
    const prefix = `[outlook-event:${event.id}]`;

    const existing = await prisma.activity.findFirst({
      where: { body: { startsWith: prefix } },
    });
    if (existing) { skipped++; continue; }

    const attendeeEmails = event.attendees.map(
      (a) => a.emailAddress.address.toLowerCase()
    );
    const attendeeNames = event.attendees.map(
      (a) => a.emailAddress.name || a.emailAddress.address
    );

    const contactId = attendeeEmails
      .map((e) => emailToContactId.get(e))
      .find(Boolean) ?? null;

    if (!contactId) { skipped++; continue; }

    const startStr = new Date(event.start.dateTime).toLocaleString();
    const endStr = new Date(event.end.dateTime).toLocaleString();

    const body =
      `${prefix}\n` +
      `Meeting: ${event.subject ?? "(no title)"}\n` +
      `Start: ${startStr}\n` +
      `End: ${endStr}\n` +
      `Attendees: ${attendeeNames.join(", ")}`;

    await prisma.activity.create({
      data: { type: "NOTE", body, contactId },
    });
    created++;
  }

  return NextResponse.json({ created, skipped });
}
