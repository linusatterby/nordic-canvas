import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Bell, User, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/classnames";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

interface TopNavProps {
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
  user?: {
    name: string;
    avatarUrl?: string;
  };
}

export function TopNav({ onMenuToggle, isSidebarOpen, user }: TopNavProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-card border-b border-border flex items-center px-4 gap-4">
      {/* Menu Toggle (Mobile) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuToggle}
        className="lg:hidden"
        aria-label={isSidebarOpen ? "Stäng meny" : "Öppna meny"}
      >
        {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Search */}
      <div className="flex-1 max-w-md">
        {searchOpen ? (
          <div className="relative animate-scale-in">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Sök kandidater, jobb..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="gap-2 text-muted-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Sök...</span>
          </Button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifikationer">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-delight rounded-full" />
        </Button>

        {/* Profile */}
        <Link to="/settings/profile">
          <Avatar
            src={user?.avatarUrl}
            alt={user?.name}
            fallback={user?.name?.slice(0, 2).toUpperCase() || "U"}
            size="sm"
          />
        </Link>
      </div>
    </header>
  );
}
