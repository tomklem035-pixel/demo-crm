"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";

type SyncResult = {
  created?: number;
  updated?: number;
  skipped?: number;
  error?: string;
};

function useSync(endpoint: string) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error ?? "Sync failed" });
      } else {
        setResult(data);
        setLastSynced(new Date().toLocaleString());
      }
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return { sync, loading, result, lastSynced };
}

function SyncPanel({
  title,
  description,
  endpoint,
  icon,
}: {
  title: string;
  description: string;
  endpoint: string;
  icon: string;
}) {
  const { sync, loading, result, lastSynced } = useSync(endpoint);

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-brand-50 dark:bg-brand-500/10 p-2.5">
          <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d={icon} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        </div>
        <button
          onClick={sync}
          disabled={loading}
          className="btn-primary shrink-0"
        >
          {loading ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {lastSynced && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Last synced: {lastSynced}
        </p>
      )}

      {result && !result.error && (
        <div className="rounded-lg bg-green-50 dark:bg-green-500/10 ring-1 ring-green-200 dark:ring-green-500/30 px-4 py-3 text-sm text-green-800 dark:text-green-300">
          {result.created !== undefined && <span>{result.created} created · </span>}
          {result.updated !== undefined && <span>{result.updated} updated · </span>}
          {result.skipped !== undefined && <span>{result.skipped} skipped</span>}
        </div>
      )}

      {result?.error && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {result.error}
        </div>
      )}
    </div>
  );
}

export default function OutlookSyncPage() {
  return (
    <div>
      <PageHeader
        title="Outlook Sync"
        subtitle="Import contacts, emails, and calendar events from your Microsoft account"
      />
      <div className="space-y-4 max-w-2xl">
        <SyncPanel
          title="Import Contacts"
          description="Pull all contacts from your Outlook address book. New contacts are created; existing ones (matched by email) are updated."
          endpoint="/api/outlook/sync-contacts"
          icon="M16 14a4 4 0 1 0-8 0M4 20a8 8 0 1 1 16 0"
        />
        <SyncPanel
          title="Sync Emails"
          description="Log emails from the last 90 days as activities against matching CRM contacts. Re-syncing won't create duplicates."
          endpoint="/api/outlook/sync-emails"
          icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
        <SyncPanel
          title="Sync Calendar"
          description="Log calendar events (last 30 days + next 60 days) as activities against matching CRM contacts."
          endpoint="/api/outlook/sync-calendar"
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </div>
    </div>
  );
}
