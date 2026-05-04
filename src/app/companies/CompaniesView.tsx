"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { formatCurrency, formatNumber } from "@/lib/format";

type Company = {
  id: string;
  name: string;
  industry: string;
  website: string | null;
  employees: number;
  annualRevenue: number;
  city: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { contacts: number; deals: number };
};

type FormState = {
  id?: string;
  name: string;
  industry: string;
  website: string;
  employees: string;
  annualRevenue: string;
  city: string;
  country: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  industry: "",
  website: "",
  employees: "",
  annualRevenue: "",
  city: "",
  country: "",
};

export default function CompaniesView({
  initialCompanies,
}: {
  initialCompanies: Company[];
}) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const industries = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => set.add(c.industry));
    return Array.from(set).sort();
  }, [companies]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (industryFilter !== "ALL" && c.industry !== industryFilter) return false;
      if (!q) return true;
      const haystack = [c.name, c.industry, c.city ?? "", c.country ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [companies, search, industryFilter]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(c: Company) {
    setForm({
      id: c.id,
      name: c.name,
      industry: c.industry,
      website: c.website ?? "",
      employees: String(c.employees ?? ""),
      annualRevenue: String(c.annualRevenue ?? ""),
      city: c.city ?? "",
      country: c.country ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = form.id ? `/api/companies/${form.id}` : "/api/companies";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          industry: form.industry,
          website: form.website,
          employees: form.employees ? Number(form.employees) : 0,
          annualRevenue: form.annualRevenue ? Number(form.annualRevenue) : 0,
          city: form.city,
          country: form.country,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      const enriched: Company = {
        ...saved,
        annualRevenue: Number(saved.annualRevenue ?? 0),
        _count:
          companies.find((c) => c.id === saved.id)?._count ?? {
            contacts: 0,
            deals: 0,
          },
      };
      setCompanies((prev) => {
        if (form.id) {
          return prev.map((c) => (c.id === enriched.id ? { ...c, ...enriched } : c));
        }
        return [enriched, ...prev];
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
    if (!confirm("Delete this company? Linked contacts will be detached.")) return;
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } else {
      alert("Failed to delete company");
    }
  }

  const totalRevenue = filtered.reduce((s, c) => s + Number(c.annualRevenue), 0);
  const totalEmployees = filtered.reduce((s, c) => s + (c.employees ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle={`${companies.length} accounts · ${formatCurrency(totalRevenue)} total revenue · ${formatNumber(totalEmployees)} employees`}
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
            New Company
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100">
          <input
            className="input max-w-xs"
            placeholder="Search by name, industry, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input max-w-[200px]"
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
          >
            <option value="ALL">All industries</option>
            {industries.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Industry</th>
                <th className="table-th">Location</th>
                <th className="table-th">Employees</th>
                <th className="table-th">Annual Revenue</th>
                <th className="table-th">Contacts</th>
                <th className="table-th">Deals</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="table-td font-medium text-slate-900">
                    {c.website ? (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-brand-600"
                      >
                        {c.name}
                      </a>
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="table-td">{c.industry}</td>
                  <td className="table-td">
                    {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="table-td tabular-nums">
                    {formatNumber(c.employees)}
                  </td>
                  <td className="table-td tabular-nums">
                    {formatCurrency(Number(c.annualRevenue))}
                  </td>
                  <td className="table-td tabular-nums">{c._count.contacts}</td>
                  <td className="table-td tabular-nums">{c._count.deals}</td>
                  <td className="table-td text-right whitespace-nowrap">
                    <button
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 mr-3"
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
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    No companies match your filters.
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
        title={form.id ? "Edit Company" : "New Company"}
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Industry</label>
              <input
                className="input"
                required
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Website</label>
              <input
                className="input"
                placeholder="https://..."
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Employees</label>
              <input
                className="input"
                type="number"
                min={0}
                value={form.employees}
                onChange={(e) => setForm({ ...form, employees: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Annual revenue (USD)</label>
              <input
                className="input"
                type="number"
                min={0}
                value={form.annualRevenue}
                onChange={(e) =>
                  setForm({ ...form, annualRevenue: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input
                className="input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Country</label>
              <input
                className="input"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 ring-1 ring-rose-200 rounded-lg px-3 py-2">
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
              {submitting ? "Saving..." : form.id ? "Save changes" : "Create company"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
