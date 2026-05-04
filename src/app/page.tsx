import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  stageColor,
  statusColor,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    companyCount,
    contactCount,
    customerCount,
    openDeals,
    recentContacts,
    recentDeals,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.contact.count(),
    prisma.contact.count({ where: { status: "CUSTOMER" } }),
    prisma.deal.findMany({
      where: { stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } },
      select: { value: true },
    }),
    prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { company: true },
    }),
    prisma.deal.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { company: true, contact: true },
    }),
  ]);

  const pipelineValue = openDeals.reduce(
    (sum, d) => sum + Number(d.value),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Snapshot of your pipeline, contacts, and accounts."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Companies"
          value={formatNumber(companyCount)}
          hint="Active accounts in your CRM"
        />
        <StatCard
          label="Contacts"
          value={formatNumber(contactCount)}
          hint={`${formatNumber(customerCount)} marked as customers`}
        />
        <StatCard
          label="Open Pipeline"
          value={formatCurrency(pipelineValue)}
          hint={`${openDeals.length} open deals`}
        />
        <StatCard
          label="Avg. Open Deal"
          value={formatCurrency(
            openDeals.length ? pipelineValue / openDeals.length : 0,
          )}
          hint="Across active stages"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent Contacts
            </h2>
            <Link
              href="/contacts"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {recentContacts.map((c) => (
              <li
                key={c.id}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {c.firstName} {c.lastName}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {c.title ?? "—"}
                    {c.company ? ` · ${c.company.name}` : ""}
                  </div>
                </div>
                <span
                  className={`pill ${statusColor(c.status)} whitespace-nowrap`}
                >
                  {c.status}
                </span>
              </li>
            ))}
            {recentContacts.length === 0 && (
              <li className="px-5 py-6 text-sm text-slate-500">
                No contacts yet.
              </li>
            )}
          </ul>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent Deals
            </h2>
            <Link
              href="/analytics"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              View analytics →
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {recentDeals.map((d) => (
              <li
                key={d.id}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {d.title}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {d.company?.name ?? "—"} ·{" "}
                    {d.expectedCloseDate
                      ? `Closes ${formatDate(d.expectedCloseDate)}`
                      : d.closedAt
                        ? `Closed ${formatDate(d.closedAt)}`
                        : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <span className="text-sm font-medium text-slate-900 tabular-nums">
                    {formatCurrency(Number(d.value))}
                  </span>
                  <span className={`pill ${stageColor(d.stage)}`}>
                    {d.stage.replace("_", " ")}
                  </span>
                </div>
              </li>
            ))}
            {recentDeals.length === 0 && (
              <li className="px-5 py-6 text-sm text-slate-500">
                No deals yet.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
