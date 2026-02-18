import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { IS_LIVE_BACKEND } from "@/lib/config/env";
import type { DemoInboxItem } from "@/lib/api/demoInbox";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Sparkles,
  X,
  Star,
  FileText,
  MessageSquare,
  Calendar,
  Bell,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──

interface DemoInboxPreviewProps {
  item: DemoInboxItem | null;
  open: boolean;
  onClose: () => void;
}

// ── Main export ──

export function DemoInboxPreview({ item, open, onClose }: DemoInboxPreviewProps) {
  // Never render on live
  if (IS_LIVE_BACKEND) return null;

  const isMobile = useIsMobile();

  if (!item) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <div className="flex items-center gap-2">
              <DrawerTitle className="text-base">Förhandsvisning</DrawerTitle>
              <PreviewDemoBadge />
            </div>
            <DrawerDescription className="text-xs">
              Exempeldata – inga åtgärder sparas.
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="px-4 pb-6 max-h-[65vh]">
            <PreviewBody item={item} />
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base">Förhandsvisning</SheetTitle>
            <PreviewDemoBadge />
          </div>
          <SheetDescription className="text-xs">
            Exempeldata – inga åtgärder sparas.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 p-4">
          <PreviewBody item={item} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ── Demo badge for preview header ──

function PreviewDemoBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[9px] font-medium uppercase tracking-wider border border-teal/20 bg-teal-muted text-teal select-none">
      <Sparkles className="h-2.5 w-2.5" />
      Demo
    </span>
  );
}

// ── Preview body router ──

function PreviewBody({ item }: { item: DemoInboxItem }) {
  switch (item.tab) {
    case "notification":
      return <NotificationPreview item={item} />;
    case "match":
      return <MatchPreview item={item} />;
    case "offer":
      return <OfferPreview item={item} />;
    case "message":
      return <MessagePreview item={item} />;
    case "request":
      return <RequestPreview item={item} />;
    default:
      return <GenericPreview item={item} />;
  }
}

// ── Notification preview ──

function NotificationPreview({ item }: { item: DemoInboxItem }) {
  const meta = item.metadata as Record<string, unknown>;
  const ctaLabel = (meta?.ctaLabel as string) || (meta?.cta as string) || "Öppna";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
          {item.org_name && (
            <p className="text-xs text-muted-foreground mt-0.5">{item.org_name}</p>
          )}
        </div>
      </div>
      {item.body && (
        <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
      )}
      <Button variant="primary" size="sm" disabled className="w-full opacity-60">
        {ctaLabel}
      </Button>
      <p className="text-[10px] text-muted-foreground/60 text-center italic">
        Knappar är inaktiva i förhandsvisning
      </p>
    </div>
  );
}

// ── Match preview ──

function MatchPreview({ item }: { item: DemoInboxItem }) {
  const meta = item.metadata as Record<string, unknown>;
  const score = meta?.score as number | undefined;
  const reason = meta?.reason as string | undefined;
  const jobTitle = (meta?.jobTitle as string) || item.title;
  const location = (meta?.location as string) || "";
  const periodText = (meta?.periodText as string) || "";
  const housing = (meta?.housing as string) || "";
  const whyBullets = (meta?.whyBullets as string[]) || [];

  return (
    <div className="space-y-4">
      {/* Mini job card */}
      <Card className="p-4 border-primary/30">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            {score != null ? (
              <span className="text-lg font-bold text-primary">{score}</span>
            ) : (
              <Star className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">{jobTitle}</h3>
            <p className="text-xs text-muted-foreground">{item.org_name}</p>
            {location && <p className="text-xs text-muted-foreground/70">{location}</p>}
            {periodText && <p className="text-xs text-muted-foreground/70">{periodText}</p>}
          </div>
        </div>
        {housing && (
          <div className="mt-2">
            <Badge variant="default" className="text-[10px]">🏠 {housing}</Badge>
          </div>
        )}
      </Card>

      {/* Score breakdown */}
      {score != null && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-foreground uppercase tracking-wide">
            Matchscore: {score}/100
          </h4>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${Math.min(score, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Why breakdown */}
      {(reason || whyBullets.length > 0) && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-foreground uppercase tracking-wide">
            Varför denna score
          </h4>
          {whyBullets.length > 0 ? (
            <ul className="space-y-1">
              {whyBullets.map((b, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">•</span>
                  {b}
                </li>
              ))}
            </ul>
          ) : reason ? (
            <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>
          ) : null}
        </div>
      )}

      <Button variant="primary" size="sm" disabled className="w-full opacity-60">
        Öppna matchning
      </Button>
      <p className="text-[10px] text-muted-foreground/60 text-center italic">
        Knappar är inaktiva i förhandsvisning
      </p>
    </div>
  );
}

// ── Offer preview ──

function OfferPreview({ item }: { item: DemoInboxItem }) {
  const meta = item.metadata as Record<string, unknown>;
  const startDate = (meta?.startDate as string) || (meta?.start_date as string) || "";
  const housingText = (meta?.housingText as string) || "";
  const status = item.status || (meta?.status as string) || "Nytt";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
          <p className="text-xs text-muted-foreground">{item.org_name}</p>
        </div>
        <Badge variant="default" className="text-xs flex-shrink-0">
          {status === "sent" ? "Väntar på svar" : status}
        </Badge>
      </div>

      {item.body && (
        <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
      )}

      {startDate && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>Startdatum: {startDate}</span>
        </div>
      )}

      {housingText && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>🏠</span>
          <span>{housingText}</span>
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <Button variant="primary" size="sm" disabled className="flex-1 opacity-60">
          <CheckCircle className="h-4 w-4 mr-1" />
          Acceptera
        </Button>
        <Button variant="outline" size="sm" disabled className="flex-1 opacity-60">
          <XCircle className="h-4 w-4 mr-1" />
          Avböj
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground/60 text-center italic">
        Knappar är inaktiva i förhandsvisning
      </p>
    </div>
  );
}

// ── Message thread preview ──

function MessagePreview({ item }: { item: DemoInboxItem }) {
  const meta = item.metadata as Record<string, unknown>;
  const messages = (meta?.messages as { sender_type: string; body: string }[]) ?? [];
  const threadTitle = (meta?.threadTitle as string) || item.title;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{threadTitle}</h3>
      </div>

      {/* Chat messages */}
      <div className="space-y-3">
        {messages.map((msg, i) => {
          const isTalent = msg.sender_type === "talent";
          return (
            <div
              key={i}
              className={cn(
                "flex",
                isTalent ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  isTalent
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                )}
              >
                <p className="text-[10px] font-medium mb-0.5 opacity-70">
                  {isTalent ? "Du" : item.org_name || "Arbetsgivare"}
                </p>
                {msg.body}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disabled input */}
      <div className="relative">
        <Input
          placeholder="Skriv ett meddelande…"
          disabled
          className="pr-10 opacity-60"
        />
        <p className="text-[10px] text-muted-foreground/60 text-center italic mt-1">
          Chattfältet är inaktivt i förhandsvisning
        </p>
      </div>
    </div>
  );
}

// ── Request preview ──

function RequestPreview({ item }: { item: DemoInboxItem }) {
  const meta = item.metadata as Record<string, unknown>;
  const actions = (meta?.actions as string[]) || (meta?.options as string[]) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-delight/10 flex items-center justify-center flex-shrink-0">
          <Calendar className="h-5 w-5 text-delight" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
          <p className="text-xs text-muted-foreground">{item.org_name}</p>
        </div>
      </div>

      {item.body && (
        <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
      )}

      {actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map((action, i) => (
            <Button
              key={action}
              variant={i === 0 ? "primary" : "outline"}
              size="sm"
              disabled
              className="flex-1 opacity-60"
            >
              {action}
            </Button>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground/60 text-center italic">
        Knappar är inaktiva i förhandsvisning
      </p>
    </div>
  );
}

// ── Generic fallback ──

function GenericPreview({ item }: { item: DemoInboxItem }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
      {item.body && <p className="text-sm text-muted-foreground">{item.body}</p>}
      {item.org_name && <p className="text-xs text-muted-foreground/70">{item.org_name}</p>}
    </div>
  );
}
