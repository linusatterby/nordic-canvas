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
  const { isDemoSession } = useDemoSession();
  const location = useLocation();

  // Demo sessions bypass auth
  if (isDemoSession) {
    return <>{children}</>;
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
