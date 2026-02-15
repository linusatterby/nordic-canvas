import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoSession } from "@/contexts/DemoSessionContext";
import { EmptyState } from "@/components/delight/EmptyStates";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ShieldX, ArrowRight } from "lucide-react";
import type { ProfileType } from "@/lib/api/profile";

interface RoleGateProps {
  allow: Array<"talent" | "employer" | "host">;
  children: React.ReactNode;
}

export function RoleGate({ allow, children }: RoleGateProps) {
  const { profile, profileLoading } = useAuth();
  const { isDemoSession, demoRole } = useDemoSession();
  const navigate = useNavigate();

  // In demo mode, use demoRole instead of profile.type
  if (isDemoSession && demoRole && allow.includes(demoRole)) {
    return <>{children}</>;
  }

  if (profileLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // If no profile, show loading or redirect will handle it
  if (!profile) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const userType = profile.type as ProfileType;

  // If user type is 'both', they can access everything
  if (userType === "both") {
    return <>{children}</>;
  }

  // Check if user type is in allowed list
  if (allow.includes(userType as "talent" | "employer" | "host")) {
    return <>{children}</>;
  }

  // User doesn't have access
  const redirectPath = userType === "talent" 
    ? "/talent/dashboard" 
    : userType === "host"
      ? "/host/housing"
      : "/employer/dashboard";
  const redirectLabel = userType === "talent" 
    ? "Till Talent Dashboard" 
    : userType === "host"
      ? "Till Mina boenden"
      : "Till Employer Dashboard";

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 text-destructive mb-6">
          <ShieldX className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Åtkomst nekad
        </h2>
        <p className="text-muted-foreground mb-6">
          Den här sidan är för {allow.join(" eller ")}. Du är inloggad som {userType}.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            onClick={() => navigate(redirectPath)}
            className="gap-2"
          >
            {redirectLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate("/settings/account")}
          >
            Byt kontotyp
          </Button>
        </div>
      </div>
    </div>
  );
}
