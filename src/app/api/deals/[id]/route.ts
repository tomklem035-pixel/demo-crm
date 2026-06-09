import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_STAGES = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;
type DealStage = (typeof ALLOWED_STAGES)[number];

const CLOSED_STAGES = new Set<string>(["CLOSED_WON", "CLOSED_LOST"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const { title, value, stage, expectedCloseDate, companyId, contactId } =
    body ?? {};

  if (title !== undefined && !title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (stage !== undefined && !ALLOWED_STAGES.includes(stage as DealStage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  try {
    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(stage !== undefined && {
          stage: stage as DealStage,
          closedAt: CLOSED_STAGES.has(stage) ? new Date() : null,
        }),
        ...(expectedCloseDate !== undefined && {
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        }),
        ...(companyId !== undefined && { companyId: companyId || null }),
        ...(contactId !== undefined && { contactId: contactId || null }),
      },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(deal);
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.deal.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });
  }
}
