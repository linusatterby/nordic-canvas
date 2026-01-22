import * as React from "react";
import { AlertTriangle, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/classnames";
import { shouldShowDemoDebug } from "@/lib/utils/debug";
import { useAuth } from "@/contexts/AuthContext";

interface InlineErrorPanelProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  details?: string;
  className?: string;
  showBack?: boolean;
}

/**
 * A friendly error panel that replaces cryptic technical errors.
 * Shows debug details only when VITE_DEMO_DEBUG is enabled.
 */
export function InlineErrorPanel({
  title,
  message,
  actionLabel = "Gå tillbaka",
  onAction,
  details,
  className,
  showBack = true,
}: InlineErrorPanelProps) {
  const navigate = useNavigate();
  const { isDemoMode } = useAuth();
  const [showDetails, setShowDetails] = React.useState(false);
  
  const showDebugDetails = details && shouldShowDemoDebug(isDemoMode);

  const handleBack = () => {
    if (onAction) {
      onAction();
    } else {
      navigate(-1);
    }
  };

  return (
    <Card
      variant="default"
      padding="lg"
      className={cn("max-w-md mx-auto text-center", className)}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {showBack && (
          <Button
            variant="primary"
            size="md"
            onClick={handleBack}
            className="gap-2 mt-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {actionLabel}
          </Button>
        )}

        {showDebugDetails && (
          <div className="w-full mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Dölj teknisk info
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Visa teknisk info
                </>
              )}
            </button>
            
            {showDetails && (
              <pre className="mt-2 p-2 bg-secondary rounded text-xs text-left overflow-x-auto whitespace-pre-wrap">
                {details}
              </pre>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Helper to get user-friendly error messages from API reasons
 */
export function getFriendlyErrorMessage(reason?: string): { title: string; message: string } {
  switch (reason) {
    case "not_found":
      return {
        title: "Hittar inte det du letar efter",
        message: "Det här innehållet finns inte längre eller har tagits bort.",
      };
    case "forbidden":
    case "rls_blocked":
      return {
        title: "Du saknar behörighet",
        message: "Du har inte tillgång till den här sidan. Kontrollera att du är inloggad med rätt konto.",
      };
    case "org_mismatch":
      return {
        title: "Fel organisation",
        message: "Det verkar som att du är inloggad i fel organisation för att se detta.",
      };
    case "no_org":
      return {
        title: "Ingen organisation kopplad",
        message: "Du behöver skapa eller gå med i en organisation först.",
      };
    default:
      return {
        title: "Något gick fel",
        message: "Vi kunde inte ladda sidan. Försök igen eller gå tillbaka.",
      };
  }
}
