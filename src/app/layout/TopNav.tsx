import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, Menu, X, LogOut, Settings, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils/classnames";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/supabase/auth";
import { toast } from "sonner";
import { useUnreadCount } from "@/hooks/useNotifications";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface TopNavProps {
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
}

export function TopNav({ onMenuToggle, isSidebarOpen }: TopNavProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { data: unreadCount, isLoading: unreadLoading } = useUnreadCount();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Användare";
  const initials = displayName.slice(0, 2).toUpperCase();
  const inboxPath = profile?.type === "employer" ? "/employer/inbox" : "/talent/inbox";

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Kunde inte logga ut");
    } else {
      toast.success("Utloggad");
      navigate("/");
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 glass border-b border-border/50 flex items-center px-4 gap-4">
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
              className="w-full h-10 pl-10 pr-4 rounded-[14px] bg-secondary/80 border border-border/40 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all duration-fast"
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
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative" 
          aria-label="Notifikationer"
          onClick={() => navigate(inboxPath)}
        >
          <Bell className="h-5 w-5" />
          {!unreadLoading && unreadCount != null && unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-delight text-delight-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {/* Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-secondary/80 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              <Avatar
                alt={displayName}
                fallback={initials}
                size="sm"
              />
              <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                {displayName}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            collisionPadding={12}
            className="w-56 rounded-[18px] backdrop-blur-xl bg-popover/95 border border-border/50 shadow-lg p-0 overflow-hidden"
          >
            <DropdownMenuLabel className="px-4 py-3 border-b border-border/50">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </DropdownMenuLabel>

            <div className="py-1">
              <DropdownMenuItem asChild className="gap-3 px-4 py-2.5 cursor-pointer rounded-none">
                <Link to="/settings/profile">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                  Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="gap-3 px-4 py-2.5 cursor-pointer rounded-none">
                <Link to="/settings/account">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Inställningar
                </Link>
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator className="my-0" />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="gap-3 px-4 py-2.5 cursor-pointer rounded-none text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Logga ut
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
