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
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils/classnames";
import { Button } from "@/components/ui/Button";
import type { Role } from "@/lib/constants/roles";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface NavSection {
  heading?: string;
  items: NavItem[];
}

const talentSections: NavSection[] = [
  {
    heading: "Översikt",
    items: [
      { icon: <LayoutDashboard className="h-5 w-5" />, label: "Översikt", href: "/talent/dashboard" },
    ],
  },
  {
    heading: "Jobb",
    items: [
      { icon: <Briefcase className="h-5 w-5" />, label: "Jobb", href: "/talent/swipe-jobs" },
      { icon: <Home className="h-5 w-5" />, label: "Boende", href: "/talent/housing" },
      { icon: <Users className="h-5 w-5" />, label: "Matchningar & förslag", href: "/talent/matches" },
    ],
  },
  {
    heading: "Kommunikation",
    items: [
      { icon: <Inbox className="h-5 w-5" />, label: "Meddelanden", href: "/talent/inbox" },
      { icon: <Activity className="h-5 w-5" />, label: "Aktivitet", href: "/talent/activity" },
    ],
  },
  {
    items: [
      { icon: <User className="h-5 w-5" />, label: "Min profil", href: "/talent/profile" },
    ],
  },
];

const employerSections: NavSection[] = [
  {
    heading: "Översikt",
    items: [
      { icon: <LayoutDashboard className="h-5 w-5" />, label: "Översikt", href: "/employer/dashboard" },
    ],
  },
  {
    heading: "Rekrytering",
    items: [
      { icon: <Briefcase className="h-5 w-5" />, label: "Annonser", href: "/employer/jobs" },
      { icon: <Users className="h-5 w-5" />, label: "Hitta talanger", href: "/employer/jobs" },
      { icon: <Calendar className="h-5 w-5" />, label: "Schema", href: "/employer/scheduler" },
      { icon: <ArrowLeftRight className="h-5 w-5" />, label: "Låna personal", href: "/employer/borrow" },
    ],
  },
  {
    heading: "Kommunikation",
    items: [
      { icon: <Inbox className="h-5 w-5" />, label: "Meddelanden", href: "/employer/inbox" },
      { icon: <Activity className="h-5 w-5" />, label: "Händelser", href: "/employer/activity" },
    ],
  },
];

const hostSections: NavSection[] = [
  {
    items: [
      { icon: <LayoutDashboard className="h-5 w-5" />, label: "Mina boenden", href: "/host/housing" },
      { icon: <Inbox className="h-5 w-5" />, label: "Meddelanden", href: "/host/inbox" },
    ],
  },
];

function getSections(role: Role): NavSection[] {
  if (role === "talent") return talentSections;
  if (role === "host") return hostSections;
  return employerSections;
}

interface SideNavProps {
  role: Role;
  isOpen: boolean;
  onToggle: () => void;
}

export function SideNav({ role, isOpen, onToggle }: SideNavProps) {
  const location = useLocation();
  const sections = getSections(role);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-slow ease-out",
        "flex flex-col",
        "bg-[hsl(222,47%,11%)] text-frost",
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
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className={cn(sIdx > 0 && "mt-4")}>
            {section.heading && isOpen && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-frost/40 select-none">
                {section.heading}
              </p>
            )}
            {!isOpen && sIdx > 0 && (
              <div className="mx-3 mb-2 border-t border-white/8" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href + item.label}
                    to={item.href}
                    className={cn(
                      "relative flex items-center gap-3 px-3 min-h-[44px] transition-all duration-200",
                      "text-sm font-medium rounded-xl",
                      isActive
                        ? "bg-white/12 text-frost shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] border border-white/10"
                        : "text-frost/70 hover:text-frost hover:bg-white/6 border border-transparent"
                    )}
                  >
                    {/* Left accent bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                    )}
                    {item.icon}
                    {isOpen && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-white/8 space-y-0.5">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-3 px-3 min-h-[44px] rounded-xl transition-all duration-200",
            "text-sm font-medium",
            location.pathname.startsWith("/settings")
              ? "bg-white/12 text-frost border border-white/10"
              : "text-frost/70 hover:text-frost hover:bg-white/6 border border-transparent"
          )}
        >
          <Settings className="h-5 w-5" />
          {isOpen && <span>Inställningar</span>}
        </Link>
        <button
          className={cn(
            "w-full flex items-center gap-3 px-3 min-h-[44px] rounded-xl transition-all duration-200",
            "text-sm font-medium text-frost/70 hover:text-frost hover:bg-white/6 border border-transparent"
          )}
        >
          <LogOut className="h-5 w-5" />
          {isOpen && <span>Logga ut</span>}
        </button>
      </div>
    </aside>
  );
}
