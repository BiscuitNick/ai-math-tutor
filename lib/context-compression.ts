/**
 * Context Compression Algorithm
 *
 * Compresses conversation history by:
 * - Keeping last 10 full turns (user + assistant pairs)
 * - Summarizing older turns for context preservation
 * - Maintaining problem context and key learning points
 */

import { CoreMessage } from "ai";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { countMessageTokens, countTotalTokens } from "./token-counter";

export interface CompressionResult {
  messages: CoreMessage[];
  compressionApplied: boolean;
  originalMessageCount: number;
  compressedMessageCount: number;
  originalTokens: number;
  compressedTokens: number;
  summary?: string;
}

export interface CompressionOptions {
  keepRecentTurns: number; // Number of recent turns to keep in full (default: 10)
  summarizeOlderTurns: boolean; // Whether to summarize older turns (default: true)
  keepSystemPrompt: boolean; // Always keep system prompt (default: true)
  compressionThreshold: number; // Minimum turns before compression triggers (default: 15)
}

const DEFAULT_OPTIONS: CompressionOptions = {
  keepRecentTurns: 10,
  summarizeOlderTurns: true,
  keepSystemPrompt: true,
  compressionThreshold: 15,
};

/**
 * Main compression function
 */
export async function compressConversationContext(
  messages: CoreMessage[],
  options: Partial<CompressionOptions> = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Separate system message if present
  const systemMessage = opts.keepSystemPrompt && messages[0]?.role === "system"
    ? messages[0]
    : null;
  const conversationMessages = systemMessage ? messages.slice(1) : messages;

  // Count conversation turns (user messages)
  const userMessages = conversationMessages.filter(m => m.role === "user");
  const turnCount = userMessages.length;

  // If below threshold, no compression needed
  if (turnCount <= opts.compressionThreshold) {
    return {
      messages,
      compressionApplied: false,
      originalMessageCount: messages.length,
      compressedMessageCount: messages.length,
      originalTokens: countTotalTokens(messages),
      compressedTokens: countTotalTokens(messages),
    };
  }

  // Calculate how many recent messages to keep
  const recentMessagesCount = opts.keepRecentTurns * 2; // Each turn = user + assistant
  const recentMessages = conversationMessages.slice(-recentMessagesCount);
  const olderMessages = conversationMessages.slice(0, -recentMessagesCount);

  // If no older messages or summarization disabled, just return recent
  if (olderMessages.length === 0 || !opts.summarizeOlderTurns) {
    const result = systemMessage
      ? [systemMessage, ...recentMessages]
      : recentMessages;

    return {
      messages: result,
      compressionApplied: false,
      originalMessageCount: messages.length,
      compressedMessageCount: result.length,
      originalTokens: countTotalTokens(messages),
      compressedTokens: countTotalTokens(result),
    };
  }

  // Summarize older messages
  try {
    const summary = await summarizeConversationHistory(olderMessages);

    // Create summary message
    const summaryMessage: CoreMessage = {
      role: "system",
      content: `## Previous Conversation Summary\n\n${summary}\n\n---\n\n## Recent Conversation (Full Detail)\n\nThe following messages contain the most recent ${opts.keepRecentTurns} turns of conversation:`,
    };

    // Build compressed message array
    const compressedMessages: CoreMessage[] = systemMessage
      ? [systemMessage, summaryMessage, ...recentMessages]
      : [summaryMessage, ...recentMessages];

    return {
      messages: compressedMessages,
      compressionApplied: true,
      originalMessageCount: messages.length,
      compressedMessageCount: compressedMessages.length,
      originalTokens: countTotalTokens(messages),
      compressedTokens: countTotalTokens(compressedMessages),
      summary,
    };
  } catch (error) {
    console.error("Error compressing context:", error);

    // Fallback: return recent messages without summarization
    const fallbackResult = systemMessage
      ? [systemMessage, ...recentMessages]
      : recentMessages;

    return {
      messages: fallbackResult,
      compressionApplied: false,
      originalMessageCount: messages.length,
      compressedMessageCount: fallbackResult.length,
      originalTokens: countTotalTokens(messages),
      compressedTokens: countTotalTokens(fallbackResult),
    };
  }
}

/**
 * Summarizes older conversation turns using GPT-3.5 for efficiency
 */
async function summarizeConversationHistory(messages: CoreMessage[]): Promise<string> {
  // Build conversation text
  const conversationText = messages
    .map(m => {
      const role = m.role === "user" ? "Student" : "Tutor";
      const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      return `${role}: ${content}`;
    })
    .join("\n\n");

  const prompt = `You are summarizing a math tutoring conversation. Create a concise summary that preserves:

1. The original problem being solved
2. Key mathematical concepts discussed
3. Student's main difficulties or misconceptions
4. Progress made toward the solution
5. Important insights or breakthroughs

Conversation to summarize:
${conversationText}

Provide a clear, concise summary (3-5 sentences) that captures the essential context needed to continue the tutoring session effectively.`;

  try {
    const { text } = await generateText({
      model: openai("gpt-3.5-turbo"), // Use cheaper model for summarization
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return text;
  } catch (error) {
    console.error("Failed to generate summary:", error);

    // Fallback to simple extraction
    return extractBasicSummary(messages);
  }
}

/**
 * Fallback summarization without AI (if API fails)
 */
function extractBasicSummary(messages: CoreMessage[]): string {
  const userMessages = messages.filter(m => m.role === "user");
  const firstUserMessage = userMessages[0];
  const turnCount = userMessages.length;

  const problemText = firstUserMessage?.content?.toString().substring(0, 200) || "a math problem";

  return `Earlier in this session (${turnCount} turns), the student was working on: ${problemText}... The conversation covered foundational concepts and initial problem-solving attempts.`;
}

/**
 * Estimates token savings from compression
 */
export function estimateCompressionSavings(
  originalMessages: CoreMessage[],
  options: Partial<CompressionOptions> = {}
): {
  originalTokens: number;
  estimatedCompressedTokens: number;
  estimatedSavings: number;
  savingsPercentage: number;
} {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalTokens = countTotalTokens(originalMessages);

  // Estimate: summary ~200 tokens, keep recent N turns
  const systemMessage = opts.keepSystemPrompt && originalMessages[0]?.role === "system"
    ? originalMessages[0]
    : null;
  const conversationMessages = systemMessage ? originalMessages.slice(1) : originalMessages;

  const recentMessagesCount = opts.keepRecentTurns * 2;
  const recentMessages = conversationMessages.slice(-recentMessagesCount);

  let estimatedTokens = 0;

  if (systemMessage) {
    estimatedTokens += countMessageTokens(systemMessage);
  }

  estimatedTokens += 200; // Summary estimate
  estimatedTokens += countTotalTokens(recentMessages);

  const savings = Math.max(0, originalTokens - estimatedTokens);
  const savingsPercentage = originalTokens > 0
    ? (savings / originalTokens) * 100
    : 0;

  return {
    originalTokens,
    estimatedCompressedTokens: estimatedTokens,
    estimatedSavings: savings,
    savingsPercentage,
  };
}

/**
 * Checks if compression should be triggered
 */
export function shouldCompressContext(
  messages: CoreMessage[],
  threshold: number = 15
): boolean {
  const userMessages = messages.filter(m => m.role === "user");
  return userMessages.length > threshold;
}

/**
 * Gets compression statistics for logging/monitoring
 */
export function getCompressionStats(result: CompressionResult): string {
  if (!result.compressionApplied) {
    return `No compression (${result.originalMessageCount} messages, ${result.originalTokens} tokens)`;
  }

  const tokenSavings = result.originalTokens - result.compressedTokens;
  const percentageSaved = ((tokenSavings / result.originalTokens) * 100).toFixed(1);

  return `Compressed: ${result.originalMessageCount} → ${result.compressedMessageCount} messages, ${result.originalTokens} → ${result.compressedTokens} tokens (${percentageSaved}% saved)`;
}
