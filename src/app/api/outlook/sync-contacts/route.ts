import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface GraphContact {
  id: string;
  displayName: string | null;
  emailAddresses: { address: string; name: string }[];
  mobilePhone: string | null;
  businessPhones: string[];
  jobTitle: string | null;
  companyName: string | null;
}

function parseName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const lastName = parts.pop()!;
  return { firstName: parts.join(" "), lastName };
}

async function fetchAllContacts(accessToken: string): Promise<GraphContact[]> {
  const results: GraphContact[] = [];
  let url: string | null =
    "https://graph.microsoft.com/v1.0/me/contacts" +
    "?$top=100&$select=id,displayName,emailAddresses,mobilePhone,businessPhones,jobTitle,companyName";

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Graph API ${res.status}: ${text}`);
    }
    const data: { value?: GraphContact[]; "@odata.nextLink"?: string } =
      await res.json();
    results.push(...(data.value ?? []));
    url = data["@odata.nextLink"] ?? null;
  }

  return results;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let contacts: GraphContact[];
  try {
    contacts = await fetchAllContacts(session.accessToken);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const c of contacts) {
    const email = c.emailAddresses?.[0]?.address?.toLowerCase();
    if (!email) { skipped++; continue; }

    const { firstName, lastName } = parseName(c.displayName ?? "Unknown");
    const phone = c.mobilePhone ?? c.businessPhones?.[0] ?? null;

    let companyId: string | null = null;
    if (c.companyName?.trim()) {
      let company = await prisma.company.findFirst({
        where: { name: c.companyName.trim() },
      });
      if (!company) {
        company = await prisma.company.create({
          data: { name: c.companyName.trim(), industry: "Unknown" },
        });
      }
      companyId = company.id;
    }

    const existing = await prisma.contact.findUnique({ where: { email } });
    if (existing) {
      await prisma.contact.update({
        where: { email },
        data: {
          firstName,
          lastName,
          phone,
          title: c.jobTitle ?? null,
          companyId,
        },
      });
      updated++;
    } else {
      await prisma.contact.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          title: c.jobTitle ?? null,
          companyId,
        },
      });
      created++;
    }
  }

  return NextResponse.json({ created, updated, skipped });
}
