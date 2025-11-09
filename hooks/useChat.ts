"use client";

import { useChat as useVercelChat } from "@ai-sdk/react";
import { UseChatHelpers } from "@ai-sdk/react";

export interface UseChatOptions {
  api?: string;
  streamProtocol?: 'text' | 'data';
  onError?: (error: Error) => void;
  onFinish?: (message: any) => void;
  onResponse?: (response: Response) => void | Promise<void>;
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
    onResponse: onResponse ? async (response) => {
      await onResponse(response);
    } : undefined,
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
