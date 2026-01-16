import * as React from "react";
import { FlaskConical, RotateCcw, Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useResetDemo } from "@/hooks/useDemo";
import { toast } from "sonner";

interface DemoBannerProps {
  onOpenGuide: () => void;
}

export function DemoBanner({ onOpenGuide }: DemoBannerProps) {
  const resetDemoMutation = useResetDemo();

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
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={resetDemoMutation.isPending}
            className="h-7 px-2 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {resetDemoMutation.isPending ? "Återställer..." : "Återställ"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenGuide}
            className="h-7 px-2 text-xs"
          >
            <Compass className="h-3.5 w-3.5 mr-1" />
            Demo-guide
          </Button>
        </div>
      </div>
    </div>
  );
}
