import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/input";
import { useHousingListings, useVerifiedTenant, useCreateHousingInquiry } from "@/hooks/useHousing";
import { MapPin, Home, Users, Sofa, Calendar, Shield, MessageCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "@/hooks/use-toast";

export default function TalentHousing() {
  const navigate = useNavigate();
  const [locationFilter, setLocationFilter] = React.useState("");
  const [maxRentFilter, setMaxRentFilter] = React.useState<number | undefined>();

  const { data: listings, isLoading } = useHousingListings({
    location: locationFilter || undefined,
    maxRent: maxRentFilter,
  });
  const { data: isVerified, isLoading: verifiedLoading } = useVerifiedTenant();
  const createInquiry = useCreateHousingInquiry();

  const handleContact = async (listingId: string) => {
    if (!isVerified) {
      toast({
        title: "Kräver verifiering",
        description: "Du måste ha ett accepterat erbjudande för att kontakta värdar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createInquiry.mutateAsync(listingId);
      toast({
        title: result.isNew ? "Förfrågan skickad!" : "Konversation öppnad",
        description: result.isNew
          ? "Värden har fått en notis om din förfrågan."
          : "Du har redan en pågående konversation.",
      });
      // Navigate to inbox with thread
      navigate(`/talent/inbox?tab=housing&threadId=${result.threadId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Något gick fel";
      toast({ title: "Fel", description: msg, variant: "destructive" });
    }
  };

  return (
    <AppShell role="talent">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hitta boende</h1>
          <p className="text-muted-foreground">
            Bläddra bland tillgängliga boenden från verifierade värdar
          </p>
        </div>

        {/* Verified tenant gate notice */}
        {!verifiedLoading && !isVerified && (
          <Card variant="default" padding="md" className="border-warning/50 bg-warning/5">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Kräver verifierad hyresgäst</p>
                <p className="text-sm text-muted-foreground mt-1">
                  För att kontakta värdar behöver du ett accepterat jobberbjudande.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => navigate("/talent/inbox?tab=offers")}
                >
                  Se erbjudanden
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="Ort..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-40"
          />
          <Input
            type="number"
            placeholder="Max hyra"
            value={maxRentFilter || ""}
            onChange={(e) => setMaxRentFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="w-32"
          />
        </div>

        {/* Listings grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : listings && listings.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Card key={listing.id} variant="interactive" padding="md">
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground line-clamp-1">
                    {listing.title || listing.display_title}
                  </h3>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{listing.location || listing.approx_area || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      <span className="font-medium text-foreground">
                        {listing.rent_per_month
                          ? formatCurrency(listing.rent_per_month) + "/mån"
                          : "Pris ej angivet"}
                      </span>
                    </div>
                    {listing.rooms && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{listing.rooms} rum</span>
                      </div>
                    )}
                    {listing.furnished && (
                      <div className="flex items-center gap-2">
                        <Sofa className="h-4 w-4" />
                        <span>Möblerad</span>
                      </div>
                    )}
                    {(listing.available_from || listing.available_to) && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {listing.available_from} — {listing.available_to || "tillsvidare"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {listing.is_demo && (
                      <Badge variant="outline" size="sm">Demo</Badge>
                    )}
                  </div>

                  <Button
                    variant={isVerified ? "primary" : "secondary"}
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => handleContact(listing.id)}
                    disabled={createInquiry.isPending || !isVerified}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {isVerified ? "Kontakta värd" : "Kräver accepterat erbjudande"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card variant="default" padding="lg" className="text-center">
            <Home className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Inga boenden hittades</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
