/**
 * Problem Explanation Generator
 *
 * Generates comprehensive explanations of the solution process
 * after a student successfully completes a problem.
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { Session, MathStep } from "./types/session";

export interface ProblemExplanation {
  problemOverview: string;
  keyConcepts: string[];
  solutionApproach: string;
  stepByStepSummary: string[];
  alternativeMethods?: string;
  commonMistakes?: string[];
  timestamp: Date;
}

export interface ExplanationRequest {
  problemText: string;
  problemType?: string;
  steps: MathStep[];
  conversationHistory?: string; // Key moments from the conversation
}

/**
 * Generates a comprehensive explanation of how the problem was solved
 */
export async function generateProblemExplanation(
  request: ExplanationRequest
): Promise<ProblemExplanation> {
  const { problemText, problemType = "unknown", steps, conversationHistory = "" } = request;

  const prompt = buildExplanationPrompt(problemText, problemType, steps, conversationHistory);

  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `Generate a comprehensive explanation for solving: ${problemText}`,
        },
      ],
      temperature: 0.5, // Balanced creativity and consistency
    });

    // Parse the response
    const explanation = parseExplanationResponse(text, problemText);
    return explanation;
  } catch (error) {
    console.error("Error generating explanation:", error);

    // Fallback to a generic explanation
    return {
      problemOverview: `You successfully solved: ${problemText}`,
      keyConcepts: ["Problem-solving", "Mathematical reasoning"],
      solutionApproach: "You worked through the problem step by step",
      stepByStepSummary: steps.map((step, idx) => `Step ${idx + 1}: ${step.expression}`),
      timestamp: new Date(),
    };
  }
}

/**
 * Builds the prompt for explanation generation
 */
function buildExplanationPrompt(
  problemText: string,
  problemType: string,
  steps: MathStep[],
  conversationHistory: string
): string {
  const stepsText = steps
    .map((step, idx) => `${idx + 1}. ${step.expression}${step.explanation ? ` (${step.explanation})` : ""}`)
    .join("\n");

  return `You are an expert math tutor providing a comprehensive explanation of how a student solved a problem.

PROBLEM:
${problemText}

PROBLEM TYPE: ${problemType}

STUDENT'S SOLUTION STEPS:
${stepsText || "Student solved the problem through conversation"}

${conversationHistory ? `KEY MOMENTS FROM TUTORING SESSION:\n${conversationHistory}\n` : ""}

Your task is to create a clear, encouraging explanation that:
1. Summarizes what the problem asked
2. Identifies the key mathematical concepts used
3. Explains the solution approach/strategy
4. Breaks down the solution into clear steps
5. Mentions alternative methods (if applicable)
6. Notes common mistakes students make on this type of problem

TONE: Encouraging, clear, and educational
AUDIENCE: The student who just solved the problem

Respond in this EXACT JSON format:
{
  "problemOverview": "1-2 sentence summary of what the problem asked",
  "keyConcepts": ["concept1", "concept2", "concept3"],
  "solutionApproach": "paragraph explaining the overall strategy/approach used",
  "stepByStepSummary": ["step 1 explanation", "step 2 explanation", ...],
  "alternativeMethods": "paragraph about other ways to solve this (or null if not applicable)",
  "commonMistakes": ["mistake1", "mistake2"] or null
}

Example:
{
  "problemOverview": "This problem asked you to solve for x in a quadratic equation.",
  "keyConcepts": ["Quadratic equations", "Factoring", "Zero product property"],
  "solutionApproach": "You used factoring to break down the quadratic equation into two binomial factors, then applied the zero product property to find the solutions.",
  "stepByStepSummary": [
    "Started with the equation x² + 5x + 6 = 0",
    "Factored into (x + 2)(x + 3) = 0",
    "Applied zero product property: x + 2 = 0 or x + 3 = 0",
    "Solved to get x = -2 or x = -3"
  ],
  "alternativeMethods": "You could also use the quadratic formula or completing the square to solve this equation.",
  "commonMistakes": ["Forgetting to check both solutions", "Sign errors when factoring"]
}`;
}

/**
 * Parses the AI response into a ProblemExplanation
 */
function parseExplanationResponse(response: string, problemText: string): ProblemExplanation {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      problemOverview: parsed.problemOverview || `Problem solved: ${problemText}`,
      keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
      solutionApproach: parsed.solutionApproach || "You worked through the problem systematically",
      stepByStepSummary: Array.isArray(parsed.stepByStepSummary) ? parsed.stepByStepSummary : [],
      alternativeMethods: parsed.alternativeMethods || undefined,
      commonMistakes: Array.isArray(parsed.commonMistakes) ? parsed.commonMistakes : undefined,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Error parsing explanation response:", error);
    console.error("Response was:", response);

    // Fallback: return basic explanation
    return {
      problemOverview: `You successfully solved: ${problemText}`,
      keyConcepts: ["Problem-solving"],
      solutionApproach: "You worked through the problem step by step",
      stepByStepSummary: ["Review your work above to see how you solved it"],
      timestamp: new Date(),
    };
  }
}

/**
 * Formats explanation as markdown for display in chat
 */
export function formatExplanationForChat(explanation: ProblemExplanation): string {
  let formatted = `## 🎉 Great work! You solved it!\n\n`;

  formatted += `### Problem Overview\n${explanation.problemOverview}\n\n`;

  if (explanation.keyConcepts.length > 0) {
    formatted += `### Key Concepts\n`;
    formatted += explanation.keyConcepts.map(concept => `- ${concept}`).join("\n");
    formatted += `\n\n`;
  }

  formatted += `### Your Approach\n${explanation.solutionApproach}\n\n`;

  if (explanation.stepByStepSummary.length > 0) {
    formatted += `### Solution Steps\n`;
    explanation.stepByStepSummary.forEach((step, idx) => {
      formatted += `${idx + 1}. ${step}\n`;
    });
    formatted += `\n`;
  }

  if (explanation.alternativeMethods) {
    formatted += `### Alternative Methods\n${explanation.alternativeMethods}\n\n`;
  }

  if (explanation.commonMistakes && explanation.commonMistakes.length > 0) {
    formatted += `### Common Pitfalls to Watch For\n`;
    formatted += explanation.commonMistakes.map(mistake => `- ${mistake}`).join("\n");
    formatted += `\n\n`;
  }

  return formatted;
}
