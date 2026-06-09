"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";

type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  contactId: string | null;
  dealId: string | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  deal: { id: string; title: string } | null;
  createdAt: string;
};

type ContactOption = { id: string; firstName: string; lastName: string };
type DealOption = { id: string; title: string };
type TaskForm = {
  title: string;
  dueDate: string;
  contactId: string;
  dealId: string;
};

const EMPTY_FORM: TaskForm = {
  title: "",
  dueDate: "",
  contactId: "",
  dealId: "",
};

type Group = "overdue" | "today" | "this-week" | "later" | "no-date";

const GROUP_CONFIG: Record<Group, { label: string; color: string }> = {
  overdue:     { label: "Overdue",      color: "text-orange-600 dark:text-orange-400" },
  today:       { label: "Today",        color: "text-brand-600 dark:text-brand-400" },
  "this-week": { label: "This Week",    color: "text-slate-600 dark:text-slate-400" },
  later:       { label: "Later",        color: "text-slate-600 dark:text-slate-400" },
  "no-date":   { label: "No Due Date",  color: "text-slate-600 dark:text-slate-400" },
};

const GROUP_ORDER: Group[] = ["overdue", "today", "this-week", "later", "no-date"];

function getGroup(dueDate: string | null): Group {
  if (!dueDate) return "no-date";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const due = new Date(dueDate);
  if (due < today) return "overdue";
  if (due < tomorrow) return "today";
  if (due < nextWeek) return "this-week";
  return "later";
}

function shortDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TasksView({
  initialTasks,
  contacts,
  deals,
}: {
  initialTasks: Task[];
  contacts: ContactOption[];
  deals: DealOption[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<TaskForm>(EMPTY_FORM);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<TaskForm>(EMPTY_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [completeError, setCompleteError] = useState<{
    taskId: string;
    message: string;
  } | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<Group, Task[]> = {
      overdue: [],
      today: [],
      "this-week": [],
      later: [],
      "no-date": [],
    };
    for (const task of tasks) {
      groups[getGroup(task.dueDate)].push(task);
    }
    return groups;
  }, [tasks]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title,
          dueDate: createForm.dueDate || null,
          contactId: createForm.contactId || null,
          dealId: createForm.dealId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      setTasks((prev) => [
        {
          id: saved.id,
          title: saved.title,
          dueDate: saved.dueDate,
          completed: saved.completed,
          contactId: saved.contactId,
          dealId: saved.dealId,
          contact: saved.contact,
          deal: saved.deal,
          createdAt: saved.createdAt,
        },
        ...prev,
      ]);
      setCreateForm(EMPTY_FORM);
      setCreateOpen(false);
    } catch (err: any) {
      setCreateError(err.message ?? "Something went wrong");
    } finally {
      setCreateSubmitting(false);
    }
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
      contactId: task.contactId ?? "",
      dealId: task.dealId ?? "",
    });
    setEditError(null);
    setEditOpen(true);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTask) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          dueDate: editForm.dueDate || null,
          contactId: editForm.contactId || null,
          dealId: editForm.dealId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === saved.id
            ? {
                ...t,
                title: saved.title,
                dueDate: saved.dueDate,
                contactId: saved.contactId,
                dealId: saved.dealId,
                contact: saved.contact,
                deal: saved.deal,
              }
            : t
        )
      );
      setEditOpen(false);
      setEditingTask(null);
    } catch (err: any) {
      setEditError(err.message ?? "Something went wrong");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function deleteTask() {
    if (!editingTask) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      setTasks((prev) => prev.filter((t) => t.id !== editingTask.id));
      setEditOpen(false);
      setEditingTask(null);
    } catch (err: any) {
      setEditError(err.message ?? "Something went wrong");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function completeTask(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setCompleteError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error("Failed to complete task");
    } catch {
      setTasks((prev) => [task, ...prev]);
      setCompleteError({ taskId: task.id, message: "Failed — try again" });
      setTimeout(() => setCompleteError(null), 3000);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {tasks.length} open
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setCreateForm(EMPTY_FORM);
            setCreateError(null);
            setCreateOpen(true);
          }}
        >
          + New Task
        </button>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center gap-2 text-center">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            All caught up!
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No open tasks. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {GROUP_ORDER.map((group) => {
            const groupTasks = grouped[group];
            if (groupTasks.length === 0) return null;
            const { label, color } = GROUP_CONFIG[group];
            return (
              <div key={group}>
                <p
                  className={`text-xs font-bold uppercase tracking-wide mb-2 ${color}`}
                >
                  {label}
                </p>
                <div className="flex flex-col gap-2">
                  {groupTasks.map((task) => {
                    const overdue = group === "overdue";
                    const completeErr =
                      completeError?.taskId === task.id
                        ? completeError.message
                        : null;
                    const contactName = task.contact
                      ? `${task.contact.firstName} ${task.contact.lastName}`
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
                            onClick={() => openEdit(task)}
                            className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 text-left w-full"
                          >
                            {task.title}
                          </button>
                          {(contactName || task.deal) && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {contactName && task.contactId ? (
                                <Link
                                  href={`/contacts/${task.contactId}`}
                                  className="hover:text-brand-600 dark:hover:text-brand-400"
                                >
                                  {contactName}
                                </Link>
                              ) : (
                                contactName
                              )}
                              {contactName && task.deal ? " · " : ""}
                              {task.deal?.title}
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
                            {shortDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Task modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Task"
      >
        <form onSubmit={createTask} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              placeholder="e.g. Send updated proposal"
              value={createForm.title}
              onChange={(e) =>
                setCreateForm({ ...createForm, title: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Due date (optional)</label>
            <input
              className="input"
              type="date"
              value={createForm.dueDate}
              onChange={(e) =>
                setCreateForm({ ...createForm, dueDate: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contact (optional)</label>
              <select
                className="input"
                value={createForm.contactId}
                onChange={(e) =>
                  setCreateForm({ ...createForm, contactId: e.target.value })
                }
              >
                <option value="">— None —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Deal (optional)</label>
              <select
                className="input"
                value={createForm.dealId}
                onChange={(e) =>
                  setCreateForm({ ...createForm, dealId: e.target.value })
                }
              >
                <option value="">— None —</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {createError && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {createError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={createSubmitting}
            >
              {createSubmitting ? "Saving…" : "Create task"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Task modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Task"
      >
        <form onSubmit={submitEdit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              value={editForm.title}
              onChange={(e) =>
                setEditForm({ ...editForm, title: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Due date (optional)</label>
            <input
              className="input"
              type="date"
              value={editForm.dueDate}
              onChange={(e) =>
                setEditForm({ ...editForm, dueDate: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contact (optional)</label>
              <select
                className="input"
                value={editForm.contactId}
                onChange={(e) =>
                  setEditForm({ ...editForm, contactId: e.target.value })
                }
              >
                <option value="">— None —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Deal (optional)</label>
              <select
                className="input"
                value={editForm.dealId}
                onChange={(e) =>
                  setEditForm({ ...editForm, dealId: e.target.value })
                }
              >
                <option value="">— None —</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
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
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium"
              onClick={deleteTask}
              disabled={editSubmitting}
            >
              Delete
            </button>
            <div className="flex gap-2">
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
          </div>
        </form>
      </Modal>
    </div>
  );
}
