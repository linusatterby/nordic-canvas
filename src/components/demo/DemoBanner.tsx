import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical, RotateCcw, Compass, Sparkles, Users, Briefcase, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useResetDemo, useSeedDemoScenario } from "@/hooks/useDemo";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { canSeedDemo, DEMO_ENABLED } from "@/lib/config/env";
import { invalidateForRoleSwitch } from "@/lib/query/invalidate";

interface DemoBannerProps {
  onOpenGuide: () => void;
}

// Safe landing routes for each role
const SAFE_LANDINGS = {
  talent: "/talent/swipe-jobs",
  employer: "/employer/jobs",
} as const;

export function DemoBanner({ onOpenGuide }: DemoBannerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const resetDemoMutation = useResetDemo();
  const seedScenarioMutation = useSeedDemoScenario();

  // Determine current view based on route
  const isEmployerView = location.pathname.startsWith("/employer");
  const isTalentView = location.pathname.startsWith("/talent");

  const handleReset = async () => {
    try {
      await resetDemoMutation.mutateAsync(undefined);
      toast.success("Demo återställd", {
        description: "All demo-data har återställts till ursprungsläget.",
      });
    } catch (error) {
      toast.error("Kunde inte återställa", {
        description: error instanceof Error ? error.message : "Okänt fel",
      });
    }
  };

  const handleSeedScenario = async () => {
    try {
      const result = await seedScenarioMutation.mutateAsync(undefined);
      toast.success("Demo-scenario skapat", {
        description: `Scenario med ${result?.seeded?.talent_source === "real_demo_user" ? "riktig demo-talang" : "demo-kort"} har skapats.`,
      });
    } catch (error) {
      toast.error("Kunde inte skapa scenario", {
        description: error instanceof Error ? error.message : "Okänt fel",
      });
    }
  };

  const handleSwitchToEmployer = () => {
    // Invalidate all role-specific queries to ensure fresh data
    invalidateForRoleSwitch(queryClient);
    navigate(SAFE_LANDINGS.employer);
    toast.info("Växlat till arbetsgivare-vy", {
      description: "Du ser nu demo som arbetsgivare.",
    });
  };

  const handleSwitchToTalent = () => {
    // Invalidate all role-specific queries to ensure fresh data
    invalidateForRoleSwitch(queryClient);
    navigate(SAFE_LANDINGS.talent);
    toast.info("Växlat till talang-vy", {
      description: "Du ser nu demo som talang.",
    });
  };

  const isPending = resetDemoMutation.isPending || seedScenarioMutation.isPending;

  // Check if user has "both" role type for full switching, or show both buttons
  const canSwitchRoles = profile?.type === "both" || true; // Allow switching in demo

  return (
    <div className="bg-accent/10 border-b border-accent/20 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-accent-foreground">
          <FlaskConical className="h-4 w-4 text-primary" />
          <span className="font-medium">DEMO-LÄGE</span>
          <span className="text-muted-foreground hidden sm:inline">
            – Du arbetar med exempeldata
          </span>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          {/* Role switch buttons */}
          {canSwitchRoles && (
            <>
              {!isTalentView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSwitchToTalent}
                  className="h-7 px-2 text-xs"
                  title="Växla till talang-perspektiv"
                >
                  <Users className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">Till talang</span>
                  <span className="sm:hidden">Talang</span>
                </Button>
              )}
              {!isEmployerView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSwitchToEmployer}
                  className="h-7 px-2 text-xs"
                  title="Växla till arbetsgivare-perspektiv"
                >
                  <Briefcase className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">Till arbetsgivare</span>
                  <span className="sm:hidden">AG</span>
                </Button>
              )}
              <div className="w-px h-4 bg-border hidden sm:block" />
            </>
          )}
          
          {canSeedDemo() ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSeedScenario}
              disabled={isPending}
              className="h-7 px-2 text-xs"
              title="Skapar ett komplett demo-scenario med matchningar, chatt, bokningar och erbjudanden"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">{seedScenarioMutation.isPending ? "Skapar..." : "Återställ demo"}</span>
              <span className="sm:hidden">{seedScenarioMutation.isPending ? "..." : "Reset"}</span>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground hidden sm:inline items-center gap-1">
              <AlertCircle className="h-3 w-3 inline" />
              Demo-reset avstängt
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isPending}
            className="h-7 px-2 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">{resetDemoMutation.isPending ? "Rensar..." : "Rensa"}</span>
            <span className="sm:hidden">{resetDemoMutation.isPending ? "..." : "Rensa"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenGuide}
            className="h-7 px-2 text-xs"
          >
            <Compass className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Demo-guide</span>
            <span className="sm:hidden">Guide</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
