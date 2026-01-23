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
import { useOrgBorrowRequests } from "@/hooks/useBorrow";
import { useMyOrgs } from "@/hooks/useOrgs";
import { 
  MessageSquare, 
  Users, 
  HandshakeIcon,
  ChevronRight,
  RefreshCw
} from "lucide-react";

export default function EmployerInbox() {
  const navigate = useNavigate();
  const { data: orgs } = useMyOrgs();
  const activeOrgId = orgs?.[0]?.id;
  
  const { data: matches, isLoading: matchesLoading, error: matchesError } = useMatches("employer", activeOrgId);
  const { data: requests, isLoading: requestsLoading, refetch: refetchRequests } = useOrgBorrowRequests(activeOrgId);

  const openRequests = requests?.filter((r) => r.status === "open") ?? [];

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
            <TabsTrigger value="borrow" className="gap-2">
              <HandshakeIcon className="h-4 w-4" />
              Lån
              {openRequests.length > 0 && (
                <Badge variant="new" className="ml-1 h-5 px-1.5 text-xs">
                  {openRequests.length}
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
                  Matchningar med talanger visas här
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
                        {match.talent_name || "Talang"}
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

          {/* Borrow Tab */}
          <TabsContent value="borrow" className="mt-4 space-y-3">
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchRequests?.()}
                disabled={requestsLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${requestsLoading ? "animate-spin" : ""}`} />
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
    </AppShell>
  );
}
