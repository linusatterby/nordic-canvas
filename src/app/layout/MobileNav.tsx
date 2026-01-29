import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Briefcase, Users, Inbox, Home } from "lucide-react";
import { cn } from "@/lib/utils/classnames";
import type { Role } from "@/lib/constants/roles";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

const talentNavItems: NavItem[] = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: "Översikt", href: "/talent/dashboard" },
  { icon: <Briefcase className="h-5 w-5" />, label: "Jobb", href: "/talent/swipe-jobs" },
  { icon: <Home className="h-5 w-5" />, label: "Boende", href: "/talent/housing" },
  { icon: <Users className="h-5 w-5" />, label: "Matcher", href: "/talent/matches" },
  { icon: <Inbox className="h-5 w-5" />, label: "Meddelanden", href: "/talent/inbox" },
];

const employerNavItems: NavItem[] = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: "Översikt", href: "/employer/dashboard" },
  { icon: <Briefcase className="h-5 w-5" />, label: "Annonser", href: "/employer/jobs" },
  { icon: <Users className="h-5 w-5" />, label: "Talanger", href: "/employer/swipe-talent" },
  { icon: <Inbox className="h-5 w-5" />, label: "Meddelanden", href: "/employer/inbox" },
];

const hostNavItems: NavItem[] = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: "Boenden", href: "/host/housing" },
  { icon: <Inbox className="h-5 w-5" />, label: "Meddelanden", href: "/host/inbox" },
];

interface MobileNavProps {
  role: Role;
}

export function MobileNav({ role }: MobileNavProps) {
  const location = useLocation();
  const navItems = role === "talent" 
    ? talentNavItems 
    : role === "host" 
      ? hostNavItems 
      : employerNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
