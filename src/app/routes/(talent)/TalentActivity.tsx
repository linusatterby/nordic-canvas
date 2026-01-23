import * as React from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { AppShell } from "@/app/layout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTalentActivity } from "@/hooks/useActivity";
import { 
  getActivityIcon, 
  getActivityTypeLabel,
  getActivitySeverityClass,
  getActivitySeverityDot
} from "@/lib/api/activity";
import { Activity, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TalentActivity() {
  const navigate = useNavigate();
  const { data: activities, isLoading, error, refetch } = useTalentActivity(100);

  return (
    <AppShell role="talent">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Aktivitet</h1>
            <p className="text-sm text-muted-foreground">
              Senaste händelserna
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
            Uppdatera
          </Button>
        </div>

        {/* Activity feed */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </Card>
            ))
          ) : error ? (
            <Card className="p-6 text-center">
              <p className="text-destructive">Kunde inte ladda aktivitet</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => refetch()}
              >
                Försök igen
              </Button>
            </Card>
          ) : !activities || activities.length === 0 ? (
            <Card className="p-8 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-foreground">Ingen aktivitet ännu</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Din aktivitet visas här när du börjar använda appen
              </p>
            </Card>
          ) : (
            activities.map((activity) => (
              <Card
                key={activity.id}
                className={cn(
                  "p-4 transition-colors border-l-4",
                  getActivitySeverityClass(activity.severity),
                  activity.href && "cursor-pointer hover:bg-secondary/50"
                )}
                onClick={() => activity.href && navigate(activity.href)}
              >
                <div className="flex items-start gap-3">
                  {/* Icon with severity dot */}
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-lg">
                      {getActivityIcon(activity.event_type)}
                    </div>
                    <div 
                      className={cn(
                        "absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                        getActivitySeverityDot(activity.severity)
                      )} 
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {activity.title}
                    </p>
                    {activity.summary && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {activity.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="default" className="text-xs">
                        {getActivityTypeLabel(activity.event_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                          locale: sv,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
