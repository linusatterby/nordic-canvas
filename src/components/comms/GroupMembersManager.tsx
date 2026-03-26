/**
 * Modal/drawer to manage members of an internal group.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { LABELS } from "@/config/labels";
import {
  useGroupMembers,
  useOrgMembers,
  useAssignUserToGroup,
  useRemoveUserFromGroup,
} from "@/hooks/useInternalComms";
import { UserPlus, UserMinus, Users } from "lucide-react";
import type { InternalGroup } from "@/lib/api/internalComms";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: InternalGroup;
  orgId: string;
}

export function GroupMembersManager({ open, onOpenChange, group, orgId }: Props) {
  const { data: members, isLoading: membersLoading } = useGroupMembers(open ? group.id : undefined);
  const { data: orgMembers, isLoading: orgMembersLoading } = useOrgMembers(open ? orgId : undefined);
  const assignMutation = useAssignUserToGroup();
  const removeMutation = useRemoveUserFromGroup();

  const memberUserIds = new Set((members ?? []).map((m) => m.user_id));
  const nonMembers = (orgMembers ?? []).filter((om) => !memberUserIds.has(om.user_id));

  const isLoading = membersLoading || orgMembersLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            {group.name} — {LABELS.commsGroupMembers}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Current members */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">{LABELS.commsGroupMembers}</h4>
              {members?.length ? (
                <ul className="space-y-1.5">
                  {members.map((m) => {
                    const profile = orgMembers?.find((om) => om.user_id === m.user_id);
                    return (
                      <li key={m.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <span className="text-sm text-foreground">
                          {profile?.full_name || m.user_id.slice(0, 8)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive h-7 px-2 gap-1"
                          disabled={removeMutation.isPending}
                          onClick={() => removeMutation.mutate({ groupId: group.id, userId: m.user_id })}
                          aria-label={LABELS.commsRemoveMember}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          {LABELS.commsRemoveMember}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">{LABELS.commsNoMembersYet}</p>
              )}
            </div>

            {/* Available to add */}
            {nonMembers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">{LABELS.commsAddMember}</h4>
                <ul className="space-y-1.5">
                  {nonMembers.map((om) => (
                    <li key={om.user_id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">
                          {om.full_name || om.user_id.slice(0, 8)}
                        </span>
                        <Badge variant="outline" size="sm">{om.role}</Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 gap-1"
                        disabled={assignMutation.isPending}
                        onClick={() => assignMutation.mutate({ groupId: group.id, userId: om.user_id })}
                        aria-label={LABELS.commsAddMember}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {LABELS.commsAddMember}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
