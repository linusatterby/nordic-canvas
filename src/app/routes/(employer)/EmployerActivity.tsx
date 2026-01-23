import * as React from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { AppShell } from "@/app/layout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEmployerActivity } from "@/hooks/useActivity";
import { getActivityIcon, getActivityTypeLabel } from "@/lib/api/activity";
import { RefreshCw, Activity } from "lucide-react";

export default function EmployerActivity() {
  const navigate = useNavigate();
  const { data: activities, isLoading, error, refetch } = useEmployerActivity(100);

  return (
    <AppShell role="employer">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Aktivitet</h1>
            <p className="text-sm text-muted-foreground">
              Senaste händelser för din organisation
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Activity Feed */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
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
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                Försök igen
              </Button>
            </Card>
          ) : !activities || activities.length === 0 ? (
            <Card className="p-8 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-foreground">Ingen aktivitet ännu</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Händelser för din organisation visas här
              </p>
            </Card>
          ) : (
            activities.map((activity) => (
              <Card
                key={activity.id}
                className={`p-4 transition-colors ${
                  activity.href ? "cursor-pointer hover:bg-secondary/50" : ""
                }`}
                onClick={() => activity.href && navigate(activity.href)}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-lg">
                    {getActivityIcon(activity.event_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {activity.title}
                        </p>
                        {activity.summary && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {activity.summary}
                          </p>
                        )}
                      </div>
                      <Badge variant="default" className="flex-shrink-0 text-xs">
                        {getActivityTypeLabel(activity.event_type)}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                        locale: sv,
                      })}
                    </p>
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
