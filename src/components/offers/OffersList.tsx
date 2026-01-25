import * as React from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { FileText, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/delight/EmptyStates";
import { useTalentOffers, useOrgOffers } from "@/hooks/useOffers";
import { getOfferStatusInfo, type OfferStatus, type OfferWithOrg, type Offer } from "@/lib/api/offers";
import { cn } from "@/lib/utils/classnames";

interface OffersListProps {
  role: "talent" | "employer";
  orgId?: string;
  onSelectOffer: (offerId: string) => void;
  selectedOfferId?: string | null;
}

export function OffersList({ role, orgId, onSelectOffer, selectedOfferId }: OffersListProps) {
  const talentQuery = useTalentOffers();
  const orgQuery = useOrgOffers(role === "employer" ? orgId : undefined);

  const { data: offers, isLoading, error } = role === "talent" ? talentQuery : orgQuery;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>Kunde inte ladda erbjudanden</p>
      </div>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title={role === "talent" ? "Inga erbjudanden" : "Inga skickade erbjudanden"}
        message={
          role === "talent"
            ? "När arbetsgivare skickar erbjudanden till dig visas de här."
            : "Skicka erbjudanden till matchade kandidater för att se dem här."
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {offers.map((offer) => (
        <OfferListItem
          key={offer.id}
          offer={offer}
          role={role}
          isSelected={selectedOfferId === offer.id}
          onClick={() => onSelectOffer(offer.id)}
        />
      ))}
    </div>
  );
}

interface OfferListItemProps {
  offer: OfferWithOrg | Offer;
  role: "talent" | "employer";
  isSelected: boolean;
  onClick: () => void;
}

function OfferListItem({ offer, role, isSelected, onClick }: OfferListItemProps) {
  const statusInfo = getOfferStatusInfo(offer.status as OfferStatus);
  const isPending = offer.status === "sent";

  return (
    <Card
      variant="interactive"
      padding="md"
      className={cn(
        "cursor-pointer transition-all",
        isSelected && "ring-2 ring-primary",
        isPending && role === "talent" && "border-primary/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            isPending ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <FileText className="h-5 w-5" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground truncate">
              {offer.role_title || "Erbjudande"}
            </h4>
            <Badge variant={statusInfo.variant as any} size="sm">
              {statusInfo.label}
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground mt-0.5">
            {role === "talent" && "org_name" in offer && offer.org_name && (
              <span>{offer.org_name} · </span>
            )}
            {offer.location && <span>{offer.location} · </span>}
            {offer.sent_at && (
              <span>
                {format(new Date(offer.sent_at), "d MMM", { locale: sv })}
              </span>
            )}
          </p>
        </div>
        
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </Card>
  );
}
