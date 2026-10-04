import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  ListOrdered,
  BarChart2,
  PieChart,
  Settings,
  Plus,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionModal } from "./transaction-modal";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/transactions", icon: ListOrdered, label: "Transactions" },
    { href: "/analytics", icon: BarChart2, label: "Analytics" },
    { href: "/budgets", icon: PieChart, label: "Budgets" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const mobileNavItems = [navItems[0], navItems[2], navItems[3], navItems[4]];

  return (
    <div className="flex h-dvh min-h-dvh w-full overflow-hidden bg-background no-print">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-xl">
        <div className="p-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground"
          >
            <img
              src={`${import.meta.env.BASE_URL}favicon.png`}
              alt="logo"
              aria-hidden="true"
              className="h-11 w-11 shrink-0 rounded-lg object-contain"
            />
            LifeLedger
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <item.icon
                  className={cn("w-5 h-5", isActive ? "text-primary" : "")}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            New Transaction
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <div className="mx-auto w-full min-w-0 max-w-[96rem] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8 2xl:px-10 print-only:p-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav — no Transactions tab */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="relative mx-auto flex h-16 w-full max-w-md items-center px-1">
          {/* Left two: Dashboard, Analytics */}
          {mobileNavItems.slice(0, 2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-full min-w-0 flex-1 flex-col items-center justify-center transition-colors",
                location === item.href
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="mt-1 max-w-full truncate text-[10px] font-medium leading-tight">
                {item.label}
              </span>
            </Link>
          ))}

          {/* Center FAB */}
          <div className="relative -top-4 flex w-12 shrink-0 justify-center">
            <button
              onClick={() => setIsModalOpen(true)}
              aria-label="Add transaction"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>

          {/* Right two: Budgets, Settings */}
          {mobileNavItems.slice(2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-full min-w-0 flex-1 flex-col items-center justify-center transition-colors",
                location === item.href
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="mt-1 max-w-full truncate text-[10px] font-medium leading-tight">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}