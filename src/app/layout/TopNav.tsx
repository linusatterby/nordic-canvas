import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, User, Menu, X, LogOut, Settings, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/classnames";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/supabase/auth";
import { toast } from "sonner";
import { useUnreadCount } from "@/hooks/useNotifications";

interface TopNavProps {
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
}

export function TopNav({ onMenuToggle, isSidebarOpen }: TopNavProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { data: unreadCount, isLoading: unreadLoading } = useUnreadCount();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Användare";
  const inboxPath = profile?.type === "employer" ? "/employer/inbox" : "/talent/inbox";

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <Avatar
              alt={displayName}
              fallback={displayName.slice(0, 2).toUpperCase()}
              size="sm"
            />
            <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform hidden sm:block",
              menuOpen && "rotate-180"
            )} />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-xl border border-border shadow-lg py-2 animate-scale-in">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>

              <div className="py-1">
                <Link
                  to="/settings/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profil
                </Link>
                <Link
                  to="/settings/account"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Inställningar
                </Link>
              </div>

              <div className="border-t border-border pt-1">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logga ut
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
