import * as React from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTalentBorrowOffers, useAcceptBorrowOffer, useDeclineBorrowOffer } from "@/hooks/useBorrow";
import { useToasts } from "@/components/delight/Toasts";
import { MapPin, Clock, Briefcase, Check, X } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

const roleLabels: Record<string, string> = {
  bartender: "Bartender",
  servitor: "Servitör",
  kock: "Kock",
  diskare: "Diskare",
  event: "Eventpersonal",
};

export function TalentBorrowOffers() {
  const { addToast } = useToasts();
  const { data: offers, isLoading } = useTalentBorrowOffers();
  const acceptMutation = useAcceptBorrowOffer();
  const declineMutation = useDeclineBorrowOffer();

  const handleAccept = async (offerId: string) => {
    try {
      await acceptMutation.mutateAsync(offerId);
      addToast({
        type: "success",
        title: "Accepterat!",
        message: "Bokning skapad. Kolla ditt schema.",
      });
    } catch (e: any) {
      addToast({
        type: "error",
        title: "Kunde inte acceptera",
        message: e.message || "Försök igen.",
      });
    }
  };

  const handleDecline = async (offerId: string) => {
    try {
      await declineMutation.mutateAsync(offerId);
      addToast({
        type: "info",
        title: "Avböjt",
        message: "Du har tackat nej till förfrågan.",
      });
    } catch {
      addToast({
        type: "error",
        title: "Fel",
        message: "Kunde inte avböja.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!offers || offers.length === 0) {
    return null; // Don't show anything if no offers
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Inkommande förfrågningar</h2>
        <Badge variant="primary" size="sm">{offers.length}</Badge>
      </div>

      <div className="space-y-3">
        {offers.map((offer) => (
          <Card key={offer.id} variant="default" padding="md" className="border-primary/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-foreground">
                    {roleLabels[offer.request.role_key] ?? offer.request.role_key}
                  </span>
                  <Badge variant="default" size="sm">{offer.org_name}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {offer.request.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(offer.request.start_ts), "d MMM HH:mm", { locale: sv })} –{" "}
                    {format(new Date(offer.request.end_ts), "HH:mm", { locale: sv })}
                  </span>
                </div>

                {offer.request.message && (
                  <p className="text-sm text-muted-foreground mt-2 italic">"{offer.request.message}"</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDecline(offer.id)}
                  disabled={declineMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="gap-1"
                  onClick={() => handleAccept(offer.id)}
                  disabled={acceptMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                  Acceptera
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
