import * as React from "react";
import { useNavigate } from "react-router-dom";
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
import { 
  MessageSquare, 
  Users, 
  Calendar,
  ChevronRight,
  RefreshCw
} from "lucide-react";

export default function TalentInbox() {
  const navigate = useNavigate();
  const { data: matches, isLoading: matchesLoading, error: matchesError } = useMatches("talent");
  const { data: offers, isLoading: offersLoading, refetch: refetchOffers } = useTalentBorrowOffers();

  const pendingOffers = offers?.filter((o) => o.status === "pending") ?? [];
  const isLoading = matchesLoading || offersLoading;

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
        <Tabs defaultValue="matches" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="matches" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Matchningar
              {matches && matches.length > 0 && (
                <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs">
                  {matches.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-2">
              <Calendar className="h-4 w-4" />
              Förfrågningar
              {pendingOffers.length > 0 && (
                <Badge variant="new" className="ml-1 h-5 px-1.5 text-xs">
                  {pendingOffers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

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

          {/* Offers Tab */}
          <TabsContent value="offers" className="mt-4 space-y-3">
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchOffers?.()}
                disabled={offersLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${offersLoading ? "animate-spin" : ""}`} />
                Uppdatera
              </Button>
            </div>

            {offersLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </Card>
              ))
            ) : pendingOffers.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium text-foreground">Inga väntande förfrågningar</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Låneförfrågningar från arbetsgivare visas här
                </p>
              </Card>
            ) : (
              pendingOffers.map((offer) => (
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
    </AppShell>
  );
}
