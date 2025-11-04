/**
 * Token Limit Enforcement
 *
 * Pre-flight token checking and budget allocation for API calls.
 * Enforces 4000 token hard limit with 3800 soft limit for safety.
 */

import { CoreMessage } from "ai";
import { countTotalTokens, countMessageTokens } from "./token-counter";

export interface TokenLimitConfig {
  hardLimit: number; // Maximum tokens allowed (default: 4000)
  softLimit: number; // Warning threshold (default: 3800)
  reservedForResponse: number; // Tokens reserved for model response (default: 1000)
}

export interface TokenBudget {
  total: number;
  used: number;
  available: number;
  reservedForResponse: number;
  exceedsLimit: boolean;
  exceedsSoftLimit: boolean;
  percentUsed: number;
}

export interface TokenCheckResult {
  allowed: boolean;
  tokenCount: number;
  limit: number;
  budget: TokenBudget;
  message?: string;
  truncationNeeded: boolean;
}

const DEFAULT_CONFIG: TokenLimitConfig = {
  hardLimit: 4000,
  softLimit: 3800,
  reservedForResponse: 1000,
};

/**
 * Performs pre-flight token check before API call
 */
export function checkTokenLimit(
  messages: CoreMessage[],
  config: Partial<TokenLimitConfig> = {}
): TokenCheckResult {
  const { hardLimit, softLimit, reservedForResponse } = { ...DEFAULT_CONFIG, ...config };

  const tokenCount = countTotalTokens(messages);
  const maxAllowed = hardLimit - reservedForResponse;
  const softMaxAllowed = softLimit - reservedForResponse;

  const exceedsLimit = tokenCount > maxAllowed;
  const exceedsSoftLimit = tokenCount > softMaxAllowed;

  const budget: TokenBudget = {
    total: hardLimit,
    used: tokenCount,
    available: Math.max(0, maxAllowed - tokenCount),
    reservedForResponse,
    exceedsLimit,
    exceedsSoftLimit,
    percentUsed: (tokenCount / hardLimit) * 100,
  };

  let message: string | undefined;

  if (exceedsLimit) {
    message = `Token limit exceeded: ${tokenCount} tokens (max ${maxAllowed} for conversation). Please reduce message length or start a new conversation.`;
  } else if (exceedsSoftLimit) {
    message = `Approaching token limit: ${tokenCount}/${maxAllowed} tokens used. Consider wrapping up this conversation.`;
  }

  return {
    allowed: !exceedsLimit,
    tokenCount,
    limit: maxAllowed,
    budget,
    message,
    truncationNeeded: exceedsLimit,
  };
}

/**
 * Allocates token budget for different message types
 */
export function allocateTokenBudget(
  totalBudget: number,
  allocation: {
    systemPrompt?: number; // Percentage for system prompt
    conversation?: number; // Percentage for conversation history
    response?: number; // Percentage reserved for response
  } = {}
): {
  systemPromptBudget: number;
  conversationBudget: number;
  responseBudget: number;
} {
  const {
    systemPrompt = 15, // 15% for system prompt
    conversation = 60, // 60% for conversation
    response = 25, // 25% for response
  } = allocation;

  // Ensure percentages add up to 100
  const total = systemPrompt + conversation + response;
  const normalizedSystem = (systemPrompt / total) * totalBudget;
  const normalizedConversation = (conversation / total) * totalBudget;
  const normalizedResponse = (response / total) * totalBudget;

  return {
    systemPromptBudget: Math.floor(normalizedSystem),
    conversationBudget: Math.floor(normalizedConversation),
    responseBudget: Math.floor(normalizedResponse),
  };
}

/**
 * Truncates messages to fit within token budget
 */
export function truncateToTokenBudget(
  messages: CoreMessage[],
  maxTokens: number,
  options: {
    keepSystemPrompt?: boolean;
    keepFirstUserMessage?: boolean;
    truncateFromOldest?: boolean;
  } = {}
): {
  messages: CoreMessage[];
  originalTokens: number;
  finalTokens: number;
  removedCount: number;
} {
  const {
    keepSystemPrompt = true,
    keepFirstUserMessage = true,
    truncateFromOldest = true,
  } = options;

  const originalTokens = countTotalTokens(messages);

  if (originalTokens <= maxTokens) {
    return {
      messages,
      originalTokens,
      finalTokens: originalTokens,
      removedCount: 0,
    };
  }

  // Separate special messages
  const systemMessage = keepSystemPrompt && messages[0]?.role === "system"
    ? messages[0]
    : null;

  let workingMessages = systemMessage ? messages.slice(1) : messages;

  // Find first user message
  const firstUserMessageIndex = workingMessages.findIndex(m => m.role === "user");
  const firstUserMessage = keepFirstUserMessage && firstUserMessageIndex >= 0
    ? workingMessages[firstUserMessageIndex]
    : null;

  // Remove first user message from working set temporarily
  if (firstUserMessage) {
    workingMessages = [
      ...workingMessages.slice(0, firstUserMessageIndex),
      ...workingMessages.slice(firstUserMessageIndex + 1),
    ];
  }

  // Calculate tokens for special messages
  let specialTokens = 0;
  if (systemMessage) specialTokens += countMessageTokens(systemMessage);
  if (firstUserMessage) specialTokens += countMessageTokens(firstUserMessage);

  const availableForConversation = maxTokens - specialTokens - 50; // 50 token buffer

  // Truncate from oldest or newest
  const result: CoreMessage[] = [];
  let currentTokens = 0;

  if (truncateFromOldest) {
    // Keep newest messages (work backwards)
    for (let i = workingMessages.length - 1; i >= 0; i--) {
      const message = workingMessages[i];
      const messageTokens = countMessageTokens(message);

      if (currentTokens + messageTokens <= availableForConversation) {
        result.unshift(message);
        currentTokens += messageTokens;
      } else {
        break;
      }
    }
  } else {
    // Keep oldest messages (work forwards)
    for (const message of workingMessages) {
      const messageTokens = countMessageTokens(message);

      if (currentTokens + messageTokens <= availableForConversation) {
        result.push(message);
        currentTokens += messageTokens;
      } else {
        break;
      }
    }
  }

  // Reconstruct final message array
  const finalMessages: CoreMessage[] = [];

  if (systemMessage) finalMessages.push(systemMessage);
  if (firstUserMessage) {
    // Insert first user message at the correct position
    finalMessages.push(firstUserMessage);
  }
  finalMessages.push(...result);

  const finalTokens = countTotalTokens(finalMessages);
  const removedCount = messages.length - finalMessages.length;

  return {
    messages: finalMessages,
    originalTokens,
    finalTokens,
    removedCount,
  };
}

/**
 * Gets token usage statistics for monitoring
 */
export function getTokenUsageStats(
  messages: CoreMessage[],
  config: Partial<TokenLimitConfig> = {}
): {
  totalTokens: number;
  messageCount: number;
  averageTokensPerMessage: number;
  budget: TokenBudget;
  status: "healthy" | "warning" | "critical";
} {
  const { hardLimit, softLimit, reservedForResponse } = { ...DEFAULT_CONFIG, ...config };

  const totalTokens = countTotalTokens(messages);
  const maxAllowed = hardLimit - reservedForResponse;
  const softMaxAllowed = softLimit - reservedForResponse;

  const exceedsLimit = totalTokens > maxAllowed;
  const exceedsSoftLimit = totalTokens > softMaxAllowed;

  const budget: TokenBudget = {
    total: hardLimit,
    used: totalTokens,
    available: Math.max(0, maxAllowed - totalTokens),
    reservedForResponse,
    exceedsLimit,
    exceedsSoftLimit,
    percentUsed: (totalTokens / hardLimit) * 100,
  };

  let status: "healthy" | "warning" | "critical";
  if (exceedsLimit) {
    status = "critical";
  } else if (exceedsSoftLimit) {
    status = "warning";
  } else {
    status = "healthy";
  }

  return {
    totalTokens,
    messageCount: messages.length,
    averageTokensPerMessage: messages.length > 0 ? totalTokens / messages.length : 0,
    budget,
    status,
  };
}

/**
 * Creates error response for token limit exceeded
 */
export function createTokenLimitError(tokenCount: number, limit: number): {
  error: string;
  message: string;
  tokenCount: number;
  limit: number;
} {
  return {
    error: "TOKEN_LIMIT_EXCEEDED",
    message: `Token limit exceeded: ${tokenCount} tokens used, maximum ${limit} allowed. Please start a new conversation or reduce message length.`,
    tokenCount,
    limit,
  };
}

/**
 * Formats token budget info for logging
 */
export function formatTokenBudget(budget: TokenBudget): string {
  const percentage = budget.percentUsed.toFixed(1);
  const status = budget.exceedsLimit ? "EXCEEDED" :
                 budget.exceedsSoftLimit ? "WARNING" : "OK";

  return `Tokens: ${budget.used}/${budget.total - budget.reservedForResponse} (${percentage}%) [${status}] - ${budget.available} available`;
}
