/**
 * Problem Completion Detector
 *
 * Analyzes student's work to detect when they have successfully
 * solved the problem correctly.
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { Session, MathStep } from "./types/session";

export interface CompletionDetectionResult {
  isComplete: boolean;
  confidence: number; // 0-1 scale
  finalAnswer?: string;
  reasoning: string; // AI's explanation of why it thinks the problem is/isn't complete
}

export interface DetectionRequest {
  problemText: string;
  steps: MathStep[];
  lastStudentMessage: string;
  conversationContext?: string; // Recent conversation history
}

/**
 * Detects if the student has successfully completed the problem
 */
export async function detectProblemCompletion(
  request: DetectionRequest
): Promise<CompletionDetectionResult> {
  const { problemText, steps, lastStudentMessage, conversationContext = "" } = request;

  const prompt = buildCompletionDetectionPrompt(
    problemText,
    steps,
    lastStudentMessage,
    conversationContext
  );

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
          content: `Analyze if the student has correctly solved this problem: ${problemText}`,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    // Parse the response
    const result = parseCompletionResponse(text);
    return result;
  } catch (error) {
    console.error("Error detecting problem completion:", error);

    // Fallback: return uncertain result
    return {
      isComplete: false,
      confidence: 0,
      reasoning: "Unable to analyze completion due to an error",
    };
  }
}

/**
 * Builds the prompt for completion detection
 */
function buildCompletionDetectionPrompt(
  problemText: string,
  steps: MathStep[],
  lastMessage: string,
  context: string
): string {
  const stepsText = steps
    .map((step, idx) => `Step ${idx + 1}: ${step.expression}`)
    .join("\n");

  return `You are an expert math tutor analyzing whether a student has correctly solved a math problem.

PROBLEM:
${problemText}

STUDENT'S WORK (Mathematical steps taken):
${stepsText || "No steps recorded yet"}

STUDENT'S LATEST MESSAGE:
${lastMessage}

${context ? `RECENT CONVERSATION CONTEXT:\n${context}\n` : ""}

Your task is to determine if the student has:
1. Arrived at the CORRECT final answer
2. Used VALID mathematical reasoning
3. COMPLETED all necessary steps

IMPORTANT GUIDELINES:
- Only mark as complete if the student has the CORRECT final answer
- Partial progress or correct approach is NOT complete
- Small arithmetic errors mean NOT complete
- If unsure, mark as NOT complete with lower confidence
- Consider the problem type and what constitutes a complete solution

Respond in this EXACT JSON format:
{
  "isComplete": true/false,
  "confidence": 0.0 to 1.0,
  "finalAnswer": "the student's final answer (if provided)",
  "reasoning": "brief explanation of your analysis"
}

Examples:
- If student says "I got x = 5" and that's correct: {"isComplete": true, "confidence": 0.95, "finalAnswer": "x = 5", "reasoning": "Student arrived at correct answer"}
- If student is still working: {"isComplete": false, "confidence": 0.8, "finalAnswer": null, "reasoning": "Student has not reached final answer yet"}
- If student has wrong answer: {"isComplete": false, "confidence": 0.9, "finalAnswer": "x = 3", "reasoning": "Student's answer x = 3 is incorrect"}`;
}

/**
 * Parses the AI response into a CompletionDetectionResult
 */
function parseCompletionResponse(response: string): CompletionDetectionResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      isComplete: Boolean(parsed.isComplete),
      confidence: Number(parsed.confidence) || 0,
      finalAnswer: parsed.finalAnswer || undefined,
      reasoning: parsed.reasoning || "No reasoning provided",
    };
  } catch (error) {
    console.error("Error parsing completion response:", error);
    console.error("Response was:", response);

    // Fallback: try to extract info from text
    const isComplete = /complete|correct|solved/i.test(response);
    const confidence = isComplete ? 0.5 : 0.3;

    return {
      isComplete,
      confidence,
      reasoning: "Failed to parse structured response, using heuristic analysis",
    };
  }
}

/**
 * Helper to build conversation context from recent messages
 */
export function buildConversationContext(messages: Array<{role: string, content: string}>): string {
  // Get last 5 messages for context
  const recentMessages = messages.slice(-5);
  return recentMessages
    .map((msg) => `${msg.role === "student" ? "Student" : "Tutor"}: ${msg.content}`)
    .join("\n\n");
}
