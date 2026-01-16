import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Users,
  Calendar,
  Send,
  SwatchBook,
  MessageCircle,
  Inbox,
  ArrowRight,
} from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";

interface DemoGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GuideOption {
  icon: React.ReactNode;
  title: string;
  description: string;
  path: string;
  badge?: string;
}

const EMPLOYER_OPTIONS: GuideOption[] = [
  {
    icon: <Users className="h-6 w-6" />,
    title: "Swipea talanger",
    description: "Hitta och matcha kandidater för dina jobb",
    path: "/employer/jobs",
    badge: "Populärt",
  },
  {
    icon: <Calendar className="h-6 w-6" />,
    title: "Öppna schema",
    description: "Se bokningar och hantera busy blocks",
    path: "/employer/scheduler",
  },
  {
    icon: <Send className="h-6 w-6" />,
    title: "Skicka Borrow",
    description: "Låna personal från andra organisationer",
    path: "/employer/borrow",
  },
];

const TALENT_OPTIONS: GuideOption[] = [
  {
    icon: <SwatchBook className="h-6 w-6" />,
    title: "Swipea jobb",
    description: "Hitta säsongsjobb som passar dig",
    path: "/talent/swipe-jobs",
    badge: "Populärt",
  },
  {
    icon: <MessageCircle className="h-6 w-6" />,
    title: "Öppna en match",
    description: "Chatta med arbetsgivare du matchat med",
    path: "/talent/matches",
  },
  {
    icon: <Inbox className="h-6 w-6" />,
    title: "Svara på Borrow",
    description: "Se och hantera inkommande förfrågningar",
    path: "/talent/dashboard",
  },
];

export function DemoGuideModal({ open, onOpenChange }: DemoGuideModalProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const isEmployer = profile?.type === "employer" || profile?.type === "both";
  const isTalent = profile?.type === "talent" || profile?.type === "both";

  const handleSelect = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  // Mark guide as seen when opened
  React.useEffect(() => {
    if (open) {
      localStorage.setItem("demoGuideSeen", "true");
    }
  }, [open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>Välkommen till Demo</ModalTitle>
          <ModalDescription>
            Välj vad du vill testa – all data är exempeldata
          </ModalDescription>
        </ModalHeader>
        
        <div className="space-y-6 py-4">
          {/* Employer Section */}
          {isEmployer && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Som arbetsgivare
              </h3>
              <div className="grid gap-3">
                {EMPLOYER_OPTIONS.map((option) => (
                  <Card
                    key={option.path}
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => handleSelect(option.path)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {option.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{option.title}</span>
                          {option.badge && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              {option.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Talent Section */}
          {isTalent && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Users className="h-4 w-4" />
                Som talang
              </h3>
              <div className="grid gap-3">
                {TALENT_OPTIONS.map((option) => (
                  <Card
                    key={option.path}
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => handleSelect(option.path)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-secondary/50 text-secondary-foreground">
                        {option.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{option.title}</span>
                          {option.badge && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              {option.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Fallback if no role */}
          {!isEmployer && !isTalent && (
            <p className="text-center text-muted-foreground py-4">
              Laddar din profil...
            </p>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
