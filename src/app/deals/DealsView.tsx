"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { formatCurrency, formatDate, stageColor } from "@/lib/format";

type DealStage =
  | "PROSPECTING"
  | "QUALIFICATION"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST";

type Deal = {
  id: string;
  title: string;
  value: string | number;
  stage: DealStage;
  expectedCloseDate: string | Date | null;
  closedAt: string | Date | null;
  companyId: string | null;
  contactId: string | null;
  createdAt: string | Date;
  company: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
};

type CompanyOption = { id: string; name: string };
type ContactOption = { id: string; firstName: string; lastName: string };

type FormState = {
  id?: string;
  title: string;
  value: string;
  stage: DealStage;
  expectedCloseDate: string;
  companyId: string;
  contactId: string;
};

const STAGES: DealStage[] = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

const EMPTY_FORM: FormState = {
  title: "",
  value: "",
  stage: "PROSPECTING",
  expectedCloseDate: "",
  companyId: "",
  contactId: "",
};

export default function DealsView({
  initialDeals,
  companies,
  contacts,
}: {
  initialDeals: Deal[];
  companies: CompanyOption[];
  contacts: ContactOption[];
}) {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deals.filter((d) => {
      if (stageFilter !== "ALL" && d.stage !== stageFilter) return false;
      if (!q) return true;
      const contactName = d.contact
        ? `${d.contact.firstName} ${d.contact.lastName}`
        : "";
      return [d.title, d.company?.name ?? "", contactName]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [deals, search, stageFilter]);

  const totalPipeline = useMemo(
    () =>
      deals
        .filter((d) => d.stage !== "CLOSED_LOST")
        .reduce((sum, d) => sum + Number(d.value), 0),
    [deals],
  );

  const wonValue = useMemo(
    () =>
      deals
        .filter((d) => d.stage === "CLOSED_WON")
        .reduce((sum, d) => sum + Number(d.value), 0),
    [deals],
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(d: Deal) {
    setForm({
      id: d.id,
      title: d.title,
      value: d.value ? String(Number(d.value)) : "",
      stage: d.stage,
      expectedCloseDate: d.expectedCloseDate
        ? new Date(d.expectedCloseDate).toISOString().split("T")[0]
        : "",
      companyId: d.companyId ?? "",
      contactId: d.contactId ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = form.id ? `/api/deals/${form.id}` : "/api/deals";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          value: form.value ? parseFloat(form.value) : 0,
          stage: form.stage,
          expectedCloseDate: form.expectedCloseDate || null,
          companyId: form.companyId || null,
          contactId: form.contactId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved: Deal = await res.json();
      setDeals((prev) => {
        if (form.id) return prev.map((d) => (d.id === saved.id ? saved : d));
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
    if (!confirm("Delete this deal?")) return;
    const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeals((prev) => prev.filter((d) => d.id !== id));
      router.refresh();
    } else {
      alert("Failed to delete deal");
    }
  }

  return (
    <div>
      <PageHeader
        title="Deals"
        subtitle={`${deals.length} deals · ${formatCurrency(totalPipeline)} pipeline · ${formatCurrency(wonValue)} won`}
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
            New Deal
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <input
            className="input max-w-xs"
            placeholder="Search by title, company or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input max-w-[180px]"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="ALL">All stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="table-th">Title</th>
                <th className="table-th">Company</th>
                <th className="table-th">Contact</th>
                <th className="table-th">Stage</th>
                <th className="table-th">Value</th>
                <th className="table-th">Expected Close</th>
                <th className="table-th">Added</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                >
                  <td className="table-td font-medium text-slate-900 dark:text-slate-100">
                    {d.title}
                  </td>
                  <td className="table-td">{d.company?.name ?? "—"}</td>
                  <td className="table-td">
                    {d.contact
                      ? `${d.contact.firstName} ${d.contact.lastName}`
                      : "—"}
                  </td>
                  <td className="table-td">
                    <span className={`pill ${stageColor(d.stage)}`}>
                      {d.stage.replace("_", " ")}
                    </span>
                  </td>
                  <td className="table-td tabular-nums">
                    {formatCurrency(Number(d.value))}
                  </td>
                  <td className="table-td">
                    {formatDate(d.expectedCloseDate)}
                  </td>
                  <td className="table-td">{formatDate(d.createdAt)}</td>
                  <td className="table-td text-right whitespace-nowrap">
                    <button
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mr-3"
                      onClick={() => openEdit(d)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs font-medium text-rose-600 hover:text-rose-700"
                      onClick={() => remove(d.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No deals match your filters.
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
        title={form.id ? "Edit Deal" : "New Deal"}
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Value (USD)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Stage</label>
              <select
                className="input"
                value={form.stage}
                onChange={(e) =>
                  setForm({ ...form, stage: e.target.value as DealStage })
                }
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Expected Close Date</label>
            <input
              className="input"
              type="date"
              value={form.expectedCloseDate}
              onChange={(e) =>
                setForm({ ...form, expectedCloseDate: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="label">Contact</label>
              <select
                className="input"
                value={form.contactId}
                onChange={(e) =>
                  setForm({ ...form, contactId: e.target.value })
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
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting
                ? "Saving..."
                : form.id
                  ? "Save changes"
                  : "Create deal"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
