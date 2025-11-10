"use client";

import { useChat as useVercelChat } from "@ai-sdk/react";
import { UseChatHelpers } from "@ai-sdk/react";

export interface CompletionStatus {
  isComplete: boolean;
  confidence: number;
  finalAnswer?: string;
}

export interface UseChatOptions {
  api?: string;
  streamProtocol?: 'text' | 'data';
  onError?: (error: Error) => void;
  onFinish?: (message: any) => void;
  onResponse?: (response: Response) => void | Promise<void>;
  onCompletionDetected?: (status: CompletionStatus) => void;
  onExpressionsExtracted?: (expressions: string[]) => void;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
}

export interface UseChatReturn extends Omit<UseChatHelpers, "messages"> {
  messages: ChatMessage[];
  append: UseChatHelpers["append"];
}

/**
 * Custom hook for chat functionality with streaming support
 * Uses Vercel AI SDK's useChat hook under the hood
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    api = "/api/chat",
    streamProtocol = 'data',
    onError,
    onFinish,
    onResponse,
    onCompletionDetected,
    onExpressionsExtracted,
  } = options;

  const chat = useVercelChat({
    api,
    streamProtocol,
    onError: (error) => {
      console.error("Chat error:", error);
      onError?.(error);
    },
    onFinish: (message) => {
      console.log("Chat finished:", message);
      onFinish?.(message);
    },
    onResponse: async (response) => {
      // Extract completion status from headers
      const completionHeader = response.headers.get('X-Completion-Status');
      if (completionHeader && onCompletionDetected) {
        try {
          const completionStatus: CompletionStatus = JSON.parse(completionHeader);
          console.log("[CLIENT] Completion status detected:", completionStatus);
          onCompletionDetected(completionStatus);
        } catch (error) {
          console.error("Failed to parse completion status:", error);
        }
      }

      // Extract expressions from headers
      const expressionsHeader = response.headers.get('X-Extracted-Expressions');
      if (expressionsHeader && onExpressionsExtracted) {
        try {
          const expressions: string[] = JSON.parse(expressionsHeader);
          console.log("[CLIENT] Expressions extracted:", expressions);
          onExpressionsExtracted(expressions);
        } catch (error) {
          console.error("Failed to parse extracted expressions:", error);
        }
      }

      // Call user's onResponse callback if provided
      if (onResponse) {
        await onResponse(response);
      }
    },
  });

  // Transform messages to match our interface
  const transformedMessages: ChatMessage[] = chat.messages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    content: msg.content,
    createdAt: msg.createdAt,
  }));

  return {
    ...chat,
    messages: transformedMessages,
    append: chat.append,
  };
}
