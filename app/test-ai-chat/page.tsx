"use client";

import { ChatInterface } from "@/components/chat/ChatInterface";
import { useChat } from "@/hooks/useChat";
import type { Message } from "@/components/chat/MessageBubble";

export default function TestAIChatPage() {
  const { messages, append, isLoading, error } = useChat({
    streamProtocol: 'text',
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  // Transform messages to match ChatInterface expectations
  const chatMessages: Message[] = messages.map((msg) => ({
    id: msg.id,
    role: msg.role === "user" ? "student" : "tutor",
    content: msg.content,
    timestamp: msg.createdAt || new Date(),
  }));

  const handleSendMessage = async (content: string) => {
    // Use append to directly add the user message
    await append({
      role: "user",
      content,
    });
  };

  return (
    <div className="h-screen w-full flex flex-col">
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3">
          <div className="flex items-start gap-2">
            <svg
              className="h-5 w-5 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Unable to send message</p>
              <p className="text-sm mt-1">{error.message}</p>
              {error.message.includes("API key") && (
                <p className="text-sm mt-2 opacity-80">
                  Please check your environment configuration and ensure OPENAI_API_KEY is set correctly.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <ChatInterface
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
