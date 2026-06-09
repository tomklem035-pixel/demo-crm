import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ContactDetailView from "./ContactDetailView";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [contact, companies, contacts, activities, tasks] = await Promise.all([
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
    prisma.activity.findMany({
      where: { contactId: params.id },
      orderBy: { createdAt: "desc" },
      include: { deal: { select: { id: true, title: true } } },
    }),
    prisma.task.findMany({
      where: { contactId: params.id, completed: false },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: { deal: { select: { id: true, title: true } } },
    }),
  ]);

  if (!contact) notFound();

  const serializedContact = {
    ...contact,
    company: contact.company
      ? {
          ...contact.company,
          annualRevenue: contact.company.annualRevenue.toString(),
        }
      : null,
    deals: contact.deals.map((d) => ({ ...d, value: d.value.toString() })),
  };

  const serializedActivities = activities.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

  const serializedTasks = tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <ContactDetailView
      contact={serializedContact}
      companies={companies}
      contacts={contacts}
      initialActivities={serializedActivities}
      initialTasks={serializedTasks}
    />
  );
}
