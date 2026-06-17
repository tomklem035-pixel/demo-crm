"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
