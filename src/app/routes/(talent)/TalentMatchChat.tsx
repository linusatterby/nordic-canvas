import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import { useMatch } from "@/hooks/useMatches";
import { useChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils/classnames";

const quickReplies = [
  "Hej! När kan du prata?",
  "Vilka tider passar dig?",
  "Tack för matchningen!",
];

export function TalentMatchChat() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { data: match, isLoading: matchLoading } = useMatch(matchId);
  const { messages, sendMessage, isSending, isLoading: chatLoading } = useChat(matchId);
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

  if (matchLoading || chatLoading) {
    return (
      <AppShell role="talent">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="talent">
      <div className="container mx-auto px-4 py-4 max-w-2xl h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/talent/matches")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-foreground">{match?.job_title}</h1>
            <p className="text-sm text-muted-foreground">{match?.org_name}</p>
          </div>
        </div>

        {/* Messages */}
        <Card variant="default" padding="md" className="flex-1 overflow-y-auto mb-4">
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Ingen konversation ännu. Säg hej!
              </p>
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

        {/* Quick Replies */}
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
    </AppShell>
  );
}

export default TalentMatchChat;
