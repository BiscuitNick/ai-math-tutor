"use client";

import React, { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageBubble, type Message } from "./MessageBubble";
import { EnhancedChatInput } from "./EnhancedChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ArrowDown, BookOpen, MessageSquare } from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { DisplayMath } from "@/components/MathDisplay";

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
  // Check if we have problem steps to show
  const hasProblems = currentSession && currentSession.steps && currentSession.steps.length > 0;
  const hasProblemText = currentSession && currentSession.problemText;

  return (
    <div className={cn(
      "fixed flex flex-col h-full w-full",
      className
    )}>
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 py-3">
        <h1 className="text-xl font-semibold text-center">AI Math Tutor</h1>
      </div>

      {/* Resizable Split View */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="vertical">
          {/* Problem Steps Panel (Top) */}
          <ResizablePanel defaultSize={50} minSize={15}>
            <div className="h-full flex flex-col">
              <div className="flex-shrink-0 border-b px-4 py-2 bg-muted/30">
                <h2 className="text-sm font-semibold">Running Problem</h2>
              </div>
              <ScrollArea className="flex-1">
                {hasProblems || hasProblemText ? (
                  <div className="p-4 flex flex-col gap-2">
                    {/* Show original problem only if we don't have steps */}
                    {hasProblemText && !hasProblems && (
                      <div className="flex items-center justify-center gap-2">
                        <DisplayMath latex={currentSession.problemText} />
                      </div>
                    )}

                    {/* Show all steps (clean extracted expressions) */}
                    {hasProblems && currentSession.steps.map((step: any, index: number) => (
                      <div key={index} className="flex items-center justify-center gap-2">
                        <DisplayMath latex={step.expression} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <Empty className="border-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <BookOpen />
                        </EmptyMedia>
                        <EmptyTitle>No Active Problem</EmptyTitle>
                        <EmptyDescription>
                          Start a conversation to see the problem steps here
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                )}
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Chat Messages Panel (Bottom) */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col relative">
              <ScrollArea className="flex-1" ref={scrollAreaRef} onScrollCapture={handleScroll}>
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <Empty className="border-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <MessageSquare />
                        </EmptyMedia>
                        <EmptyTitle>No Messages Yet</EmptyTitle>
                        <EmptyDescription>
                          Start a conversation by asking a question
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 p-4">
                    {messages.map((message, index) => (
                      <MessageBubble
                        key={message.id || index}
                        message={message}
                        currentSession={currentSession}
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
          </ResizablePanel>
        </ResizablePanelGroup>
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
