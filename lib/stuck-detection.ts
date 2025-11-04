/**
 * Stuck Detection System
 *
 * Tracks student progress and identifies when they're stuck on a problem.
 * Uses response analysis to determine if the student is making progress.
 */

import { CoreMessage } from "ai";

export type StuckLevel = "not_stuck" | "potentially_stuck" | "definitely_stuck" | "severely_stuck";

export interface StuckStatus {
  level: StuckLevel;
  consecutiveStuckTurns: number;
  lastProgressTurn: number; // Index of last turn where student made progress
  totalTurns: number;
  timeSinceLastProgress?: number; // milliseconds
  recommendedHintLevel: number; // 0-4, escalating hint specificity
}

export interface TurnAnalysis {
  isCorrect: boolean;
  isProgress: boolean;
  hasNewIdea: boolean;
  confidence: number; // 0-1
  reasoning?: string;
}

/**
 * Analyzes a conversation history to determine stuck status
 */
export function analyzeStuckStatus(
  messages: CoreMessage[],
  turnTimestamps?: Date[]
): StuckStatus {
  // Filter to only user messages (student responses)
  const userMessages = messages.filter(msg => msg.role === "user");
  const totalTurns = userMessages.length;

  if (totalTurns === 0) {
    return {
      level: "not_stuck",
      consecutiveStuckTurns: 0,
      lastProgressTurn: 0,
      totalTurns: 0,
      recommendedHintLevel: 0,
    };
  }

  // For now, we'll use a simple heuristic based on turn count
  // In a full implementation, this would use GPT to analyze the actual content

  // Count recent turns (last 5) to detect stuckness
  const recentTurnCount = Math.min(5, totalTurns);
  const recentMessages = userMessages.slice(-recentTurnCount);

  // Heuristic: assume student is stuck if they've made many turns
  // This is a placeholder - real implementation would analyze content
  const consecutiveStuckTurns = estimateStuckTurns(recentMessages);

  let level: StuckLevel = "not_stuck";
  let recommendedHintLevel = 0;

  if (consecutiveStuckTurns >= 5) {
    level = "severely_stuck";
    recommendedHintLevel = 4;
  } else if (consecutiveStuckTurns >= 4) {
    level = "definitely_stuck";
    recommendedHintLevel = 3;
  } else if (consecutiveStuckTurns >= 3) {
    level = "potentially_stuck";
    recommendedHintLevel = 2;
  } else if (consecutiveStuckTurns >= 2) {
    level = "potentially_stuck";
    recommendedHintLevel = 1;
  }

  // Calculate time since last progress if timestamps available
  let timeSinceLastProgress: number | undefined;
  if (turnTimestamps && turnTimestamps.length >= 2) {
    const lastTime = turnTimestamps[turnTimestamps.length - 1];
    const previousTime = turnTimestamps[turnTimestamps.length - 2];
    timeSinceLastProgress = lastTime.getTime() - previousTime.getTime();
  }

  return {
    level,
    consecutiveStuckTurns,
    lastProgressTurn: Math.max(0, totalTurns - consecutiveStuckTurns - 1),
    totalTurns,
    timeSinceLastProgress,
    recommendedHintLevel,
  };
}

/**
 * Estimates stuck turns based on message patterns
 * This is a simplified heuristic - full implementation would use GPT
 */
function estimateStuckTurns(messages: CoreMessage[]): number {
  // Look for indicators of being stuck:
  // - Very short messages
  // - Repeated phrases
  // - Questions asking for help
  // - Phrases like "I don't know", "I'm stuck", etc.

  let stuckCount = 0;
  const stuckPhrases = [
    "i don't know",
    "i'm stuck",
    "i have no idea",
    "i can't",
    "help",
    "confused",
    "what do i do",
    "what should i",
  ];

  for (const message of messages) {
    const content = message.content.toString().toLowerCase();

    // Short messages might indicate uncertainty
    if (content.length < 15) {
      stuckCount++;
      continue;
    }

    // Check for stuck phrases
    const containsStuckPhrase = stuckPhrases.some(phrase =>
      content.includes(phrase)
    );

    if (containsStuckPhrase) {
      stuckCount++;
    }
  }

  return stuckCount;
}

/**
 * Analyzes a single student response using GPT-4
 * This would be called for each turn to provide detailed analysis
 */
export async function analyzeStudentResponse(
  studentResponse: string,
  conversationHistory: CoreMessage[],
  problemContext: string
): Promise<TurnAnalysis> {
  // This is a placeholder for GPT-4 analysis
  // In the real implementation, this would make an API call to GPT-4
  // with a prompt asking it to analyze if the student's response shows:
  // 1. Correctness
  // 2. Progress toward solution
  // 3. New insights/ideas
  // 4. Understanding of concepts

  // For now, return a conservative estimate
  return {
    isCorrect: false,
    isProgress: studentResponse.length > 20,
    hasNewIdea: true,
    confidence: 0.5,
    reasoning: "Placeholder analysis - implement GPT-4 integration",
  };
}

/**
 * Determines if a hint should be provided based on stuck status
 */
export function shouldProvideHint(stuckStatus: StuckStatus): boolean {
  return stuckStatus.level !== "not_stuck" && stuckStatus.recommendedHintLevel > 0;
}

/**
 * Gets the appropriate hint level description
 */
export function getHintLevelDescription(level: number): string {
  const descriptions = [
    "No hint needed - student is making progress",
    "Conceptual hint - remind of relevant concept or approach",
    "Specific approach - suggest which operation or method to use",
    "Concrete direction - guide toward specific next step",
    "Example problem - provide similar problem with solution",
  ];

  return descriptions[Math.min(level, 4)] || descriptions[0];
}
