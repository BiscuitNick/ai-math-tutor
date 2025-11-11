/**
 * Graduated Hint System
 *
 * Provides progressively more specific hints based on how stuck the student is.
 * Level 1: Conceptual hints (remind of relevant concepts)
 * Level 2: Specific approach (suggest which operation/method)
 * Level 3: Concrete direction (guide toward specific next step)
 * Level 4: Example problem (provide similar problem with solution)
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { CoreMessage } from "ai";
import { generateExampleProblem, formatExampleForChat } from "./example-generator";

export type HintLevel = 0 | 1 | 2 | 3 | 4;

export interface HintRequest {
  problemText: string;
  conversationHistory: CoreMessage[];
  currentStuckLevel: number;
  problemType?: string;
}

export interface GeneratedHint {
  level: HintLevel;
  hintText: string;
  reasoning: string;
  timestamp: Date;
}

/**
 * Generates a hint at the specified level using GPT-4
 */
export async function generateHint(request: HintRequest): Promise<GeneratedHint> {
  const { problemText, conversationHistory, currentStuckLevel, problemType } = request;

  const hintLevel = Math.min(4, Math.max(0, currentStuckLevel)) as HintLevel;

  if (hintLevel === 0) {
    return {
      level: 0,
      hintText: "No hint needed - student is making progress.",
      reasoning: "Student is not stuck",
      timestamp: new Date(),
    };
  }

  // Special case: Level 4 uses example problem generator
  if (hintLevel === 4) {
    try {
      const example = await generateExampleProblem({
        originalProblem: problemText,
        problemType,
      });

      const formattedExample = formatExampleForChat(example);

      return {
        level: 4,
        hintText: formattedExample,
        reasoning: "Generated example problem to demonstrate the approach",
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error generating example problem:", error);
      // Fall through to regular hint generation
    }
  }

  const hintPrompt = buildHintPrompt(hintLevel, problemText, problemType);

  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "system",
          content: hintPrompt,
        },
        ...conversationHistory.slice(-6), // Include recent context
        {
          role: "user",
          content: `Based on the conversation, provide a Level ${hintLevel} hint for this problem: ${problemText}`,
        },
      ],
    });

    return {
      level: hintLevel,
      hintText: text,
      reasoning: `Generated Level ${hintLevel} hint based on stuck detection`,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Error generating hint:", error);

    // Fallback to generic hint
    return {
      level: hintLevel,
      hintText: getFallbackHint(hintLevel),
      reasoning: "Fallback hint due to API error",
      timestamp: new Date(),
    };
  }
}

/**
 * Builds the system prompt for hint generation based on level
 */
function buildHintPrompt(level: HintLevel, problemText: string, problemType?: string): string {
  const basePrompt = `You are a math tutor providing hints to help a stuck student. The student is working on this problem:

${problemText}

${problemType ? `Problem Type: ${problemType}\n` : ''}

IMPORTANT RULES:
- NEVER solve the problem directly
- NEVER provide the final answer
- Provide ONLY the hint, no extra explanation unless needed
- Keep hints concise (2-3 sentences max)
- Use encouraging tone

`;

  const levelGuidance: Record<Exclude<HintLevel, 0>, string> = {
    1: `Level 1 - CONCEPTUAL HINT:
Remind the student of a relevant mathematical concept, principle, or property that applies to this problem.
Examples:
- "Remember that to solve for x, we need to isolate it on one side of the equation."
- "Think about the properties of triangles - what do you know about the sum of angles?"
- "Consider what operation is the inverse of multiplication."

Focus on CONCEPTS and PRINCIPLES, not specific steps.`,

    2: `Level 2 - SPECIFIC APPROACH:
Suggest which operation, method, or technique would help solve this problem.
Examples:
- "To get x by itself, you'll need to use inverse operations. What's the inverse of addition?"
- "This looks like a problem where the Pythagorean theorem would be helpful."
- "Try factoring this expression first - look for common factors."

Suggest the APPROACH or METHOD, but don't show how to do it.`,

    3: `Level 3 - CONCRETE DIRECTION:
Guide the student toward the specific next step they should take.
Examples:
- "Start by subtracting 5 from both sides of the equation. What does that give you?"
- "Look at the triangle - if you know two sides, which formula helps you find the third?"
- "The first step is to combine like terms on the left side. Can you do that?"

Give SPECIFIC DIRECTION for the next step, but don't solve it for them.`,

    4: `Level 4 - EXAMPLE PROBLEM:
Provide a SIMPLER, ANALOGOUS problem with a guided solution that demonstrates the same concept.
Examples:
- "Let's try a simpler version: If you had x + 3 = 7, you'd subtract 3 from both sides to get x = 4. Your problem uses the same approach but with different numbers."
- "Here's a similar but easier problem: Find the area of a rectangle with width 4 and length 5. You multiply 4 × 5 = 20. Now apply the same idea to your problem."

Provide a DIFFERENT problem (not their actual problem) that shows the technique, then suggest they apply it.`,
  };

  return basePrompt + levelGuidance[level as Exclude<HintLevel, 0>];
}

/**
 * Provides fallback hints when API is unavailable
 */
function getFallbackHint(level: HintLevel): string {
  const fallbacks: Record<Exclude<HintLevel, 0>, string> = {
    1: "Think about what mathematical concept or principle applies to this type of problem. What do you already know that might help?",
    2: "Consider what operation or method would help you make progress. What's the first step you could try?",
    3: "Look at the problem structure. What would be a logical first step to simplify or solve it?",
    4: "Try working through a simpler version of this problem first. What would happen if the numbers were smaller or the problem was easier?",
  };

  return fallbacks[level as Exclude<HintLevel, 0>] || "Take a moment to think about what you know and what you're trying to find.";
}

/**
 * Gets a hint description for logging/debugging
 */
export function getHintDescription(level: HintLevel): string {
  const descriptions: Record<HintLevel, string> = {
    0: "No hint",
    1: "Conceptual hint - remind of relevant concept",
    2: "Specific approach - suggest operation/method",
    3: "Concrete direction - guide to next step",
    4: "Example problem - provide analogous problem",
  };

  return descriptions[level];
}

/**
 * Checks if a new hint should be generated based on history
 */
export function shouldGenerateNewHint(
  currentStuckLevel: number,
  lastHintLevel?: number,
  turnsSinceLastHint?: number
): boolean {
  // Generate new hint if:
  // 1. No hint has been given yet
  if (lastHintLevel === undefined) {
    return currentStuckLevel >= 2;
  }

  // 2. Student is more stuck than last hint level
  if (currentStuckLevel > lastHintLevel) {
    return true;
  }

  // 3. It's been more than 3 turns since last hint and still stuck
  if (turnsSinceLastHint && turnsSinceLastHint > 3 && currentStuckLevel >= 2) {
    return true;
  }

  return false;
}
