import * as React from "react";
import { Star, ChevronRight, Award, Calendar, TrendingUp } from "lucide-react";
import { AppShell } from "@/app/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Link } from "react-router-dom";
import { TalentBorrowOffers } from "@/components/borrow/TalentBorrowOffers";
import { TalentCircleVisibilityCard } from "@/components/circles/TalentCircleVisibilityCard";

// Stub data
const passportData = {
  legacyScore: 72,
  completedSeasons: 3,
  totalBadges: 8,
  profileCompletion: 85,
  nextSteps: [
    { id: "1", label: "Lägg till videopitch", completed: false },
    { id: "2", label: "Verifiera telefonnummer", completed: true },
    { id: "3", label: "Lägg till referens", completed: false },
  ],
};

const recentMatches = [
  { id: "1", company: "Åre Ski Resort", role: "Liftskötare", status: "pending" },
  { id: "2", company: "Storhogna Högfjällshotell", role: "Receptionist", status: "accepted" },
];

export function TalentDashboard() {
  return (
    <AppShell role="talent">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Hej Erik! 👋</h1>
          <p className="text-muted-foreground mt-1">
            Du är redo för säsongen. Fortsätt bygga ditt rykte.
          </p>
        </div>

        {/* Incoming Borrow Offers */}
        <div className="mb-6">
          <TalentBorrowOffers />
        </div>

        {/* Circle Visibility Settings */}
        <div className="mb-6">
          <TalentCircleVisibilityCard />
        </div>

        {/* Season Passport */}
        <Card variant="elevated" padding="lg" className="mb-6">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Season Passport
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Din säsongsresa i ett sammandrag
              </p>
            </div>
            <Badge variant="primary" className="text-lg px-4 py-1">
              <Star className="h-4 w-4 mr-1" />
              {passportData.legacyScore}/100
            </Badge>
          </CardHeader>

          <CardContent className="mt-6">
            <div className="grid sm:grid-cols-3 gap-6">
              {/* Seasons */}
              <div className="text-center p-4 bg-secondary rounded-xl">
                <div className="text-3xl font-bold text-foreground">
                  {passportData.completedSeasons}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Avslutade säsonger
                </div>
              </div>

              {/* Badges */}
              <div className="text-center p-4 bg-secondary rounded-xl">
                <div className="text-3xl font-bold text-foreground">
                  {passportData.totalBadges}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Intjänade badges
                </div>
              </div>

              {/* Profile */}
              <div className="text-center p-4 bg-secondary rounded-xl">
                <div className="text-3xl font-bold text-foreground">
                  {passportData.profileCompletion}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Profilkomplett
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-foreground">Legacy Score framsteg</span>
                <span className="text-muted-foreground">72/100</span>
              </div>
              <Progress value={72} size="lg" variant="default" />
            </div>
          </CardContent>
        </Card>

        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Next Steps */}
          <Card variant="default" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-verified" />
                Nästa steg
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-4 space-y-3">
              {passportData.nextSteps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    step.completed ? "bg-verified-muted" : "bg-secondary"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      step.completed
                        ? "border-verified bg-verified text-verified-foreground"
                        : "border-border"
                    }`}
                  >
                    {step.completed && <span className="text-xs">✓</span>}
                  </div>
                  <span
                    className={`text-sm flex-1 ${
                      step.completed ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Matches */}
          <Card variant="default" padding="lg">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Senaste matchningar
              </CardTitle>
              <Link to="/talent/matches">
                <Button variant="ghost" size="sm" className="gap-1">
                  Alla
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="mt-4 space-y-3">
              {recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary"
                >
                  <div className="flex-1">
                    <div className="font-medium text-foreground text-sm">
                      {match.role}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {match.company}
                    </div>
                  </div>
                  <Badge
                    variant={match.status === "accepted" ? "verified" : "primary"}
                    size="sm"
                  >
                    {match.status === "accepted" ? "Accepterad" : "Väntar"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <Card variant="interactive" padding="lg" className="mt-6 text-center">
          <p className="text-muted-foreground mb-4">
            Redo att hitta ditt nästa jobb?
          </p>
          <Link to="/talent/swipe-jobs">
            <Button variant="primary" size="lg" className="gap-2">
              Börja swipea jobb
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}

export default TalentDashboard;
