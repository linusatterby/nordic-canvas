import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoSession } from "@/contexts/DemoSessionContext";
import { Skeleton } from "@/components/ui/Skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { isDemoSession, demoRole } = useDemoSession();
  const location = useLocation();

  // Demo bypass is strictly scoped:
  //  - Only employer/talent areas matching the active demoRole are allowed.
  //  - Admin routes always require real auth.
  if (isDemoSession) {
    const path = location.pathname;
    const isEmployerArea = path.startsWith("/employer");
    const isTalentArea = path.startsWith("/talent");
    const isAdminArea = path.startsWith("/admin");

    // Never bypass admin routes in demo
    if (!isAdminArea) {
      // Allow if path matches the demo role
      if (demoRole === "employer" && isEmployerArea) return <>{children}</>;
      if (demoRole === "talent" && isTalentArea) return <>{children}</>;

      // Redirect to the correct area for the active demo role
      const target = demoRole === "employer" ? "/employer/jobs" : "/talent/swipe-jobs";
      return <Navigate to={target} replace />;
    }
    // Admin area falls through to normal auth check below
  }

  if (loading) {
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

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
