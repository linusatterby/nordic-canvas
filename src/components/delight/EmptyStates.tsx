import * as React from "react";
import { Search, FolderOpen, Calendar, Users, Inbox } from "lucide-react";
import { cn } from "@/lib/utils/classnames";
import { Button } from "@/components/ui/Button";

type EmptyStateType = "no-results" | "no-data" | "no-matches" | "no-schedule" | "inbox-empty";

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  message?: string;
  action?: {
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
};

export function EmptyState({ type, title, message, action, className }: EmptyStateProps) {
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
      {action && (
        <Button
          variant="primary"
          size="md"
          onClick={action.onClick}
          className="mt-6"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
