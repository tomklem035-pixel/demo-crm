import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: NextRequest) {
  const expected = process.env.SEED_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Seeding is disabled. Set SEED_TOKEN env var to enable." },
      { status: 503 },
    );
  }
  const provided =
    req.nextUrl.searchParams.get("token") ?? req.headers.get("x-seed-token");
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const counts = await runSeed(prisma);
    return NextResponse.json({
      ok: true,
      message: "Database seeded with mock data.",
      counts,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Seed failed", detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
