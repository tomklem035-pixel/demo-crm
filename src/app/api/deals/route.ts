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

export async function GET() {
  const deals = await prisma.deal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, value, stage, expectedCloseDate, companyId, contactId } =
    body ?? {};

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (stage && !ALLOWED_STAGES.includes(stage as DealStage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  try {
    const deal = await prisma.deal.create({
      data: {
        title,
        value: value !== undefined && value !== "" ? parseFloat(value) : 0,
        stage: (stage as DealStage) ?? "PROSPECTING",
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        closedAt: stage && CLOSED_STAGES.has(stage) ? new Date() : null,
        companyId: companyId || null,
        contactId: contactId || null,
      },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(deal, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}
