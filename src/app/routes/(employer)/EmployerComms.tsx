/**
 * Employer internal communications page.
 */
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { LABELS } from "@/config/labels";
import {
  useInternalMessages,
  useGroups,
  useCreateMessage,
  useCreateGroup,
} from "@/hooks/useInternalComms";
import { useMyOrgs, useDemoOrgId } from "@/hooks/useOrgs";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMembership } from "@/hooks/useDemoMembership";
import { CreateMessageDialog } from "@/components/comms/CreateMessageDialog";
import { CreateGroupDialog } from "@/components/comms/CreateGroupDialog";
import { GroupMembersManager } from "@/components/comms/GroupMembersManager";
import { Plus, Megaphone, Users, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import type { InternalGroup } from "@/lib/api/internalComms";

export default function EmployerComms() {
  const { isDemoMode } = useAuth();
  const { data: orgs } = useMyOrgs();
  const { data: demoOrgId } = useDemoOrgId();
  const orgId = orgs?.[0]?.id ?? (isDemoMode ? demoOrgId : undefined) ?? undefined;
  const demoReady = useDemoMembership(orgId, isDemoMode);
  const effectiveOrgId = demoReady ? orgId : undefined;
  const { data: messages, isLoading } = useInternalMessages(effectiveOrgId);
  const { data: groups } = useGroups(effectiveOrgId);
  const createMsgMutation = useCreateMessage(effectiveOrgId);
  const createGroupMutation = useCreateGroup(effectiveOrgId);
  const createMsgMutation = useCreateMessage(orgId);
  const createGroupMutation = useCreateGroup(orgId);

  const [showCreateMsg, setShowCreateMsg] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [managingGroup, setManagingGroup] = useState<InternalGroup | null>(null);

  if (!orgId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{LABELS.commsTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">{LABELS.commsSubtitle}</p>
        </div>
        <Card className="p-8 text-center">
          <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{LABELS.commsNoOrg}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{LABELS.commsTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">{LABELS.commsSubtitle}</p>
      </div>

      <Tabs defaultValue="messages">
        <TabsList>
          <TabsTrigger value="messages">
            <Megaphone className="h-4 w-4 mr-1.5" />
            {LABELS.commsTitle}
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Users className="h-4 w-4 mr-1.5" />
            {LABELS.commsGroupsTitle}
          </TabsTrigger>
        </TabsList>

        {/* ── Messages tab ─────────────────────────────────── */}
        <TabsContent value="messages" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateMsg(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {LABELS.commsNewMessage}
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : !messages?.length ? (
            <Card className="p-8 text-center">
              <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">{LABELS.commsEmpty}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{LABELS.commsEmptyHint}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <Card key={msg.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{msg.title}</h3>
                        {msg.is_important && (
                          <Badge variant="warn" size="sm">
                            {LABELS.commsImportant}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{msg.body}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Users className="h-3 w-3" />
                        {msg.target === "all"
                          ? LABELS.commsTargetAll
                          : msg.group_names?.join(", ") ?? LABELS.commsTargetGroups}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleDateString("sv-SE")}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Groups tab ───────────────────────────────────── */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{LABELS.commsGroupsSubtitle}</p>
            </div>
            <Button onClick={() => setShowCreateGroup(true)} className="gap-2">
              <FolderPlus className="h-4 w-4" />
              {LABELS.commsCreateGroup}
            </Button>
          </div>

          {!groups?.length ? (
            <Card className="p-8 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">{LABELS.commsNoGroupsYet}</p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.map((g) => (
                <Card
                  key={g.id}
                  className="p-4 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setManagingGroup(g)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{g.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs">
                      {LABELS.commsManageMembers}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ──────────────────────────────────────── */}
      <CreateMessageDialog
        open={showCreateMsg}
        onOpenChange={setShowCreateMsg}
        groups={groups ?? []}
        orgId={orgId ?? ""}
        onSubmit={async (payload) => {
          await createMsgMutation.mutateAsync(payload);
          setShowCreateMsg(false);
        }}
        isSubmitting={createMsgMutation.isPending}
      />

      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        onSubmit={async (name) => {
          await createGroupMutation.mutateAsync(name);
          setShowCreateGroup(false);
          toast.success(LABELS.commsGroupCreated);
        }}
        isSubmitting={createGroupMutation.isPending}
      />

      {managingGroup && orgId && (
        <GroupMembersManager
          open={!!managingGroup}
          onOpenChange={(open) => { if (!open) setManagingGroup(null); }}
          group={managingGroup}
          orgId={orgId}
        />
      )}
    </div>
  );
}
