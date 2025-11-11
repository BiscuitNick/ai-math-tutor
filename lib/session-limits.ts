/**
 * Session Turn Limits
 *
 * Implements turn counting and session completion logic.
 * Warns users at 40 and 45 turns, enforces limit at 50 turns.
 */

import { CoreMessage } from "ai";

export interface TurnLimitConfig {
  maxTurns: number; // Maximum turns allowed (default: 50)
  warningThresholds: number[]; // Turn counts to show warnings (default: [40, 45])
}

export interface TurnLimitResult {
  currentTurns: number;
  maxTurns: number;
  remaining: number;
  limitReached: boolean;
  shouldWarn: boolean;
  warningMessage?: string;
  completionMessage?: string;
}

const DEFAULT_CONFIG: TurnLimitConfig = {
  maxTurns: 50,
  warningThresholds: [40, 45],
};

/**
 * Counts the number of conversation turns (user messages)
 */
export function countConversationTurns(messages: CoreMessage[]): number {
  return messages.filter(m => m.role === "user").length;
}

/**
 * Checks if session should display a warning or be terminated
 */
export function checkTurnLimit(
  messages: CoreMessage[],
  config: Partial<TurnLimitConfig> = {}
): TurnLimitResult {
  const { maxTurns, warningThresholds } = { ...DEFAULT_CONFIG, ...config };

  const currentTurns = countConversationTurns(messages);
  const remaining = Math.max(0, maxTurns - currentTurns);
  const limitReached = currentTurns >= maxTurns;

  // Check if we should show a warning
  const shouldWarn = warningThresholds.includes(currentTurns) && !limitReached;

  let warningMessage: string | undefined;
  let completionMessage: string | undefined;

  if (limitReached) {
    completionMessage = generateCompletionMessage(currentTurns);
  } else if (shouldWarn) {
    warningMessage = generateWarningMessage(currentTurns, remaining);
  }

  return {
    currentTurns,
    maxTurns,
    remaining,
    limitReached,
    shouldWarn,
    warningMessage,
    completionMessage,
  };
}

/**
 * Generates a warning message when approaching turn limit
 */
function generateWarningMessage(currentTurns: number, remaining: number): string {
  if (remaining <= 5) {
    return `📊 **Session Update**: You have ${remaining} turn${remaining === 1 ? '' : 's'} remaining in this session. We're making great progress! Let's focus on wrapping up this problem.`;
  }

  if (remaining <= 10) {
    return `📊 **Session Update**: You have ${remaining} turns remaining in this session. We're doing well! Let's continue working toward the solution.`;
  }

  return `📊 **Session Update**: This session will continue for ${remaining} more turns. You're making good progress!`;
}

/**
 * Generates a completion message when session limit is reached
 */
function generateCompletionMessage(totalTurns: number): string {
  return `## Session Complete

We've reached the end of this learning session after ${totalTurns} turns.

**Great work on your learning journey!** Here's what you accomplished:
- You engaged deeply with mathematical concepts
- You showed persistence in working through challenges
- You developed problem-solving strategies

**Next Steps:**
- Review what you learned in this session
- Practice similar problems to reinforce concepts
- Start a new session when you're ready to continue learning

Feel free to start a new problem session whenever you'd like to continue practicing!`;
}

/**
 * Checks if a new turn should be allowed
 */
export function shouldAllowNewTurn(messages: CoreMessage[], maxTurns: number = 50): boolean {
  const currentTurns = countConversationTurns(messages);
  return currentTurns < maxTurns;
}

/**
 * Gets the turn limit status for display in UI
 */
export function getTurnLimitStatus(
  messages: CoreMessage[],
  maxTurns: number = 50
): {
  current: number;
  max: number;
  percentage: number;
  remaining: number;
} {
  const current = countConversationTurns(messages);
  const remaining = Math.max(0, maxTurns - current);
  const percentage = Math.min(100, (current / maxTurns) * 100);

  return {
    current,
    max: maxTurns,
    percentage,
    remaining,
  };
}

/**
 * Determines if session should be automatically completed and saved to Firestore
 */
export function shouldCompleteSession(messages: CoreMessage[], maxTurns: number = 50): boolean {
  return countConversationTurns(messages) >= maxTurns;
}

/**
 * Generates a session summary for storage when session completes
 */
export function generateSessionSummary(messages: CoreMessage[]): {
  totalTurns: number;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  completionReason: "turn_limit" | "user_ended" | "error";
} {
  const userMessages = messages.filter(m => m.role === "user").length;
  const assistantMessages = messages.filter(m => m.role === "assistant").length;

  return {
    totalTurns: userMessages,
    totalMessages: messages.length,
    userMessages,
    assistantMessages,
    completionReason: "turn_limit",
  };
}

/**
 * Formats turn limit info for inclusion in system prompt
 */
export function formatTurnLimitForPrompt(result: TurnLimitResult): string {
  if (result.limitReached) {
    return `\n\n## SESSION LIMIT REACHED\n\nThis session has reached its ${result.maxTurns}-turn limit. Provide a warm, encouraging closing message that summarizes the session and encourages the student to continue learning.\n`;
  }

  if (result.shouldWarn && result.warningMessage) {
    return `\n\n## SESSION WARNING\n\nThe student has ${result.remaining} turns remaining. Include this information naturally: "${result.warningMessage}"\n`;
  }

  return '';
}

/**
 * Creates error response when turn limit is exceeded
 */
export function createTurnLimitError(currentTurns: number, maxTurns: number): {
  error: string;
  message: string;
  currentTurns: number;
  maxTurns: number;
} {
  return {
    error: "SESSION_LIMIT_REACHED",
    message: `This session has reached its maximum of ${maxTurns} turns. Please start a new session to continue learning.`,
    currentTurns,
    maxTurns,
  };
}
