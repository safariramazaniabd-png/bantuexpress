"use client";

import { useRouter, usePathname } from "next/navigation";
import { BarChart3, Users, Flag, FileText } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/reports", label: "Signalements", icon: Flag },
  { href: "/admin/audit-logs", label: "Audit", icon: FileText },
];

export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-zinc-200 pb-2 mb-6 dark:border-zinc-800">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <button
            key={item.href}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${
              active
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 dark:hover:text-zinc-200 dark:hover:bg-zinc-900"
            }`}
            onClick={() => router.push(item.href)}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
