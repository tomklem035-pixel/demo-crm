import { prisma } from "@/lib/prisma";
import ContactsView from "./ContactsView";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
      include: { company: true },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return <ContactsView initialContacts={contacts} companies={companies} />;
}
