import * as React from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Home, 
  Banknote, 
  Briefcase,
  Check,
  X,
  AlertCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOffer, useRespondOffer, useWithdrawOffer } from "@/hooks/useOffers";
import { getOfferStatusInfo, type OfferStatus } from "@/lib/api/offers";
import { useToasts } from "@/components/delight/Toasts";

interface OfferDetailModalProps {
  offerId: string | null;
  onClose: () => void;
  role: "talent" | "employer";
}

export function OfferDetailModal({ offerId, onClose, role }: OfferDetailModalProps) {
  const { data: offer, isLoading, error } = useOffer(offerId ?? undefined);
  const respondMutation = useRespondOffer();
  const withdrawMutation = useWithdrawOffer();
  const { addToast } = useToasts();

  const handleAccept = async () => {
    if (!offerId) return;
    try {
      const result = await respondMutation.mutateAsync({ offerId, action: "accept" });
      addToast({
        type: "success",
        title: "Erbjudande accepterat!",
        message: "Du har accepterat erbjudandet.",
      });
      onClose();
    } catch (err) {
      addToast({
        type: "error",
        title: "Kunde inte acceptera",
        message: err instanceof Error ? err.message : "Ett fel uppstod",
      });
    }
  };

  const handleDecline = async () => {
    if (!offerId) return;
    try {
      await respondMutation.mutateAsync({ offerId, action: "decline" });
      addToast({ type: "info", title: "Erbjudande avböjt", message: "Du har avböjt erbjudandet." });
      onClose();
    } catch (err) {
      addToast({ type: "error", title: "Kunde inte avböja", message: "Ett fel uppstod" });
    }
  };

  const handleWithdraw = async () => {
    if (!offerId) return;
    try {
      await withdrawMutation.mutateAsync(offerId);
      addToast({ type: "info", title: "Erbjudande återkallat", message: "Erbjudandet har återkallats." });
      onClose();
    } catch (err) {
      addToast({ type: "error", title: "Kunde inte återkalla", message: "Ett fel uppstod" });
    }
  };

  const statusInfo = offer ? getOfferStatusInfo(offer.status as OfferStatus) : null;
  const isPending = respondMutation.isPending || withdrawMutation.isPending;
  const canRespond = role === "talent" && offer?.status === "sent";
  const canWithdraw = role === "employer" && offer?.status && ["draft", "sent"].includes(offer.status);

  return (
    <Dialog open={!!offerId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Erbjudande</DialogTitle>
        </DialogHeader>
        
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {error && (
          <div className="text-center text-destructive py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Kunde inte ladda erbjudandet</p>
          </div>
        )}

        {offer && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{offer.role_title || "Erbjudande"}</h3>
                {role === "talent" && offer.org_name && (
                  <p className="text-sm text-muted-foreground">{offer.org_name}</p>
                )}
              </div>
              {statusInfo && <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>}
            </div>

            <Card padding="md" className="space-y-2 text-sm">
              {offer.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{offer.location}</span>
                </div>
              )}
              {offer.start_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(offer.start_date), "d MMM yyyy", { locale: sv })}
                    {offer.end_date && ` – ${format(new Date(offer.end_date), "d MMM yyyy", { locale: sv })}`}
                  </span>
                </div>
              )}
              {offer.hours_per_week && (
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{offer.hours_per_week} tim/vecka</span>
                </div>
              )}
              {offer.hourly_rate && (
                <div className="flex items-center gap-3">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <span>{offer.hourly_rate} {offer.currency}/tim</span>
                </div>
              )}
              {offer.housing_included && (
                <div className="flex items-center gap-3 text-success">
                  <Home className="h-4 w-4" />
                  <span>Boende ingår{offer.housing_note && ` – ${offer.housing_note}`}</span>
                </div>
              )}
            </Card>

            {offer.message && (
              <p className="text-sm bg-muted/50 rounded-lg p-3">{offer.message}</p>
            )}

            <div className="flex gap-3 pt-2">
              {canRespond && (
                <>
                  <Button variant="danger" size="md" onClick={handleDecline} disabled={isPending} className="flex-1">
                    <X className="h-4 w-4 mr-2" />Avböj
                  </Button>
                  <Button variant="verified" size="md" onClick={handleAccept} disabled={isPending} className="flex-1">
                    <Check className="h-4 w-4 mr-2" />Acceptera
                  </Button>
                </>
              )}
              {canWithdraw && (
                <Button variant="secondary" size="md" onClick={handleWithdraw} disabled={isPending} className="w-full">
                  Återkalla erbjudande
                </Button>
              )}
              {!canRespond && !canWithdraw && (
                <Button variant="secondary" size="md" onClick={onClose} className="w-full">Stäng</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
