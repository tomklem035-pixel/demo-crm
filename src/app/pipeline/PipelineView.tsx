"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { formatCurrency } from "@/lib/format";

type ActiveStage = "PROSPECTING" | "QUALIFICATION" | "PROPOSAL" | "NEGOTIATION";
type DealStage = ActiveStage | "CLOSED_WON" | "CLOSED_LOST";

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

const ACTIVE_STAGES: ActiveStage[] = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
];

const ALL_STAGES: DealStage[] = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

const COLUMN_CONFIG: Record<ActiveStage, { label: string; accentColor: string }> = {
  PROSPECTING:   { label: "Prospecting",   accentColor: "#94a3b8" },
  QUALIFICATION: { label: "Qualification", accentColor: "#f59e0b" },
  PROPOSAL:      { label: "Proposal",      accentColor: "#6366f1" },
  NEGOTIATION:   { label: "Negotiation",   accentColor: "#f97316" },
};

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-slate-500",
];

const EMPTY_FORM: FormState = {
  title: "",
  value: "",
  stage: "PROSPECTING",
  expectedCloseDate: "",
  companyId: "",
  contactId: "",
};

function avatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function shortDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildColumns(deals: Deal[]): Record<ActiveStage, Deal[]> {
  const cols: Record<ActiveStage, Deal[]> = {
    PROSPECTING: [],
    QUALIFICATION: [],
    PROPOSAL: [],
    NEGOTIATION: [],
  };
  for (const deal of deals) {
    if ((ACTIVE_STAGES as string[]).includes(deal.stage)) {
      cols[deal.stage as ActiveStage].push(deal);
    }
  }
  return cols;
}

export default function PipelineView({
  initialDeals,
  companies,
  contacts,
}: {
  initialDeals: Deal[];
  companies: CompanyOption[];
  contacts: ContactOption[];
}) {
  const router = useRouter();
  const [columns, setColumns] = useState<Record<ActiveStage, Deal[]>>(
    () => buildColumns(initialDeals)
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dragError, setDragError] = useState<{ dealId: string; message: string } | null>(null);

  const totalDeals = useMemo(
    () => ACTIVE_STAGES.reduce((sum, s) => sum + columns[s].length, 0),
    [columns]
  );
  const totalValue = useMemo(
    () =>
      ACTIVE_STAGES.reduce(
        (sum, s) =>
          sum + columns[s].reduce((s2, d) => s2 + parseFloat(d.value), 0),
        0
      ),
    [columns]
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(deal: Deal) {
    setForm({
      id: deal.id,
      title: deal.title,
      value: deal.value ? String(parseFloat(deal.value)) : "",
      stage: deal.stage,
      expectedCloseDate: deal.expectedCloseDate
        ? new Date(deal.expectedCloseDate).toISOString().split("T")[0]
        : "",
      companyId: deal.companyId ?? "",
      contactId: deal.contactId ?? "",
    });
    setFormError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
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
      const saved = await res.json();
      const savedDeal: Deal = { ...saved, value: String(saved.value) };

      setColumns((prev) => {
        const next: Record<ActiveStage, Deal[]> = {
          PROSPECTING: [...prev.PROSPECTING],
          QUALIFICATION: [...prev.QUALIFICATION],
          PROPOSAL: [...prev.PROPOSAL],
          NEGOTIATION: [...prev.NEGOTIATION],
        };
        if (form.id) {
          for (const s of ACTIVE_STAGES) {
            next[s] = next[s].filter((d) => d.id !== savedDeal.id);
          }
        }
        if ((ACTIVE_STAGES as string[]).includes(savedDeal.stage)) {
          next[savedDeal.stage as ActiveStage] = [
            savedDeal,
            ...next[savedDeal.stage as ActiveStage],
          ];
        }
        return next;
      });

      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setFormError(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Pipeline
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {totalDeals} {totalDeals === 1 ? "deal" : "deals"} ·{" "}
            {formatCurrency(totalValue)} total pipeline
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          + New Deal
        </button>
      </div>

      {/* Board */}
      <div className="grid grid-cols-4 gap-4 overflow-x-auto">
        {ACTIVE_STAGES.map((stage) => {
          const config = COLUMN_CONFIG[stage];
          const deals = columns[stage];
          const colValue = deals.reduce((sum, d) => sum + parseFloat(d.value), 0);
          return (
            <div key={stage} className="flex flex-col gap-2 min-w-[200px]">
              {/* Column header */}
              <div
                className="flex items-center justify-between pb-2 border-b-2"
                style={{ borderBottomColor: config.accentColor }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: config.accentColor }}
                  />
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    {config.label}
                  </span>
                  <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full px-1.5 py-0.5 font-semibold leading-none">
                    {deals.length}
                  </span>
                </div>
                {colValue > 0 && (
                  <span className="text-xs text-slate-400 font-semibold">
                    {formatCurrency(colValue)}
                  </span>
                )}
              </div>

              {/* Cards area */}
              <div className="flex flex-col gap-2 min-h-[80px]">
                {deals.length === 0 ? (
                  <div className="flex items-center justify-center h-16 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-400 dark:text-slate-600">
                      No deals
                    </span>
                  </div>
                ) : (
                  deals.map((deal, index) => {
                    const displayName = deal.contact
                      ? `${deal.contact.firstName} ${deal.contact.lastName}`
                      : deal.company?.name ?? null;
                    const initial = displayName
                      ? displayName[0].toUpperCase()
                      : "?";
                    const errorMsg =
                      dragError?.dealId === deal.id ? dragError.message : null;
                    return (
                      <div
                        key={deal.id}
                        onClick={() => openEdit(deal)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow select-none"
                        style={{
                          borderTopWidth: "3px",
                          borderTopColor: config.accentColor,
                        }}
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 leading-snug">
                          {deal.title}
                        </p>
                        {displayName && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${avatarColor(index)}`}
                            >
                              {initial}
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {displayName}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(deal.value)}
                          </span>
                          <span className="text-xs text-slate-400">
                            {shortDate(deal.expectedCloseDate)}
                          </span>
                        </div>
                        {errorMsg && (
                          <p className="text-xs text-rose-500 mt-1.5">
                            {errorMsg}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal modal (create + edit) */}
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
                {ALL_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
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
          {formError && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {formError}
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
              {submitting ? "Saving…" : form.id ? "Save changes" : "Create deal"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
