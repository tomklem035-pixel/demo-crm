import { prisma } from "@/lib/prisma";
import PipelineView from "./PipelineView";

export const dynamic = "force-dynamic";

const ACTIVE_STAGES = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
] as const;

export default async function PipelinePage() {
  const [deals, companies, contacts] = await Promise.all([
    prisma.deal.findMany({
      where: { stage: { in: [...ACTIVE_STAGES] } },
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

  const serializedDeals = deals.map((d) => ({
    ...d,
    value: d.value.toString(),
  }));

  return (
    <PipelineView
      initialDeals={serializedDeals}
      companies={companies}
      contacts={contacts}
    />
  );
}
