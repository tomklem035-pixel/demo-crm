import { prisma } from "@/lib/prisma";
import DealsView from "./DealsView";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const [deals, companies, contacts] = await Promise.all([
    prisma.deal.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.contact.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  // Convert Decimal values to strings for client serialization
  const serializedDeals = deals.map((d) => ({
    ...d,
    value: d.value.toString(),
  }));

  return (
    <DealsView
      initialDeals={serializedDeals}
      companies={companies}
      contacts={contacts}
    />
  );
}
