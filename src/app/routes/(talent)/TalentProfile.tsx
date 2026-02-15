import * as React from "react";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { AvailabilityEditor } from "@/components/profile/AvailabilityEditor";
import { JobPreferencesEditor } from "@/components/profile/JobPreferencesEditor";
import { CredentialsList } from "@/components/profile/CredentialsList";
import { Star, Shield, MapPin, Calendar, Edit2, Video, Award } from "lucide-react";

// Stub data
const profileData = {
  name: "Erik Svensson",
  role: "Liftskötare",
  location: "Åre, Sverige",
  bio: "Erfaren säsongsarbetare med passion för fjällen. 3 säsonger som liftskötare och skidlärare.",
  legacyScore: 72,
  isVerified: true,
  badges: [
    { label: "Erfaren", variant: "verified" as const },
    { label: "Punktlig", variant: "primary" as const },
    { label: "Skidåkare", variant: "default" as const },
  ],
  availability: [
    { period: "Dec 2025 - Apr 2026", status: "available" },
    { period: "Jun 2025 - Aug 2025", status: "busy" },
  ],
  reviews: [
    {
      id: "1",
      company: "Åre Ski Resort",
      rating: 5,
      comment: "Erik var fantastisk! Alltid på plats i tid och positiv attityd.",
      date: "Mar 2024",
    },
    {
      id: "2",
      company: "Storhogna Högfjällshotell",
      rating: 4,
      comment: "Duktig och pålitlig. Rekommenderas varmt.",
      date: "Sep 2023",
    },
  ],
};

export function TalentProfile() {
  return (
    <AppShell role="talent">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <Card variant="elevated" padding="lg" className="mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative">
              <Avatar
                size="xl"
                fallback={profileData.name.slice(0, 2)}
                className="ring-4 ring-card"
              />
              {profileData.isVerified && (
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-verified flex items-center justify-center">
                  <Shield className="h-3 w-3 text-verified-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-foreground">
                      {profileData.name}
                    </h1>
                    <Badge variant="primary">
                      <Star className="h-3 w-3" />
                      {profileData.legacyScore}/100
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">{profileData.role}</p>
                </div>
                <Button variant="secondary" size="sm" className="gap-2">
                  <Edit2 className="h-4 w-4" />
                  Redigera
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                <MapPin className="h-4 w-4" />
                {profileData.location}
              </div>

              <p className="text-sm text-muted-foreground mt-3">
                {profileData.bio}
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                {profileData.badges.map((badge, i) => (
                  <Badge key={i} variant={badge.variant} size="sm">
                    {badge.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Video Pitch CTA */}
          <div className="mt-6 p-4 bg-primary-muted rounded-xl flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Lägg till en videopitch</p>
              <p className="text-sm text-muted-foreground">
                Kandidater med video får 3x fler matchningar
              </p>
            </div>
            <Button variant="primary" size="sm">
              Spela in
            </Button>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="schedule">
          <TabsList>
            <TabsTrigger value="schedule">Schema</TabsTrigger>
            <TabsTrigger value="reviews">Omdömen</TabsTrigger>
            <TabsTrigger value="credentials">Certifikat</TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <div className="space-y-4">
              {/* Job preferences - 3 modes */}
              <JobPreferencesEditor />

              {/* Availability Editor - editable dates */}
              <AvailabilityEditor />

              {/* Existing availability periods (stub data) */}
              <Card variant="default" padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Perioder</h3>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Edit2 className="h-4 w-4" />
                    Redigera
                  </Button>
                </div>
                <div className="space-y-3">
                  {profileData.availability.map((period, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        period.status === "available" ? "bg-verified-muted" : "bg-busy-muted"
                      }`}
                    >
                      <Calendar className={`h-4 w-4 ${
                        period.status === "available" ? "text-verified" : "text-busy"
                      }`} />
                      <span className="text-sm text-foreground flex-1">{period.period}</span>
                      <Badge
                        variant={period.status === "available" ? "verified" : "busy"}
                        size="sm"
                      >
                        {period.status === "available" ? "Tillgänglig" : "Upptagen"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <Card variant="default" padding="lg">
              <h3 className="font-semibold text-foreground mb-4">Omdömen</h3>
              <div className="space-y-4">
                {profileData.reviews.map((review) => (
                  <div key={review.id} className="p-4 bg-secondary rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">{review.company}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-warn text-warn" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                    <p className="text-xs text-muted-foreground mt-2">{review.date}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Credentials Tab */}
          <TabsContent value="credentials">
            <CredentialsList />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

export default TalentProfile;
