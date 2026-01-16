import * as React from "react";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/delight/EmptyStates";
import { MessageCircle, Calendar, MapPin, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const stubMatches = [
  {
    id: "1",
    company: "Åre Ski Resort",
    role: "Liftskötare",
    location: "Åre, Jämtland",
    period: "Dec 2025 - Apr 2026",
    status: "pending",
    lastMessage: null,
    avatarUrl: undefined,
  },
  {
    id: "2",
    company: "Storhogna Högfjällshotell",
    role: "Receptionist",
    location: "Vemdalen, Härjedalen",
    period: "Jan 2026 - Mar 2026",
    status: "accepted",
    lastMessage: "Hej! Vi ser fram emot att träffa dig...",
    avatarUrl: undefined,
  },
];

export function TalentMatches() {
  const [matches] = React.useState(stubMatches);

  return (
    <AppShell role="talent" user={{ name: "Erik Svensson" }}>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Dina matchningar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Arbetsgivare du har matchat med
          </p>
        </div>

        {matches.length > 0 ? (
          <div className="space-y-4">
            {matches.map((match) => (
              <Card key={match.id} variant="interactive" padding="md">
                <div className="flex items-start gap-4">
                  <Avatar
                    size="lg"
                    fallback={match.company.slice(0, 2)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">
                        {match.role}
                      </h3>
                      <Badge
                        variant={match.status === "accepted" ? "verified" : "primary"}
                        size="sm"
                      >
                        {match.status === "accepted" ? "Accepterad" : "Väntar"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{match.company}</p>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {match.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {match.period}
                      </span>
                    </div>

                    {match.lastMessage && (
                      <p className="text-sm text-muted-foreground mt-3 truncate">
                        {match.lastMessage}
                      </p>
                    )}
                  </div>

                  {match.status === "accepted" && (
                    <Button variant="primary" size="sm" className="gap-1 shrink-0">
                      <MessageCircle className="h-4 w-4" />
                      Chatta
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            type="no-matches"
            action={{
              label: "Börja swipea",
              onClick: () => {},
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

export default TalentMatches;
