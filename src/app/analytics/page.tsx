import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import AnalyticsCharts from "./AnalyticsCharts";
import { formatCurrency, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [contacts, deals, companies] = await Promise.all([
    prisma.contact.findMany({ select: { status: true, createdAt: true } }),
    prisma.deal.findMany({
      select: {
        stage: true,
        value: true,
        createdAt: true,
        closedAt: true,
        company: { select: { industry: true, name: true } },
      },
    }),
    prisma.company.findMany({
      select: {
        name: true,
        industry: true,
        annualRevenue: true,
        _count: { select: { deals: true, contacts: true } },
      },
    }),
  ]);

  // Status distribution
  const statusCountsMap = new Map<string, number>();
  contacts.forEach((c) => {
    statusCountsMap.set(c.status, (statusCountsMap.get(c.status) ?? 0) + 1);
  });
  const statusData = Array.from(statusCountsMap.entries()).map(
    ([name, value]) => ({ name, value }),
  );

  // Pipeline by stage
  const stageMap = new Map<string, { count: number; value: number }>();
  deals.forEach((d) => {
    const cur = stageMap.get(d.stage) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += Number(d.value);
    stageMap.set(d.stage, cur);
  });
  const stageOrder = [
    "PROSPECTING",
    "QUALIFICATION",
    "PROPOSAL",
    "NEGOTIATION",
    "CLOSED_WON",
    "CLOSED_LOST",
  ];
  const stageData = stageOrder
    .map((stage) => ({
      stage: stage.replace("_", " "),
      count: stageMap.get(stage)?.count ?? 0,
      value: stageMap.get(stage)?.value ?? 0,
    }))
    .filter((s) => s.count > 0);

  // Industry revenue (from companies)
  const industryMap = new Map<string, number>();
  companies.forEach((c) => {
    industryMap.set(
      c.industry,
      (industryMap.get(c.industry) ?? 0) + Number(c.annualRevenue),
    );
  });
  const industryData = Array.from(industryMap.entries())
    .map(([industry, revenue]) => ({ industry, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  // Monthly contact growth (last 6 months)
  const now = new Date();
  const monthBuckets: { label: string; key: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthBuckets.push({
      label: d.toLocaleString("en-US", { month: "short" }),
      key,
      count: 0,
    });
  }
  const bucketIndex = new Map(monthBuckets.map((b, i) => [b.key, i]));
  contacts.forEach((c) => {
    const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const i = bucketIndex.get(key);
    if (i !== undefined) monthBuckets[i].count += 1;
  });

  // Top companies by deal value
  const topCompanies = companies
    .map((c) => ({
      name: c.name,
      industry: c.industry,
      contacts: c._count.contacts,
      deals: c._count.deals,
      revenue: Number(c.annualRevenue),
    }))
    .sort((a, b) => b.deals - a.deals)
    .slice(0, 8);

  const totalPipeline = deals
    .filter((d) => d.stage !== "CLOSED_WON" && d.stage !== "CLOSED_LOST")
    .reduce((s, d) => s + Number(d.value), 0);
  const wonValue = deals
    .filter((d) => d.stage === "CLOSED_WON")
    .reduce((s, d) => s + Number(d.value), 0);
  const closedDeals = deals.filter(
    (d) => d.stage === "CLOSED_WON" || d.stage === "CLOSED_LOST",
  );
  const winRate = closedDeals.length
    ? deals.filter((d) => d.stage === "CLOSED_WON").length / closedDeals.length
    : 0;
  const avgDealSize =
    deals.length > 0
      ? deals.reduce((s, d) => s + Number(d.value), 0) / deals.length
      : 0;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Pipeline performance, customer mix, and account insights."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Open Pipeline"
          value={formatCurrency(totalPipeline)}
          hint={`${deals.length} total deals`}
        />
        <StatCard
          label="Closed-Won Revenue"
          value={formatCurrency(wonValue)}
          hint="Across all time"
        />
        <StatCard
          label="Win Rate"
          value={`${(winRate * 100).toFixed(1)}%`}
          hint={`${closedDeals.length} closed deals`}
        />
        <StatCard
          label="Avg. Deal Size"
          value={formatCurrency(avgDealSize)}
          hint="All stages combined"
        />
      </div>

      <AnalyticsCharts
        statusData={statusData}
        stageData={stageData}
        industryData={industryData}
        monthlyContacts={monthBuckets.map((b) => ({
          month: b.label,
          contacts: b.count,
        }))}
      />

      <div className="card mt-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">
            Top Accounts by Activity
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-th">Company</th>
                <th className="table-th">Industry</th>
                <th className="table-th">Contacts</th>
                <th className="table-th">Deals</th>
                <th className="table-th">Annual Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topCompanies.map((c) => (
                <tr key={c.name}>
                  <td className="table-td font-medium text-slate-900">
                    {c.name}
                  </td>
                  <td className="table-td">{c.industry}</td>
                  <td className="table-td tabular-nums">
                    {formatNumber(c.contacts)}
                  </td>
                  <td className="table-td tabular-nums">
                    {formatNumber(c.deals)}
                  </td>
                  <td className="table-td tabular-nums">
                    {formatCurrency(c.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
