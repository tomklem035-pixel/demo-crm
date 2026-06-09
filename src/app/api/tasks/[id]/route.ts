import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const { title, dueDate, completed, dealId, contactId } = body ?? {};

  if (
    title !== undefined &&
    (!title || typeof title !== "string" || !title.trim())
  ) {
    return NextResponse.json(
      { error: "title cannot be empty" },
      { status: 400 },
    );
  }

  try {
    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
        ...(completed !== undefined && { completed: Boolean(completed) }),
        ...(dealId !== undefined && { dealId: dealId || null }),
        ...(contactId !== undefined && { contactId: contactId || null }),
      },
      include: {
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(task);
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.task.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}
