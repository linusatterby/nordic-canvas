import * as React from "react";
import { MapPin, Users, Shield, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/classnames";

export interface HousingCardProps {
  id: string;
  title: string;
  location: string;
  capacity: number;
  rules: string[];
  isVerifiedHost?: boolean;
  requiresVerifiedTenant?: boolean;
  imageUrl?: string;
  onViewDetails?: (id: string) => void;
  className?: string;
}

export function HousingCard({
  id,
  title,
  location,
  capacity,
  rules,
  isVerifiedHost = false,
  requiresVerifiedTenant = false,
  imageUrl,
  onViewDetails,
  className,
}: HousingCardProps) {
  return (
    <Card
      variant="interactive"
      padding="none"
      className={cn("overflow-hidden", className)}
      role="article"
      aria-label={`Boende: ${title}`}
    >
      {/* Image */}
      {imageUrl && (
        <div className="aspect-video w-full overflow-hidden bg-secondary">
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {isVerifiedHost && (
            <Badge variant="verified" size="sm" icon={<Shield className="h-3 w-3" />}>
              Verifierad värd
            </Badge>
          )}
        </div>

        {/* Location & Capacity */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            <span>{capacity} {capacity === 1 ? "person" : "personer"}</span>
          </div>
        </div>

        {/* Rules Preview */}
        {rules.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Regler
            </p>
            <div className="flex flex-wrap gap-1.5">
              {rules.slice(0, 3).map((rule, index) => (
                <Badge key={index} variant="outline" size="sm">
                  {rule}
                </Badge>
              ))}
              {rules.length > 3 && (
                <Badge variant="outline" size="sm">
                  +{rules.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Verified Tenant Required */}
        {requiresVerifiedTenant && (
          <div className="mt-3">
            <Badge variant="primary" size="sm" icon={<Shield className="h-3 w-3" />}>
              Kräver verifierad hyresgäst
            </Badge>
          </div>
        )}

        {/* View Details */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails?.(id)}
          className="w-full mt-4 justify-between"
        >
          Visa detaljer
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
