/**
 * Employee/talent internal information feed.
 * Shows messages targeted to "all" or groups the user belongs to.
 */
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { LABELS } from "@/config/labels";
import { useInternalMessagesForUser } from "@/hooks/useInternalComms";
import { useOrgs } from "@/hooks/useOrgs";
import { Megaphone, Users } from "lucide-react";

export default function TalentComms() {
  const { data: orgs } = useOrgs();
  const orgId = orgs?.[0]?.id;
  const { data: messages, isLoading } = useInternalMessagesForUser(orgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{LABELS.commsFeedTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">{LABELS.commsFeedSubtitle}</p>
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
          <p className="text-muted-foreground">{LABELS.commsFeedEmpty}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card key={msg.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{msg.title}</h3>
                    {msg.is_important && (
                      <Badge variant="destructive" className="text-[10px] shrink-0">
                        {LABELS.commsImportant}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{msg.body}</p>
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
    </div>
  );
}
