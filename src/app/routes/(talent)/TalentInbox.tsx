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
import { useTalentBorrowOffers } from "@/hooks/useBorrow";
import { useNotifications, useUnreadCount, useMarkNotificationRead } from "@/hooks/useNotifications";
import { useTalentOffers, usePendingOffersCount } from "@/hooks/useOffers";
import { OffersList, OfferDetailModal } from "@/components/offers";
import { getSeverityDotClass } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";
import { useDemoMode } from "@/hooks/useDemo";
import { isDemoEffectivelyEnabled, IS_LIVE_BACKEND } from "@/lib/config/env";
import {
  useDemoNotifications,
  useDemoMatchItems,
  useDemoOfferItems,
  useDemoMessageItems,
  useDemoRequestItems,
} from "@/hooks/useDemoInbox";
import type { DemoInboxItem } from "@/lib/api/demoInbox";
import { 
  MessageSquare, 
  Users, 
  Calendar,
  Bell,
  ChevronRight,
  RefreshCw,
  FileText,
  Sparkles,
} from "lucide-react";

// ── Discreet demo badge (Nordic Warm Minimal) ──
function DemoBadge() {
  // Never render in live
  if (IS_LIVE_BACKEND) return null;

  return (
    <span className="inline-flex items-center gap-0.5 rounded-pill px-1.5 py-px text-[9px] font-medium uppercase tracking-wider border border-teal/20 bg-teal-muted text-teal select-none">
      <Sparkles className="h-2.5 w-2.5" />
      Demo
    </span>
  );
}

export default function TalentInbox() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { isDemoMode } = useDemoMode();
  // Hard guard: demo features never active on live backend
  const demoEnabled = !IS_LIVE_BACKEND && isDemoEffectivelyEnabled(isDemoMode);

  const { data: matches, isLoading: matchesLoading, error: matchesError } = useMatches("talent");
  const { data: borrowOffers, isLoading: borrowOffersLoading, refetch: refetchBorrowOffers } = useTalentBorrowOffers();
  const { data: notifications, isLoading: notificationsLoading, refetch: refetchNotifications } = useNotifications({ limit: 30 });
  const { data: unreadCount } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const pendingOffersCount = usePendingOffersCount();

  // Demo data hooks (queries auto-disabled when !demoEnabled via useDemoInbox)
  const { data: demoNotifications, refetch: refetchDemoNotif } = useDemoNotifications();
  const { data: demoMatches, refetch: refetchDemoMatches } = useDemoMatchItems();
  const { data: demoOffers, refetch: refetchDemoOffers } = useDemoOfferItems();
  const { data: demoMessages, refetch: refetchDemoMessages } = useDemoMessageItems();
  const { data: demoRequests, refetch: refetchDemoRequests } = useDemoRequestItems();

  const pendingBorrowOffers = borrowOffers?.filter((o) => o.status === "pending") ?? [];

  // Merge real + demo data (demo only as fallback when real is empty)
  const usingDemoNotifications = demoEnabled && (!notifications || notifications.length === 0) && (demoNotifications?.length ?? 0) > 0;
  const usingDemoMatches = demoEnabled && (!matches || matches.length === 0) && (demoMatches?.length ?? 0) > 0;
  const usingDemoOffers = demoEnabled && (demoOffers?.length ?? 0) > 0;
  const usingDemoRequests = demoEnabled && pendingBorrowOffers.length === 0 && (demoRequests?.length ?? 0) > 0;
  const usingDemoMessages = demoEnabled && (demoMessages?.length ?? 0) > 0;

  const effectiveNotifications = usingDemoNotifications ? demoNotifications! : (notifications ?? []);
  const effectiveMatches = usingDemoMatches ? demoMatches! : (matches ?? []);
  const effectiveBorrowOffers = usingDemoRequests ? demoRequests! : pendingBorrowOffers;

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

  const handleNotificationClick = (notification: { id: string; is_read?: boolean; href?: string | null }) => {
    if ("is_read" in notification && !notification.is_read) {
      markRead.mutate(notification.id);
    }
    if (notification.href) {
      navigate(notification.href);
    }
  };

  // Tab badge counts: real + demo when demo active, real only in live
  const notifCount = (notifications?.filter(n => !n.is_read).length ?? 0) + (demoEnabled ? (demoNotifications?.length ?? 0) : 0);
  const matchCount = (matches?.length ?? 0) + (demoEnabled ? (demoMatches?.length ?? 0) : 0);
  const offerCount = pendingOffersCount + (demoEnabled ? (demoOffers?.length ?? 0) : 0);
  const requestCount = pendingBorrowOffers.length + (demoEnabled ? (demoRequests?.length ?? 0) : 0);
  const messageCount = demoEnabled ? (demoMessages?.length ?? 0) : 0;

  // Refetch both real + demo without duplicate spam
  const handleRefresh = React.useCallback(() => {
    refetchNotifications?.();
    if (demoEnabled) refetchDemoNotif();
  }, [demoEnabled, refetchNotifications, refetchDemoNotif]);

  const handleRefreshRequests = React.useCallback(() => {
    refetchBorrowOffers?.();
    if (demoEnabled) refetchDemoRequests();
  }, [demoEnabled, refetchBorrowOffers, refetchDemoRequests]);

  return (
    <AppShell role="talent">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inkorg</h1>
            <p className="text-sm text-muted-foreground">
              Dina konversationer och ärenden
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="notifications" className="gap-1 text-xs sm:text-sm">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notiser</span>
              {notifCount > 0 && (
                <Badge variant="new" className="ml-1 h-5 px-1.5 text-xs">
                  {notifCount > 9 ? "9+" : notifCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-1 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Matchningar</span>
              {matchCount > 0 && (
                <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs">
                  {matchCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="job-offers" className="gap-1 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Erbjudanden</span>
              {offerCount > 0 && (
                <Badge variant="new" className="ml-1 h-5 px-1.5 text-xs">
                  {offerCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Meddelanden</span>
              {messageCount > 0 && (
                <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs">
                  {messageCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="borrow-offers" className="gap-1 text-xs sm:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Förfrågan</span>
              {requestCount > 0 && (
                <Badge variant="new" className="ml-1 h-5 px-1.5 text-xs">
                  {requestCount}
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
                onClick={handleRefresh}
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
            ) : usingDemoNotifications ? (
              (demoNotifications ?? []).map((item) => (
                <DemoNotificationCard key={item.id} item={item} />
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
            ) : matchesError && !usingDemoMatches ? (
              <Card className="p-6 text-center">
                <p className="text-destructive">Kunde inte ladda matchningar</p>
              </Card>
            ) : usingDemoMatches ? (
              (demoMatches ?? []).map((item) => (
                <DemoMatchCard key={item.id} item={item} />
              ))
            ) : !matches || matches.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium text-foreground">Inga matchningar ännu</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Börja swipea för att hitta matchningar
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate("/talent/swipe-jobs")}
                >
                  Hitta jobb
                </Button>
              </Card>
            ) : (
              matches.map((match) => (
                <Card
                  key={match.id}
                  className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => navigate(`/talent/matches/${match.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {match.org_name || "Arbetsgivare"}
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

          {/* Job Offers Tab */}
          <TabsContent value="job-offers" className="mt-4">
            {usingDemoOffers ? (
              <div className="space-y-3">
                {(demoOffers ?? []).map((item) => (
                  <DemoOfferCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <OffersList
                role="talent"
                onSelectOffer={(id) => setSelectedOfferId(id)}
                selectedOfferId={selectedOfferId}
              />
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="mt-4 space-y-3">
            {usingDemoMessages ? (
              (demoMessages ?? []).map((item) => (
                <DemoMessageCard key={item.id} item={item} />
              ))
            ) : (
              <Card className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium text-foreground">Inga meddelanden</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Konversationer med arbetsgivare visas här
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Borrow Offers / Requests Tab */}
          <TabsContent value="borrow-offers" className="mt-4 space-y-3">
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshRequests}
                disabled={borrowOffersLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", borrowOffersLoading && "animate-spin")} />
                Uppdatera
              </Button>
            </div>

            {borrowOffersLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </Card>
              ))
            ) : usingDemoRequests ? (
              (demoRequests ?? []).map((item) => (
                <DemoRequestCard key={item.id} item={item} />
              ))
            ) : pendingBorrowOffers.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium text-foreground">Inga väntande förfrågningar</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Låneförfrågningar från arbetsgivare visas här
                </p>
              </Card>
            ) : (
              pendingBorrowOffers.map((offer) => (
                <Card
                  key={offer.id}
                  className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => navigate("/talent/dashboard")}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-delight/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-delight" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {offer.org_name || "Arbetsgivare"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Extratid-förfrågan
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(offer.created_at), {
                          addSuffix: true,
                          locale: sv,
                        })}
                      </p>
                    </div>
                    <Badge variant="new" className="flex-shrink-0">
                      Svara
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Offer Detail Modal */}
      {!usingDemoOffers && (
        <OfferDetailModal
          offerId={selectedOfferId}
          onClose={handleCloseOfferModal}
          role="talent"
        />
      )}
    </AppShell>
  );
}

// ── Demo card components ──

function DemoNotificationCard({ item }: { item: DemoInboxItem }) {
  return (
    <Card className="p-3 bg-primary/5 border-l-2 border-l-primary">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <div className={cn(
            "h-2 w-2 rounded-full",
            getSeverityDotClass(item.severity as "info" | "success" | "warning" | "urgent")
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
            <DemoBadge />
          </div>
          {item.body && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.body}</p>
          )}
          {item.org_name && (
            <p className="text-xs text-muted-foreground/70 mt-1">{item.org_name}</p>
          )}
        </div>
        <Badge variant="new" className="h-4 px-1 text-[10px] flex-shrink-0">Ny</Badge>
      </div>
    </Card>
  );
}

function DemoMatchCard({ item }: { item: DemoInboxItem }) {
  const score = (item.metadata as { score?: number })?.score;
  const reason = (item.metadata as { reason?: string })?.reason;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          {score != null ? (
            <span className="text-sm font-bold text-primary">{score}</span>
          ) : (
            <MessageSquare className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-medium text-foreground truncate">{item.org_name}</p>
            <DemoBadge />
          </div>
          <p className="text-sm text-muted-foreground truncate">{item.title}</p>
          {reason && (
            <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{reason}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs">Ny</Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}

function DemoOfferCard({ item }: { item: DemoInboxItem }) {
  return (
    <Card className="p-4 border-primary/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-medium text-foreground truncate">{item.title}</h4>
            <Badge variant="default" size="sm">Väntar på svar</Badge>
            <DemoBadge />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {item.org_name && <span>{item.org_name}</span>}
          </p>
          {item.body && (
            <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{item.body}</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </Card>
  );
}

function DemoMessageCard({ item }: { item: DemoInboxItem }) {
  const messages = (item.metadata as { messages?: { sender_type: string; body: string }[] })?.messages ?? [];
  const lastMessage = messages[messages.length - 1];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-medium text-foreground truncate">{item.title}</p>
            <DemoBadge />
          </div>
          {lastMessage && (
            <p className="text-sm text-muted-foreground truncate">
              {lastMessage.sender_type === "employer" ? "Arbetsgivare: " : "Du: "}
              {lastMessage.body}
            </p>
          )}
          <p className="text-xs text-muted-foreground/70 mt-1">{messages.length} meddelanden</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="new" className="text-xs">{messages.length}</Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}

function DemoRequestCard({ item }: { item: DemoInboxItem }) {
  const options = (item.metadata as { options?: string[] })?.options ?? [];

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-full bg-delight/10 flex items-center justify-center flex-shrink-0">
          <Calendar className="h-5 w-5 text-delight" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-medium text-foreground">{item.org_name}</p>
            <DemoBadge />
          </div>
          <p className="text-sm text-muted-foreground">{item.title}</p>
          {item.body && (
            <p className="text-xs text-muted-foreground/80 mt-1">{item.body}</p>
          )}
          {options.length > 0 && (
            <div className="flex gap-2 mt-2">
              {options.map((opt) => (
                <Button key={opt} variant="outline" size="sm" className="text-xs">
                  {opt}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
