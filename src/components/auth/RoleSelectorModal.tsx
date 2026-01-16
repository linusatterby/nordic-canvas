import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, User } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/classnames";

interface RoleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleSelectorModal({ isOpen, onClose }: RoleSelectorModalProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = React.useState<"talent" | "employer" | null>(null);

  const handleContinue = () => {
    if (selected === "talent") {
      navigate("/talent/dashboard");
    } else if (selected === "employer") {
      navigate("/employer/dashboard");
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
              <span className="font-medium text-foreground">Talent</span>
              <span className="text-xs text-muted-foreground">Hitta säsongsjobb</span>
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
              <span className="font-medium text-foreground">Employer</span>
              <span className="text-xs text-muted-foreground">Hitta säsongspersonal</span>
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
