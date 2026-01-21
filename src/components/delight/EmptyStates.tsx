import * as React from "react";
import { Search, FolderOpen, Calendar, Users, Inbox, Plus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/classnames";
import { Button } from "@/components/ui/Button";

type EmptyStateType = 
  | "no-results" 
  | "no-data" 
  | "no-matches" 
  | "no-schedule" 
  | "inbox-empty"
  | "no-offers"
  | "no-requests";

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const emptyStateDefaults: Record<EmptyStateType, { icon: React.ReactNode; title: string; message: string }> = {
  "no-results": {
    icon: <Search className="h-12 w-12" />,
    title: "Inga träffar",
    message: "Prova att justera din sökning eller filter.",
  },
  "no-data": {
    icon: <FolderOpen className="h-12 w-12" />,
    title: "Tomt här",
    message: "Det finns inget att visa ännu.",
  },
  "no-matches": {
    icon: <Users className="h-12 w-12" />,
    title: "Inga matchningar ännu",
    message: "Fortsätt swipea för att hitta din nästa säsong!",
  },
  "no-schedule": {
    icon: <Calendar className="h-12 w-12" />,
    title: "Schemat är tomt",
    message: "Lägg till dina tillgängliga perioder.",
  },
  "inbox-empty": {
    icon: <Inbox className="h-12 w-12" />,
    title: "Inkorgen är tom",
    message: "Snyggt. Du är i kapp.",
  },
  "no-offers": {
    icon: <Users className="h-12 w-12" />,
    title: "Inga tillgängliga pass",
    message: "Inga öppna pass från partners just nu.",
  },
  "no-requests": {
    icon: <Plus className="h-12 w-12" />,
    title: "Inga förfrågningar",
    message: "Skapa en förfrågan för att hitta personal snabbt.",
  },
};

export function EmptyState({ type, title, message, action, secondaryAction, className }: EmptyStateProps) {
  const defaults = emptyStateDefaults[type];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6",
        className
      )}
    >
      <div className="text-muted-foreground/50 mb-4">
        {defaults.icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {title || defaults.title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {message || defaults.message}
      </p>
      
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
        {action && (
          <Button
            variant="primary"
            size="md"
            onClick={action.onClick}
            className="gap-1"
          >
            {action.label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {secondaryAction && (
          <Button
            variant="secondary"
            size="md"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
