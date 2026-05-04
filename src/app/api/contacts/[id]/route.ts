import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED"] as const;
type ContactStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const { firstName, lastName, email, phone, title, status, companyId } =
    body ?? {};

  if (status && !ALLOWED_STATUSES.includes(status as ContactStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(title !== undefined && { title: title || null }),
        ...(status !== undefined && { status: status as ContactStatus }),
        ...(companyId !== undefined && { companyId: companyId || null }),
      },
      include: { company: true },
    });
    return NextResponse.json(contact);
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "A contact with that email already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.contact.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}
