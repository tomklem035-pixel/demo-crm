"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { statusColor } from "@/lib/format";

type ContactStatus = "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED";
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

type Company = { id: string; name: string };
type ContactOption = { id: string; firstName: string; lastName: string };
type Tab = "deals" | "activity" | "tasks";

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export default function ContactDetailView({
  contact: initialContact,
  companies,
  contacts,
}: {
  contact: Contact;
  companies: Company[];
  contacts: ContactOption[];
}) {
  const router = useRouter();
  const [contact, setContact] = useState<Contact>(initialContact);
  const [tab, setTab] = useState<Tab>("deals");

  const titleLine = [contact.title, contact.company?.name]
    .filter(Boolean)
    .join(" · ");

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
        <button className="btn-secondary" onClick={() => {}}>
          Edit Contact
        </button>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <nav className="flex -mb-px">
          {(["deals", "activity", "tasks"] as Tab[]).map((t) => (
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
                : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === "deals" && (
        <div className="card p-10 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Deals list — implemented in Task 4.
          </p>
        </div>
      )}
      {tab === "activity" && (
        <div className="card p-10 flex flex-col items-center justify-center gap-2 text-center">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Activity logging coming soon.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Activity tracking will be added in a future update.
          </p>
        </div>
      )}
      {tab === "tasks" && (
        <div className="card p-10 flex flex-col items-center justify-center gap-2 text-center">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Task tracking coming soon.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Task management will be added in a future update.
          </p>
        </div>
      )}
    </div>
  );
}
