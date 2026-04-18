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
    <div className="flex h-screen bg-background overflow-hidden no-print">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-xl">
        <div className="p-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-primary-foreground text-sm">L</span>
            </div>
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
      <main className="flex-1 overflow-y-auto pb-24 lg:pb-0 relative">
        <div className="max-w-375 mx-auto w-full p-4 sm:p-6 lg:p-8 print-only:p-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav — no Transactions tab */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-xl border-t border-border pb-safe">
        <div className="flex items-center justify-around px-2 h-16 relative">
          {/* Left two: Dashboard, Analytics */}
          {mobileNavItems.slice(0, 2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full transition-colors",
                location === item.href
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          ))}

          {/* Center FAB */}
          <div className="relative -top-5">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform cursor-pointer"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>

          {/* Right two: Budgets, Settings */}
          {mobileNavItems.slice(2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full transition-colors",
                location === item.href
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
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
