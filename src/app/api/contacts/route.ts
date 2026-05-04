import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED"] as const;
type ContactStatus = (typeof ALLOWED_STATUSES)[number];

export async function GET() {
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });
  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    firstName,
    lastName,
    email,
    phone,
    title,
    status,
    companyId,
  } = body ?? {};

  if (!firstName || !lastName || !email) {
    return NextResponse.json(
      { error: "firstName, lastName, and email are required" },
      { status: 400 },
    );
  }
  if (status && !ALLOWED_STATUSES.includes(status as ContactStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const contact = await prisma.contact.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        title: title || null,
        status: (status as ContactStatus) ?? "LEAD",
        companyId: companyId || null,
      },
      include: { company: true },
    });
    return NextResponse.json(contact, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "A contact with that email already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
