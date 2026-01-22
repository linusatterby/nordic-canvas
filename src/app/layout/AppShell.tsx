import * as React from "react";
import { cn } from "@/lib/utils/classnames";
import { SideNav } from "./SideNav";
import { TopNav } from "./TopNav";
import { MobileNav } from "./MobileNav";
import type { Role } from "@/lib/constants/roles";
import { useAuth } from "@/contexts/AuthContext";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { DemoGuideModal } from "@/components/demo/DemoGuideModal";
import { isDemoEffectivelyEnabled } from "@/lib/config/env";

interface AppShellProps {
  children: React.ReactNode;
  role: Role;
}

export function AppShell({ children, role }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [guideOpen, setGuideOpen] = React.useState(false);
  const { profile, isDemoMode, loading, profileLoading } = useAuth();

  // Show demo guide on first visit for demo users (role-specific)
  React.useEffect(() => {
    if (loading || profileLoading || !isDemoMode || !profile) return;
    
    // Role-specific localStorage key
    const storageKey = profile.user_id 
      ? `demoGuideSeen:${role}:${profile.user_id}`
      : `demoGuideSeen:${role}`;
    
    const guideSeen = localStorage.getItem(storageKey);
    if (!guideSeen) {
      // Delay to let the page render
      const timer = setTimeout(() => setGuideOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isDemoMode, loading, profileLoading, role, profile]);

  return (
    <div className="min-h-screen bg-frost">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SideNav
          role={role}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-ink/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="lg:hidden">
            <SideNav
              role={role}
              isOpen={true}
              onToggle={() => setMobileMenuOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <div
        className={cn(
          "transition-all duration-slow ease-out",
          "lg:ml-16",
          sidebarOpen && "lg:ml-64"
        )}
      >
        <TopNav
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          isSidebarOpen={mobileMenuOpen}
        />
        
        {/* Demo Banner - only show if demo is globally enabled */}
        {isDemoEffectivelyEnabled(isDemoMode) && (
          <DemoBanner onOpenGuide={() => setGuideOpen(true)} />
        )}
        
        <main className="pb-20 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav role={role} />

      {/* Demo Guide Modal */}
      <DemoGuideModal open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  );
}
