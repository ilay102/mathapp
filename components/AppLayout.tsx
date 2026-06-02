"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = pathname === "/login" || pathname?.startsWith("/auth");

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#f8f9fa]">
      <Sidebar />
      <div className="flex-1 overflow-x-hidden relative">
        {children}
      </div>
    </div>
  );
}
