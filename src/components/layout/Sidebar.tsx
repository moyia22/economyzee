import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Wallet,
  CalendarClock,
  Target,
  Users,
  FileBarChart,
  Settings,
  ChevronsLeft,
  Sparkles,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { to: "/analytics", label: "Análises", icon: BarChart3 },
  { to: "/accounts", label: "Contas & Cartões", icon: Wallet },
  { to: "/bills", label: "Contas a pagar", icon: CalendarClock },
  { to: "/budgets", label: "Orçamentos", icon: Target },
  { to: "/shared", label: "Compartilhado", icon: Users },
  { to: "/reports", label: "Relatórios", icon: FileBarChart },
  { to: "/settings", label: "Configurações", icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const path = location.pathname;

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose?.();
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  const sidebarContent = (isMobile: boolean) => (
    <>
      <div className="flex h-20 items-center gap-3 px-4">
        <div className="flex shrink-0 items-center justify-center transition-transform hover:scale-110 active:scale-95">
          <img src="/logo.png" alt="EconomyZee Logo" className="h-[52px] w-[52px] object-contain drop-shadow-lg" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="flex flex-col leading-tight">
            <span className="text-[17px] font-bold tracking-tight">EconomyZee</span>
            <span className="text-[11px] text-muted-foreground">Finanças inteligentes</span>
          </div>
        )}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {nav.map((item) => {
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to as "/"}
              className={cn(
                "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
              title={collapsed && !isMobile ? item.label : undefined}
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active && "text-primary")} />
              {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
              {(!collapsed || isMobile) && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-scale-in" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {(!collapsed || isMobile) && (
          <div className="mb-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-primary" />
              Bot conectado
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              @EconomyZee_Bot está sincronizando suas transações em tempo real.
            </p>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <ChevronsLeft
              className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
            />
            {!collapsed && "Recolher"}
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-[248px]"
        )}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl lg:hidden animate-slide-in-right">
            {sidebarContent(true)}
          </aside>
        </>
      )}
    </>
  );
}
