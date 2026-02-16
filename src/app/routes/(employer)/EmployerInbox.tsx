import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { AppShell } from "@/app/layout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { useMatches } from "@/hooks/useMatches";
import { useOrgBorrowRequests } from "@/hooks/useBorrow";
import { useMyOrgs } from "@/hooks/useOrgs";
import { useNotifications, useUnreadCount, useMarkNotificationRead } from "@/hooks/useNotifications";
import { useOrgOffers } from "@/hooks/useOffers";
import { OffersList, OfferDetailModal } from "@/components/offers";
import { getSeverityDotClass } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";
import { 
  MessageSquare, 
  Users, 
  HandshakeIcon,
  Bell,
  ChevronRight,
  RefreshCw,
  FileText
} from "lucide-react";

export default function EmployerInbox() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: orgs } = useMyOrgs();
  const activeOrgId = orgs?.[0]?.id;
  
  const { data: matches, isLoading: matchesLoading, error: matchesError } = useMatches("employer", activeOrgId);
  const { data: requests, isLoading: requestsLoading, refetch: refetchRequests } = useOrgBorrowRequests(activeOrgId);
  const { data: notifications, isLoading: notificationsLoading, refetch: refetchNotifications } = useNotifications({ limit: 30 });
  const { data: unreadCount } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const { data: jobOffers } = useOrgOffers(activeOrgId);

  const openRequests = requests?.filter((r) => r.status === "open") ?? [];
  const pendingOffers = jobOffers?.filter((o) => o.status === "sent") ?? [];

  // Handle offerId from URL (from notification deep-link)
  const urlOfferId = searchParams.get("offerId");
  const urlTab = searchParams.get("tab");
  const [selectedOfferId, setSelectedOfferId] = React.useState<string | null>(urlOfferId);
  const [activeTab, setActiveTab] = React.useState(urlTab === "offers" ? "job-offers" : "notifications");

  React.useEffect(() => {
    if (urlOfferId) {
      setSelectedOfferId(urlOfferId);
      setActiveTab("job-offers");
    }
  }, [urlOfferId]);

  const handleCloseOfferModal = () => {
    setSelectedOfferId(null);
    if (urlOfferId) {
      setSearchParams({});
    }
  };

  const handleNotificationClick = (notification: { id: string; is_read: boolean; href?: string | null }) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    if (notification.href) {
      navigate(notification.href);
    }
  };

  return (
    <AppShell role="employer">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inkorg</h1>
            <p className="text-sm text-muted-foreground">
              Konversationer och låneförfrågningar
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="notifications" className="gap-1 text-xs sm:text-sm">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notiser</span>
              {unreadCount && unreadCount > 0 && (
                <Badge variant="new" className="ml-1 h-5 px-1.5 text-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-1 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Matchningar</span>
              {matches && matches.length > 0 && (
                <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs">
                  {matches.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="job-offers" className="gap-1 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Erbjudanden</span>
              {pendingOffers.length > 0 && (
                <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs">
                  {pendingOffers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="borrow" className="gap-1 text-xs sm:text-sm">
              <HandshakeIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Lån</span>
              {openRequests.length > 0 && (
                <Badge variant="new" className="ml-1 h-5 px-1.5 text-xs">
                  {openRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-4 space-y-3">
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchNotifications?.()}
                disabled={notificationsLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", notificationsLoading && "animate-spin")} />
                Uppdatera
              </Button>
            </div>

            {notificationsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-3">
                  <div className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </Card>
              ))
            ) : !notifications || notifications.length === 0 ? (
              <Card className="p-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium text-foreground">Inga notiser</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Du har inga notiser just nu
                </p>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    "p-3 cursor-pointer transition-colors hover:bg-secondary/50",
                    !notification.is_read && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div 
                        className={cn(
                          "h-2 w-2 rounded-full",
                          getSeverityDotClass((notification as { severity?: string }).severity as "info" | "success" | "warning" | "urgent" || "info")
                        )} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm truncate",
                        !notification.is_read ? "font-medium text-foreground" : "text-muted-foreground"
                      )}>
                        {notification.title}
                      </p>
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
                    {!notification.is_read && (
                      <Badge variant="new" className="h-4 px-1 text-[10px] flex-shrink-0">
                        Ny
                      </Badge>
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches" className="mt-4 space-y-3">
            {matchesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </Card>
              ))
            ) : matchesError ? (
              <Card className="p-6 text-center">
                <p className="text-destructive">Kunde inte ladda matchningar</p>
              </Card>
            ) : !matches || matches.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium text-foreground">Inga matchningar ännu</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Matchningar med kandidater visas här
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate("/employer/jobs")}
                >
                  Visa mina jobb
                </Button>
              </Card>
            ) : (
              matches.map((match) => (
                <Card
                  key={match.id}
                  className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => navigate(`/employer/matches/${match.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {match.talent_name || "Kandidat"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {match.job_title || "Uppdrag"}
                      </p>
                      {match.last_message && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {match.last_message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        {match.status === "matched" ? "Ny" : "Aktiv"}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Job Offers Tab (NEW) */}
          <TabsContent value="job-offers" className="mt-4">
            <OffersList
              role="employer"
              orgId={activeOrgId}
              onSelectOffer={(id) => setSelectedOfferId(id)}
              selectedOfferId={selectedOfferId}
            />
          </TabsContent>

          {/* Borrow Tab */}
          <TabsContent value="borrow" className="mt-4 space-y-3">
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchRequests?.()}
                disabled={requestsLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", requestsLoading && "animate-spin")} />
                Uppdatera
              </Button>
            </div>

            {requestsLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </Card>
              ))
            ) : openRequests.length === 0 ? (
              <Card className="p-8 text-center">
                <HandshakeIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium text-foreground">Inga aktiva låneförfrågningar</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Skapa en förfrågan för att låna personal
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate("/employer/borrow")}
                >
                  Skapa förfrågan
                </Button>
              </Card>
            ) : (
              openRequests.map((request) => (
                <Card
                  key={request.id}
                  className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => navigate("/employer/borrow")}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-delight/10 flex items-center justify-center">
                      <HandshakeIcon className="h-5 w-5 text-delight" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {request.role_key} i {request.location}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.offers?.length ?? 0} svar
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(request.created_at), {
                          addSuffix: true,
                          locale: sv,
                        })}
                      </p>
                    </div>
                    <Badge 
                      variant={request.status === "open" ? "new" : "default"} 
                      className="flex-shrink-0"
                    >
                      {request.status === "open" ? "Öppen" : "Stängd"}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Offer Detail Modal */}
      <OfferDetailModal
        offerId={selectedOfferId}
        onClose={handleCloseOfferModal}
        role="employer"
      />
    </AppShell>
  );
}
