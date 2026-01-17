import * as React from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCircleMembers,
  useCirclePartners,
  useAddCircleMember,
  useRemoveCircleMember,
  useCreateCircle,
} from "@/hooks/useCircles";
import { useToasts } from "@/components/delight/Toasts";
import { Plus, Trash2, Users, MapPin } from "lucide-react";
import type { Circle, CircleMember } from "@/lib/api/circles";

interface CircleManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  circle: Circle | null;
  onCircleCreated?: (circleId: string) => void;
}

export function CircleManagementModal({
  open,
  onOpenChange,
  orgId,
  circle,
  onCircleCreated,
}: CircleManagementModalProps) {
  const { addToast } = useToasts();
  const [showCreateCircle, setShowCreateCircle] = React.useState(false);
  const [newCircleName, setNewCircleName] = React.useState("");
  const [selectedPartner, setSelectedPartner] = React.useState<string>("");

  const { data: members, isLoading: membersLoading } = useCircleMembers(circle?.id);
  const { data: partners } = useCirclePartners(orgId);
  const addMemberMutation = useAddCircleMember();
  const removeMemberMutation = useRemoveCircleMember();
  const createCircleMutation = useCreateCircle();

  // Filter out partners that are already members
  const availablePartners = React.useMemo(() => {
    if (!partners || !members) return partners ?? [];
    const memberIds = new Set(members.map((m: CircleMember) => m.id));
    return partners.filter((p) => !memberIds.has(p.id));
  }, [partners, members]);

  const handleAddMember = async () => {
    if (!circle || !selectedPartner) return;
    try {
      await addMemberMutation.mutateAsync({
        circleId: circle.id,
        memberOrgId: selectedPartner,
      });
      setSelectedPartner("");
      addToast({ type: "success", title: "Klart!", message: "Medlem tillagd." });
    } catch (e) {
      addToast({ type: "error", title: "Fel", message: e instanceof Error ? e.message : "Kunde inte lägga till." });
    }
  };

  const handleRemoveMember = async (memberOrgId: string) => {
    if (!circle) return;
    try {
      await removeMemberMutation.mutateAsync({
        circleId: circle.id,
        memberOrgId,
      });
      addToast({ type: "success", title: "Borttagen", message: "Medlem borttagen." });
    } catch (e) {
      addToast({ type: "error", title: "Fel", message: "Kunde inte ta bort." });
    }
  };

  const handleCreateCircle = async () => {
    if (!newCircleName.trim()) return;
    try {
      const circleId = await createCircleMutation.mutateAsync({
        orgId,
        name: newCircleName.trim(),
      });
      setNewCircleName("");
      setShowCreateCircle(false);
      addToast({ type: "success", title: "Klart!", message: "Cirkel skapad." });
      if (circleId) {
        onCircleCreated?.(circleId);
      }
    } catch (e) {
      addToast({ type: "error", title: "Fel", message: "Kunde inte skapa cirkel." });
    }
  };

  // If no circle selected, show create form
  if (!circle) {
    return (
      <Modal open={open} onOpenChange={onOpenChange}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Skapa ny cirkel</ModalTitle>
            <ModalDescription>
              Namnge din cirkel och lägg till partners.
            </ModalDescription>
          </ModalHeader>
          <div className="py-4 space-y-4">
            <Input
              placeholder="Cirkelnamn, t.ex. 'Hamnens krögare'"
              value={newCircleName}
              onChange={(e) => setNewCircleName(e.target.value)}
            />
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateCircle}
              disabled={createCircleMutation.isPending || !newCircleName.trim()}
            >
              {createCircleMutation.isPending ? "Skapar..." : "Skapa cirkel"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {circle.name}
          </ModalTitle>
          <ModalDescription>
            Hantera vilka partnerföretag som ingår i denna cirkel.
          </ModalDescription>
        </ModalHeader>

        <div className="py-4 space-y-4">
          {/* Members List */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">
              Medlemmar ({members?.length ?? 0})
            </h4>
            {membersLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {members.map((member) => (
                  <Card key={member.id} variant="ghost" padding="sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-foreground text-sm">
                          {member.name}
                        </span>
                        {member.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {member.location}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removeMemberMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Inga medlemmar ännu. Lägg till dina trusted partners nedan.
              </p>
            )}
          </div>

          {/* Add Member */}
          {availablePartners && availablePartners.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Lägg till medlem</h4>
              <div className="flex gap-2">
                <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                  <SelectTrigger className="flex-1 bg-background">
                    <SelectValue placeholder="Välj partner..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {availablePartners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name}
                        {partner.location && ` (${partner.location})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddMember}
                  disabled={addMemberMutation.isPending || !selectedPartner}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : partners && partners.length === 0 ? (
            <Card variant="ghost" padding="sm" className="text-center">
              <p className="text-sm text-muted-foreground">
                Du har inga trusted partners ännu. Bjud in partners först i "Trusted Circle"-fliken.
              </p>
            </Card>
          ) : null}

          {/* Create new circle option */}
          {showCreateCircle ? (
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-medium text-foreground">Skapa ny cirkel</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Cirkelnamn"
                  value={newCircleName}
                  onChange={(e) => setNewCircleName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateCircle}
                  disabled={createCircleMutation.isPending || !newCircleName.trim()}
                >
                  Skapa
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowCreateCircle(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Skapa ny cirkel
            </Button>
          )}
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Stäng
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
