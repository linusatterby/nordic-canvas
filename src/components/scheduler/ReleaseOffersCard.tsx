import * as React from "react";
import { Share2, ArrowRight, Clock, User } from "lucide-react";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import type { ShiftBookingWithTalent } from "@/lib/api/scheduler";

interface ReleaseOffersCardProps {
  orgId: string;
  bookings: ShiftBookingWithTalent[];
}

export function ReleaseOffersCard({ orgId, bookings }: ReleaseOffersCardProps) {
  const { data: circleOffers, isLoading } = useCircleReleaseOffers(orgId);
  const { data: allCirclePartners } = useAllCirclePartnersFlat(orgId);
  const takeOfferMutation = useTakeReleaseOffer();
  const createOfferMutation = useCreateReleaseOffer();

  const hasCirclePartners = (allCirclePartners?.length ?? 0) > 0;

  // Filter bookings that can be released (not already released, not in past)
  const releasableBookings = bookings.filter(
    (b) => !b.is_released && new Date(b.start_ts) > new Date()
  );

  const handleRelease = async (bookingId: string) => {
    try {
      await createOfferMutation.mutateAsync({ bookingId, fromOrgId: orgId });
      toast.success("Pass öppnat för cirkeln", {
        description: "Partnerföretag kan nu ta över passet.",
      });
    } catch (error) {
      toast.error("Kunde inte öppna pass", {
        description: error instanceof Error ? error.message : "Okänt fel",
      });
    }
  };

  const handleTakeOver = async (offerId: string) => {
    try {
      await takeOfferMutation.mutateAsync(offerId);
      toast.success("Du tog över passet!", {
        description: "Bokningen har lagts till i ditt schema.",
      });
    } catch (error) {
      toast.error("Kunde inte ta över", {
        description: error instanceof Error ? error.message : "Okänt fel",
      });
    }
  };

  if (!hasCirclePartners) {
    return null; // Don't show if no circle partners
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
        ) : circleOffers && circleOffers.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Öppna pass från partners
            </h4>
            {circleOffers.map((offer) => (
              <div
                key={offer.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground text-sm">
                      {offer.talent_name}
                    </span>
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
                  onClick={() => handleTakeOver(offer.id)}
                  disabled={takeOfferMutation.isPending}
                >
                  Ta över
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Inga öppna pass från partners just nu
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
                  <Badge variant="verified" size="sm">
                    {booking.talent_name ?? "Talang"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(booking.start_ts), "d MMM HH:mm", { locale: sv })}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRelease(booking.id)}
                  disabled={createOfferMutation.isPending}
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
