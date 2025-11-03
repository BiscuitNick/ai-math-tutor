import { openai } from "@ai-sdk/openai";
import { streamText, CoreMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { SOCRATIC_SYSTEM_PROMPT } from "@/lib/prompts/socratic-tutor";
import { manageConversationContext, countTotalTokens } from "@/lib/token-counter";
import { validateOpenAIKey, APIError, parseAPIError } from "@/lib/error-handler";

export const runtime = "edge";

// Configuration
const MAX_TOKENS = 4000;
const MAX_CONVERSATION_TURNS = 10;
const MAX_RESPONSE_TOKENS = 1000;

// TypeScript interfaces for API
interface ChatRequest {
  messages: CoreMessage[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ChatRequest;
    const { messages } = body;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    // Validate messages format
    for (const message of messages) {
      if (!message.role || !message.content) {
        throw new Error("Invalid message format. Each message must have 'role' and 'content'");
      }
    }

    // Validate OpenAI API key
    validateOpenAIKey();


    // Prepare messages with system prompt
    const messagesWithSystem: CoreMessage[] = [
      {
        role: "system",
        content: SOCRATIC_SYSTEM_PROMPT,
      },
      ...messages,
    ];

    // Manage conversation context to stay under token limits
    const managedMessages = manageConversationContext(messagesWithSystem, {
      maxTurns: MAX_CONVERSATION_TURNS,
      maxTokens: MAX_TOKENS - MAX_RESPONSE_TOKENS, // Reserve space for response
      keepSystemPrompt: true,
    });

    // Log token usage for debugging
    const totalTokens = countTotalTokens(managedMessages);
    console.log(`Token count: ${totalTokens} / ${MAX_TOKENS - MAX_RESPONSE_TOKENS}`);
    console.log(`Messages: ${managedMessages.length} (${messages.length} original)`);

    // Check if we're over the token limit even after trimming
    if (totalTokens > MAX_TOKENS - MAX_RESPONSE_TOKENS) {
      console.error(`Token limit exceeded: ${totalTokens} tokens`);
      throw new Error("Conversation is too long. Please start a new conversation.");
    }

    // Stream the response using Vercel AI SDK with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const result = await streamText({
        model: openai("gpt-4-turbo-preview"),
        messages: managedMessages,
        temperature: 0.7,
        maxOutputTokens: MAX_RESPONSE_TOKENS,
        abortSignal: controller.signal,
      });

      clearTimeout(timeoutId);
      return result.toTextStreamResponse();
    } catch (streamError: any) {
      clearTimeout(timeoutId);
      throw streamError;
    }
  } catch (error: any) {
    console.error("Chat API error:", error);

    // Parse error using error handler
    const apiError = parseAPIError(error);

    // Return error in text stream format that AI SDK can parse
    return new Response(apiError.message, {
      status: apiError.statusCode || 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}
