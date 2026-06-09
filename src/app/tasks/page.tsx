import { prisma } from "@/lib/prisma";
import TasksView from "./TasksView";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, contacts, deals] = await Promise.all([
    prisma.task.findMany({
      where: { completed: false },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
    }),
    prisma.contact.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.deal.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const serializedTasks = tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <TasksView initialTasks={serializedTasks} contacts={contacts} deals={deals} />
  );
}
