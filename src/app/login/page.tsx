"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const error = params.get("error");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    await signIn("azure-ad", { callbackUrl });
  }

  return (
    <div className="card p-10 flex flex-col items-center gap-6 w-full max-w-sm">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Sign in to CRM
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Use your Microsoft account to continue
        </p>
      </div>

      {error === "AccessDenied" && (
        <div className="w-full rounded-lg bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 text-center">
          Your account is not authorised to access this application.
        </div>
      )}

      <button
        onClick={handleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" className="h-5 w-5" aria-hidden="true">
          <path fill="#f3f3f3" d="M0 0h23v23H0z" />
          <path fill="#f35325" d="M1 1h10v10H1z" />
          <path fill="#81bc06" d="M12 1h10v10H12z" />
          <path fill="#05a6f0" d="M1 12h10v10H1z" />
          <path fill="#ffba08" d="M12 12h10v10H12z" />
        </svg>
        {loading ? "Redirecting…" : "Sign in with Microsoft"}
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
