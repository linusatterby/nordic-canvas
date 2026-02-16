import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Share2, ArrowRight, Clock, User, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useCircleReleaseOffers,
  useTakeReleaseOffer,
  useCreateReleaseOffer,
  useAllCirclePartnersFlat,
} from "@/hooks/useCircles";
import { useToasts } from "@/components/delight/Toasts";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import type { EffectiveBooking, EffectiveReleaseOffer } from "@/hooks/useScheduler";

interface ReleaseOffersCardProps {
  orgId: string;
  bookings: EffectiveBooking[];
  releaseOffers?: EffectiveReleaseOffer[];
}

export function ReleaseOffersCard({ orgId, bookings, releaseOffers = [] }: ReleaseOffersCardProps) {
  const navigate = useNavigate();
  const { addToast } = useToasts();
  const { data: circleOffers, isLoading } = useCircleReleaseOffers(orgId);
  const { data: allCirclePartners } = useAllCirclePartnersFlat(orgId);
  const takeOfferMutation = useTakeReleaseOffer();
  const createOfferMutation = useCreateReleaseOffer();

  const hasCirclePartners = (allCirclePartners?.length ?? 0) > 0;

  // Combine real circle offers with demo release offers
  const allOffers = React.useMemo(() => {
    const realOffers = circleOffers ?? [];
    // Filter out demo offers that are already in real offers by ID
    const realIds = new Set(realOffers.map(o => o.id));
    const demoOnlyOffers = releaseOffers.filter(o => o.is_demo && !realIds.has(o.id));
    
    return [
      ...realOffers.map(o => ({ ...o, is_demo: false })),
      ...demoOnlyOffers.map(o => ({
        id: o.id,
        talent_name: o.talent_name ?? "Demo-kandidat",
        from_org_name: "Demo-partner",
        start_ts: o.booking_start_ts,
        is_demo: true,
      })),
    ];
  }, [circleOffers, releaseOffers]);

  // Filter bookings that can be released (not already released, not in past)
  const releasableBookings = bookings.filter(
    (b) => !b.is_released && new Date(b.start_ts) > new Date()
  );

  const handleRelease = async (bookingId: string) => {
    try {
      await createOfferMutation.mutateAsync({ bookingId, fromOrgId: orgId });
      addToast({
        type: "success",
        title: "Pass öppnat för cirkeln",
        message: "Partnerföretag kan nu ta över passet.",
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Kunde inte öppna pass",
        message: error instanceof Error ? error.message : "Okänt fel",
      });
    }
  };

  const handleTakeOver = async (offerId: string, isDemo: boolean = false) => {
    try {
      // For demo offers, we would call a demo-specific RPC if it existed
      // For now, we'll just show a success message for demo
      if (isDemo) {
        addToast({
          type: "success",
          title: "Passet är ditt!",
          message: "Demo-bokningen har lagts till i ditt schema.",
          action: {
            label: "Öppna schemat",
            onClick: () => navigate("/employer/scheduler"),
          },
        });
        return;
      }
      
      await takeOfferMutation.mutateAsync(offerId);
      addToast({
        type: "success",
        title: "Passet är ditt!",
        message: "Bokningen har lagts till i ditt schema.",
        action: {
          label: "Öppna schemat",
          onClick: () => navigate("/employer/scheduler"),
        },
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Kunde inte ta över",
        message: error instanceof Error ? error.message : "Okänt fel",
      });
    }
  };

  if (!hasCirclePartners && releaseOffers.length === 0) {
    return null; // Don't show if no circle partners and no demo offers
  }

  return (
    <Card variant="default" padding="md" className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="h-4 w-4 text-primary" />
          Cirkel-delning
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Dela pass med partners eller ta över deras
        </p>
      </CardHeader>

      <CardContent className="mt-4 space-y-4">
        {/* Available Offers from Circle Partners */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : allOffers && allOffers.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Öppna pass från partners
            </h4>
            {allOffers.map((offer) => (
              <div
                key={offer.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">
                        {offer.talent_name}
                      </span>
                      {offer.is_demo && (
                        <Badge variant="warn" size="sm">DEMO</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{offer.from_org_name}</span>
                      {offer.start_ts && (
                        <>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(offer.start_ts), "d MMM HH:mm", { locale: sv })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleTakeOver(offer.id, offer.is_demo)}
                  disabled={takeOfferMutation.isPending}
                >
                  Ta över
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Inga öppna pass från partners just nu
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/employer/borrow")}
              className="gap-1"
            >
              <Calendar className="h-4 w-4" />
              Skapa förfrågan
            </Button>
          </div>
        )}

        {/* Release Your Own Bookings */}
        {releasableBookings.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Öppna dina pass för cirkeln
            </h4>
            {releasableBookings.slice(0, 3).map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="verified" size="sm">
                      {booking.talent_name ?? "Kandidat"}
                    </Badge>
                    {booking.is_demo && (
                      <Badge variant="warn" size="sm">DEMO</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(booking.start_ts), "d MMM HH:mm", { locale: sv })}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRelease(booking.id)}
                  disabled={createOfferMutation.isPending || booking.is_demo}
                  className="text-xs"
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  Öppna
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
