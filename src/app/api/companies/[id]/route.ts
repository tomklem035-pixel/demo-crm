import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const {
    name,
    industry,
    website,
    employees,
    annualRevenue,
    city,
    country,
  } = body ?? {};

  try {
    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(industry !== undefined && { industry }),
        ...(website !== undefined && { website: website || null }),
        ...(employees !== undefined && { employees: Number(employees) || 0 }),
        ...(annualRevenue !== undefined && {
          annualRevenue: Number(annualRevenue) || 0,
        }),
        ...(city !== undefined && { city: city || null }),
        ...(country !== undefined && { country: country || null }),
      },
    });
    return NextResponse.json(company);
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.company.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 });
  }
}
