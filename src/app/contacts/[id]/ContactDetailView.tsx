"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { formatCurrency, formatDate, stageColor, statusColor } from "@/lib/format";

type ContactStatus = "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED";
type DealStage =
  | "PROSPECTING"
  | "QUALIFICATION"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST";
type ActivityType = "CALL" | "EMAIL" | "NOTE";
type Tab = "deals" | "activity";

type Deal = {
  id: string;
  title: string;
  value: string;
  stage: DealStage;
  expectedCloseDate: string | Date | null;
  closedAt: string | Date | null;
  companyId: string | null;
  contactId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  title: string | null;
  status: ContactStatus;
  companyId: string | null;
  company: { id: string; name: string; annualRevenue: string } | null;
  deals: Deal[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

type Activity = {
  id: string;
  type: ActivityType;
  body: string;
  contactId: string | null;
  dealId: string | null;
  deal: { id: string; title: string } | null;
  createdAt: string;
};

type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  contactId: string | null;
  dealId: string | null;
  deal: { id: string; title: string } | null;
  createdAt: string;
};

type Company = { id: string; name: string };
type ContactOption = { id: string; firstName: string; lastName: string };
type LogForm = { type: ActivityType; body: string; dealId: string };
type TaskForm = { title: string; dueDate: string; dealId: string };

const DEAL_STAGES: DealStage[] = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

const CONTACT_STATUSES: ContactStatus[] = [
  "LEAD",
  "QUALIFIED",
  "CUSTOMER",
  "CHURNED",
];

const ACTIVITY_TYPES: ActivityType[] = ["CALL", "EMAIL", "NOTE"];

const ACTIVITY_ICON: Record<ActivityType, { emoji: string; bg: string }> = {
  CALL:  { emoji: "📞", bg: "bg-indigo-500" },
  EMAIL: { emoji: "✉️", bg: "bg-amber-500" },
  NOTE:  { emoji: "📝", bg: "bg-slate-500" },
};

type DealFormState = {
  title: string;
  value: string;
  stage: DealStage;
  expectedCloseDate: string;
  companyId: string;
};

type ContactFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  status: ContactStatus;
  companyId: string;
};

const EMPTY_DEAL_FORM: DealFormState = {
  title: "",
  value: "",
  stage: "PROSPECTING",
  expectedCloseDate: "",
  companyId: "",
};

const EMPTY_LOG_FORM: LogForm = { type: "CALL", body: "", dealId: "" };
const EMPTY_TASK_FORM: TaskForm = { title: "", dueDate: "", dealId: "" };

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

function shortDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

export default function ContactDetailView({
  contact: initialContact,
  companies,
  contacts,
  initialActivities,
  initialTasks,
}: {
  contact: Contact;
  companies: Company[];
  contacts: ContactOption[];
  initialActivities: Activity[];
  initialTasks: Task[];
}) {
  const router = useRouter();
  const [contact, setContact] = useState<Contact>(initialContact);
  const [tab, setTab] = useState<Tab>("deals");

  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState<LogForm>(EMPTY_LOG_FORM);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskForm>(EMPTY_TASK_FORM);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskForm, setEditTaskForm] = useState<TaskForm>(EMPTY_TASK_FORM);
  const [editTaskSubmitting, setEditTaskSubmitting] = useState(false);
  const [editTaskError, setEditTaskError] = useState<string | null>(null);
  const [taskCompleteError, setTaskCompleteError] = useState<{
    taskId: string;
    message: string;
  } | null>(null);

  const [dealOpen, setDealOpen] = useState(false);
  const [dealForm, setDealForm] = useState<DealFormState>(EMPTY_DEAL_FORM);
  const [dealSubmitting, setDealSubmitting] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [contactForm, setContactForm] = useState<ContactFormState>({
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone ?? "",
    title: contact.title ?? "",
    status: contact.status,
    companyId: contact.companyId ?? "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function submitLog(e: React.FormEvent) {
    e.preventDefault();
    setLogSubmitting(true);
    setLogError(null);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: logForm.type,
          body: logForm.body,
          contactId: contact.id,
          dealId: logForm.dealId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      setActivities((prev) => [
        {
          id: saved.id,
          type: saved.type,
          body: saved.body,
          contactId: saved.contactId,
          dealId: saved.dealId,
          deal: saved.deal,
          createdAt: saved.createdAt,
        },
        ...prev,
      ]);
      setLogForm(EMPTY_LOG_FORM);
      setLogOpen(false);
    } catch (err: any) {
      setLogError(err.message ?? "Something went wrong");
    } finally {
      setLogSubmitting(false);
    }
  }

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    setTaskSubmitting(true);
    setTaskError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskForm.title,
          dueDate: taskForm.dueDate || null,
          contactId: contact.id,
          dealId: taskForm.dealId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      setTasks((prev) =>
        sortTasks([
          ...prev,
          {
            id: saved.id,
            title: saved.title,
            dueDate: saved.dueDate,
            completed: saved.completed,
            contactId: saved.contactId,
            dealId: saved.dealId,
            deal: saved.deal,
            createdAt: saved.createdAt,
          },
        ])
      );
      setTaskForm(EMPTY_TASK_FORM);
      setTaskOpen(false);
    } catch (err: any) {
      setTaskError(err.message ?? "Something went wrong");
    } finally {
      setTaskSubmitting(false);
    }
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setEditTaskForm({
      title: task.title,
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
      dealId: task.dealId ?? "",
    });
    setEditTaskError(null);
    setEditTaskOpen(true);
  }

  async function submitEditTask(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTask) return;
    setEditTaskSubmitting(true);
    setEditTaskError(null);
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTaskForm.title,
          dueDate: editTaskForm.dueDate || null,
          dealId: editTaskForm.dealId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      setTasks((prev) =>
        sortTasks(
          prev.map((t) =>
            t.id === saved.id
              ? {
                  ...t,
                  title: saved.title,
                  dueDate: saved.dueDate,
                  dealId: saved.dealId,
                  deal: saved.deal,
                }
              : t
          )
        )
      );
      setEditTaskOpen(false);
      setEditingTask(null);
    } catch (err: any) {
      setEditTaskError(err.message ?? "Something went wrong");
    } finally {
      setEditTaskSubmitting(false);
    }
  }

  async function deleteTask() {
    if (!editingTask) return;
    setEditTaskSubmitting(true);
    setEditTaskError(null);
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      setTasks((prev) => prev.filter((t) => t.id !== editingTask.id));
      setEditTaskOpen(false);
      setEditingTask(null);
    } catch (err: any) {
      setEditTaskError(err.message ?? "Something went wrong");
    } finally {
      setEditTaskSubmitting(false);
    }
  }

  async function completeTask(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setTaskCompleteError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error("Failed to complete task");
    } catch {
      setTasks((prev) => sortTasks([task, ...prev]));
      setTaskCompleteError({ taskId: task.id, message: "Failed — try again" });
      setTimeout(() => setTaskCompleteError(null), 3000);
    }
  }

  async function submitDeal(e: React.FormEvent) {
    e.preventDefault();
    setDealSubmitting(true);
    setDealError(null);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: dealForm.title,
          value: dealForm.value ? parseFloat(dealForm.value) : 0,
          stage: dealForm.stage,
          expectedCloseDate: dealForm.expectedCloseDate || null,
          contactId: contact.id,
          companyId: dealForm.companyId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      setContact((prev) => ({
        ...prev,
        deals: [
          {
            id: saved.id,
            title: saved.title,
            value: String(saved.value),
            stage: saved.stage,
            expectedCloseDate: saved.expectedCloseDate,
            closedAt: saved.closedAt,
            companyId: saved.companyId,
            contactId: saved.contactId,
            createdAt: saved.createdAt,
            updatedAt: saved.updatedAt,
          },
          ...prev.deals,
        ],
      }));
      setDealForm(EMPTY_DEAL_FORM);
      setDealOpen(false);
      router.refresh();
    } catch (err: any) {
      setDealError(err.message ?? "Something went wrong");
    } finally {
      setDealSubmitting(false);
    }
  }

  function openEdit() {
    setContactForm({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone ?? "",
      title: contact.title ?? "",
      status: contact.status,
      companyId: contact.companyId ?? "",
    });
    setEditError(null);
    setEditOpen(true);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: contactForm.firstName,
          lastName: contactForm.lastName,
          email: contactForm.email,
          phone: contactForm.phone || null,
          title: contactForm.title || null,
          status: contactForm.status,
          companyId: contactForm.companyId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      setContact((prev) => ({
        ...prev,
        firstName: saved.firstName,
        lastName: saved.lastName,
        email: saved.email,
        phone: saved.phone,
        title: saved.title,
        status: saved.status,
        companyId: saved.companyId,
        company: saved.company,
      }));
      setEditOpen(false);
      router.refresh();
    } catch (err: any) {
      setEditError(err.message ?? "Something went wrong");
    } finally {
      setEditSubmitting(false);
    }
  }

  const titleLine = [contact.title, contact.company?.name]
    .filter(Boolean)
    .join(" · ");

  const pipelineDeals = useMemo(
    () => contact.deals.filter((d) => d.stage !== "CLOSED_LOST"),
    [contact.deals]
  );
  const pipelineValue = useMemo(
    () => pipelineDeals.reduce((sum, d) => sum + parseFloat(d.value), 0),
    [pipelineDeals]
  );

  return (
    <div>
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M15 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Contacts
        </Link>
      </div>

      {/* Header card */}
      <div className="card p-5 mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 flex-shrink-0 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-xl select-none">
            {initials(contact.firstName, contact.lastName)}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {contact.firstName} {contact.lastName}
              </h1>
              <span className={`pill ${statusColor(contact.status)}`}>
                {contact.status}
              </span>
            </div>
            {titleLine && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {titleLine}
              </p>
            )}
            <div className="flex items-center gap-4 mt-0.5">
              <a
                href={`mailto:${contact.email}`}
                className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                {contact.email}
              </a>
              {contact.phone && (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {contact.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <button className="btn-secondary" onClick={openEdit}>
          Edit Contact
        </button>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <nav className="flex -mb-px">
          {(["deals", "activity"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {t === "deals"
                ? `Deals (${contact.deals.length})`
                : "Activity"}
            </button>
          ))}
        </nav>
      </div>

      {/* Deals tab */}
      {tab === "deals" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {contact.deals.length}{" "}
              {contact.deals.length === 1 ? "deal" : "deals"}
              {pipelineDeals.length > 0 &&
                ` · ${formatCurrency(pipelineValue)} pipeline`}
            </p>
            <button
              className="btn-primary"
              onClick={() => {
                setDealForm(EMPTY_DEAL_FORM);
                setDealError(null);
                setDealOpen(true);
              }}
            >
              + New Deal
            </button>
          </div>
          {contact.deals.length === 0 ? (
            <div className="card p-10 flex flex-col items-center justify-center gap-2 text-center">
              <p className="font-medium text-slate-700 dark:text-slate-300">
                No deals yet.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Create the first deal for this contact.
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="table-th">Title</th>
                      <th className="table-th">Stage</th>
                      <th className="table-th">Value</th>
                      <th className="table-th">Expected Close</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {contact.deals.map((deal) => (
                      <tr
                        key={deal.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      >
                        <td className="table-td font-medium text-slate-900 dark:text-slate-100">
                          {deal.title}
                        </td>
                        <td className="table-td">
                          <span className={`pill ${stageColor(deal.stage)}`}>
                            {deal.stage.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="table-td">
                          {formatCurrency(deal.value)}
                        </td>
                        <td className="table-td">
                          {formatDate(deal.expectedCloseDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity tab */}
      {tab === "activity" && (
        <div className="flex flex-col gap-6">
          <div className="flex gap-2">
            <button
              className="btn-primary"
              onClick={() => {
                setLogForm(EMPTY_LOG_FORM);
                setLogError(null);
                setLogOpen(true);
              }}
            >
              + Log activity
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setTaskForm(EMPTY_TASK_FORM);
                setTaskError(null);
                setTaskOpen(true);
              }}
            >
              + Add task
            </button>
          </div>

          {/* Open tasks */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
              Open Tasks
            </p>
            {tasks.length === 0 ? (
              <div className="card p-6 flex items-center justify-center">
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  No open tasks.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {tasks.map((task) => {
                  const overdue = isOverdue(task.dueDate);
                  const completeErr =
                    taskCompleteError?.taskId === task.id
                      ? taskCompleteError.message
                      : null;
                  return (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
                        overdue
                          ? "bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30"
                          : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand-600 cursor-pointer"
                        onChange={() => completeTask(task)}
                      />
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => openEditTask(task)}
                          className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 text-left w-full"
                        >
                          {task.title}
                        </button>
                        {task.deal && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {task.deal.title}
                          </p>
                        )}
                        {completeErr && (
                          <p className="text-xs text-rose-500 mt-1">
                            {completeErr}
                          </p>
                        )}
                      </div>
                      {task.dueDate && (
                        <span
                          className={`text-xs font-medium flex-shrink-0 ${
                            overdue
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {overdue ? "Overdue · " : ""}
                          {shortDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activity history */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
              History
            </p>
            {activities.length === 0 ? (
              <div className="card p-6 flex items-center justify-center">
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  No activity logged yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {activities.map((activity) => {
                  const icon = ACTIVITY_ICON[activity.type];
                  return (
                    <div
                      key={activity.id}
                      className="flex gap-3 items-start"
                    >
                      <div
                        className={`w-7 h-7 rounded-full ${icon.bg} flex items-center justify-center text-sm flex-shrink-0 mt-0.5`}
                      >
                        {icon.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 dark:text-slate-100 leading-snug">
                          {activity.body}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {activity.type.charAt(0) +
                            activity.type.slice(1).toLowerCase()}
                          {activity.deal ? ` · ${activity.deal.title}` : ""}
                          {" · "}
                          {new Date(activity.createdAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Deal modal */}
      <Modal open={dealOpen} onClose={() => setDealOpen(false)} title="New Deal">
        <form onSubmit={submitDeal} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              placeholder="e.g. Q3 Expansion"
              value={dealForm.title}
              onChange={(e) =>
                setDealForm({ ...dealForm, title: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Value ($)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={dealForm.value}
                onChange={(e) =>
                  setDealForm({ ...dealForm, value: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Stage</label>
              <select
                className="input"
                value={dealForm.stage}
                onChange={(e) =>
                  setDealForm({
                    ...dealForm,
                    stage: e.target.value as DealStage,
                  })
                }
              >
                {DEAL_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Expected close date</label>
              <input
                className="input"
                type="date"
                value={dealForm.expectedCloseDate}
                onChange={(e) =>
                  setDealForm({
                    ...dealForm,
                    expectedCloseDate: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="label">Company</label>
              <select
                className="input"
                value={dealForm.companyId}
                onChange={(e) =>
                  setDealForm({ ...dealForm, companyId: e.target.value })
                }
              >
                <option value="">— None —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Contact</label>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {contact.firstName} {contact.lastName}
            </p>
          </div>
          {dealError && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {dealError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setDealOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={dealSubmitting}
            >
              {dealSubmitting ? "Saving…" : "Create deal"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Contact modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Contact"
      >
        <form onSubmit={submitEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name</label>
              <input
                className="input"
                required
                value={contactForm.firstName}
                onChange={(e) =>
                  setContactForm({ ...contactForm, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Last name</label>
              <input
                className="input"
                required
                value={contactForm.lastName}
                onChange={(e) =>
                  setContactForm({ ...contactForm, lastName: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={contactForm.email}
              onChange={(e) =>
                setContactForm({ ...contactForm, email: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={contactForm.phone}
                onChange={(e) =>
                  setContactForm({ ...contactForm, phone: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={contactForm.title}
                onChange={(e) =>
                  setContactForm({ ...contactForm, title: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={contactForm.status}
                onChange={(e) =>
                  setContactForm({
                    ...contactForm,
                    status: e.target.value as ContactStatus,
                  })
                }
              >
                {CONTACT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Company</label>
              <select
                className="input"
                value={contactForm.companyId}
                onChange={(e) =>
                  setContactForm({ ...contactForm, companyId: e.target.value })
                }
              >
                <option value="">— None —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {editError && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {editError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={editSubmitting}
            >
              {editSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Activity modal */}
      <Modal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="Log Activity"
      >
        <form onSubmit={submitLog} className="space-y-4">
          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              {ACTIVITY_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLogForm({ ...logForm, type: t })}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    logForm.type === t
                      ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-400"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {ACTIVITY_ICON[t].emoji}{" "}
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              required
              rows={4}
              placeholder="What happened?"
              value={logForm.body}
              onChange={(e) =>
                setLogForm({ ...logForm, body: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Related deal (optional)</label>
            <select
              className="input"
              value={logForm.dealId}
              onChange={(e) =>
                setLogForm({ ...logForm, dealId: e.target.value })
              }
            >
              <option value="">— None —</option>
              {contact.deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
          {logError && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {logError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setLogOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={logSubmitting}
            >
              {logSubmitting ? "Saving…" : "Log activity"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Task modal */}
      <Modal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        title="Add Task"
      >
        <form onSubmit={submitTask} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              placeholder="e.g. Send updated proposal"
              value={taskForm.title}
              onChange={(e) =>
                setTaskForm({ ...taskForm, title: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Due date (optional)</label>
            <input
              className="input"
              type="date"
              value={taskForm.dueDate}
              onChange={(e) =>
                setTaskForm({ ...taskForm, dueDate: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Related deal (optional)</label>
            <select
              className="input"
              value={taskForm.dealId}
              onChange={(e) =>
                setTaskForm({ ...taskForm, dealId: e.target.value })
              }
            >
              <option value="">— None —</option>
              {contact.deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
          {taskError && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {taskError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setTaskOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={taskSubmitting}
            >
              {taskSubmitting ? "Saving…" : "Add task"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Task modal */}
      <Modal
        open={editTaskOpen}
        onClose={() => setEditTaskOpen(false)}
        title="Edit Task"
      >
        <form onSubmit={submitEditTask} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              value={editTaskForm.title}
              onChange={(e) =>
                setEditTaskForm({ ...editTaskForm, title: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Due date (optional)</label>
            <input
              className="input"
              type="date"
              value={editTaskForm.dueDate}
              onChange={(e) =>
                setEditTaskForm({ ...editTaskForm, dueDate: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Related deal (optional)</label>
            <select
              className="input"
              value={editTaskForm.dealId}
              onChange={(e) =>
                setEditTaskForm({ ...editTaskForm, dealId: e.target.value })
              }
            >
              <option value="">— None —</option>
              {contact.deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
          {editTaskError && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {editTaskError}
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium"
              onClick={deleteTask}
              disabled={editTaskSubmitting}
            >
              Delete
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditTaskOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={editTaskSubmitting}
              >
                {editTaskSubmitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
