import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ContactDetailView from "./ContactDetailView";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [contact, companies, contacts] = await Promise.all([
    prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        company: true,
        deals: { orderBy: { createdAt: "desc" } },
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

  if (!contact) notFound();

  const serializedContact = {
    ...contact,
    deals: contact.deals.map((d) => ({
      ...d,
      value: d.value.toString(),
    })),
  };

  return (
    <ContactDetailView
      contact={serializedContact}
      companies={companies}
      contacts={contacts}
    />
  );
}
