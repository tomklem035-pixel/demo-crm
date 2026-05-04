export function formatCurrency(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : value ?? 0;
  if (Number.isNaN(n)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : value ?? 0;
  if (Number.isNaN(n)) return "0";
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function statusColor(status: string): string {
  switch (status) {
    case "LEAD":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "QUALIFIED":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "CUSTOMER":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "CHURNED":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export function stageColor(stage: string): string {
  switch (stage) {
    case "PROSPECTING":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "QUALIFICATION":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "PROPOSAL":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200";
    case "NEGOTIATION":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "CLOSED_WON":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "CLOSED_LOST":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}
