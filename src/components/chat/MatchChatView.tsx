import * as React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Send } from "lucide-react";
import { useChat, type EffectiveMessage } from "@/hooks/useChat";
import { cn } from "@/lib/utils/classnames";

interface MatchChatViewProps {
  matchId: string | undefined;
  isMatchDemo?: boolean;
  /** Quick reply suggestions */
  quickReplies?: string[];
  /** Header action buttons rendered by parent */
  headerActions?: React.ReactNode;
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * Shared chat view component used by both Talent and Employer match chat routes.
 * Single source of truth for chat rendering logic.
 */
export function MatchChatView({
  matchId,
  isMatchDemo = false,
  quickReplies = [],
  headerActions,
  emptyMessage = "Säg hej! Ingen konversation ännu.",
}: MatchChatViewProps) {
  const { messages, sendMessage, isSending, isLoading, isDemo } = useChat(matchId, isMatchDemo);
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

  const handleQuickReply = (text: string) => {
    setInput(text);
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
    <div className="flex-1 flex flex-col">
      {/* Messages */}
      <Card variant="default" padding="md" className="flex-1 overflow-y-auto mb-4">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-center text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Quick Replies */}
      {quickReplies.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {quickReplies.map((reply) => (
            <Button
              key={reply}
              variant="secondary"
              size="sm"
              onClick={() => handleQuickReply(reply)}
              className="whitespace-nowrap text-xs"
            >
              {reply}
            </Button>
          ))}
        </div>
      )}

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

/**
 * Individual message bubble component
 */
function MessageBubble({ message }: { message: EffectiveMessage }) {
  return (
    <div
      className={cn(
        "max-w-[80%] p-3 rounded-xl text-sm",
        message.is_own
          ? "ml-auto bg-primary text-primary-foreground"
          : "bg-secondary text-foreground"
      )}
    >
      {message.body}
    </div>
  );
}

export default MatchChatView;
