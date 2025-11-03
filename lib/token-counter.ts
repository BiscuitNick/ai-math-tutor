import { Tiktoken, encodingForModel } from "js-tiktoken";
import { CoreMessage } from "ai";

// Encoding for GPT-4
let encoder: Tiktoken | null = null;

function getEncoder(): Tiktoken {
  if (!encoder) {
    encoder = encodingForModel("gpt-4");
  }
  return encoder;
}

/**
 * Count tokens in a single message
 */
export function countMessageTokens(message: CoreMessage): number {
  const enc = getEncoder();
  const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content);

  // Each message has overhead: role + content + formatting
  // OpenAI format: <|im_start|>role\ncontent<|im_end|>\n
  const tokens = enc.encode(content).length;
  const roleTokens = enc.encode(message.role).length;

  // Add 4 tokens for formatting (<|im_start|>, role, \n, <|im_end|>)
  return tokens + roleTokens + 4;
}

/**
 * Count total tokens in an array of messages
 */
export function countTotalTokens(messages: CoreMessage[]): number {
  let total = 0;

  for (const message of messages) {
    total += countMessageTokens(message);
  }

  // Add 2 tokens for the priming (getting assistant to respond)
  return total + 2;
}

/**
 * Trim messages to stay under token limit while keeping the most recent ones
 * @param messages - Array of messages
 * @param maxTokens - Maximum allowed tokens (default: 4000)
 * @param keepSystemPrompt - Whether to always keep the first system message (default: true)
 * @returns Trimmed array of messages
 */
export function trimMessagesToLimit(
  messages: CoreMessage[],
  maxTokens: number = 4000,
  keepSystemPrompt: boolean = true
): CoreMessage[] {
  if (messages.length === 0) return messages;

  // Separate system prompt from conversation
  const systemMessage = keepSystemPrompt && messages[0].role === "system" ? messages[0] : null;
  const conversationMessages = systemMessage ? messages.slice(1) : messages;

  // Calculate system prompt tokens
  const systemTokens = systemMessage ? countMessageTokens(systemMessage) : 0;
  const availableTokens = maxTokens - systemTokens - 100; // 100 token buffer

  // Start from the most recent messages and work backwards
  const result: CoreMessage[] = [];
  let currentTokens = 0;

  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const message = conversationMessages[i];
    const messageTokens = countMessageTokens(message);

    if (currentTokens + messageTokens <= availableTokens) {
      result.unshift(message);
      currentTokens += messageTokens;
    } else {
      // Can't fit more messages
      break;
    }
  }

  // Add system message back at the beginning
  if (systemMessage) {
    result.unshift(systemMessage);
  }

  return result;
}

/**
 * Keep only the last N conversation turns (user + assistant pairs)
 * @param messages - Array of messages
 * @param maxTurns - Maximum number of conversation turns to keep (default: 10)
 * @param keepSystemPrompt - Whether to always keep the first system message (default: true)
 * @returns Trimmed array of messages
 */
export function trimToLastNTurns(
  messages: CoreMessage[],
  maxTurns: number = 10,
  keepSystemPrompt: boolean = true
): CoreMessage[] {
  if (messages.length === 0) return messages;

  // Separate system prompt from conversation
  const systemMessage = keepSystemPrompt && messages[0].role === "system" ? messages[0] : null;
  const conversationMessages = systemMessage ? messages.slice(1) : messages;

  // Count conversation pairs (user + assistant = 1 turn)
  const maxMessages = maxTurns * 2;

  // Keep only the last N turns
  const recentMessages = conversationMessages.slice(-maxMessages);

  // Add system message back at the beginning
  if (systemMessage) {
    return [systemMessage, ...recentMessages];
  }

  return recentMessages;
}

/**
 * Manage conversation context with both turn limit and token limit
 * @param messages - Array of messages
 * @param options - Configuration options
 * @returns Trimmed array of messages
 */
export function manageConversationContext(
  messages: CoreMessage[],
  options: {
    maxTurns?: number;
    maxTokens?: number;
    keepSystemPrompt?: boolean;
  } = {}
): CoreMessage[] {
  const {
    maxTurns = 10,
    maxTokens = 4000,
    keepSystemPrompt = true,
  } = options;

  // First, trim to last N turns
  let trimmed = trimToLastNTurns(messages, maxTurns, keepSystemPrompt);

  // Then, ensure we're under token limit
  trimmed = trimMessagesToLimit(trimmed, maxTokens, keepSystemPrompt);

  return trimmed;
}

/**
 * Free the encoder resources
 * Note: In edge runtime, encoders are typically garbage collected automatically
 */
export function cleanup(): void {
  // Reset encoder reference to allow garbage collection
  encoder = null;
}
