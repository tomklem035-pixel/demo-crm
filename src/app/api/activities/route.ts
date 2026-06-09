import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["CALL", "EMAIL", "NOTE"] as const;
type ActivityType = (typeof ALLOWED_TYPES)[number];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, body: text, contactId, dealId } = body ?? {};

  if (!type || !ALLOWED_TYPES.includes(type as ActivityType)) {
    return NextResponse.json(
      { error: "type must be CALL, EMAIL, or NOTE" },
      { status: 400 },
    );
  }
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  try {
    const activity = await prisma.activity.create({
      data: {
        type: type as ActivityType,
        body: text.trim(),
        contactId: contactId || null,
        dealId: dealId || null,
      },
      include: {
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(activity, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2003") {
      return NextResponse.json(
        { error: "Referenced contact or deal not found" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 },
    );
  }
}
