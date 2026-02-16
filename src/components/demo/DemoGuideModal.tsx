import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Users,
  Calendar,
  Send,
  SwatchBook,
  MessageCircle,
  Check,
  RotateCcw,
  ArrowRight,
  User,
  Repeat,
} from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { useAuth } from "@/contexts/AuthContext";
import { useDefaultOrgId } from "@/hooks/useOrgs";
import { useDemoGuideSummary } from "@/hooks/useDemoGuideSummary";
import { useSeedDemoScenario } from "@/hooks/useDemo";
import { getGuideSteps, getCompletedCount, type GuideStep } from "@/lib/demo/guideSteps";
import { useToasts } from "@/components/delight/Toasts";

interface DemoGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ICON_MAP: Record<GuideStep["icon"], React.ReactNode> = {
  swipe: <SwatchBook className="h-5 w-5" />,
  match: <Users className="h-5 w-5" />,
  chat: <MessageCircle className="h-5 w-5" />,
  borrow: <Send className="h-5 w-5" />,
  schedule: <Calendar className="h-5 w-5" />,
  release: <Repeat className="h-5 w-5" />,
  profile: <User className="h-5 w-5" />,
};

function getStorageKey(role: string, profileId?: string): string {
  return profileId ? `demoGuideSeen:${role}:${profileId}` : `demoGuideSeen:${role}`;
}

export function DemoGuideModal({ open, onOpenChange }: DemoGuideModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToasts();
  const { user, profile, isDemoMode } = useAuth();
  const { data: orgId } = useDefaultOrgId();
  const seedDemo = useSeedDemoScenario();

  const isEmployer = profile?.type === "employer" || profile?.type === "both";
  const isTalent = profile?.type === "talent" || profile?.type === "both";
  const activeRole: "employer" | "talent" = isEmployer ? "employer" : "talent";

  // Get guide summary for the active role
  const { summary, refetch: refetchSummary } = useDemoGuideSummary({
    orgId: isEmployer ? orgId : null,
    userId: user?.id,
    role: activeRole,
  });

  // Get steps for active role
  const steps = React.useMemo(() => getGuideSteps(activeRole), [activeRole]);
  const completedCount = getCompletedCount(steps, summary);
  const progressPercent = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  // Mark guide as seen when opened (role-specific)
  React.useEffect(() => {
    if (open && profile) {
      const key = getStorageKey(activeRole, profile.user_id);
      localStorage.setItem(key, "true");
    }
  }, [open, activeRole, profile]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  const handleResetDemo = async () => {
    if (!orgId) {
      addToast({ type: "error", title: "Fel", message: "Ingen organisation hittad." });
      return;
    }

    try {
      await seedDemo.mutateAsync(orgId);
      
      // Refetch guide summary
      refetchSummary();
      
      addToast({
        type: "success",
        title: "Demo återställd",
        message: "Alla steg har återställts med nytt demo-scenario.",
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Fel",
        message: "Kunde inte återställa demo-scenario.",
      });
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <div className="flex items-center justify-between">
            <div>
              <ModalTitle>Demo-guide</ModalTitle>
              <ModalDescription>
                {activeRole === "employer" ? "Utforska som arbetsgivare" : "Utforska som kandidat"}
              </ModalDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {completedCount}/{steps.length}
              </span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-3">
            <Progress value={progressPercent} className="h-2" />
          </div>
        </ModalHeader>
        
        <div className="space-y-3 py-4">
          {/* Role indicator */}
          <div className="flex items-center gap-2 px-1">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              {activeRole === "employer" ? (
                <Briefcase className="h-4 w-4" />
              ) : (
                <Users className="h-4 w-4" />
              )}
            </div>
            <span className="text-sm font-medium">
              {activeRole === "employer" ? "Arbetsgivarvy" : "Kandidatvy"}
            </span>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {steps.map((step) => {
              const isComplete = step.isComplete(summary);
              
              return (
                <Card
                  key={step.id}
                  className={`p-3 cursor-pointer transition-all group ${
                    isComplete 
                      ? "bg-verified/10 border-verified/30" 
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleSelect(step.href)}
                >
                  <div className="flex items-center gap-3">
                    {/* Status icon */}
                    <div className={`
                      p-2 rounded-lg transition-colors
                      ${isComplete 
                        ? "bg-verified/20 text-verified" 
                        : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      }
                    `}>
                      {isComplete ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        ICON_MAP[step.icon]
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isComplete ? "line-through text-muted-foreground" : ""}`}>
                          {step.title}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {step.description}
                      </p>
                    </div>
                    
                    {/* CTA */}
                    {!isComplete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {step.ctaLabel}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Reset button */}
          {isDemoMode && isEmployer && (
            <div className="pt-4 border-t">
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-2"
                onClick={handleResetDemo}
                disabled={seedDemo.isPending}
              >
                <RotateCcw className="h-4 w-4" />
                {seedDemo.isPending ? "Återställer..." : "Starta från början"}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Skapar nytt demo-scenario med match, chatt och bokningar
              </p>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
