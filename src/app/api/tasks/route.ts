import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, dueDate, contactId, dealId } = body ?? {};

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        contactId: contactId || null,
        dealId: dealId || null,
      },
      include: {
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2003") {
      return NextResponse.json(
        { error: "Referenced contact or deal not found" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}
