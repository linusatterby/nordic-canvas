import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/delight/EmptyStates";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/Modal";
import { Input } from "@/components/ui/input";
import { WeekRangeSelector, getCurrentWeekRange, type WeekRange } from "@/components/scheduler/WeekRangeSelector";
import { CreateBookingModal } from "@/components/scheduler/CreateBookingModal";
import { Plus, Calendar } from "lucide-react";
import { cn } from "@/lib/utils/classnames";
import { useDefaultOrgId, useCreateOrg } from "@/hooks/useOrgs";
import { useScheduler, useCreateBooking } from "@/hooks/useScheduler";
import { useMatches } from "@/hooks/useMatches";
import { useToasts } from "@/components/delight/Toasts";
import { format, addDays, isSameDay, parseISO, startOfDay } from "date-fns";
import { sv } from "date-fns/locale";
import type { ShiftBookingWithTalent, BusyBlock } from "@/lib/api/scheduler";

const weekDays = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

interface DaySlot {
  date: Date;
  bookings: ShiftBookingWithTalent[];
  busyBlocks: BusyBlock[];
}

export function EmployerScheduler() {
  const navigate = useNavigate();
  const { addToast } = useToasts();
  const { data: orgId, isLoading: orgLoading } = useDefaultOrgId();
  const { data: matches } = useMatches("employer", orgId);
  const createBookingMutation = useCreateBooking();

  const [weekRange, setWeekRange] = React.useState<WeekRange>(getCurrentWeekRange);
  const [showCreateOrg, setShowCreateOrg] = React.useState(false);
  const [showCreateBooking, setShowCreateBooking] = React.useState(false);
  const [orgName, setOrgName] = React.useState("");
  const [orgLocation, setOrgLocation] = React.useState("");
  const createOrgMutation = useCreateOrg();

  // Get unique talent IDs from matches
  const matchedTalentIds = React.useMemo(() => {
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.talent_user_id))];
  }, [matches]);

  // Build talent options for booking modal with real legacy scores
  const talentOptions = React.useMemo(() => {
    if (!matches) return [];
    const seen = new Set<string>();
    return matches
      .filter((m) => {
        if (seen.has(m.talent_user_id)) return false;
        seen.add(m.talent_user_id);
        return true;
      })
      .map((m) => ({
        user_id: m.talent_user_id,
        full_name: m.talent_name,
        legacy_score: m.talent_legacy_score,
      }));
  }, [matches]);

  // Fetch scheduler data
  const { data: schedulerData, isLoading: schedulerLoading } = useScheduler(
    orgId ?? undefined,
    { start: weekRange.start, end: weekRange.end },
    matchedTalentIds
  );

  // Build day slots from week range
  const daySlots = React.useMemo((): DaySlot[] => {
    const weekStart = new Date(weekRange.start);
    const slots: DaySlot[] = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dayStart = startOfDay(date);
      const dayEnd = startOfDay(addDays(date, 1));

      const dayBookings = (schedulerData?.bookings ?? []).filter((b) => {
        const bStart = new Date(b.start_ts);
        return bStart >= dayStart && bStart < dayEnd;
      });

      const dayBusyBlocks = (schedulerData?.busyBlocks ?? []).filter((b) => {
        const bStart = new Date(b.start_ts);
        return bStart >= dayStart && bStart < dayEnd;
      });

      slots.push({ date, bookings: dayBookings, busyBlocks: dayBusyBlocks });
    }

    return slots;
  }, [weekRange, schedulerData]);

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    try {
      await createOrgMutation.mutateAsync({ name: orgName, location: orgLocation || undefined });
      setShowCreateOrg(false);
      addToast({ type: "success", title: "Klart!", message: "Organisation skapad." });
    } catch {
      addToast({ type: "error", title: "Fel", message: "Kunde inte skapa organisation." });
    }
  };

  const handleCreateBooking = async (talentUserId: string, startTs: string, endTs: string) => {
    if (!orgId) return;
    await createBookingMutation.mutateAsync({
      orgId,
      talentUserId,
      startTs,
      endTs,
    });
    addToast({ type: "success", title: "Bokat!", message: "Passet har lagts till." });
  };

  const formatTime = (isoString: string) => {
    return format(new Date(isoString), "HH:mm");
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  // Loading state
  if (orgLoading) {
    return (
      <AppShell role="employer">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  // No org state
  if (!orgId) {
    return (
      <AppShell role="employer">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <EmptyState
            type="no-data"
            title="Ingen organisation"
            message="Skapa en organisation för att börja schemalägga."
            action={{ label: "Skapa organisation", onClick: () => setShowCreateOrg(true) }}
          />
          <Modal open={showCreateOrg} onOpenChange={setShowCreateOrg}>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Skapa organisation</ModalTitle>
                <ModalDescription>Fyll i uppgifter om din organisation.</ModalDescription>
              </ModalHeader>
              <div className="space-y-4 py-4">
                <Input placeholder="Organisationsnamn" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                <Input placeholder="Plats (valfritt)" value={orgLocation} onChange={(e) => setOrgLocation(e.target.value)} />
              </div>
              <ModalFooter>
                <Button variant="secondary" onClick={() => setShowCreateOrg(false)}>Avbryt</Button>
                <Button variant="primary" onClick={handleCreateOrg} disabled={createOrgMutation.isPending}>Skapa</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="employer">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Schemaläggare</h1>
            <p className="text-sm text-muted-foreground mt-1">Hantera pass och se tillgänglighet</p>
          </div>
          <div className="flex items-center gap-3">
            <WeekRangeSelector value={weekRange} onChange={setWeekRange} />
            <Button 
              variant="primary" 
              size="sm" 
              className="gap-2"
              onClick={() => setShowCreateBooking(true)}
              disabled={talentOptions.length === 0}
            >
              <Plus className="h-4 w-4" />
              Skapa bokning
            </Button>
          </div>
        </div>

        {/* No matches hint */}
        {matchedTalentIds.length === 0 && (
          <Card variant="default" padding="md" className="mb-6 border-warn/30 bg-warn-muted">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-warn" />
              <div>
                <p className="text-sm font-medium text-foreground">Inga matchade talanger</p>
                <p className="text-xs text-muted-foreground">
                  Matcha med talanger för att börja schemalägga.{" "}
                  <button 
                    className="text-primary underline"
                    onClick={() => navigate("/employer/jobs")}
                  >
                    Gå till jobb
                  </button>
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Week Grid */}
        <Card variant="default" padding="md">
          {schedulerLoading ? (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center">
                  <Skeleton className="h-4 w-8 mx-auto mb-2" />
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {daySlots.map((slot, i) => {
                const hasContent = slot.bookings.length > 0 || slot.busyBlocks.length > 0;
                const dateNum = format(slot.date, "d");
                
                return (
                  <div key={i} className="text-center">
                    {/* Day header */}
                    <div className="mb-2">
                      <div className="text-xs font-medium text-muted-foreground">{weekDays[i]}</div>
                      <div className={cn(
                        "text-sm font-semibold",
                        isToday(slot.date) ? "text-primary" : "text-foreground"
                      )}>
                        {dateNum}
                      </div>
                    </div>

                    {/* Day content */}
                    <div className={cn(
                      "min-h-32 rounded-lg p-2 space-y-1",
                      !hasContent ? "bg-secondary/50 border-2 border-dashed border-muted" : "bg-secondary"
                    )}>
                      {/* Own bookings - primary style */}
                      {slot.bookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="group relative"
                        >
                          <Badge
                            variant="verified"
                            size="sm"
                            className="w-full justify-center text-[10px] cursor-help"
                          >
                            {booking.talent_name ?? "Talang"}
                          </Badge>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-ink text-frost text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {formatTime(booking.start_ts)} - {formatTime(booking.end_ts)}
                          </div>
                        </div>
                      ))}

                      {/* Busy blocks - muted style, no org info */}
                      {slot.busyBlocks.map((block, idx) => (
                        <Badge
                          key={`busy-${idx}`}
                          variant="busy"
                          size="sm"
                          className="w-full justify-center text-[10px]"
                        >
                          Upptagen
                        </Badge>
                      ))}

                      {/* Empty day indicator */}
                      {!hasContent && (
                        <span className="text-xs text-muted-foreground">–</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="verified" size="sm">●</Badge>
            <span>Din bokning</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="busy" size="sm">●</Badge>
            <span>Upptagen (annan)</span>
          </div>
        </div>
      </div>

      {/* Create Booking Modal */}
      <CreateBookingModal
        open={showCreateBooking}
        onOpenChange={setShowCreateBooking}
        talents={talentOptions}
        existingBookings={schedulerData?.bookings ?? []}
        busyBlocks={schedulerData?.busyBlocks ?? []}
        onSubmit={handleCreateBooking}
        isSubmitting={createBookingMutation.isPending}
      />
    </AppShell>
  );
}

export default EmployerScheduler;
