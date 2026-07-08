import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_RECIPIENTS = 500;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "Session expired, please sign in again" }, { status: 401 });
  }

  const senderEmail = session.user?.email;
  if (!senderEmail) {
    return NextResponse.json({ error: "Signed-in account has no email address" }, { status: 400 });
  }

  let payload: { subject?: unknown; body?: unknown; recipientEmails?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { subject, body, recipientEmails } = payload;
  if (typeof subject !== "string" || !subject.trim()) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }
  if (typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "Body is required" }, { status: 400 });
  }
  if (!Array.isArray(recipientEmails) || recipientEmails.length === 0) {
    return NextResponse.json({ error: "At least one recipient is required" }, { status: 400 });
  }
  if (recipientEmails.length > MAX_RECIPIENTS) {
    return NextResponse.json({ error: `Too many recipients (max ${MAX_RECIPIENTS})` }, { status: 400 });
  }
  if (!recipientEmails.every((e) => typeof e === "string" && e.includes("@"))) {
    return NextResponse.json({ error: "recipientEmails must all be valid-looking email addresses" }, { status: 400 });
  }

  const message = {
    message: {
      subject,
      body: { contentType: "Text", content: body },
      toRecipients: [{ emailAddress: { address: senderEmail } }],
      bccRecipients: (recipientEmails as string[]).map((address) => ({
        emailAddress: { address },
      })),
    },
  };

  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Graph API error (sendMail)", res.status, text);
    return NextResponse.json({ error: `Graph API error: ${res.status}` }, { status: 502 });
  }

  return NextResponse.json({ sent: recipientEmails.length });
}
