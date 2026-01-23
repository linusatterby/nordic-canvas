import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Calendar,
  ArrowLeftRight,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  Activity,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils/classnames";
import { Button } from "@/components/ui/Button";
import type { Role } from "@/lib/constants/roles";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

const talentNavItems: NavItem[] = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard", href: "/talent/dashboard" },
  { icon: <Briefcase className="h-5 w-5" />, label: "Hitta jobb", href: "/talent/swipe-jobs" },
  { icon: <Users className="h-5 w-5" />, label: "Matchningar", href: "/talent/matches" },
  { icon: <Inbox className="h-5 w-5" />, label: "Inbox", href: "/talent/inbox" },
  { icon: <Activity className="h-5 w-5" />, label: "Aktivitet", href: "/talent/activity" },
  { icon: <User className="h-5 w-5" />, label: "Min profil", href: "/talent/profile" },
];

const employerNavItems: NavItem[] = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard", href: "/employer/dashboard" },
  { icon: <Briefcase className="h-5 w-5" />, label: "Mina jobb", href: "/employer/jobs" },
  { icon: <Users className="h-5 w-5" />, label: "Hitta talanger", href: "/employer/swipe-talent" },
  { icon: <Inbox className="h-5 w-5" />, label: "Inbox", href: "/employer/inbox" },
  { icon: <Activity className="h-5 w-5" />, label: "Aktivitet", href: "/employer/activity" },
  { icon: <Calendar className="h-5 w-5" />, label: "Schemaläggare", href: "/employer/scheduler" },
  { icon: <ArrowLeftRight className="h-5 w-5" />, label: "Låna personal", href: "/employer/borrow" },
];

interface SideNavProps {
  role: Role;
  isOpen: boolean;
  onToggle: () => void;
}

export function SideNav({ role, isOpen, onToggle }: SideNavProps) {
  const location = useLocation();
  const navItems = role === "talent" ? talentNavItems : employerNavItems;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-ink text-frost transition-all duration-slow ease-out",
        "flex flex-col",
        isOpen ? "w-64" : "w-16"
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        {isOpen && (
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">ST</span>
            </div>
            <span className="font-semibold text-sm">Seasonal Talent</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-frost/70 hover:text-frost hover:bg-white/10"
          aria-label={isOpen ? "Minimera meny" : "Expandera meny"}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", !isOpen && "rotate-180")} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                "text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-frost/70 hover:text-frost hover:bg-white/10"
              )}
            >
              {item.icon}
              {isOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-white/10 space-y-1">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
            "text-sm font-medium text-frost/70 hover:text-frost hover:bg-white/10"
          )}
        >
          <Settings className="h-5 w-5" />
          {isOpen && <span>Inställningar</span>}
        </Link>
        <button
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
            "text-sm font-medium text-frost/70 hover:text-frost hover:bg-white/10"
          )}
        >
          <LogOut className="h-5 w-5" />
          {isOpen && <span>Logga ut</span>}
        </button>
      </div>
    </aside>
  );
}
