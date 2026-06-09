"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { formatDate, statusColor } from "@/lib/format";

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  title: string | null;
  status: "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED";
  companyId: string | null;
  createdAt: string | Date;
  company: { id: string; name: string } | null;
};

type CompanyOption = { id: string; name: string };

type FormState = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  status: Contact["status"];
  companyId: string;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  title: "",
  status: "LEAD",
  companyId: "",
};

const STATUSES: Contact["status"][] = ["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED"];

export default function ContactsView({
  initialContacts,
  companies,
}: {
  initialContacts: Contact[];
  companies: CompanyOption[];
}) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        c.firstName,
        c.lastName,
        c.email,
        c.title ?? "",
        c.company?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [contacts, search, statusFilter]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(c: Contact) {
    setForm({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone ?? "",
      title: c.title ?? "",
      status: c.status,
      companyId: c.companyId ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = form.id ? `/api/contacts/${form.id}` : "/api/contacts";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          title: form.title,
          status: form.status,
          companyId: form.companyId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved: Contact = await res.json();
      setContacts((prev) => {
        if (form.id) {
          return prev.map((c) => (c.id === saved.id ? saved : c));
        }
        return [saved, ...prev];
      });
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this contact?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } else {
      alert("Failed to delete contact");
    }
  }

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} contacts in your database`}
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New Contact
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <input
            className="input max-w-xs"
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input max-w-[160px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Title</th>
                <th className="table-th">Company</th>
                <th className="table-th">Email</th>
                <th className="table-th">Phone</th>
                <th className="table-th">Status</th>
                <th className="table-th">Added</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="table-td font-medium">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
                    >
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="table-td">{c.title ?? "—"}</td>
                  <td className="table-td">{c.company?.name ?? "—"}</td>
                  <td className="table-td">
                    <a
                      href={`mailto:${c.email}`}
                      className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      {c.email}
                    </a>
                  </td>
                  <td className="table-td">{c.phone ?? "—"}</td>
                  <td className="table-td">
                    <span className={`pill ${statusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="table-td">{formatDate(c.createdAt)}</td>
                  <td className="table-td text-right whitespace-nowrap">
                    <button
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mr-3"
                      onClick={() => openEdit(c)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs font-medium text-rose-600 hover:text-rose-700"
                      onClick={() => remove(c.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    No contacts match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? "Edit Contact" : "New Contact"}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name</label>
              <input
                className="input"
                required
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Last name</label>
              <input
                className="input"
                required
                value={form.lastName}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
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
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as Contact["status"],
                  })
                }
              >
                {STATUSES.map((s) => (
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
                value={form.companyId}
                onChange={(e) =>
                  setForm({ ...form, companyId: e.target.value })
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

          {error && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : form.id ? "Save changes" : "Create contact"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
