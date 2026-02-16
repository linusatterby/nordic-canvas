import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useHostHousingThreads } from "@/hooks/useHousing";
import { useHousingChat } from "@/hooks/useChat";
import { Inbox, MessageCircle, Home, ChevronRight, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils/classnames";

export default function HostInbox() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeThreadId = searchParams.get("threadId");

  const { data: threads, isLoading } = useHostHousingThreads();

  const activeThread = threads?.find((t) => t.thread_id === activeThreadId);

  // If we have an active thread, show the chat view
  if (activeThreadId && activeThread) {
    return (
      <AppShell role="host">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-border bg-card">
            <button
              onClick={() => navigate("/host/inbox")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Tillbaka till inbox
            </button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                <Home className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Boendeförfrågan</h2>
                <p className="text-sm text-muted-foreground">
                  {activeThread.listing_title || activeThread.listing_location || "Boende"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-4">
            <HousingChatView
              threadId={activeThreadId}
              recipientName={activeThread.talent_name || "Kandidat"}
            />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="host">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
          <p className="text-muted-foreground">Förfrågningar om dina boenden</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : threads && threads.length > 0 ? (
          <div className="space-y-2">
            {threads.map((thread) => (
              <Card
                key={thread.thread_id}
                variant="interactive"
                padding="md"
                className="cursor-pointer"
                onClick={() => navigate(`/host/inbox?threadId=${thread.thread_id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground truncate">
                        {thread.talent_name || "Kandidat"}
                      </p>
                      {thread.last_message_at && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(thread.last_message_at), {
                            addSuffix: true,
                            locale: sv,
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {thread.listing_title || thread.listing_location || "Boendeförfrågan"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card variant="default" padding="lg" className="text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Inga förfrågningar än</p>
            <p className="text-sm text-muted-foreground mt-1">
              När kandidater kontaktar dig visas det här
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

/**
 * Simple housing chat view component
 */
function HousingChatView({
  threadId,
  recipientName,
}: {
  threadId: string;
  recipientName: string;
}) {
  const { messages, sendMessage, isSending, isLoading } = useHousingChat(threadId);
  const [input, setInput] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim().length === 0 || input.length > 1000) return;
    sendMessage(input.trim());
    setInput("");
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <Card variant="default" padding="md" className="flex-1">
          <div className="space-y-3">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-10 w-1/2 ml-auto" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages */}
      <Card variant="default" padding="md" className="flex-1 overflow-y-auto mb-4">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-center text-sm text-muted-foreground">
                Säg hej till {recipientName}!
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "max-w-[80%] p-3 rounded-xl text-sm",
                msg.is_own
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              )}
            >
              {msg.body}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Skriv ett meddelande..."
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          maxLength={1000}
        />
        <Button
          variant="primary"
          onClick={handleSend}
          disabled={isSending || input.trim().length === 0}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
