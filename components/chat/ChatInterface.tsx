"use client";

import React, { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageBubble, type Message } from "./MessageBubble";
import { EnhancedChatInput } from "./EnhancedChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ArrowDown } from "lucide-react";

export interface ChatInterfaceProps {
  messages?: Message[];
  onSendMessage?: (data: { text: string; images: File[] }) => void | Promise<void>;
  isLoading?: boolean;
  className?: string;
  currentSessionId?: string | null;
  currentSession?: any;
  onCompleteSession?: () => void;
}

export function ChatInterface({
  messages = [],
  onSendMessage = () => {},
  isLoading = false,
  className,
  currentSessionId,
  currentSession,
  onCompleteSession
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll when new messages arrive, but only if user is near bottom
  useEffect(() => {
    if (isNearBottom) {
      // Use requestAnimationFrame for smooth scrolling
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [messages, isLoading, isNearBottom]);

  // Check scroll position
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Consider "near bottom" if within 100px
    const nearBottom = distanceFromBottom < 100;
    setIsNearBottom(nearBottom);
    setShowScrollButton(!nearBottom && messages.length > 0);
  };
  return (
    <div className={cn(
      "flex flex-col h-full w-full",
      className
    )}>
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 py-3">
        <h1 className="text-xl font-semibold text-center">AI Math Tutor</h1>
      </div>

      {/* Message Area */}
      <div className="flex-1 min-h-0 relative">
        <ScrollArea className="h-full" ref={scrollAreaRef} onScrollCapture={handleScroll}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Start a conversation by asking a question...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id || index}
                  message={message}
                />
              ))}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute bottom-4 right-4 rounded-full shadow-lg"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4" />
            <span className="sr-only">Scroll to bottom</span>
          </Button>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t p-4">
        <EnhancedChatInput
          onSend={onSendMessage}
          isLoading={isLoading}
          currentSessionId={currentSessionId}
          currentSession={currentSession}
          onCompleteSession={onCompleteSession}
        />
      </div>
    </div>
  );
}
