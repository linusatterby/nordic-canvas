import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoSession } from "@/contexts/DemoSessionContext";
import { buildLoginUrl } from "@/lib/auth/returnUrl";
import { Skeleton } from "@/components/ui/Skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuth();
  const { isDemoSession, demoRole } = useDemoSession();
  const location = useLocation();

  // ── Demo bypass ─────────────────────────────────────────────
  // Both IS_DEMO_ENV (status="demo") and session-based demo bypass guards.
  if (status === "demo" || isDemoSession) {
    const path = location.pathname;
    const isAdminArea = path.startsWith("/admin");

    // Never bypass admin routes in demo
    if (!isAdminArea) {
      // If session-based demo with role scoping, enforce role match
      if (isDemoSession && demoRole) {
        const isEmployerArea = path.startsWith("/employer");
        const isTalentArea = path.startsWith("/talent");

        if (demoRole === "employer" && isEmployerArea) return <>{children}</>;
        if (demoRole === "talent" && isTalentArea) return <>{children}</>;

        // Settings and other non-role-specific areas are allowed
        if (!isEmployerArea && !isTalentArea) return <>{children}</>;

        // Redirect to correct demo area
        const target = demoRole === "employer" ? "/employer/jobs" : "/talent/swipe-jobs";
        return <Navigate to={target} replace />;
      }

      // IS_DEMO_ENV without session — allow everything (except admin)
      return <>{children}</>;
    }
    // Admin area falls through to normal auth check below
  }

  // ── Loading state — show skeleton, NO redirect ──────────────
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-frost flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-6">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-8 w-1/2 mx-auto" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // ── Anonymous — redirect to login with returnUrl ────────────
  if (status === "anonymous") {
    return <Navigate to={buildLoginUrl(location.pathname)} replace />;
  }

  // ── Authenticated — allow ───────────────────────────────────
  return <>{children}</>;
}
