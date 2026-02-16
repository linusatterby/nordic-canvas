import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, User } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/classnames";
import { invalidateForRoleSwitch } from "@/lib/query/invalidate";

// Safe landing routes for each role
const SAFE_LANDINGS = {
  talent: "/talent/swipe-jobs",
  employer: "/employer/jobs",
} as const;

interface RoleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleSelectorModal({ isOpen, onClose }: RoleSelectorModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = React.useState<"talent" | "employer" | null>(null);

  const handleContinue = () => {
    // Invalidate all role-specific queries to ensure fresh data
    invalidateForRoleSwitch(queryClient);
    
    if (selected === "talent") {
      navigate(SAFE_LANDINGS.talent);
    } else if (selected === "employer") {
      navigate(SAFE_LANDINGS.employer);
    }
    onClose();
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Välj läge</ModalTitle>
        </ModalHeader>

        <div className="pt-4">
          <p className="text-muted-foreground text-sm mb-6">
            Ditt konto har tillgång till båda lägen. Vilket vill du använda just nu?
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setSelected("talent")}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all",
                selected === "talent"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  selected === "talent" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                )}
              >
                <User className="h-6 w-6" />
              </div>
              <span className="font-medium text-foreground">Kandidat</span>
              <span className="text-xs text-muted-foreground">Hitta jobb i besöksnäringen</span>
            </button>

            <button
              onClick={() => setSelected("employer")}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all",
                selected === "employer"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  selected === "employer" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                )}
              >
                <Briefcase className="h-6 w-6" />
              </div>
              <span className="font-medium text-foreground">Arbetsgivare</span>
              <span className="text-xs text-muted-foreground">Hitta personal för din verksamhet</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!selected}
            onClick={handleContinue}
          >
            Fortsätt
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
