import * as React from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { 
  Bell, 
  Check, 
  CheckCheck,
  RefreshCw
} from "lucide-react";
import { 
  useNotifications, 
  useMarkNotificationRead, 
  useMarkAllNotificationsRead 
} from "@/hooks/useNotifications";
import { getSeverityDotClass, type NotificationWithSeverity } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

interface NotificationsListProps {
  limit?: number;
  showMarkAll?: boolean;
  onNotificationClick?: (notification: NotificationWithSeverity) => void;
}

export function NotificationsList({ 
  limit = 20, 
  showMarkAll = true,
  onNotificationClick 
}: NotificationsListProps) {
  const navigate = useNavigate();
  const { data: notifications, isLoading, error, refetch } = useNotifications({ limit });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleNotificationClick = async (notification: NotificationWithSeverity) => {
    // Mark as read before navigating
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }

    // Custom handler or default navigation
    if (onNotificationClick) {
      onNotificationClick(notification);
    } else if (notification.href) {
      navigate(notification.href);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-3">
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 text-center">
        <p className="text-sm text-destructive">Kunde inte ladda notiser</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Försök igen
        </Button>
      </Card>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-medium text-foreground">Inga notiser</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Du har inga notiser just nu
        </p>
      </Card>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-3">
      {/* Header with mark all */}
      {showMarkAll && unreadCount > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-muted-foreground">
            {unreadCount} olästa
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markAllRead.isPending}
            className="text-xs"
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Markera alla som lästa
          </Button>
        </div>
      )}

      {/* Notifications list */}
      <div className="space-y-2">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={cn(
              "p-3 cursor-pointer transition-colors hover:bg-secondary/50",
              !notification.is_read && "bg-primary/5 border-l-2",
              !notification.is_read && getSeverityBorderClass(notification.severity)
            )}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="flex items-start gap-3">
              {/* Severity indicator */}
              <div className="flex-shrink-0 mt-1">
                <div 
                  className={cn(
                    "h-2 w-2 rounded-full",
                    getSeverityDotClass(notification.severity)
                  )} 
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    "text-sm truncate",
                    !notification.is_read ? "font-medium text-foreground" : "text-muted-foreground"
                  )}>
                    {notification.title}
                  </p>
                  {!notification.is_read && (
                    <Badge variant="new" className="h-4 px-1 text-[10px] flex-shrink-0">
                      Ny
                    </Badge>
                  )}
                </div>
                {notification.body && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {notification.body}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                    locale: sv,
                  })}
                </p>
              </div>

              {/* Read indicator */}
              {notification.is_read && (
                <Check className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Get border class for severity
 */
function getSeverityBorderClass(severity: string): string {
  switch (severity) {
    case "urgent":
      return "border-l-destructive";
    case "warning":
      return "border-l-amber-500";
    case "success":
      return "border-l-emerald-500";
    case "info":
    default:
      return "border-l-primary";
  }
}